import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc, and, count, avg, sql } from "drizzle-orm";
import { db, recoveryRequestsTable, guardianApprovalsTable, eventsTable } from "@workspace/db";
import {
  InitiateRecoveryBody,
  GetRecoveryRequestParams,
  SubmitProofBody,
  SubmitProofParams,
  GuardianApproveParams,
  GuardianApproveBody,
  ContestRecoveryParams,
  ContestRecoveryBody,
  ListRecoveryRequestsQueryParams,
  ListEventsQueryParams,
} from "@workspace/api-zod";
import { generateRequestId, generateEventId } from "../lib/crypto.js";
import {
  buildGuardianApprovalMessage,
  guardianApprovalBytes,
  canonicalJson,
  evaluateRecoveryPolicy,
  hashChainSigningIntent,
  loadGuardianRegistry,
  loadRecoveryPolicy,
  validateChainSigningIntent,
  verifyGuardianApproval,
  verifyFrostOperatorToken,
  verifyProofVerifierReceipt,
} from "../lib/recoveryPolicy.js";

const router: IRouter = Router();

// ─── Helpers ───────────────────────────────────────────────────────────────

async function appendEvent(
  eventType: string,
  requestId: string | null,
  data: Record<string, unknown>
) {
  await db.insert(eventsTable).values({
    eventId: generateEventId(),
    eventType,
    requestId,
    dataJson: JSON.stringify(data),
  });
}

function formatRequest(row: typeof recoveryRequestsTable.$inferSelect, approvals: typeof guardianApprovalsTable.$inferSelect[]) {
  return {
    requestId: row.requestId,
    status: row.status,
    newKeyCommit: row.newKeyCommit,
    policyCommit: row.policyCommit,
    requestedTimelock: row.requestedTimelock,
    approvalCount: row.approvalCount,
    quorum: row.quorum,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    timelockExpiresAt: row.timelockExpiresAt?.toISOString() ?? null,
    proofReceipt: row.proofReceiptJson ? JSON.parse(row.proofReceiptJson) : null,
    guardianApprovals: approvals.map((a) => ({
      guardianId: a.guardianId,
      signature: a.signature,
      timestamp: a.approvedAt.toISOString(),
    })),
    contestHash: row.contestHash ?? null,
    finalizedAt: row.finalizedAt?.toISOString() ?? null,
    metadata: row.metadata ?? null,
  };
}


function requireFrostOperator(req: Request, res: Response): boolean {
  const operatorId = req.header("x-frost-operator-id") ?? "";
  const authorization = req.header("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  try {
    if (verifyFrostOperatorToken(operatorId, token)) return true;
  } catch { /* Missing or invalid operator registry fails closed. */ }
  res.status(401).json({ error: "Authenticated FrostGate operator credentials required." });
  return false;
}

async function getApprovals(requestId: string) {
  return db
    .select()
    .from(guardianApprovalsTable)
    .where(eq(guardianApprovalsTable.requestId, requestId))
    .orderBy(guardianApprovalsTable.createdAt);
}

// ─── List recovery requests ────────────────────────────────────────────────

router.get("/recovery", async (req, res): Promise<void> => {
  const query = ListRecoveryRequestsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { status, limit = 20, offset = 0 } = query.data;

  const whereClause = status
    ? eq(recoveryRequestsTable.status, status)
    : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(recoveryRequestsTable)
      .where(whereClause)
      .orderBy(desc(recoveryRequestsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(recoveryRequestsTable)
      .where(whereClause),
  ]);

  const total = Number(totalRows[0]?.count ?? 0);

  const items = await Promise.all(
    rows.map(async (row) => {
      const approvals = await getApprovals(row.requestId);
      return formatRequest(row, approvals);
    })
  );

  res.json({ items, total });
});

// ─── Initiate recovery ─────────────────────────────────────────────────────

router.post("/recovery", async (req, res): Promise<void> => {
  const parsed = InitiateRecoveryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const policy = loadRecoveryPolicy();
    const guardians = loadGuardianRegistry();
    if (guardians.size < policy.quorum) throw new Error("Guardian registry does not satisfy quorum.");
    const { newKeyCommit, policyCommit, requestedTimelock, metadata } = parsed.data;
    if (requestedTimelock < policy.minimumTimelockSeconds || requestedTimelock > policy.maximumTimelockSeconds) {
      res.status(400).json({ error: "Requested timelock is outside the configured recovery policy." });
      return;
    }
    const requestId = generateRequestId(newKeyCommit, policyCommit);
    const metadataObject = metadata ? JSON.parse(metadata) as Record<string, unknown> : {};
    const chainIntent = validateChainSigningIntent(
      { ...(metadataObject.chainIntent as Record<string, unknown>), requestId },
      requestId,
    );
    const storedMetadata = canonicalJson({ ...metadataObject, chainIntent, policyVersion: policy.version, policyQuorum: policy.quorum });

    const [row] = await db.insert(recoveryRequestsTable).values({
      requestId,
      status: "INITIATED",
      newKeyCommit,
      policyCommit,
      requestedTimelock,
      approvalCount: 0,
      quorum: policy.quorum,
      metadata: storedMetadata,
    }).returning();

    await appendEvent("RecoveryInitiated", requestId, {
      requestId, newKeyCommit, policyCommit, requestedTimelock,
      policyVersion: policy.version, quorum: policy.quorum,
      chainIntentHash: hashChainSigningIntent(chainIntent),
    });
    const approvals = await getApprovals(requestId);
    res.status(201).json(formatRequest(row!, approvals));
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "Recovery policy configuration failed closed." });
  }
});

// ─── Get recovery request ──────────────────────────────────────────────────

router.get("/recovery/:requestId", async (req, res): Promise<void> => {
  const params = GetRecoveryRequestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select()
    .from(recoveryRequestsTable)
    .where(eq(recoveryRequestsTable.requestId, params.data.requestId));

  if (!row) {
    res.status(404).json({ error: "Recovery request not found" });
    return;
  }

  const approvals = await getApprovals(row.requestId);
  res.json(formatRequest(row, approvals));
});

// ─── External proof verifier boundary ─────────────────────────────────────
// This API never fabricates proofs. A separately operated, configured proof
// verifier must issue the Ed25519-signed receipt accepted by submit-proof.
router.post("/recovery/:requestId/proof-verify", async (_req, res): Promise<void> => {
  res.status(503).json({
    error: "Proof generation/verification is external. Submit a signed receipt from the configured Ed25519 proof verifier.",
  });
});

// ─── Submit proof ──────────────────────────────────────────────────────────

router.post("/recovery/:requestId/submit-proof", async (req, res): Promise<void> => {
  const params = SubmitProofParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const body = SubmitProofBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const { requestId } = params.data;
  const { proofReceipt } = body.data;
  const [row] = await db.select().from(recoveryRequestsTable)
    .where(eq(recoveryRequestsTable.requestId, requestId));
  if (!row) { res.status(404).json({ error: "Recovery request not found" }); return; }
  if (proofReceipt.newKeyCommit !== row.newKeyCommit) {
    res.status(401).json({ error: "Proof receipt is not bound to this recovery new-key commitment." }); return;
  }
  if (row.status !== "INITIATED") {
    res.status(409).json({ error: `Cannot submit proof in status ${row.status}` }); return;
  }

  let valid = false;
  try {
    valid = verifyProofVerifierReceipt(proofReceipt, requestId);
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "Proof verifier unavailable." });
    return;
  }
  if (!valid) { res.status(401).json({ error: "Invalid, expired, or untrusted proof-verifier receipt." }); return; }

  const [existingProof] = await db.select().from(recoveryRequestsTable)
    .where(eq(recoveryRequestsTable.proofHash, proofReceipt.proofHash));
  if (existingProof) { res.status(409).json({ error: "Proof hash already used; replay rejected." }); return; }

  const timelockExpiresAt = new Date(Date.now() + row.requestedTimelock * 1000);
  const [updated] = await db.update(recoveryRequestsTable).set({
    status: "PROOF_SUBMITTED",
    proofHash: proofReceipt.proofHash,
    proofReceiptJson: JSON.stringify(proofReceipt),
    timelockExpiresAt,
  }).where(and(
    eq(recoveryRequestsTable.requestId, requestId),
    eq(recoveryRequestsTable.status, "INITIATED"),
  )).returning();
  if (!updated) { res.status(409).json({ error: "Recovery state changed; reload and retry." }); return; }

  await appendEvent("ProofSubmitted", requestId, {
    proofHash: proofReceipt.proofHash,
    publicInputsHash: proofReceipt.publicInputsHash,
    verifier: "ed25519-external",
  });
  const approvals = await getApprovals(requestId);
  res.json(formatRequest(updated, approvals));
});

// ─── Guardian approve ──────────────────────────────────────────────────────

router.get("/recovery/:requestId/guardian-challenge/:guardianId", async (req, res): Promise<void> => {
  const params = GetRecoveryRequestParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const guardianId = req.params.guardianId;
  const [row] = await db.select().from(recoveryRequestsTable)
    .where(eq(recoveryRequestsTable.requestId, params.data.requestId));
  if (!row) { res.status(404).json({ error: "Recovery request not found" }); return; }
  if (row.status !== "PROOF_SUBMITTED" || !row.proofHash || !row.proofReceiptJson || !row.timelockExpiresAt || !row.metadata) {
    res.status(409).json({ error: "Recovery is not ready for guardian approval." }); return;
  }
  try {
    const policy = loadRecoveryPolicy();
    const registry = loadGuardianRegistry();
    if (row.quorum !== policy.quorum) throw new Error("Stored recovery quorum differs from active policy.");
    const metadataObject = JSON.parse(row.metadata) as Record<string, unknown>;
    if (metadataObject.policyVersion !== policy.version) throw new Error("Stored policy version differs from active policy.");
    if (!registry.has(guardianId)) { res.status(403).json({ error: "Guardian is not trusted." }); return; }
    const intent = validateChainSigningIntent(metadataObject.chainIntent, row.requestId);
    const message = buildGuardianApprovalMessage({
      policyVersion: policy.version, requestId: row.requestId, guardianId,
      newKeyCommit: row.newKeyCommit, policyCommit: row.policyCommit,
      requestedTimelock: row.requestedTimelock, proofHash: row.proofHash,
      publicInputsHash: (JSON.parse(row.proofReceiptJson) as { publicInputsHash: string }).publicInputsHash,
      timelockExpiresAt: row.timelockExpiresAt.toISOString(),
      chainIntentHash: hashChainSigningIntent(intent),
    });
    res.json({
      message,
      signingDomain: "URUU-GUARDIAN-APPROVAL",
      signingBytesHex: guardianApprovalBytes(message).toString("hex"),
      signatureEncoding: "lowercase-hex-ed25519-64-byte",
    });
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "Guardian challenge unavailable." });
  }
});

router.post("/recovery/:requestId/guardian-approve", async (req, res): Promise<void> => {
  const params = GuardianApproveParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const body = GuardianApproveBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const { requestId } = params.data;
  const { guardianId, signature } = body.data;
  try {
    const policy = loadRecoveryPolicy();
    const registry = loadGuardianRegistry();
    if (!registry.has(guardianId)) {
      res.status(403).json({ error: "Guardian is not in the configured trusted registry." }); return;
    }

    // Lock the request row while checking state, verifying and recording the
    // approval. This prevents quorum races and approvals after the state closes.
    const updated = await db.transaction(async (tx) => {
      const [row] = await tx.select().from(recoveryRequestsTable)
        .where(eq(recoveryRequestsTable.requestId, requestId)).for("update");
      if (!row) throw new Error("NOT_FOUND: Recovery request not found.");
      if (row.status !== "PROOF_SUBMITTED") throw new Error(`CONFLICT: Cannot approve in status ${row.status}.`);
      if (!row.proofHash || !row.proofReceiptJson || !row.timelockExpiresAt || !row.metadata) throw new Error("CONFLICT: Proof, timelock, or chain intent commitment is missing.");
      if (row.quorum !== policy.quorum) throw new Error("CONFLICT: Stored quorum differs from active policy.");
      const metadataObject = JSON.parse(row.metadata) as Record<string, unknown>;
      if (metadataObject.policyVersion !== policy.version) throw new Error("CONFLICT: Stored policy version differs from active policy.");
      const chainIntent = validateChainSigningIntent(metadataObject.chainIntent, requestId);
      const intentHash = hashChainSigningIntent(chainIntent);
      const message = buildGuardianApprovalMessage({
        policyVersion: policy.version, requestId, guardianId,
        newKeyCommit: row.newKeyCommit, policyCommit: row.policyCommit,
        requestedTimelock: row.requestedTimelock, proofHash: row.proofHash,
        publicInputsHash: (JSON.parse(row.proofReceiptJson) as { publicInputsHash: string }).publicInputsHash,
        timelockExpiresAt: row.timelockExpiresAt.toISOString(),
        chainIntentHash: intentHash,
      });
      if (!verifyGuardianApproval(guardianId, signature, message, registry)) {
        throw new Error("UNAUTHORIZED: Guardian Ed25519 approval signature is invalid.");
      }

      const existing = await tx.select().from(guardianApprovalsTable)
        .where(eq(guardianApprovalsTable.requestId, requestId));
      if (existing.some((item) => item.guardianId === guardianId)) {
        throw new Error("CONFLICT: Guardian has already approved this recovery.");
      }
      for (const approval of existing) {
        const existingMessage = buildGuardianApprovalMessage({
          policyVersion: policy.version, requestId, guardianId: approval.guardianId,
          newKeyCommit: row.newKeyCommit, policyCommit: row.policyCommit,
          requestedTimelock: row.requestedTimelock, proofHash: row.proofHash,
          publicInputsHash: (JSON.parse(row.proofReceiptJson!) as { publicInputsHash: string }).publicInputsHash,
          timelockExpiresAt: row.timelockExpiresAt!.toISOString(),
          chainIntentHash: intentHash,
        });
        if (!verifyGuardianApproval(approval.guardianId, approval.signature, existingMessage, registry)) {
          throw new Error("CONFLICT: Stored guardian approval failed re-verification; recovery frozen.");
        }
      }

      await tx.insert(guardianApprovalsTable).values({
        requestId, guardianId, signature, approvedAt: new Date(),
      });
      const newApprovalCount = row.approvalCount + 1;
      const newStatus = newApprovalCount >= row.quorum ? "APPROVED" : "PROOF_SUBMITTED";
      const [next] = await tx.update(recoveryRequestsTable).set({
        approvalCount: newApprovalCount, status: newStatus,
      }).where(and(
        eq(recoveryRequestsTable.requestId, requestId),
        eq(recoveryRequestsTable.status, "PROOF_SUBMITTED"),
      )).returning();
      if (!next) throw new Error("CONFLICT: Recovery state changed while recording approval.");

      await tx.insert(eventsTable).values({
        eventId: generateEventId(), eventType: "GuardianApproved", requestId,
        dataJson: JSON.stringify({
          guardianId, approvalCount: next.approvalCount, quorum: next.quorum,
          policyVersion: policy.version, chainIntentHash: intentHash,
        }),
      });
      return next;
    });

    const approvals = await getApprovals(requestId);
    res.json(formatRequest(updated, approvals));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Guardian policy unavailable.";
    const status = message.startsWith("NOT_FOUND:") ? 404 :
      message.startsWith("UNAUTHORIZED:") ? 401 :
      message.startsWith("CONFLICT:") ? 409 : 503;
    res.status(status).json({ error: message.replace(/^(NOT_FOUND|UNAUTHORIZED|CONFLICT): /, "") });
  }
});

// Independent FROST operators fetch this certificate and verify it locally.
// This endpoint does not contact signers, create signature shares, or broadcast.
router.get("/recovery/:requestId/signing-intent", async (req, res): Promise<void> => {
  if (!requireFrostOperator(req, res)) return;
  const params = GetRecoveryRequestParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const { requestId } = params.data;
  const [row] = await db.select().from(recoveryRequestsTable)
    .where(eq(recoveryRequestsTable.requestId, requestId));
  if (!row) { res.status(404).json({ error: "Recovery request not found" }); return; }

  try {
    const eligibility = evaluateRecoveryPolicy({
      status: row.status, approvalCount: row.approvalCount, quorum: row.quorum,
      timelockExpiresAt: row.timelockExpiresAt, contestHash: row.contestHash,
      proofHash: row.proofHash,
    });
    if (!eligibility.eligible) {
      res.status(409).json({ error: eligibility.reason }); return;
    }
    const policy = loadRecoveryPolicy();
    const registry = loadGuardianRegistry();
    if (row.quorum !== policy.quorum) throw new Error("Stored recovery quorum differs from active policy.");
    const metadataObject = JSON.parse(row.metadata ?? "{}") as Record<string, unknown>;
    if (metadataObject.policyVersion !== policy.version) throw new Error("Stored policy version differs from active policy.");
    const chainIntent = validateChainSigningIntent(metadataObject.chainIntent, requestId);
    const message = buildGuardianApprovalMessage({
      policyVersion: policy.version, requestId, guardianId: "",
      newKeyCommit: row.newKeyCommit, policyCommit: row.policyCommit,
      requestedTimelock: row.requestedTimelock, proofHash: row.proofHash!,
      publicInputsHash: (JSON.parse(row.proofReceiptJson ?? "{}") as { publicInputsHash: string }).publicInputsHash,
      timelockExpiresAt: row.timelockExpiresAt!.toISOString(),
      chainIntentHash: hashChainSigningIntent(chainIntent),
    });
    const approvals = await getApprovals(requestId);
    const signatures = approvals.map((approval) => {
      const approvalMessage = { ...message, guardianId: approval.guardianId };
      if (!verifyGuardianApproval(approval.guardianId, approval.signature, approvalMessage, registry)) {
        throw new Error(`Stored approval from ${approval.guardianId} no longer verifies.`);
      }
      return { guardianId: approval.guardianId, signature: approval.signature };
    });
    if (new Set(signatures.map((item) => item.guardianId)).size < policy.quorum) {
      res.status(409).json({ error: "Independently verified guardian quorum is not met." }); return;
    }
    res.json({
      schema: "uruu.frostgate-authorization.v1",
      policy: { version: policy.version, quorum: policy.quorum, guardianCount: registry.size },
      chainIntent,
      chainIntentHash: hashChainSigningIntent(chainIntent),
      sighashHex: chainIntent.sighashHex,
      approvalMessageSchema: message.schema,
      approvalMessage: {
        schema: message.schema, policyVersion: message.policyVersion, requestId,
        newKeyCommit: message.newKeyCommit, policyCommit: message.policyCommit,
        requestedTimelock: message.requestedTimelock, proofHash: message.proofHash,
        chainIntentHash: message.chainIntentHash,
      },
      guardianSignatures: signatures,
      expiresAt: chainIntent.expiresAt,
      status: "READY_FOR_INDEPENDENT_OPERATOR_VERIFICATION",
    });
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "Signing authorization unavailable." });
  }
});

// Operators re-check this endpoint immediately before emitting each share.
// Production deployment must protect it with mutual TLS/operator authentication.
router.get("/recovery/:requestId/operator-status", async (req, res): Promise<void> => {
  if (!requireFrostOperator(req, res)) return;
  const params = GetRecoveryRequestParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db.select().from(recoveryRequestsTable)
    .where(eq(recoveryRequestsTable.requestId, params.data.requestId));
  if (!row) { res.status(404).json({ error: "Recovery request not found" }); return; }
  let chainIntentHash: string | null = null;
  let expiresAt: number | null = null;
  try {
    const metadataObject = JSON.parse(row.metadata ?? "{}") as Record<string, unknown>;
    const intent = validateChainSigningIntent(metadataObject.chainIntent, row.requestId);
    chainIntentHash = hashChainSigningIntent(intent);
    expiresAt = intent.expiresAt;
  } catch { /* Invalid or absent intent is a revoked authorization. */ }
  let activePolicyVersion: string | null = null;
  let activeQuorum: number | null = null;
  try {
    const policy = loadRecoveryPolicy();
    activePolicyVersion = policy.version;
    activeQuorum = policy.quorum;
  } catch { /* Missing policy configuration revokes the authorization. */ }
  let storedPolicyVersion: string | null = null;
  try {
    storedPolicyVersion = (JSON.parse(row.metadata ?? "{}") as Record<string, unknown>).policyVersion as string;
  } catch { /* Malformed stored policy revokes the authorization. */ }
  const revoked = row.status !== "APPROVED" || Boolean(row.contestHash) ||
    !row.proofHash || row.approvalCount < row.quorum ||
    !row.timelockExpiresAt || row.timelockExpiresAt.getTime() > Date.now() ||
    !expiresAt || expiresAt <= Math.floor(Date.now() / 1000) ||
    !activePolicyVersion || storedPolicyVersion !== activePolicyVersion ||
    activeQuorum !== row.quorum;
  res.json({
    schema: "uruu.frostgate-operator-status.v1",
    requestId: row.requestId,
    chainIntentHash,
    expiresAt,
    status: row.status,
    approvalCount: row.approvalCount,
    quorum: row.quorum,
    policyVersion: activePolicyVersion,
    checkedAt: Math.floor(Date.now() / 1000),
    revoked,
  });
});

// ─── Contest ───────────────────────────────────────────────────────────────

router.post("/recovery/:requestId/contest", async (req, res): Promise<void> => {
  const params = ContestRecoveryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = ContestRecoveryBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { requestId } = params.data;
  const { contestHash } = body.data;

  const [row] = await db
    .select()
    .from(recoveryRequestsTable)
    .where(eq(recoveryRequestsTable.requestId, requestId));

  if (!row) {
    res.status(404).json({ error: "Recovery request not found" });
    return;
  }

  if (row.status === "FINALIZED" || row.status === "INITIATED") {
    res.status(400).json({ error: `Cannot contest in status ${row.status}` });
    return;
  }

  const [updated] = await db
    .update(recoveryRequestsTable)
    .set({ status: "CONTESTED", contestHash })
    .where(eq(recoveryRequestsTable.requestId, requestId))
    .returning();

  await appendEvent("RecoveryContested", requestId, { contestHash });

  const approvals = await getApprovals(requestId);
  res.json(formatRequest(updated!, approvals));
});

// ─── Finalize ──────────────────────────────────────────────────────────────

router.post("/recovery/:requestId/finalize", async (_req, res): Promise<void> => {
  res.status(409).json({
    error: "Finalization is disabled. Guardian approval only creates an authorization certificate; independent FROST operators and EXCAL-native transaction confirmation are required before FINALIZED.",
  });
});

// ─── Events ────────────────────────────────────────────────────────────────

router.get("/events", async (req, res): Promise<void> => {
  const query = ListEventsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { limit = 50, offset = 0, requestId, eventType } = query.data;

  const conditions = [];
  if (requestId) conditions.push(eq(eventsTable.requestId, requestId));
  if (eventType) conditions.push(eq(eventsTable.eventType, eventType));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(eventsTable)
      .where(whereClause)
      .orderBy(desc(eventsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(eventsTable).where(whereClause),
  ]);

  const total = Number(totalRows[0]?.count ?? 0);
  const items = rows.map((r) => ({
    id: r.eventId,
    eventType: r.eventType,
    requestId: r.requestId,
    timestamp: r.createdAt.toISOString(),
    dataJson: r.dataJson,
  }));

  res.json({ items, total });
});

// ─── Dashboard stats ───────────────────────────────────────────────────────

router.get("/stats", async (_req, res): Promise<void> => {
  const [totalRows, byStatusRows, totalEventRows, avgTimeRows, recentEventRows] = await Promise.all([
    db.select({ count: count() }).from(recoveryRequestsTable),
    db
      .select({ status: recoveryRequestsTable.status, count: count() })
      .from(recoveryRequestsTable)
      .groupBy(recoveryRequestsTable.status),
    db.select({ count: count() }).from(eventsTable),
    db
      .select({
        avg: avg(
          sql<number>`EXTRACT(EPOCH FROM (${recoveryRequestsTable.finalizedAt} - ${recoveryRequestsTable.createdAt}))`
        ),
      })
      .from(recoveryRequestsTable)
      .where(eq(recoveryRequestsTable.status, "FINALIZED")),
    db
      .select()
      .from(eventsTable)
      .orderBy(desc(eventsTable.createdAt))
      .limit(10),
  ]);

  const totalRequests = Number(totalRows[0]?.count ?? 0);
  const totalEvents = Number(totalEventRows[0]?.count ?? 0);
  const byStatus = byStatusRows.map((r) => ({ status: r.status, count: Number(r.count) }));

  const finalizedCount = byStatus.find((s) => s.status === "FINALIZED")?.count ?? 0;
  const approvalRate = totalRequests > 0 ? finalizedCount / totalRequests : 0;
  const avgApprovalTime = avgTimeRows[0]?.avg ? Number(avgTimeRows[0].avg) : null;

  const recentActivity = recentEventRows.map((r) => ({
    id: r.eventId,
    eventType: r.eventType,
    requestId: r.requestId,
    timestamp: r.createdAt.toISOString(),
    dataJson: r.dataJson,
  }));

  res.json({ totalRequests, byStatus, totalEvents, approvalRate, avgApprovalTime, recentActivity });
});

// ─── Guardian pending ──────────────────────────────────────────────────────

router.get("/guardian/pending", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(recoveryRequestsTable)
    .where(eq(recoveryRequestsTable.status, "PROOF_SUBMITTED"))
    .orderBy(desc(recoveryRequestsTable.createdAt));

  const items = await Promise.all(
    rows.map(async (row) => {
      const approvals = await getApprovals(row.requestId);
      return formatRequest(row, approvals);
    })
  );

  res.json({ items, total: items.length });
});

export default router;

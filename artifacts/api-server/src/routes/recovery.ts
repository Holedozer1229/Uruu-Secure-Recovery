import { Router, type IRouter } from "express";
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
  FinalizeRecoveryParams,
  VerifyProofParams,
  VerifyProofBody,
  ListRecoveryRequestsQueryParams,
  ListEventsQueryParams,
} from "@workspace/api-zod";
import {
  sha256,
  mockVerifierSign,
  mockVerifierVerify,
  mockVerify,
  generateSyntheticProof,
  generateRequestId,
  generateEventId,
  computeTranscriptHash,
  serializePublicInputs,
} from "../lib/crypto.js";

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

  const { newKeyCommit, policyCommit, requestedTimelock, metadata } = parsed.data;
  const requestId = generateRequestId(newKeyCommit, policyCommit);

  const [row] = await db
    .insert(recoveryRequestsTable)
    .values({
      requestId,
      status: "INITIATED",
      newKeyCommit,
      policyCommit,
      requestedTimelock,
      approvalCount: 0,
      quorum: 2,
      metadata: metadata ?? null,
    })
    .returning();

  await appendEvent("RecoveryInitiated", requestId, {
    requestId,
    newKeyCommit,
    policyCommit,
    requestedTimelock,
  });

  const approvals = await getApprovals(requestId);
  res.status(201).json(formatRequest(row!, approvals));
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

// ─── Mock ZK proof verifier ────────────────────────────────────────────────

router.post("/recovery/:requestId/proof-verify", async (req, res): Promise<void> => {
  const params = VerifyProofParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = VerifyProofBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { proofBlob, publicInputs } = body.data;
  const ts = Date.now();

  const publicInputsHash = computeTranscriptHash({
    accountId: publicInputs.accountId,
    requestId: publicInputs.requestId,
    newKeyCommit: publicInputs.newKeyCommit,
    policyCommit: publicInputs.policyCommit,
    proofNonce: publicInputs.proofNonce,
    timestamp: ts,
  });

  const proofHash = sha256(Buffer.from(proofBlob, "base64"));

  const isValid = mockVerify(proofBlob, publicInputsHash);
  if (!isValid) {
    res.status(400).json({ error: "Proof verification failed (invalid proofBlob)" });
    return;
  }

  // Canonical sign input: proofHash || publicInputsHash || requestId || timestamp
  const signInput = `${proofHash}:${publicInputsHash}:${params.data.requestId}:${ts}`;
  const verifierSig = mockVerifierSign(signInput);

  const receipt = {
    proofHash,
    publicInputsHash,
    verifierSig,
    timestamp: new Date(ts).toISOString(),
    requestId: params.data.requestId,
    accountId: publicInputs.accountId,
    newKeyCommit: publicInputs.newKeyCommit,
  };

  res.json(receipt);
});

// ─── Submit proof ──────────────────────────────────────────────────────────

router.post("/recovery/:requestId/submit-proof", async (req, res): Promise<void> => {
  const params = SubmitProofParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = SubmitProofBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { requestId } = params.data;
  const { proofReceipt } = body.data;

  const [row] = await db
    .select()
    .from(recoveryRequestsTable)
    .where(eq(recoveryRequestsTable.requestId, requestId));

  if (!row) {
    res.status(404).json({ error: "Recovery request not found" });
    return;
  }

  if (row.status !== "INITIATED") {
    res.status(400).json({ error: `Cannot submit proof in status ${row.status}` });
    return;
  }

  // Verify the verifier signature
  const { proofHash, publicInputsHash, verifierSig, timestamp } = proofReceipt;
  const tsMs = new Date(timestamp).getTime();
  const signInput = `${proofHash}:${publicInputsHash}:${requestId}:${tsMs}`;
  const isValid = mockVerifierVerify(signInput, verifierSig);

  if (!isValid) {
    res.status(400).json({ error: "Invalid verifier signature on ProofReceipt" });
    return;
  }

  // Check proof hash not reused
  const [existingProof] = await db
    .select()
    .from(recoveryRequestsTable)
    .where(eq(recoveryRequestsTable.proofHash, proofHash));

  if (existingProof) {
    res.status(409).json({ error: "Proof hash already used — replay attack rejected" });
    return;
  }

  // Compute timelock expiry
  const timelockExpiresAt = new Date(Date.now() + row.requestedTimelock * 1000);

  const [updated] = await db
    .update(recoveryRequestsTable)
    .set({
      status: "PROOF_SUBMITTED",
      proofHash,
      proofReceiptJson: JSON.stringify(proofReceipt),
      timelockExpiresAt,
    })
    .where(eq(recoveryRequestsTable.requestId, requestId))
    .returning();

  await appendEvent("ProofSubmitted", requestId, { proofHash, publicInputsHash });

  const approvals = await getApprovals(requestId);
  res.json(formatRequest(updated!, approvals));
});

// ─── Guardian approve ──────────────────────────────────────────────────────

router.post("/recovery/:requestId/guardian-approve", async (req, res): Promise<void> => {
  const params = GuardianApproveParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = GuardianApproveBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { requestId } = params.data;
  const { guardianId, signature } = body.data;

  const [row] = await db
    .select()
    .from(recoveryRequestsTable)
    .where(eq(recoveryRequestsTable.requestId, requestId));

  if (!row) {
    res.status(404).json({ error: "Recovery request not found" });
    return;
  }

  if (!["PROOF_SUBMITTED", "APPROVED"].includes(row.status)) {
    res.status(400).json({ error: `Cannot approve in status ${row.status}` });
    return;
  }

  // Check guardian hasn't already approved
  const existingApprovals = await getApprovals(requestId);
  const alreadyApproved = existingApprovals.some((a) => a.guardianId === guardianId);
  if (alreadyApproved) {
    res.status(400).json({ error: `Guardian ${guardianId} has already approved` });
    return;
  }

  await db.insert(guardianApprovalsTable).values({
    requestId,
    guardianId,
    signature,
    approvedAt: new Date(),
  });

  const newApprovalCount = row.approvalCount + 1;
  const newStatus = newApprovalCount >= row.quorum ? "APPROVED" : row.status;

  const [updated] = await db
    .update(recoveryRequestsTable)
    .set({ approvalCount: newApprovalCount, status: newStatus })
    .where(eq(recoveryRequestsTable.requestId, requestId))
    .returning();

  await appendEvent("GuardianApproved", requestId, {
    guardianId,
    approvalCount: newApprovalCount,
    quorum: row.quorum,
    newStatus,
  });

  const approvals = await getApprovals(requestId);
  res.json(formatRequest(updated!, approvals));
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

router.post("/recovery/:requestId/finalize", async (req, res): Promise<void> => {
  const params = FinalizeRecoveryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { requestId } = params.data;

  const [row] = await db
    .select()
    .from(recoveryRequestsTable)
    .where(eq(recoveryRequestsTable.requestId, requestId));

  if (!row) {
    res.status(404).json({ error: "Recovery request not found" });
    return;
  }

  if (row.status !== "APPROVED") {
    res.status(400).json({ error: `Recovery must be APPROVED before finalizing (current: ${row.status})` });
    return;
  }

  if (row.approvalCount < row.quorum) {
    res.status(400).json({ error: `Quorum not met: ${row.approvalCount}/${row.quorum} approvals` });
    return;
  }

  if (row.timelockExpiresAt && new Date() < row.timelockExpiresAt) {
    const remaining = Math.ceil((row.timelockExpiresAt.getTime() - Date.now()) / 1000);
    res.status(400).json({ error: `Timelock not elapsed — ${remaining}s remaining` });
    return;
  }

  const [updated] = await db
    .update(recoveryRequestsTable)
    .set({ status: "FINALIZED", finalizedAt: new Date() })
    .where(eq(recoveryRequestsTable.requestId, requestId))
    .returning();

  await appendEvent("RecoveryFinalized", requestId, {
    newKeyCommit: row.newKeyCommit,
    finalizedAt: updated!.finalizedAt!.toISOString(),
  });

  const approvals = await getApprovals(requestId);
  res.json(formatRequest(updated!, approvals));
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

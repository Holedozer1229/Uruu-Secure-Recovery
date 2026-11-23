import { createHash, createPublicKey, verify as verifySignature } from "node:crypto";

export const GUARDIAN_APPROVAL_SCHEMA = "uruu.guardian-approval.v1" as const;
export const SIGNING_INTENT_SCHEMA = "uruu.frostgate-signing-intent.v1" as const;
const HEX_32 = /^[0-9a-f]{64}$/;
const HEX_SIGNATURE = /^[0-9a-f]{128}$/;

export interface RecoveryPolicy {
  version: string;
  quorum: number;
  minimumTimelockSeconds: number;
  maximumTimelockSeconds: number;
}

export interface ChainInput {
  txid: string;
  vout: number;
  amountSats: string;
}

export interface ChainSigningIntent {
  schema: typeof SIGNING_INTENT_SCHEMA;
  chainId: string;
  networkMagic: string;
  genesisHash: string;
  operation: "RECOVERY";
  requestId: string;
  inputs: ChainInput[];
  destinationScriptHex: string;
  amountSats: string;
  feeSats: string;
  expiresAt: number;
  /** Exact 32-byte chain-native sighash, computed by the EXCAL transaction builder. */
  sighashHex: string;
}

export interface GuardianApprovalMessage {
  schema: typeof GUARDIAN_APPROVAL_SCHEMA;
  policyVersion: string;
  requestId: string;
  guardianId: string;
  newKeyCommit: string;
  policyCommit: string;
  requestedTimelock: number;
  proofHash: string;
  chainIntentHash: string;
}

function parseJsonEnv<T>(name: string): T {
  const raw = process.env[name];
  if (!raw) throw new Error(`${name} is required; recovery is fail-closed.`);
  try { return JSON.parse(raw) as T; }
  catch { throw new Error(`${name} must contain valid JSON.`); }
}

export function loadRecoveryPolicy(): RecoveryPolicy {
  const policy = parseJsonEnv<RecoveryPolicy>("URUU_RECOVERY_POLICY_JSON");
  if (!policy.version || !Number.isSafeInteger(policy.quorum) || policy.quorum < 2 ||
      !Number.isSafeInteger(policy.minimumTimelockSeconds) || policy.minimumTimelockSeconds < 1 ||
      !Number.isSafeInteger(policy.maximumTimelockSeconds) ||
      policy.maximumTimelockSeconds < policy.minimumTimelockSeconds) {
    throw new Error("Invalid URUU recovery policy configuration.");
  }
  return policy;
}

export function loadGuardianRegistry(): Map<string, ReturnType<typeof createPublicKey>> {
  const configured = parseJsonEnv<Record<string, string>>("URUU_GUARDIAN_PUBLIC_KEYS_JSON");
  const entries = Object.entries(configured);
  const policy = loadRecoveryPolicy();
  if (entries.length < policy.quorum) throw new Error("Guardian registry is smaller than the configured quorum.");
  const registry = new Map<string, ReturnType<typeof createPublicKey>>();
  for (const [guardianId, pem] of entries) {
    if (!guardianId.trim() || typeof pem !== "string" || !pem.includes("BEGIN PUBLIC KEY")) {
      throw new Error("Guardian registry entries must map IDs to PEM public keys.");
    }
    const key = createPublicKey(pem);
    if (key.asymmetricKeyType !== "ed25519") throw new Error(`Guardian ${guardianId} key must be Ed25519.`);
    registry.set(guardianId, key);
  }
  return registry;
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalJson(object[key])}`,
  ).join(",")}}`;
}

export function sha256Hex(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

export function validateChainSigningIntent(value: unknown, requestId: string, nowSeconds = Math.floor(Date.now() / 1000)): ChainSigningIntent {
  if (!value || typeof value !== "object") throw new Error("A chain-native signing intent is required.");
  const intent = value as Partial<ChainSigningIntent>;
  if (intent.schema !== SIGNING_INTENT_SCHEMA || intent.operation !== "RECOVERY" ||
      intent.requestId !== requestId || typeof intent.chainId !== "string" || !intent.chainId ||
      typeof intent.networkMagic !== "string" || !intent.networkMagic ||
      typeof intent.genesisHash !== "string" || !HEX_32.test(intent.genesisHash) ||
      typeof intent.destinationScriptHex !== "string" || !/^(?:[0-9a-f]{2})+$/i.test(intent.destinationScriptHex) ||
      typeof intent.amountSats !== "string" || !/^[1-9][0-9]*$/.test(intent.amountSats) ||
      typeof intent.feeSats !== "string" || !/^(0|[1-9][0-9]*)$/.test(intent.feeSats) ||
      !Number.isSafeInteger(intent.expiresAt) || (intent.expiresAt as number) <= nowSeconds ||
      typeof intent.sighashHex !== "string" || !HEX_32.test(intent.sighashHex) ||
      !Array.isArray(intent.inputs) || intent.inputs.length === 0) {
    throw new Error("Malformed or expired chain-native signing intent.");
  }
  for (const input of intent.inputs) {
    if (!HEX_32.test(input.txid) || !Number.isSafeInteger(input.vout) || input.vout < 0 ||
        !/^(0|[1-9][0-9]*)$/.test(input.amountSats)) {
      throw new Error("Malformed transaction input in signing intent.");
    }
  }
  const amount = BigInt(intent.amountSats);
  const fee = BigInt(intent.feeSats);
  const total = intent.inputs.reduce((sum, input) => sum + BigInt(input.amountSats), 0n);
  if (amount + fee > total) throw new Error("Signing intent spends more than its committed inputs.");
  return intent as ChainSigningIntent;
}

export function hashChainSigningIntent(intent: ChainSigningIntent): string {
  return sha256Hex(canonicalJson(intent));
}

export function guardianApprovalBytes(message: GuardianApprovalMessage): Buffer {
  return Buffer.from(`URUU-GUARDIAN-APPROVAL\0${canonicalJson(message)}`, "utf8");
}

export function verifyGuardianApproval(
  guardianId: string,
  signatureHex: string,
  message: GuardianApprovalMessage,
  registry = loadGuardianRegistry(),
): boolean {
  const key = registry.get(guardianId);
  if (!key || !HEX_SIGNATURE.test(signatureHex)) return false;
  try {
    return verifySignature(null, guardianApprovalBytes(message), key, Buffer.from(signatureHex, "hex"));
  } catch {
    return false;
  }
}

export function evaluateRecoveryPolicy(input: {
  status: string;
  approvalCount: number;
  quorum: number;
  timelockExpiresAt: Date | null;
  contestHash: string | null;
  proofHash: string | null;
  now?: Date;
}): { eligible: boolean; reason: string } {
  if (input.status === "CONTESTED" || input.contestHash) return { eligible: false, reason: "recovery is contested" };
  if (input.status !== "APPROVED") return { eligible: false, reason: "guardian quorum has not approved this recovery" };
  if (input.approvalCount < input.quorum) return { eligible: false, reason: "guardian quorum is not met" };
  if (!input.proofHash || !HEX_32.test(input.proofHash)) return { eligible: false, reason: "proof verifier receipt is missing or invalid" };
  if (!input.timelockExpiresAt) return { eligible: false, reason: "timelock expiry is missing" };
  if ((input.now ?? new Date()) < input.timelockExpiresAt) return { eligible: false, reason: "timelock has not elapsed" };
  return { eligible: true, reason: "policy checks passed; chain-native intent still requires operator verification" };
}

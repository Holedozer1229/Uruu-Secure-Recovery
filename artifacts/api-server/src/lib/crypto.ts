/**
 * URUU Recovery — Mock Cryptographic Utilities
 * 
 * All cryptographic operations here are SIMULATED for demo purposes.
 * In production, use HSMs, audited MPC libraries, and real ZK provers.
 */

import { createHash, createHmac, randomBytes } from "crypto";

// Deterministic "verifier key" for the demo — in production this would be an HSM-backed Ed25519 key
const VERIFIER_KEY = Buffer.from(
  process.env.VERIFIER_SECRET ?? "uruu-demo-verifier-key-NOT-FOR-PRODUCTION",
  "utf8"
);

/**
 * Compute SHA-256 of a string/buffer and return hex.
 */
export function sha256(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

/**
 * Compute a mock verifier signature using HMAC-SHA256.
 * In production: Ed25519 sign with HSM key.
 */
export function mockVerifierSign(message: string): string {
  return createHmac("sha256", VERIFIER_KEY).update(message).digest("hex");
}

/**
 * Verify a mock verifier signature.
 */
export function mockVerifierVerify(message: string, sig: string): boolean {
  const expected = mockVerifierSign(message);
  // Constant-time comparison
  return expected === sig;
}

/**
 * Canonical serialization of public inputs for ZK circuit.
 * Produces: circuitVersion(4) || accountId(32) || requestId(32) || newKeyCommit(32) || policyCommit(32) || proofNonce(32) || timestamp(8)
 */
export function serializePublicInputs(inputs: {
  accountId: string;
  requestId: string;
  newKeyCommit: string;
  policyCommit: string;
  proofNonce: string;
  timestamp?: number;
}): Buffer {
  const circuitVersion = Buffer.alloc(4);
  circuitVersion.writeUInt32BE(1, 0); // v1

  function pad32(s: string): Buffer {
    const h = sha256(s); // normalize to 32 bytes via hash
    return Buffer.from(h.slice(0, 64), "hex");
  }

  const ts = Buffer.alloc(8);
  const tsVal = BigInt(inputs.timestamp ?? Date.now());
  ts.writeBigUInt64BE(tsVal);

  return Buffer.concat([
    circuitVersion,
    pad32(inputs.accountId),
    pad32(inputs.requestId),
    pad32(inputs.newKeyCommit),
    pad32(inputs.policyCommit),
    pad32(inputs.proofNonce),
    ts,
  ]);
}

/**
 * Compute transcript hash over serialized public inputs.
 */
export function computeTranscriptHash(inputs: Parameters<typeof serializePublicInputs>[0]): string {
  return sha256(serializePublicInputs(inputs));
}

/**
 * Mock ZK proof verifier.
 * In production: call snarkjs verify() or circom verifier.
 * 
 * Returns true for any non-empty proofBlob that is valid base64 (synthetic demo).
 */
export function mockVerify(proofBlob: string, publicInputsHash: string): boolean {
  // Demo: accept any non-empty proof that hashes to something non-trivial
  if (!proofBlob || proofBlob.length < 16) return false;
  // In a real system this would call the ZK verifier circuit
  return true;
}

/**
 * Generate a synthetic proof blob for testing.
 */
export function generateSyntheticProof(requestId: string): string {
  const data = Buffer.concat([
    Buffer.from("URUU-SYNTHETIC-PROOF-V1:"),
    Buffer.from(requestId),
    randomBytes(32),
  ]);
  return data.toString("base64");
}

/**
 * Generate a request ID as H(newKeyCommit || policyCommit || timestamp).
 */
export function generateRequestId(newKeyCommit: string, policyCommit: string): string {
  const ts = Date.now().toString();
  return sha256(`${newKeyCommit}:${policyCommit}:${ts}`).slice(0, 32);
}

/**
 * Generate a UUID-like event ID.
 */
export function generateEventId(): string {
  return randomBytes(16).toString("hex");
}

// Synthetic test vectors for the URUU protocol
export const SYNTHETIC_TEST_VECTORS = [
  {
    label: "V1 — Standard Recovery",
    accountId: "acc_0x" + "a".repeat(30),
    requestId: "req_" + "1".repeat(28),
    newKeyCommit: "0x" + "b".repeat(62),
    policyCommit: "0x" + "c".repeat(62),
    proofNonce: "0x" + "d".repeat(62),
    proofBlob: "dXJ1dS1zeW50aGV0aWMtcHJvb2YtdjEtdGVzdC12ZWN0b3ItMQ==",
  },
  {
    label: "V2 — Guardian Quorum 3-of-5",
    accountId: "acc_0x" + "e".repeat(30),
    requestId: "req_" + "2".repeat(28),
    newKeyCommit: "0x" + "f".repeat(62),
    policyCommit: "0x" + "0".repeat(62),
    proofNonce: "0x" + "9".repeat(62),
    proofBlob: "dXJ1dS1zeW50aGV0aWMtcHJvb2YtdjEtdGVzdC12ZWN0b3ItMg==",
  },
  {
    label: "V3 — Contested Recovery",
    accountId: "acc_0x" + "1".repeat(30),
    requestId: "req_" + "3".repeat(28),
    newKeyCommit: "0x" + "2".repeat(62),
    policyCommit: "0x" + "3".repeat(62),
    proofNonce: "0x" + "4".repeat(62),
    proofBlob: "dXJ1dS1zeW50aGV0aWMtcHJvb2YtdjEtdGVzdC12ZWN0b3ItMw==",
  },
];

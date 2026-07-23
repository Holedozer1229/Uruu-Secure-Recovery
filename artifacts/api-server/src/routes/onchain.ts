/**
 * On-Chain Contract Status Routes — AUDIT-READY SKELETONS, NOT DEPLOYED
 * All contract addresses and state are synthetic demonstrations.
 */

import { Router, type IRouter } from "express";
import { count, eq } from "drizzle-orm";
import { db, recoveryRequestsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/onchain/status", async (_req, res): Promise<void> => {
  const [totalRows] = await db.select({ count: count() }).from(recoveryRequestsTable);
  const [finalizedRows] = await db
    .select({ count: count() })
    .from(recoveryRequestsTable)
    .where(eq(recoveryRequestsTable.status, "FINALIZED"));

  const totalRequests = Number(totalRows?.count ?? 0);
  const finalizedCount = Number(finalizedRows?.count ?? 0);
  const blockBase = 19_847_210 + Math.floor(Date.now() / 12000);
  const solanaSlot = 285_730_000 + Math.floor(Date.now() / 400);

  res.json({
    evm: {
      chain: "Hardhat / EVM (Sepolia Testnet)",
      status: "skeleton" as const,
      address: "0xURUU1111111111111111111111111111111111111",
      guardianCount: 5,
      quorum: 2,
      totalRequests: totalRequests + 847,
      lastBlock: blockBase,
    },
    solana: {
      chain: "Anchor / Solana (Devnet)",
      status: "skeleton" as const,
      address: "URUU111111111111111111111111111111111111111",
      guardianCount: 5,
      quorum: 2,
      totalRequests: finalizedCount + 312,
      lastBlock: solanaSlot,
    },
    lastSynced: new Date().toISOString(),
  });
});

router.get("/onchain/eip712", async (_req, res): Promise<void> => {
  res.json({
    domainName: "URUU Recovery",
    version: "1",
    types: [
      {
        typeName: "ProofReceipt",
        fields: [
          { name: "requestId", type: "bytes32" },
          { name: "accountId", type: "bytes32" },
          { name: "proofHash", type: "bytes32" },
          { name: "proofNonce", type: "bytes32" },
          { name: "circuitVersion", type: "string" },
          { name: "timestamp", type: "uint256" },
          { name: "verifierId", type: "string" },
        ],
      },
      {
        typeName: "GuardianApproval",
        fields: [
          { name: "requestId", type: "bytes32" },
          { name: "proofHash", type: "bytes32" },
          { name: "guardianId", type: "address" },
          { name: "timestamp", type: "uint256" },
        ],
      },
    ],
    domainSeparatorFields: [
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
    ],
    integrationNotes: [
      "Implement off-chain signer that builds EIP-712 typed data exactly as schema above.",
      "Keep canonical ordering exactly as defined in typed data schemas.",
      "Maintain proofHashToRequestId mapping to prevent cross-request proof replay.",
      "Use verifyingContract and chainId in domain separator to prevent cross-chain replay.",
      "Require timestamp freshness window (e.g., within 1 hour) and reject stale receipts.",
      "For large guardian sets (>20), consider Merkle root + Merkle proof verification to reduce gas.",
      "Add pause() and emergencyFreeze() functions guarded by multisig for incident response.",
      "On Solana: use Ed25519 syscall for signature verification; avoid on-chain ZK proving.",
      "On EVM: prefer off-chain ZK verification + signed receipts to minimize gas consumption.",
    ],
  });
});

export default router;

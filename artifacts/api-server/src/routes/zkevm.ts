/**
 * zkEVM Pipeline Routes — SIMULATION ONLY
 * All data is synthetic and for demonstration purposes.
 */

import { Router, type IRouter } from "express";
import { count, eq } from "drizzle-orm";
import { db, recoveryRequestsTable } from "@workspace/db";

const router: IRouter = Router();

// Deterministic phase simulation based on time
function phaseStatus(seed: number): "idle" | "running" | "complete" | "error" {
  const t = Math.floor(Date.now() / 3000) + seed;
  const cycle = t % 10;
  if (cycle < 1) return "idle";
  if (cycle < 4) return "running";
  if (cycle < 9) return "complete";
  return cycle === 9 ? "running" : "complete";
}

function phaseLatency(seed: number): number {
  const base = [120, 340, 890, 45, 210][seed % 5];
  return base + (Math.floor(Date.now() / 5000) % 30) - 15;
}

router.get("/zkevm/status", async (_req, res): Promise<void> => {
  const [totalRows] = await db.select({ count: count() }).from(recoveryRequestsTable);
  const totalRequests = Number(totalRows?.count ?? 0);

  res.json({
    networkId: "uruu-zkevm-devnet-1",
    chainId: 1337,
    provingBackend: "Groth16 / Halo2 (PLONK)",
    totalProofsGenerated: totalRequests * 3 + 142,
    avgProvingTimeMs: 1847.3,
    queueDepth: Math.floor(Date.now() / 10000) % 8,
    verifierContractAddress: "0xURUU1111111111111111111111111111111111111",
    status: "online" as const,
    uptime: "99.97%",
  });
});

router.get("/zkevm/pipeline", async (_req, res): Promise<void> => {
  const [proofSubmitted] = await db
    .select({ count: count() })
    .from(recoveryRequestsTable)
    .where(eq(recoveryRequestsTable.status, "PROOF_SUBMITTED"));

  const queuedProofs = Number(proofSubmitted?.count ?? 0);
  const blockBase = 19_847_210 + Math.floor(Date.now() / 12000);

  res.json({
    phases: [
      {
        name: "Witness Generation",
        status: phaseStatus(0),
        latencyMs: phaseLatency(0),
        proofSize: "2.4 KB",
        gasEstimate: 21000,
        lastUpdated: new Date().toISOString(),
      },
      {
        name: "Circuit Compilation",
        status: phaseStatus(1),
        latencyMs: phaseLatency(1),
        proofSize: "18.7 KB",
        gasEstimate: 85000,
        lastUpdated: new Date().toISOString(),
      },
      {
        name: "Proof Generation (Groth16)",
        status: phaseStatus(2),
        latencyMs: phaseLatency(2),
        proofSize: "192 B",
        gasEstimate: 300000,
        lastUpdated: new Date().toISOString(),
      },
      {
        name: "Recursive Aggregation",
        status: phaseStatus(3),
        latencyMs: phaseLatency(3),
        proofSize: "768 B",
        gasEstimate: 480000,
        lastUpdated: new Date().toISOString(),
      },
      {
        name: "On-Chain Verification",
        status: phaseStatus(4),
        latencyMs: phaseLatency(4),
        proofSize: "192 B",
        gasEstimate: 150000,
        lastUpdated: new Date().toISOString(),
      },
      {
        name: "Receipt Issuance",
        status: phaseStatus(0) === "complete" ? "complete" : "idle",
        latencyMs: 12,
        proofSize: null,
        gasEstimate: 35000,
        lastUpdated: new Date().toISOString(),
      },
    ],
    lastBlock: blockBase,
    tps: 847 + (Math.floor(Date.now() / 4000) % 100),
    gasUsed: `${(2.1 + (Math.floor(Date.now() / 7000) % 10) * 0.1).toFixed(1)}M`,
    proofAggregation: queuedProofs > 0 ? `${queuedProofs} proof(s) batching...` : "IDLE — awaiting submissions",
  });
});

export default router;

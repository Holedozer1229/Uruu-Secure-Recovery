import { pgTable, text, integer, timestamp, serial, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const recoveryRequestsTable = pgTable("recovery_requests", {
  id: serial("id").primaryKey(),
  requestId: text("request_id").notNull().unique(),
  status: text("status").notNull().default("INITIATED"),
  newKeyCommit: text("new_key_commit").notNull(),
  policyCommit: text("policy_commit").notNull(),
  requestedTimelock: integer("requested_timelock").notNull(),
  approvalCount: integer("approval_count").notNull().default(0),
  quorum: integer("quorum").notNull().default(2),
  timelockExpiresAt: timestamp("timelock_expires_at", { withTimezone: true }),
  proofHash: text("proof_hash"),
  proofReceiptJson: text("proof_receipt_json"),
  contestHash: text("contest_hash"),
  finalizedAt: timestamp("finalized_at", { withTimezone: true }),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const guardianApprovalsTable = pgTable("guardian_approvals", {
  id: serial("id").primaryKey(),
  requestId: text("request_id").notNull(),
  guardianId: text("guardian_id").notNull(),
  signature: text("signature").notNull(),
  approvedAt: timestamp("approved_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("guardian_approvals_request_guardian_unique").on(table.requestId, table.guardianId),
]);

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  eventId: text("event_id").notNull().unique(),
  eventType: text("event_type").notNull(),
  requestId: text("request_id"),
  dataJson: text("data_json").notNull().default("{}"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRecoveryRequestSchema = createInsertSchema(recoveryRequestsTable).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertRecoveryRequest = z.infer<typeof insertRecoveryRequestSchema>;
export type RecoveryRequest = typeof recoveryRequestsTable.$inferSelect;

export const insertGuardianApprovalSchema = createInsertSchema(guardianApprovalsTable).omit({
  id: true, createdAt: true,
});
export type InsertGuardianApproval = z.infer<typeof insertGuardianApprovalSchema>;
export type GuardianApproval = typeof guardianApprovalsTable.$inferSelect;

export const insertEventSchema = createInsertSchema(eventsTable).omit({
  id: true, createdAt: true,
});
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;

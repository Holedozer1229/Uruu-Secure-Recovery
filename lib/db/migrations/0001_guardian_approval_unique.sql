-- URUU production guardian replay protection.
-- Preflight: this statement intentionally fails if historical duplicates exist.
SELECT request_id, guardian_id, COUNT(*) AS duplicate_count
FROM guardian_approvals
GROUP BY request_id, guardian_id
HAVING COUNT(*) > 1;

CREATE UNIQUE INDEX IF NOT EXISTS guardian_approvals_request_guardian_unique
ON guardian_approvals (request_id, guardian_id);

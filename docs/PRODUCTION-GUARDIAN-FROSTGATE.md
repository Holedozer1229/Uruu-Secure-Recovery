# URUU production guardian policy and FrostGate authorization

Status: implementation branch. This code is fail-closed by default. It does not move funds, create FROST shares, or change EXCAL consensus.

## Required server configuration

Set these only in the private API-server runtime (never frontend variables):

```bash
URUU_RECOVERY_POLICY_JSON='{"version":"uruu-recovery-v1","quorum":3,"minimumTimelockSeconds":86400,"maximumTimelockSeconds":2592000}'
URUU_GUARDIAN_PUBLIC_KEYS_JSON='{"guardian-1":"-----BEGIN PUBLIC KEY-----...","guardian-2":"-----BEGIN PUBLIC KEY-----...","guardian-3":"-----BEGIN PUBLIC KEY-----...","guardian-4":"-----BEGIN PUBLIC KEY-----...","guardian-5":"-----BEGIN PUBLIC KEY-----..."}'
URUU_PROOF_VERIFIER_PUBLIC_KEY_PEM='-----BEGIN PUBLIC KEY-----...'
URUU_FROST_OPERATOR_TOKENS_JSON='{"operator-1":"<unique random 32+ character token>","operator-2":"<different unique token>","operator-3":"<different unique token>"}'
```

All guardian and proof-verifier keys must be Ed25519 public keys. The API refuses to initiate recovery if policy or the trusted registry is absent/invalid. The configured quorum is persisted on each request; the old hard-coded 2-of-N behavior is removed. Operator tokens must be unique, private, at least 32 characters, and provisioned one per independent operator.

Before enabling this branch, provision unique keys with independent guardians. Do not generate or store guardian private keys on the URUU server.

## Signed proof-verifier receipt

Proof generation/verification is external. The old synthetic proof endpoint now returns 503; it cannot mint its own proof receipt. A separately operated verifier must verify the actual proof and sign the following canonical object with Ed25519:

```json
{
  "schema": "uruu.proof-verifier-receipt.v1",
  "requestId": "<request id>",
  "proofHash": "<64 lowercase hex SHA-256>",
  "publicInputsHash": "<64 lowercase hex SHA-256>",
  "accountId": "<account identifier or null>",
  "newKeyCommit": "<exact newKeyCommit from the recovery request>",
  "timestamp": "<UTC ISO-8601 timestamp>"
}
```

Signature bytes are Ed25519 over UTF-8 bytes of:
`URUU-PROOF-VERIFIER-RECEIPT\0` followed by compact JSON with lexicographically sorted keys. Encode the 64-byte signature as 128 lowercase hex characters in `verifierSig`. The API enforces a five-minute receipt age window, request binding, exact new-key commitment binding, and proof-hash replay rejection. A signature proves that the configured verifier issued the receipt; it does not replace auditing the verifier implementation or circuit.

## Recovery request chain intent

The `metadata` field must be a JSON string with a `chainIntent` object. The exact 32-byte `sighashHex` must come from the existing EXCAL transaction builder and native sighash implementation; URUU does not construct or reinterpret it.

Required fields:
- `schema`: `uruu.frostgate-signing-intent.v1`
- `chainId`, `networkMagic`, `genesisHash` (32-byte lowercase hex)
- `operation`: `RECOVERY`
- `inputs`: nonempty array of `{txid, vout, amountSats}`
- `destinationScriptHex`, `amountSats`, `feeSats`
- `expiresAt`: Unix seconds, no more than 15 minutes ahead
- `sighashHex`: exact 32-byte EXCAL-native transaction sighash

The API binds the generated request ID, normalizes the exact schema fields, checks input/output/fee arithmetic, and commits the full intent hash into every guardian approval.

## Guardian approval ceremony

1. The recovery request must have a valid signed external proof receipt.
2. Each guardian fetches `GET /recovery/:requestId/guardian-challenge/:guardianId`.
3. The guardian independently displays and reviews the chain, genesis hash, inputs, destination script, amount, fee, expiry, and intent hash.
4. Guardian signs the returned `signingBytesHex` locally with its Ed25519 private key. Submit lowercase 128-character hex as `signature` to `POST /recovery/:requestId/guardian-approve`.
5. API verifies against the configured Ed25519 public key, rejects duplicates, and increments the count atomically. A database unique index prevents duplicate approvals.
6. `GET /recovery/:requestId/signing-intent` returns the authorization certificate only after quorum, timelock, proof, and contest checks pass.
7. Every FROST operator independently verifies the certificate using its own trusted guardian public-key registry. Never trust guardian public keys supplied by the certificate itself.

## FROST operator integration

Aethergate adds `authorized_intent::verify_uruu_authorization` and `require_exact_sighash`. Operators should:
- retrieve the certificate over mutually authenticated TLS;
- use their own guardian ID -> raw Ed25519 public-key hex registry;
- verify the complete certificate locally;
- compare the exact FROST SigningPackage message to the approved 32-byte sighash;
- re-check `GET /recovery/:requestId/operator-status` immediately before any signing share. The response includes a Unix `checkedAt` timestamp and is accepted by FROST for at most 30 seconds;
- reject revoked, expired, contested, mismatched, or below-quorum requests.

The current Aethergate FROST transport is not a deployed independent-operator network. Do not use its in-process DKG/demo orchestration as proof that five independent operators are deployed. Production requires separate operator processes, authenticated channels, protected shares, durable one-time nonce handling, and audited deployment.

## EXCAL compatibility gate — signing remains disabled

Aethergate's current ciphersuite emits 64-byte BIP340/Taproot Schnorr signatures. No EXCAL consensus/script/wallet compatibility has been established by this change. The certificate-verification adapter is not permission to sign or broadcast. Do not call FROST share generation for EXCAL until independent test vectors prove exact chain-native sighash and signature-verification compatibility. No EXCAL signature rules, consensus, wallet signing, transaction serialization, issuance, or chain state are changed here.

## Database rollout

Apply `lib/db/migrations/0001_guardian_approval_unique.sql` after checking for historical duplicate guardian approvals. The Drizzle schema also declares the unique index. Back up the database before applying schema changes.

## Validation status

The code has been committed to a feature branch but has not yet passed a build, typecheck, DB migration, or end-to-end security test. Do not deploy to production or enable real recovery until those checks and an external security review pass.

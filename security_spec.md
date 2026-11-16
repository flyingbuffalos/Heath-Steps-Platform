# Security Specification: StridePulse Step Tracker

## 1. Data Invariants
1. **Strict Ownership**: Every document in `/users/{userId}`, `/users/{userId}/dailySteps/{dateKey}`, and `/users/{userId}/stepSessions/{sessionId}` belongs exclusively to the verified user (`request.auth.uid == userId` and `request.auth.token.email_verified == true`).
2. **PII Isolation**: User email and biometric profile (`heightCm`, `weightKg`) live in `/users/{userId}` and are strictly readable only by `isOwner(userId)` — never publicly readable or listable.
3. **Master Gate Integrity**: Subcollection writes (`dailySteps`, `stepSessions`) verify the parent `/users/{userId}` document exists via `exists()`.
4. **Temporal Integrity**: `createdAt` must equal `request.time` on creation and remain immutable on updates; `updatedAt` must equal `request.time` on creation and update.
5. **Bounded Data & Schema Purity**: Every string length, numeric range, enum value, and 24-hour array length (`hourlySteps.size() == 24`) is enforced alongside strict `hasAll` / `hasOnly` and `affectedKeys().hasOnly(...)` guards.
6. **Immutable Audit Log**: `stepSessions` records are append-only/deletable by owner and cannot be retroactively mutated.

## 2. The "Dirty Dozen" Attack Payloads
1. Unauthenticated read/write to `/users/victim123`.
2. Authenticated attacker attempting to read `/users/victim123` (PII leak test).
3. Unverified email (`email_verified: false`) attempting to write `/users/attacker/dailySteps/2026-11-16`.
4. Shadow field injection (`isAdmin: true`) on `/users/attacker` create.
5. Identity spoofing (`uid: "victim123"`) inside `/users/attacker/dailySteps/2026-11-16`.
6. Malformed document ID (`../../etc/passwd` or 500-char string) in `stepSessions/{sessionId}`.
7. Client-forged `createdAt` timestamp (not equal to `request.time`).
8. Mutating `createdAt` or `uid` during a `/users/attacker` profile update.
9. Oversized `hourlySteps` array (length 1000 instead of 24) in `dailySteps`.
10. Out-of-bounds `steps` value (`-500` or `99999999`) in `dailySteps`.
11. Unconstrained `list` query scraping `/users` or another user's `dailySteps`.
12. Creating a `stepSessions` record with an oversized 10KB `note` string.

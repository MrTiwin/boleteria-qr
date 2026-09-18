---
description: Anti-double-scan verification conventions
paths:
  - "src/server/verify.ts"
  - "src/app/api/verify/**"
---

- The status transition is **one** SQL statement:
  `UPDATE ticket SET status='verified', verified_at=now(), verified_by_station=$1
  WHERE id=$2 AND status='issued'`, run inside a transaction, with the row count checked
  immediately after. `rowCount === 1` means this request won the race; `rowCount === 0` means the
  ticket was already verified — never a separate `SELECT` first.
- Never wrap the update in application-level locking (mutex, in-memory lock). Two station
  requests can and will arrive within milliseconds of each other from different processes;
  only the database's own row-level locking on the conditional `UPDATE` is trusted.
- The HMAC signature on the QR token is verified **before** the database round trip — a bad
  signature never reaches the transaction.
- On "already verified", the response includes who verified it and when, read from the row the
  `UPDATE` did *not* touch — one extra `SELECT`, only on that branch.

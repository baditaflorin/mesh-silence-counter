---
status: accepted
date: 2026-05-11
---

# 0003 — Anonymous aggregation

## Context

The whole point of the app is that the *aggregate* count of still phones is public, but no individual phone's state is. Naïvely publishing `{ peerId, still }` defeats the goal.

## Decision

For v1: publish only `{ still, ts }` into Yjs **awareness**, keyed by Yjs's internal random 32-bit `clientID` which is **regenerated on every page load and never displayed in the UI**.

A peer in the room with a debugger open can read other peers' clientIDs from the awareness map. They can correlate `clientID → still-flag-over-time`. They cannot tie that clientID to a real-world identity unless they have side-channel information ("Alex is the one who left their phone in the kitchen — that's clientID 1234").

For v2 we have a stronger option documented for upgrade: **Semaphore commit-reveal** (same pattern as `mesh-mafia`). Each phone publishes a count contribution to a shared bucket without revealing identity, using a zero-knowledge proof that the contribution is valid. This eliminates the side-channel attack. We do NOT ship this in v1 because:

- The app is primarily used by groups who already know each other (meditation buddies, retreat).
- The threat model from "another peer in the same room learns I fidgeted" is low-stakes.
- Semaphore + snarkjs is ~600 kB of WASM and would dominate the bundle.

## Consequences

- **Inside-the-room anonymity is best-effort, not cryptographic.** Documented in `docs/privacy.md`.
- **Outside-the-room anonymity is cryptographic.** The signaling server and TURN see only encrypted SDP / DTLS bytes; they cannot see still-flags.
- **Personal stillness time is computed locally** and never published, so even with full debugger access another peer cannot read your "you were still 70%."

## Alternatives considered

- **Semaphore commit-reveal aggregation.** Deferred to v2; see above.
- **Periodic clientID rotation.** Adds churn in the awareness state without solving the side-channel — a determined adversary still correlates by signature of state-changes-over-time.
- **Don't publish at all; just show your own state.** Defeats the experience.

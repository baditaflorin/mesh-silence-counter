# Privacy threat model — mesh-silence-counter

## What other peers in the same room can see

- A boolean `still: true|false` per second, anonymous via Yjs awareness clientID.
- The aggregate count of still phones.

## Anonymity within the room

The Yjs awareness `clientID` is a per-page-load random 32-bit integer. It is **not displayed in the UI**, so a casual user cannot tell which `still` flag belongs to which phone. A user with a debugger open can read the clientIDs and correlate `clientID → still flag` over time, but they cannot tie a clientID to a real-world identity without side channels.

We have a stronger Semaphore-based design documented in [ADR 0003](adr/0003-anonymity.md) for v2; it is not in v1 because of bundle size.

## Per-phone stillness time

Your phone's **personal "you were still X% of the time"** is computed locally from the accelerometer signal and **never published**. Even with full debugger access another peer cannot read your personal stillness time — it doesn't exist on the wire.

## What the signaling server sees

The room name and encrypted SDP offers/answers. Nothing about accelerometers or stillness.

## What the TURN server sees

Encrypted DTLS bytes when peers can't connect directly.

## Permission asked

iOS Safari requires explicit permission for `DeviceMotionEvent`. We ask once on **Join the room**. If denied, the app still works but your phone always counts as "still."

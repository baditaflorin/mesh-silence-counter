# mesh-silence-counter

[![Live](https://img.shields.io/badge/live-baditaflorin.github.io%2Fmesh--silence--counter-B5A0FF?style=flat-square)](https://baditaflorin.github.io/mesh-silence-counter/)
[![Version](https://img.shields.io/github/package-json/v/baditaflorin/mesh-silence-counter?style=flat-square&color=6a6a8a)](https://github.com/baditaflorin/mesh-silence-counter/blob/main/package.json)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![No backend](https://img.shields.io/badge/backend-none-1a160a?style=flat-square)](docs/adr/0001-deployment-mode.md)

> Peer-to-peer mesh: group meditation timer. Phones detect stillness via accelerometer and aggregate the count anonymously.

**Live:** https://baditaflorin.github.io/mesh-silence-counter/

Set a 20-minute timer. Place your phone face-up on your lap or a flat surface. Every phone watches its own accelerometer for movement; the mesh dashboard shows **how many phones are still right now** — but never which ones, and never how much each phone moved.

When the timer ends, your phone privately tells _you_ how long _you_ were still. Nobody else can see that.

## Gentle accountability without surveillance

The aggregate is the experience: glance at the screen and see "5 / 6 still right now." That's enough social pressure to keep the room calm. No leaderboard, no personal data leaving the device.

## How it works

1. Yjs over y-webrtc. Every phone joins the same room.
2. Each phone listens to `DeviceMotionEvent` and computes **jerk** = magnitude of change-in-acceleration. Jerk below the threshold = "still."
3. Each phone publishes only `{ still: boolean, ts: number }` into Yjs **awareness** every second.
4. Every phone aggregates the other phones' awareness states into a count.
5. Locally, each phone accumulates "still time" by summing the per-second still flags.

The local "you were still for X minutes" never gets published.

## iOS permission

iOS Safari requires `DeviceMotionEvent.requestPermission()` on user gesture. We ask for it on **Join the room** and surface an error if denied. Without motion permission the aggregate still counts your phone, just with a constant `still = true` (so don't lie — set the threshold high).

## Privacy threat model

See [docs/privacy.md](docs/privacy.md). Wire payload: `{ still: boolean }` per second, anonymous via Yjs awareness clientID (random per session, never displayed in UI). Per-phone "still time" is local-only.

## Architecture

- **Mode A** — pure GitHub Pages.
- **WebRTC** — Yjs + y-webrtc with self-hosted signaling and TURN.

## Run it locally

```bash
git clone https://github.com/baditaflorin/mesh-silence-counter.git
cd mesh-silence-counter
npm install
npm run dev
```

## Self-hosted infrastructure

| Repo                                                                   | Endpoint                               | Role                      |
| ---------------------------------------------------------------------- | -------------------------------------- | ------------------------- |
| [signaling-server](https://github.com/baditaflorin/signaling-server)   | `wss://turn.0docker.com/ws`            | y-webrtc protocol fan-out |
| [turn-token-server](https://github.com/baditaflorin/turn-token-server) | `https://turn.0docker.com/credentials` | HMAC TURN creds           |
| [coturn-hetzner](https://github.com/baditaflorin/coturn-hetzner)       | `turn:turn.0docker.com:3479`           | TURN relay                |

## ADRs

- [0001 — Deployment mode](docs/adr/0001-deployment-mode.md)
- [0002 — Stillness detection (jerk threshold)](docs/adr/0002-stillness.md)
- [0003 — Anonymous aggregation](docs/adr/0003-anonymity.md)
- [0010 — GitHub Pages publishing](docs/adr/0010-pages-publishing.md)

## License

[MIT](LICENSE) © 2026 Florin Badita

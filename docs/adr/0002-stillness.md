---
status: accepted
date: 2026-05-11
---

# 0002 — Stillness detection (jerk threshold)

## Context

`DeviceMotionEvent.acceleration` gives `(ax, ay, az)` excluding gravity (when available). The naïve check is `magnitude(a) < threshold`. But on iOS Safari `acceleration` is sometimes null and we fall back to `accelerationIncludingGravity` — which is dominated by 9.8 m/s² regardless of motion.

A more robust signal is **jerk** — the magnitude of change in acceleration sample-to-sample:

```
jerk = |a_now − a_prev|
```

Jerk is invariant to gravity orientation because gravity is constant between samples. A phone on a table with gravity along z has jerk ≈ 0. A phone being picked up has jerk in the tens.

## Decision

Use jerk thresholding with a default cutoff of **0.4 m/s²/sample** at the OS-default sample rate (~60 Hz on most browsers, ~16 Hz on some Androids). At this threshold, a phone resting on a hard surface registers still, a fidgeting hand registers moving, a phone in your pocket while you walk registers very-moving.

Configurable from 0.1 to 2.0 in Settings.

## Consequences

- **Works regardless of phone orientation.** Place it face-up, face-down, on its edge — same answer.
- **Doesn't depend on `acceleration` being non-null.** Always falls back to `accelerationIncludingGravity` if needed.
- **Sample rate variability** between browsers / phones means the same threshold has different sensitivity across devices. We document this and provide a slider; if the room finds the aggregate is too jumpy, raise it.
- **Breathing on a stable phone doesn't register as movement** — the jerk from the chest rising is too small.

## Alternatives considered

- **Threshold on `|acceleration|` directly.** Rejected — fails when `acceleration` is null (iOS sometimes).
- **Threshold on `|accelerationIncludingGravity| − 9.81`.** Rejected — assumes phone is horizontal; tilted phones leak gravity into the magnitude.
- **Variance over a rolling window.** Better signal-to-noise but more code; the simple jerk threshold proved good enough in testing.

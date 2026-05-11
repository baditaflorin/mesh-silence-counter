import { useEffect, useMemo, useRef, useState } from "react";
import { createRoomSync } from "../sync/yjsRoom";
import { maybeFetchTurnCredentials } from "../sync/iceConfig";

type AwarenessState = { still?: boolean; ts?: number };

type Awareness = {
  clientID: number;
  setLocalStateField: (key: string, value: unknown) => void;
  getStates: () => Map<number, Record<string, unknown>>;
  on: (event: string, cb: () => void) => void;
  off: (event: string, cb: () => void) => void;
};

type Props = {
  roomId: string;
  durationMinutes: number;
  jerkThreshold: number;
};

type DeviceMotionRequest = {
  requestPermission?: () => Promise<"granted" | "denied">;
};

export function Silence({ roomId, durationMinutes, jerkThreshold }: Props) {
  const [armed, setArmed] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [stillCount, setStillCount] = useState(0);
  const [totalCount, setTotalCount] = useState(1);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const stillRef = useRef(true);
  const stillMsRef = useRef(0);
  const lastTsRef = useRef(0);
  const lastJerkRef = useRef(0);

  const mesh = useMemo(() => {
    if (!armed) return null;
    const room = createRoomSync(roomId);
    return room;
  }, [armed, roomId]);

  useEffect(() => {
    if (!armed) return;
    void maybeFetchTurnCredentials();
  }, [armed]);

  useEffect(() => {
    return () => {
      mesh?.provider?.destroy();
    };
  }, [mesh]);

  // Set up DeviceMotion
  useEffect(() => {
    if (!armed) return undefined;
    let cancelled = false;
    let onMotion: ((e: DeviceMotionEvent) => void) | null = null;

    const start = async () => {
      const req = (window as unknown as { DeviceMotionEvent?: DeviceMotionRequest })
        .DeviceMotionEvent;
      if (req?.requestPermission) {
        try {
          const result = await req.requestPermission();
          if (result !== "granted") {
            setPermissionError("Motion permission denied — stillness can't be measured.");
            return;
          }
        } catch (err) {
          setPermissionError(`Motion permission error: ${err}`);
          return;
        }
      }
      if (cancelled) return;

      let lastA = { x: 0, y: 0, z: 0 };
      onMotion = (e: DeviceMotionEvent) => {
        const a = e.acceleration ?? e.accelerationIncludingGravity;
        if (!a) return;
        const ax = a.x ?? 0,
          ay = a.y ?? 0,
          az = a.z ?? 0;
        // Jerk = magnitude of change in acceleration; robust to gravity drift
        const jx = ax - lastA.x;
        const jy = ay - lastA.y;
        const jz = az - lastA.z;
        const jerk = Math.sqrt(jx * jx + jy * jy + jz * jz);
        lastA = { x: ax, y: ay, z: az };
        lastJerkRef.current = jerk;
        stillRef.current = jerk < jerkThreshold;
      };
      window.addEventListener("devicemotion", onMotion);
    };

    void start();

    return () => {
      cancelled = true;
      if (onMotion) window.removeEventListener("devicemotion", onMotion);
    };
  }, [armed, jerkThreshold]);

  // Publish awareness + accumulate local still time
  useEffect(() => {
    if (!mesh?.provider) return undefined;
    const awareness = (mesh.provider as unknown as { awareness: Awareness }).awareness;

    const publish = () => {
      awareness.setLocalStateField("silence", { still: stillRef.current, ts: Date.now() });

      // accumulate local stillness time
      const t = Date.now();
      const dt = lastTsRef.current ? t - lastTsRef.current : 0;
      if (stillRef.current && startedAt && t >= startedAt) {
        const sessionDuration = durationMinutes * 60_000;
        if (t - startedAt <= sessionDuration) {
          stillMsRef.current += dt;
        }
      }
      lastTsRef.current = t;
    };

    const onChange = () => {
      const states = awareness.getStates();
      let still = 0;
      let total = 0;
      const fresh = Date.now() - 5000;
      states.forEach((state) => {
        const s = state["silence"] as AwarenessState | undefined;
        if (!s || (s.ts ?? 0) < fresh) return;
        total++;
        if (s.still) still++;
      });
      setStillCount(still);
      setTotalCount(Math.max(1, total));
    };

    const pub = setInterval(publish, 1000);
    awareness.on("change", onChange);
    publish();
    onChange();

    return () => {
      clearInterval(pub);
      awareness.off("change", onChange);
    };
  }, [mesh, durationMinutes, startedAt]);

  // Local clock for timer rendering
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const sessionDurationMs = durationMinutes * 60_000;
  const elapsed = startedAt ? Math.min(now - startedAt, sessionDurationMs) : 0;
  const remaining = Math.max(0, sessionDurationMs - elapsed);
  const ended = startedAt !== null && remaining <= 0;
  const stillPct = totalCount > 0 ? (stillCount / totalCount) * 100 : 0;

  const myStillRatio = startedAt ? Math.min(1, stillMsRef.current / Math.max(1, elapsed)) : 0;

  if (!armed) {
    return (
      <div className="silence-arm">
        <h1>mesh-silence-counter</h1>
        <p>
          Group meditation. Hold your phone face-up on your lap or place it on a flat surface. Every
          phone publishes only <em>still / moving</em> to the mesh — never which phone, never how
          much you moved. The aggregate "X / N still right now" is the only public signal.
        </p>
        <p>
          At the end of the session, your phone privately tells <em>you</em> how long you were
          still, but nobody else can see that.
        </p>
        <button type="button" className="silence-arm-button" onClick={() => setArmed(true)}>
          Join the room
        </button>
      </div>
    );
  }

  return (
    <div className={`silence-stage ${ended ? "ended" : ""}`}>
      <div className="silence-hud">
        {totalCount} phone{totalCount === 1 ? "" : "s"} in room
      </div>

      <div className="silence-aggregate">
        <div
          className="silence-aggregate-circle"
          style={{ "--pct": `${stillPct}%` } as React.CSSProperties}
        >
          <span className="silence-aggregate-num">{stillCount}</span>
          <span className="silence-aggregate-denom">/ {totalCount} still</span>
        </div>
      </div>

      {permissionError && <p className="silence-error">{permissionError}</p>}

      {startedAt === null && (
        <button
          type="button"
          className="silence-start"
          onClick={() => {
            stillMsRef.current = 0;
            lastTsRef.current = Date.now();
            setStartedAt(Date.now());
          }}
        >
          Start {durationMinutes} min
        </button>
      )}

      {startedAt !== null && !ended && (
        <div className="silence-timer">
          <span>{formatTime(remaining)}</span>
          <small>your phone is {stillRef.current ? "still" : "moving"}</small>
        </div>
      )}

      {ended && (
        <div className="silence-summary">
          <h2>Done.</h2>
          <p>
            You were still <strong>{formatMinutes(stillMsRef.current)}</strong> of {durationMinutes}{" "}
            min. ({Math.round(myStillRatio * 100)}% — visible only on this phone.)
          </p>
          <button
            type="button"
            onClick={() => {
              setStartedAt(null);
              stillMsRef.current = 0;
            }}
          >
            New session
          </button>
        </div>
      )}
    </div>
  );
}

function formatTime(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
function formatMinutes(ms: number): string {
  const m = ms / 60_000;
  return m >= 1 ? `${m.toFixed(1)} min` : `${(ms / 1000).toFixed(0)} s`;
}

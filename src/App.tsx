import { useEffect, useState } from "react";
import { Silence } from "./features/silence/Silence";
import { SettingsDrawer } from "./features/settings/SettingsDrawer";
import { appConfig } from "./shared/config";
import { InviteShareButton } from "@baditaflorin/mesh-common";

const STORAGE = {
  room: `${appConfig.storagePrefix}:room`,
  duration: `${appConfig.storagePrefix}:duration`,
  threshold: `${appConfig.storagePrefix}:threshold`,
};

export function App() {
  const [roomId, setRoomId] = useState(() => localStorage.getItem(STORAGE.room) ?? "default");
  const [durationMinutes, setDurationMinutes] = useState(() =>
    Math.max(1, Number(localStorage.getItem(STORAGE.duration) ?? "20")),
  );
  const [jerkThreshold, setJerkThreshold] = useState(() =>
    Math.max(0.05, Number(localStorage.getItem(STORAGE.threshold) ?? "0.4")),
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE.room, roomId);
  }, [roomId]);
  useEffect(() => {
    localStorage.setItem(STORAGE.duration, String(durationMinutes));
  }, [durationMinutes]);
  useEffect(() => {
    localStorage.setItem(STORAGE.threshold, String(jerkThreshold));
  }, [jerkThreshold]);

  return (
    <div className="app-root">
      <Silence roomId={roomId} durationMinutes={durationMinutes} jerkThreshold={jerkThreshold} />

      <InviteShareButton appName={appConfig.appName} roomId={roomId} />
      <button
        type="button"
        className="settings-fab"
        onClick={() => setSettingsOpen(true)}
        aria-label="Open settings"
      >
        ⚙
      </button>

      <div className="self-ref">
        <a href={appConfig.repositoryUrl} target="_blank" rel="noreferrer">
          source
        </a>
        <span aria-hidden="true">·</span>
        <a href={appConfig.paypalUrl} target="_blank" rel="noreferrer">
          tip ♥
        </a>
        <span aria-hidden="true">·</span>
        <span>
          v{appConfig.version} · {appConfig.commit}
        </span>
      </div>

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        roomId={roomId}
        onRoomChange={setRoomId}
        durationMinutes={durationMinutes}
        onDurationChange={setDurationMinutes}
        jerkThreshold={jerkThreshold}
        onJerkThresholdChange={setJerkThreshold}
      />
    </div>
  );
}

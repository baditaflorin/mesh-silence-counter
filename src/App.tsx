import { useEffect, useState } from "react";
import { MeshShell } from "@baditaflorin/mesh-common";
import { Silence } from "./features/silence/Silence";
import { SettingsExtras } from "./features/settings/SettingsExtras";
import { appConfig } from "./shared/config";

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
    <MeshShell
      config={appConfig}
      roomId={roomId}
      onRoomChange={setRoomId}
      settingsExtras={
        <SettingsExtras
          durationMinutes={durationMinutes}
          onDurationChange={setDurationMinutes}
          jerkThreshold={jerkThreshold}
          onJerkThresholdChange={setJerkThreshold}
        />
      }
    >
      <Silence roomId={roomId} durationMinutes={durationMinutes} jerkThreshold={jerkThreshold} />
    </MeshShell>
  );
}

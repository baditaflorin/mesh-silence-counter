type Props = {
  durationMinutes: number;
  onDurationChange: (next: number) => void;
  jerkThreshold: number;
  onJerkThresholdChange: (next: number) => void;
};

export function SettingsExtras({
  durationMinutes,
  onDurationChange,
  jerkThreshold,
  onJerkThresholdChange,
}: Props) {
  return (
    <>
      <label>
        <span>Session duration (min)</span>
        <input
          type="number"
          min={1}
          max={120}
          value={durationMinutes}
          onChange={(e) =>
            onDurationChange(Math.max(1, Math.min(120, Number(e.target.value) || 20)))
          }
        />
      </label>

      <label>
        <span>Stillness sensitivity (jerk threshold = {jerkThreshold.toFixed(2)})</span>
        <input
          type="range"
          min={0.1}
          max={2}
          step={0.05}
          value={jerkThreshold}
          onChange={(e) => onJerkThresholdChange(Number(e.target.value))}
        />
      </label>
      <p className="mesh-settings-help">
        Higher = more tolerant of small movements. Default 0.4 catches deliberate fidgets but
        ignores breathing on a stable surface.
      </p>
    </>
  );
}

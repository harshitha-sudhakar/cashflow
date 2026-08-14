import type { UserSettings } from "../lib/types";

interface UserSettingsPanelProps {
  settings: UserSettings;
  onUpdate: (partial: Partial<UserSettings>) => void;
}

export function UserSettingsPanel({ settings, onUpdate }: UserSettingsPanelProps) {
  return (
    <div className="card settings-panel">
      <h2 className="card-title">Forecast preferences</h2>
      <p className="card-subtitle">Adjust how far ahead to project and how much cushion to keep.</p>

      <div className="settings-grid">
        <label className="form-label">
          Forecast horizon
          <select
            value={settings.forecastHorizonDays}
            onChange={(e) =>
              onUpdate({ forecastHorizonDays: Number(e.target.value) as UserSettings["forecastHorizonDays"] })
            }
          >
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
          </select>
        </label>

        <label className="form-label">
          Comfort buffer ($)
          <input
            type="number"
            step="0.01"
            min="0"
            value={settings.comfortBuffer}
            onChange={(e) => onUpdate({ comfortBuffer: parseFloat(e.target.value) || 0 })}
          />
        </label>
      </div>
      <p className="form-helper">
        The comfort buffer shows as a reference line on your forecast chart. The forecast horizon controls how many days the projection covers.
      </p>
    </div>
  );
}

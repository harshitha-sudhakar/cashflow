import type { Forecast } from "../lib/types";

interface ShortfallCalendarProps {
  forecast: Forecast | null;
  loading: boolean;
}

export function ShortfallCalendar({ forecast, loading }: ShortfallCalendarProps) {
  if (loading) {
    return <div className="card"><p>Loading forecast...</p></div>;
  }

  if (!forecast) {
    return (
      <div className="card empty-state">
        <h2 className="card-title">Forecast preview</h2>
        <p>Log income and obligations to generate the runway view.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-headline-row">
        <div>
          <h2 className="card-title">Runway</h2>
          <p className="card-subtitle">A 90-day view of projected balance and shortfall risk.</p>
        </div>
        <span className="card-pill">{forecast.horizonDays} days</span>
      </div>

      <div className="forecast-stats">
        <div>
          <span>Risk days</span>
          <strong>{forecast.shortfallDates.length}</strong>
        </div>
        <div>
          <span>Lowest low</span>
          <strong>${Math.min(...forecast.dailyProjection.map((p) => p.confidenceLow)).toFixed(2)}</strong>
        </div>
        <div>
          <span>End balance</span>
          <strong>${forecast.dailyProjection[forecast.dailyProjection.length - 1]?.projectedBalance.toFixed(2) ?? "0.00"}</strong>
        </div>
      </div>

      {forecast.shortfallDates.length === 0 ? (
        <p className="shortfall-clear">No shortfall risk detected in this window.</p>
      ) : (
        <ul className="shortfall-list">
          {forecast.shortfallDates.map((s) => (
            <li key={s.date} className="shortfall-item">
              <span className="shortfall-date">{new Date(s.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
              <span>at risk of running short by ~${s.shortfallAmount.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      )}

      <details className="projection-details">
        <summary>Daily projection</summary>
        <p className="projection-note">Balance range widens when income or obligations are less certain.</p>
        <ul className="projection-list">
          {forecast.dailyProjection.map((p) => (
            <li key={p.date}>
              <span>{new Date(p.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
              <span>${p.projectedBalance.toFixed(2)}</span>
              <span className="projection-range">${p.confidenceLow.toFixed(0)} – ${p.confidenceHigh.toFixed(0)}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

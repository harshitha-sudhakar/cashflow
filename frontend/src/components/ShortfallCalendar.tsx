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
        <h2 className="card-title">No forecast yet</h2>
        <p>Log some income and obligations, then run the forecast to see your shortfall risk.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="card-title">Next {forecast.horizonDays} days</h2>

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

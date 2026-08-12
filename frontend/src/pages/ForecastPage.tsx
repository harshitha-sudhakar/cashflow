import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/authContext";
import { useUserSettings } from "../lib/useUserSettings";
import { ML_SERVICE_URL } from "../lib/utils";
import type { Forecast } from "../lib/types";
import { ForecastChart } from "../components/ForecastChart";

export function ForecastPage() {
  const { user } = useAuth();
  const { settings } = useUserSettings(user?.uid);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  async function loadForecast() {
    if (!user) return;
    const snap = await getDoc(doc(db, "forecasts", user.uid));
    setForecast(snap.exists() ? (snap.data() as Forecast) : null);
    setLoading(false);
  }

  useEffect(() => {
    loadForecast();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleRefresh() {
    if (!user) return;
    setRefreshing(true);
    setRefreshError(null);
    try {
      const res = await fetch(`${ML_SERVICE_URL}/generate-forecast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, horizonDays: settings.forecastHorizonDays }),
      });
      if (!res.ok) throw new Error(`Forecast service returned ${res.status}`);
      await loadForecast();
    } catch {
      setRefreshError("Couldn't reach the forecast service. Is api.py running on port 5001?");
    } finally {
      setRefreshing(false);
    }
  }

  const stats = useMemo(() => {
    if (!forecast) return null;
    const lowest = Math.min(...forecast.dailyProjection.map((p) => p.confidenceLow));
    const end = forecast.dailyProjection.at(-1)?.projectedBalance ?? 0;
    const today = forecast.dailyProjection[0];
    const safeToSpend = today ? Math.max(0, today.projectedBalance - settings.comfortBuffer) : 0;
    return { lowest, end, safeToSpend, shortfalls: forecast.shortfallDates.length };
  }, [forecast, settings.comfortBuffer]);

  return (
    <div className="page-stack">
      <section className="page-hero card">
        <p className="eyebrow">Forecast</p>
        <h1 className="page-title">Balance projection</h1>
        <p className="page-description">
          A {settings.forecastHorizonDays}-day view of projected balance with confidence bands. Amber dots mark days where the low estimate dips below zero.
        </p>
        <button className="btn-primary" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? "Refreshing..." : "Refresh forecast"}
        </button>
        {refreshError && <p className="auth-error">{refreshError}</p>}
      </section>

      {stats && (
        <section className="forecast-stats-row">
          <div className="stat-card">
            <span>Safe to spend</span>
            <strong className="gradient-number">${stats.safeToSpend.toFixed(2)}</strong>
          </div>
          <div className="stat-card">
            <span>End balance</span>
            <strong>${stats.end.toFixed(2)}</strong>
          </div>
          <div className="stat-card">
            <span>Lowest low</span>
            <strong>${stats.lowest.toFixed(2)}</strong>
          </div>
          <div className="stat-card">
            <span>Shortfall days</span>
            <strong>{stats.shortfalls}</strong>
          </div>
        </section>
      )}

      <section className="card chart-card">
        {loading ? (
          <p className="card-subtitle">Loading forecast...</p>
        ) : !forecast ? (
          <div className="empty-state">
            <h2 className="card-title">No forecast yet</h2>
            <p className="card-subtitle">Add accounts, income, and obligations, then refresh to generate a projection.</p>
          </div>
        ) : (
          <>
            <ForecastChart
              data={forecast.dailyProjection}
              comfortBuffer={settings.comfortBuffer}
              height={420}
            />
            {forecast.shortfallDates.length > 0 && (
              <ul className="shortfall-list" style={{ marginTop: "1.5rem" }}>
                {forecast.shortfallDates.map((s) => (
                  <li key={s.date} className="shortfall-item">
                    <span className="shortfall-date">
                      {new Date(s.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                    <span>balance may dip ~${s.shortfallAmount.toFixed(2)} below zero</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}

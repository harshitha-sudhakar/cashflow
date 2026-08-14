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
  const { settings, updateSettings } = useUserSettings(user?.uid);
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

  async function handleRefresh(horizonDays = settings.forecastHorizonDays) {
    if (!user) return;
    setRefreshing(true);
    setRefreshError(null);
    try {
      const res = await fetch(`${ML_SERVICE_URL}/generate-forecast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, horizonDays }),
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
    const end = forecast.dailyProjection.at(-1)?.projectedBalance ?? 0;
    const current = forecast.dailyProjection[0]?.projectedBalance ?? 0;
    return { end, current };
  }, [forecast]);

  return (
    <div className="page-stack">
      <section className="page-hero card">
        <p className="eyebrow">Forecast</p>
        <h1 className="page-title">Balance projection</h1>
        <p className="page-description">
          A {settings.forecastHorizonDays}-day view of projected balance with confidence bands. Amber dots mark days where the low estimate dips below zero.
        </p>
        <button className="btn-primary" onClick={() => handleRefresh()} disabled={refreshing}>
          {refreshing ? "Refreshing..." : "Refresh forecast"}
        </button>
        {refreshError && <p className="auth-error">{refreshError}</p>}
      </section>

      <section className="card horizon-card">
        <div>
          <p className="eyebrow">Forecast window</p>
          <h2 className="card-title">How far ahead?</h2>
          <p className="card-subtitle">Choose the runway you want to inspect. Your selection is saved to your account.</p>
        </div>
        <div className="horizon-toggle" role="group" aria-label="Forecast horizon">
          {[30, 60, 90].map((days) => (
            <button
              key={days}
              type="button"
              className={settings.forecastHorizonDays === days ? "horizon-option active" : "horizon-option"}
              onClick={async () => {
                await updateSettings({ forecastHorizonDays: days as 30 | 60 | 90 });
                await handleRefresh(days as 30 | 60 | 90);
              }}
            >
              {days} days
            </button>
          ))}
        </div>
      </section>

      {stats && (
        <section className="forecast-stats-row">
          <div className="stat-card">
            <span>Current balance</span>
            <strong className="gradient-number">${stats.current.toFixed(2)}</strong>
          </div>
          <div className="stat-card">
            <span>End balance</span>
            <strong>${stats.end.toFixed(2)}</strong>
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
            {forecast.diagnostics?.activeDaysInHorizon === 0 && (
              <div className="note" style={{ marginBottom: "1rem" }}>
                None of your logged income or obligation dates fall within this {settings.forecastHorizonDays}-day
                window — that's why the line is flat. You have {forecast.diagnostics.totalIncomeRecords} income
                and {forecast.diagnostics.totalObligationRecords} obligation record(s) logged; check that their
                dates are today or later, not in the past.
              </div>
            )}
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

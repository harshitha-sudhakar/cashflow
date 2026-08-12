import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/authContext";
import { useUserSettings } from "../lib/useUserSettings";
import { UserSettingsPanel } from "../components/UserSettingsPanel";
import { ML_SERVICE_URL, weightedIncomeTotal, weightedObligationTotal } from "../lib/utils";
import type { Account, Forecast, IncomeEvent, Obligation } from "../lib/types";

export function DashboardPage() {
  const { user } = useAuth();
  const { settings, updateSettings } = useUserSettings(user?.uid);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [income, setIncome] = useState<IncomeEvent[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    if (!user) return;

    const [forecastSnap, incomeSnap, obligationsSnap, accountsSnap] = await Promise.all([
      getDoc(doc(db, "forecasts", user.uid)),
      getDocs(query(collection(db, "incomeEvents"), where("userId", "==", user.uid))),
      getDocs(query(collection(db, "obligations"), where("userId", "==", user.uid))),
      getDocs(query(collection(db, "accounts"), where("userId", "==", user.uid))),
    ]);

    setForecast(forecastSnap.exists() ? (forecastSnap.data() as Forecast) : null);
    setIncome(incomeSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as IncomeEvent));
    setObligations(obligationsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Obligation));
    setAccounts(accountsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Account));
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleRefresh() {
    if (!user) return;
    setRefreshing(true);
    try {
      await fetch(`${ML_SERVICE_URL}/generate-forecast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, horizonDays: settings.forecastHorizonDays }),
      });
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }

  const stats = useMemo(() => {
    const accountTotal = accounts.reduce((s, a) => s + a.balance, 0);
    const endBalance = forecast?.dailyProjection.at(-1)?.projectedBalance ?? accountTotal;
    const todayBalance = forecast?.dailyProjection[0]?.projectedBalance ?? accountTotal;
    const safeToSpend = Math.max(0, todayBalance - settings.comfortBuffer);
    return {
      accountTotal,
      weightedIncome: weightedIncomeTotal(income),
      weightedObligations: weightedObligationTotal(obligations),
      endBalance,
      safeToSpend,
      shortfalls: forecast?.shortfallDates.length ?? 0,
    };
  }, [accounts, income, obligations, forecast, settings.comfortBuffer]);

  return (
    <div className="page-stack">
      <section className="page-hero card">
        <p className="eyebrow">Overview</p>
        <h1 className="page-title">Cashflow Clarity</h1>
        <p className="page-description">
          A neutral logging and forecasting tool. Track accounts, income, and obligations to see how your balance projects over time.
        </p>
        <div className="hero-actions">
          <button className="btn-primary" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? "Refreshing..." : "Refresh forecast"}
          </button>
          <Link to="/forecast" className="btn-ghost">View forecast →</Link>
        </div>
      </section>

      <section className="forecast-stats-row">
        <div className="stat-card">
          <span>Account total</span>
          <strong>${stats.accountTotal.toFixed(2)}</strong>
        </div>
        <div className="stat-card">
          <span>Safe to spend</span>
          <strong className="gradient-number">${stats.safeToSpend.toFixed(2)}</strong>
        </div>
        <div className="stat-card">
          <span>Forecast end</span>
          <strong>${stats.endBalance.toFixed(2)}</strong>
        </div>
        <div className="stat-card">
          <span>Shortfall days</span>
          <strong>{loading ? "—" : stats.shortfalls}</strong>
        </div>
      </section>

      <Link to="/scratchpad" className="card scratchpad-promo">
        <div>
          <h2 className="card-title">Test a what-if scenario →</h2>
          <p className="card-subtitle">
            Model a one-off withdrawal or windfall against your current forecast without saving anything.
          </p>
        </div>
      </Link>

      <div className="dashboard-links">
        <Link to="/accounts" className="card nav-card">
          <h3 className="card-title">Accounts</h3>
          <p className="card-subtitle">{accounts.length} account{accounts.length !== 1 ? "s" : ""} · ${stats.accountTotal.toFixed(2)} total</p>
        </Link>
        <Link to="/income" className="card nav-card">
          <h3 className="card-title">Income</h3>
          <p className="card-subtitle">{income.length} entries · ${stats.weightedIncome.toFixed(2)} weighted</p>
        </Link>
        <Link to="/obligations" className="card nav-card">
          <h3 className="card-title">Obligations</h3>
          <p className="card-subtitle">{obligations.length} entries · ${stats.weightedObligations.toFixed(2)} weighted</p>
        </Link>
        <Link to="/ask" className="card nav-card">
          <h3 className="card-title">Ask</h3>
          <p className="card-subtitle">Query your financial history in natural language</p>
        </Link>
      </div>

      <UserSettingsPanel settings={settings} onUpdate={updateSettings} />
    </div>
  );
}

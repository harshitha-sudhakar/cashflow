import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/authContext";
import type { Account, Forecast, IncomeEvent, Obligation } from "../lib/types";
import { certaintyValue } from "../lib/utils";
import { ForecastChart } from "../components/ForecastChart";

export function DashboardPage() {
  const { user } = useAuth();
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [income, setIncome] = useState<IncomeEvent[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const [forecastSnap, incomeSnap, obligationsSnap, accountsSnap] = await Promise.all([
        getDoc(doc(db, "forecasts", user!.uid)),
        getDocs(query(collection(db, "incomeEvents"), where("userId", "==", user!.uid))),
        getDocs(query(collection(db, "obligations"), where("userId", "==", user!.uid))),
        getDocs(query(collection(db, "accounts"), where("userId", "==", user!.uid))),
      ]);
      setForecast(forecastSnap.exists() ? (forecastSnap.data() as Forecast) : null);
      setIncome(incomeSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as IncomeEvent));
      setObligations(obligationsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Obligation));
      setAccounts(accountsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Account));
      setLoading(false);
    }
    load();
  }, [user]);

  const accountTotal = accounts.reduce((s, a) => s + a.balance, 0);
  const recentIncome = [...income]
    .filter((i) => !i.hidden)
    .sort((a, b) => b.expectedDate.localeCompare(a.expectedDate))
    .slice(0, 5);
  const recentObligations = [...obligations]
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
    .slice(0, 5);

  return (
    <div className="page-stack">
      <section className="page-hero card">
        <p className="eyebrow">Overview</p>
        <h1 className="page-title">Runway</h1>
        <p className="page-description">
          A neutral logging and forecasting tool. Track accounts, income, and obligations to see how
          your balance projects over time.
        </p>
        <div className="hero-actions">
          <Link to="/accounts" className="btn-primary" style={{ textDecoration: "none", display: "inline-block" }}>
            {accounts.length === 0 ? "Add your first account" : "Manage accounts"}
          </Link>
          <span className="hero-account-total">
            {accounts.length === 0 ? "No accounts yet" : `$${accountTotal.toFixed(2)} across ${accounts.length} account${accounts.length !== 1 ? "s" : ""}`}
          </span>
        </div>
      </section>

      <section className="card chart-card">
        <div className="card-headline-row">
          <div>
            <h2 className="card-title">Forecast preview</h2>
            <p className="card-subtitle">
              {forecast ? "Your projected balance over time." : "Log income and obligations, then visit the Forecast page to generate one."}
            </p>
          </div>
          <Link to="/forecast" className="btn-ghost btn-sm">Full forecast →</Link>
        </div>
        {loading ? (
          <p className="card-subtitle">Loading...</p>
        ) : forecast ? (
          <ForecastChart data={forecast.dailyProjection} height={220} />
        ) : (
          <p className="card-subtitle">No forecast yet.</p>
        )}
      </section>

      <Link to="/sandbox" className="card scratchpad-promo">
        <div>
          <h2 className="card-title">Test a what-if scenario →</h2>
          <p className="card-subtitle">
            Model a one-off withdrawal or windfall against your current forecast without saving anything.
          </p>
        </div>
      </Link>

      <section className="card">
        <div className="card-headline-row">
          <h2 className="card-title">Recent income</h2>
          <Link to="/income" className="btn-ghost btn-sm">View all →</Link>
        </div>
        {recentIncome.length === 0 ? (
          <p className="card-subtitle">Nothing logged yet.</p>
        ) : (
          <ul className="logged-list">
            {recentIncome.map((item) => (
              <li key={item.id}>
                <div className="logged-mainline">
                  <span className="logged-name">{item.source}</span>
                  <span className={`certainty-chip certainty-${certaintyValue(item)}`}>{certaintyValue(item)}</span>
                </div>
                <div className="logged-meta">
                  <span>${item.amount.toFixed(2)}</span>
                  <span>{new Date(item.expectedDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <div className="card-headline-row">
          <h2 className="card-title">Upcoming obligations</h2>
          <Link to="/obligations" className="btn-ghost btn-sm">View all →</Link>
        </div>
        {recentObligations.length === 0 ? (
          <p className="card-subtitle">Nothing logged yet.</p>
        ) : (
          <ul className="logged-list">
            {recentObligations.map((item) => (
              <li key={item.id}>
                <div className="logged-mainline">
                  <span className="logged-name">{item.name}</span>
                  <span className={`certainty-chip certainty-${certaintyValue(item)}`}>{certaintyValue(item)}</span>
                </div>
                <div className="logged-meta">
                  <span>${item.amount.toFixed(2)}</span>
                  <span>{new Date(item.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link to="/ask" className="card scratchpad-promo">
        <div>
          <h2 className="card-title">Ask about your finances →</h2>
          <p className="card-subtitle">
            Query your logged history in plain language — what's coming in, what's typically due, and when.
          </p>
        </div>
      </Link>
    </div>
  );
}

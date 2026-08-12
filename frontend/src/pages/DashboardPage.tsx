import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/authContext";
import type { Forecast, IncomeEvent, Obligation } from "../lib/types";
import { ShortfallCalendar } from "../components/ShortfallCalendar";
import { CreditHealthScore } from "../components/CreditHealthScore";

export function DashboardPage() {
  const { user } = useAuth();
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [income, setIncome] = useState<IncomeEvent[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function load() {
      const forecastSnap = await getDoc(doc(db, "forecasts", user!.uid));
      setForecast(forecastSnap.exists() ? (forecastSnap.data() as Forecast) : null);

      const incomeSnap = await getDocs(query(collection(db, "incomeEvents"), where("userId", "==", user!.uid)));
      setIncome(incomeSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as IncomeEvent));

      const obligationsSnap = await getDocs(query(collection(db, "obligations"), where("userId", "==", user!.uid)));
      setObligations(obligationsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Obligation));

      setLoading(false);
    }

    load();
  }, [user]);

  return (
    <div className="dashboard-grid">
      <div className="dashboard-main">
        <ShortfallCalendar forecast={forecast} loading={loading} />

        <div className="card">
          <h2 className="card-title">Logged income</h2>
          {income.length === 0 ? (
            <p className="card-subtitle">Nothing logged yet.</p>
          ) : (
            <ul className="logged-list">
              {income.map((e) => (
                <li key={e.id}>
                  <span>{e.source}</span>
                  <span>${e.amount.toFixed(2)}</span>
                  <span className="logged-date">
                    {new Date(e.expectedDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2 className="card-title">Logged obligations</h2>
          {obligations.length === 0 ? (
            <p className="card-subtitle">Nothing logged yet.</p>
          ) : (
            <ul className="logged-list">
              {obligations.map((o) => (
                <li key={o.id}>
                  <span>{o.name}</span>
                  <span>${o.amount.toFixed(2)}</span>
                  <span className="logged-date">
                    {new Date(o.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="dashboard-side">
        <CreditHealthScore income={income} obligations={obligations} forecast={forecast} />
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/authContext";
import { useUserSettings } from "../lib/useUserSettings";
import { ML_SERVICE_URL } from "../lib/utils";
import type { Forecast, ForecastPoint, HypotheticalEntry } from "../lib/types";
import { ForecastChart } from "../components/ForecastChart";

export function ScratchpadPage() {
  const { user } = useAuth();
  const { settings } = useUserSettings(user?.uid);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [simulated, setSimulated] = useState<ForecastPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [entryType, setEntryType] = useState<"income" | "expense">("expense");
  const [name, setName] = useState("What-if");

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "forecasts", user.uid)).then((snap) => {
      setForecast(snap.exists() ? (snap.data() as Forecast) : null);
      setLoading(false);
    });
  }, [user]);

  async function handleSimulate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSimulating(true);
    setError(null);

    const hypothetical: HypotheticalEntry = {
      type: entryType,
      amount: parseFloat(amount),
      date,
      name,
    };

    try {
      const res = await fetch(`${ML_SERVICE_URL}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          horizonDays: settings.forecastHorizonDays,
          hypothetical,
        }),
      });
      if (!res.ok) throw new Error(`Simulate returned ${res.status}`);
      const data = await res.json();
      setSimulated(data.dailyProjection);
    } catch {
      setError("Couldn't reach the forecast service. Is api.py running on port 5001?");
    } finally {
      setSimulating(false);
    }
  }

  function clearSimulation() {
    setSimulated(null);
    setAmount("");
    setDate("");
    setName("What-if");
  }

  return (
    <div className="page-stack scratchpad-page">
      <section className="page-hero card">
        <p className="eyebrow">Scratchpad</p>
        <h1 className="page-title">Test a what-if scenario</h1>
        <p className="page-description">
          Model a one-off withdrawal or windfall against your current forecast. Nothing here is saved — it's a sandbox for exploring outcomes.
        </p>
      </section>

      <section className="card">
        <h2 className="card-title">Hypothetical entry</h2>
        <form onSubmit={handleSimulate} className="stacked-form">
          <div className="form-row">
            <label className="form-label">
              Type
              <select value={entryType} onChange={(e) => setEntryType(e.target.value as "income" | "expense")}>
                <option value="income">Income / windfall</option>
                <option value="expense">Expense / withdrawal</option>
              </select>
            </label>
            <label className="form-label">
              Amount ($)
              <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </label>
          </div>
          <div className="form-row">
            <label className="form-label">
              Date
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </label>
            <label className="form-label">
              Label (optional)
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="What-if" />
            </label>
          </div>
          {error && <p className="auth-error">{error}</p>}
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={simulating}>
              {simulating ? "Running..." : "Run simulation"}
            </button>
            {simulated && (
              <button type="button" className="btn-ghost" onClick={clearSimulation}>Clear</button>
            )}
          </div>
        </form>
      </section>

      <section className="card chart-card">
        <h2 className="card-title">Projection comparison</h2>
        <p className="card-subtitle">
          {simulated
            ? "Solid line is your current forecast. Dashed line shows the simulated outcome."
            : "Run a simulation above to see how your balance would change."}
        </p>
        {loading ? (
          <p className="card-subtitle">Loading forecast...</p>
        ) : !forecast ? (
          <p className="card-subtitle">Generate a forecast first from the Forecast page.</p>
        ) : (
          <ForecastChart
            data={forecast.dailyProjection}
            simulatedData={simulated ?? undefined}
            comfortBuffer={settings.comfortBuffer}
            height={480}
          />
        )}
      </section>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/authContext";
import type { CashFlowCertainty, Obligation } from "../lib/types";
import { certaintyValue, computeRecurrenceWindow, computeAmountSparkline } from "../lib/utils";
import { RecurrenceRangeBar, AmountSparkline } from "../components/RecurrenceRangeBar";
import { BACKEND_URL } from "../lib/utils";

export function ObligationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nessieSyncing, setNessieSyncing] = useState(false);
  const [nessieMessage, setNessieMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [priority, setPriority] = useState<"fixed" | "flexible">("fixed");
  const [certainty, setCertainty] = useState<CashFlowCertainty>("confirmed");

  const groupedNames = useMemo(() => {
    const names = new Set(items.map((o) => o.name));
    return Array.from(names);
  }, [items]);

  async function loadItems() {
    if (!user) return;
    const snap = await getDocs(query(collection(db, "obligations"), where("userId", "==", user.uid)));
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Obligation);
    data.sort((a, b) => b.dueDate.localeCompare(a.dueDate));
    setItems(data);
    setLoading(false);
  }

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    try {
      await addDoc(collection(db, "obligations"), {
        userId: user.uid,
        name,
        amount: parseFloat(amount),
        dueDate,
        status: "upcoming",
        recurring,
        priority,
        certainty,
        excludedFromForecast: false,
        hidden: false,
      });
      setName("");
      setAmount("");
      setDueDate("");
      setShowAdd(false);
      await loadItems();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function updateField(id: string, field: string, value: unknown) {
    await updateDoc(doc(db, "obligations", id), { [field]: value });
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  }

  async function toggleExclude(id: string, current: boolean) {
    await updateField(id, "excludedFromForecast", !current);
  }

  async function toggleHidden(id: string, current: boolean) {
    await updateField(id, "hidden", !current);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this obligation? This can't be undone.")) return;
    await deleteDoc(doc(db, "obligations", id));
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function syncFromNessie() {
    if (!user) return;
    setNessieSyncing(true);
    setNessieMessage(null);
    setError(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/nessie/snapshot`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? `Nessie returned ${response.status}`);

      const existingBills = new Set(items.map((item) => item.nessieBillId).filter(Boolean));
      const existingSeries = new Set(items.map((item) => item.nessieSeriesKey).filter(Boolean));

      let importedHistory = 0;
      let importedForecasts = 0;

      for (const bill of payload.bills as Array<{
        _id?: string;
        payee: string;
        nickname: string;
        payment_date: string;
        payment_amount: number;
      }>) {
        if (!bill._id || existingBills.has(bill._id)) continue;
        await addDoc(collection(db, "obligations"), {
          userId: user.uid,
          name: bill.payee || bill.nickname || "Nessie bill",
          amount: Number(bill.payment_amount),
          dueDate: bill.payment_date,
          status: "paid",
          recurring: false,
          priority: "fixed",
          certainty: "confirmed",
          hidden: true,
          excludedFromForecast: false,
          nessieBillId: bill._id,
        });
        importedHistory += 1;
      }

      const today = new Date();
      for (const pattern of payload.patterns as Array<{
        payee: string;
        averageAmount: number;
        sampleDates: string[];
      }>) {
        if (!pattern.payee || existingSeries.has(pattern.payee)) continue;

        const latest = [...pattern.sampleDates].sort().at(-1);
        if (!latest) continue;

        const anchor = new Date(`${latest}T12:00:00`);
        let next = new Date(anchor);
        do {
          next = new Date(next.getFullYear(), next.getMonth() + 1, Math.min(anchor.getDate(), 28), 12);
        } while (next < today);

        const nextDate = next.toISOString().slice(0, 10);
        await addDoc(collection(db, "obligations"), {
          userId: user.uid,
          name: pattern.payee,
          amount: Number(pattern.averageAmount),
          dueDate: nextDate,
          status: "upcoming",
          recurring: true,
          priority: "fixed",
          certainty: "likely",
          hidden: false,
          excludedFromForecast: false,
          nessieSeriesKey: pattern.payee,
          source: "nessie",
        });
        importedForecasts += 1;
      }

      await loadItems();
      setShowHidden(false);
      setNessieMessage(
        `Nessie synced: ${importedHistory} historical bill${importedHistory === 1 ? "" : "s"} and ${importedForecasts} forecast entr${importedForecasts === 1 ? "y" : "ies"} added.`
      );
    } catch (err) {
      setNessieMessage(null);
      setError((err as Error).message);
    } finally {
      setNessieSyncing(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="page-hero card">
        <p className="eyebrow">Obligations</p>
        <h1 className="page-title">Scheduled outflows</h1>
        <p className="page-description">
          Bills, subscriptions, and payments due on specific dates. Recurrence patterns appear when you have 2+ entries for the same name.
        </p>
        <button className="btn-primary" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? "Cancel" : "Log new obligation"}
        </button>
      </section>

      <section className="card nessie-card">
        <div className="card-headline-row">
          <div>
            <p className="eyebrow">Connected data</p>
            <h2 className="card-title">Nessie bill history</h2>
            <p className="card-subtitle">
              Pull bill history from the configured Nessie account. Historical rows become pattern data, while the next recurring occurrence feeds the forecast.
            </p>
          </div>
          <button className="btn-secondary btn-sm" onClick={syncFromNessie} disabled={nessieSyncing}>
            {nessieSyncing ? "Syncing…" : "Sync Nessie"}
          </button>
        </div>
        {nessieMessage && <p className="sync-message">{nessieMessage}</p>}
      </section>

      {groupedNames.length > 0 && (
        <section className="card">
          <h2 className="card-title">Recurrence patterns</h2>
          <p className="card-subtitle">Visual summary of when each obligation typically lands.</p>
          <ul className="pattern-list">
            {groupedNames.map((obligationName) => {
              const window = computeRecurrenceWindow(items, obligationName);
              const sparkline = computeAmountSparkline(items, obligationName);
              if (!window) return null;
              return (
                <li key={obligationName} className="pattern-row">
                  <span className="pattern-name">{obligationName}</span>
                  <RecurrenceRangeBar minDay={window.minDay} maxDay={window.maxDay} />
                  {sparkline && <AmountSparkline amounts={sparkline} />}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {showAdd && (
        <section className="card">
          <h2 className="card-title">New obligation</h2>
          <form onSubmit={handleAdd} className="stacked-form">
            <label className="form-label">
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rent, Electric" required />
            </label>
            <div className="form-row">
              <label className="form-label">
                Amount ($)
                <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </label>
              <label className="form-label">
                Due date
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
              </label>
            </div>
            <div className="form-row">
              <label className="form-label">
                Priority
                <select value={priority} onChange={(e) => setPriority(e.target.value as "fixed" | "flexible")}>
                  <option value="fixed">Fixed</option>
                  <option value="flexible">Flexible</option>
                </select>
              </label>
              <label className="form-label">
                Certainty
                <select value={certainty} onChange={(e) => setCertainty(e.target.value as CashFlowCertainty)}>
                  <option value="confirmed">Confirmed</option>
                  <option value="likely">Likely</option>
                  <option value="speculative">Speculative</option>
                </select>
              </label>
            </div>
            <label className="form-checkbox">
              <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
              Recurring
            </label>
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" className="btn-primary">Save entry</button>
          </form>
        </section>
      )}

      <section className="card">
        <div className="card-headline-row">
          <h2 className="card-title">All entries</h2>
          {items.some((i) => i.hidden) && (
            <button className="btn-ghost btn-sm" onClick={() => setShowHidden(!showHidden)}>
              {showHidden ? "Hide hidden entries" : `Show ${items.filter((i) => i.hidden).length} hidden`}
            </button>
          )}
        </div>
        {loading ? (
          <p className="card-subtitle">Loading...</p>
        ) : items.filter((i) => showHidden || !i.hidden).length === 0 ? (
          <p className="card-subtitle">Nothing logged yet.</p>
        ) : (
          <ul className="editable-list">
            {items.filter((i) => showHidden || !i.hidden).map((item) => {
              const window = computeRecurrenceWindow(items, item.name);
              return (
                <li key={item.id} className={`editable-row ${item.excludedFromForecast ? "row-excluded" : ""}`}>
                  <div className="editable-fields">
                    <label className="inline-field inline-field-wide">
                      <span className="field-label">Name</span>
                      <div className="name-with-pattern">
                        <input
                          defaultValue={item.name}
                          onBlur={(e) => e.target.value !== item.name && updateField(item.id!, "name", e.target.value)}
                        />
                        {window && <RecurrenceRangeBar minDay={window.minDay} maxDay={window.maxDay} />}
                      </div>
                    </label>
                    <label className="inline-field">
                      <span className="field-label">Amount</span>
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={item.amount}
                        onBlur={(e) => {
                          const val = parseFloat(e.target.value);
                          if (val !== item.amount) updateField(item.id!, "amount", val);
                        }}
                      />
                    </label>
                    <label className="inline-field">
                      <span className="field-label">Due date</span>
                      <input
                        type="date"
                        defaultValue={item.dueDate}
                        onBlur={(e) => e.target.value !== item.dueDate && updateField(item.id!, "dueDate", e.target.value)}
                      />
                    </label>
                    <label className="inline-field">
                      <span className="field-label">Certainty</span>
                      <select
                        defaultValue={certaintyValue(item)}
                        onChange={(e) => updateField(item.id!, "certainty", e.target.value)}
                      >
                        <option value="confirmed">Confirmed</option>
                        <option value="likely">Likely</option>
                        <option value="speculative">Speculative</option>
                      </select>
                    </label>
                  </div>
                  <div className="editable-actions">
                    <div className="editable-actions-left">
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={!!item.excludedFromForecast}
                          onChange={() => toggleExclude(item.id!, !!item.excludedFromForecast)}
                        />
                        Exclude from forecast
                      </label>
                    </div>
                    <div className="editable-actions-right">
                      <button className="btn-ghost btn-sm" onClick={() => toggleHidden(item.id!, !!item.hidden)}>
                        {item.hidden ? "Unhide" : "Hide"}
                      </button>
                      <button className="btn-ghost btn-sm btn-danger" onClick={() => handleDelete(item.id!)}>
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

import { useEffect, useState } from "react";
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
import type { CashFlowCertainty, IncomeEvent } from "../lib/types";
import { certaintyValue } from "../lib/utils";

export function IncomePage() {
  const { user } = useAuth();
  const [items, setItems] = useState<IncomeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [certainty, setCertainty] = useState<CashFlowCertainty>("confirmed");
  const [expectedDate, setExpectedDate] = useState("");
  const [category, setCategory] = useState("gig");
  const [recurring, setRecurring] = useState(false);

  async function loadItems() {
    if (!user) return;
    const snap = await getDocs(query(collection(db, "incomeEvents"), where("userId", "==", user.uid)));
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as IncomeEvent);
    data.sort((a, b) => b.expectedDate.localeCompare(a.expectedDate));
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
      await addDoc(collection(db, "incomeEvents"), {
        userId: user.uid,
        source,
        amount: parseFloat(amount),
        status: certainty,
        certainty,
        confidence: certainty === "confirmed" ? 1 : certainty === "likely" ? 0.7 : 0.35,
        expectedDate,
        category,
        recurring,
        excludedFromForecast: false,
        hidden: false,
      });
      setSource("");
      setAmount("");
      setExpectedDate("");
      setRecurring(false);
      setShowAdd(false);
      await loadItems();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function updateField(id: string, field: string, value: unknown) {
    await updateDoc(doc(db, "incomeEvents", id), { [field]: value });
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  }

  async function markReceived(id: string) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const prior = certaintyValue(item);
    await updateDoc(doc(db, "incomeEvents", id), {
      status: "confirmed",
      certainty: "confirmed",
      confidence: 1,
      previousCertainty: prior === "confirmed" ? "likely" : prior,
    });
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, status: "confirmed", certainty: "confirmed", confidence: 1, previousCertainty: prior === "confirmed" ? "likely" : prior }
          : i,
      ),
    );
  }

  async function unmarkReceived(id: string) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const restore = item.previousCertainty ?? "likely";
    const confidence = restore === "confirmed" ? 1 : restore === "likely" ? 0.7 : 0.35;
    await updateDoc(doc(db, "incomeEvents", id), {
      status: restore,
      certainty: restore,
      confidence,
    });
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: restore, certainty: restore, confidence } : i)),
    );
  }

  async function toggleExclude(id: string, current: boolean) {
    await updateField(id, "excludedFromForecast", !current);
  }

  async function toggleHidden(id: string, current: boolean) {
    await updateField(id, "hidden", !current);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this income entry? This can't be undone.")) return;
    await deleteDoc(doc(db, "incomeEvents", id));
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const visibleItems = items.filter((item) => showHidden || !item.hidden);
  const hiddenCount = items.filter((item) => item.hidden).length;

  return (
    <div className="page-stack">
      <section className="page-hero card">
        <p className="eyebrow">Income</p>
        <h1 className="page-title">Expected income</h1>
        <p className="page-description">
          Track expected and received cash. Edit any row inline, mark items as received, or exclude
          sources from the forecast for what-if filtering.
        </p>
        <button className="btn-primary" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? "Cancel" : "Log new income"}
        </button>
      </section>

      {showAdd && (
        <section className="card">
          <h2 className="card-title">New income entry</h2>
          <form onSubmit={handleAdd} className="stacked-form">
            <label className="form-label">
              Source
              <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. DoorDash, Sponsor" required />
            </label>
            <div className="form-row">
              <label className="form-label">
                Amount ($)
                <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </label>
              <label className="form-label">
                Expected date
                <input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} required />
              </label>
            </div>
            <div className="form-row">
              <label className="form-label">
                Certainty
                <select value={certainty} onChange={(e) => setCertainty(e.target.value as CashFlowCertainty)}>
                  <option value="confirmed">Confirmed</option>
                  <option value="likely">Likely</option>
                  <option value="speculative">Speculative</option>
                </select>
              </label>
              <label className="form-label">
                Category
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="gig">Gig work</option>
                  <option value="freelance">Freelance</option>
                  <option value="sponsorship">Sponsorship</option>
                  <option value="salary">Salary</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>
            <label className="form-checkbox">
              <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
              Recurring (repeats weekly, e.g. every weekend)
            </label>
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" className="btn-primary">Save entry</button>
          </form>
        </section>
      )}

      <section className="card">
        <div className="card-headline-row">
          <h2 className="card-title">All entries</h2>
          {hiddenCount > 0 && (
            <button className="btn-ghost btn-sm" onClick={() => setShowHidden(!showHidden)}>
              {showHidden ? "Hide hidden entries" : `Show ${hiddenCount} hidden`}
            </button>
          )}
        </div>
        {loading ? (
          <p className="card-subtitle">Loading...</p>
        ) : visibleItems.length === 0 ? (
          <p className="card-subtitle">Nothing logged yet.</p>
        ) : (
          <ul className="editable-list">
            {visibleItems.map((item) => (
              <li key={item.id} className={`editable-row ${item.excludedFromForecast ? "row-excluded" : ""}`}>
                <div className="editable-fields">
                  <label className="inline-field">
                    <span className="field-label">Source</span>
                    <input
                      defaultValue={item.source}
                      onBlur={(e) => e.target.value !== item.source && updateField(item.id!, "source", e.target.value)}
                    />
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
                    <span className="field-label">Date</span>
                    <input
                      type="date"
                      defaultValue={item.expectedDate}
                      onBlur={(e) => e.target.value !== item.expectedDate && updateField(item.id!, "expectedDate", e.target.value)}
                    />
                  </label>
                  <label className="inline-field">
                    <span className="field-label">Certainty</span>
                    <select
                      defaultValue={certaintyValue(item)}
                      onChange={(e) => {
                        const c = e.target.value as CashFlowCertainty;
                        updateField(item.id!, "certainty", c);
                        updateField(item.id!, "status", c);
                        updateField(item.id!, "confidence", c === "confirmed" ? 1 : c === "likely" ? 0.7 : 0.35);
                      }}
                    >
                      <option value="confirmed">Confirmed</option>
                      <option value="likely">Likely</option>
                      <option value="speculative">Speculative</option>
                    </select>
                  </label>
                </div>
                <div className="editable-actions">
                  <div className="editable-actions-left">
                    {certaintyValue(item) !== "confirmed" ? (
                      <button className="btn-ghost btn-sm" onClick={() => markReceived(item.id!)}>
                        Mark as received
                      </button>
                    ) : (
                      <button className="btn-ghost btn-sm" onClick={() => unmarkReceived(item.id!)}>
                        Unmark as received
                      </button>
                    )}
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
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

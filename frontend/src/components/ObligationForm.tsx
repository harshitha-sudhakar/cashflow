import { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/authContext";
import type { CashFlowCertainty } from "../lib/types";

interface ObligationFormProps {
  onLogged?: () => void;
}

export function ObligationForm({ onLogged }: ObligationFormProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [priority, setPriority] = useState<"fixed" | "flexible">("fixed");
  const [certainty, setCertainty] = useState<CashFlowCertainty>("confirmed");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      setError("No signed-in user found — try logging out and back in.");
      return;
    }
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
      });
      setSubmitted(true);
      setName("");
      setAmount("");
      setDueDate("");
      setRecurring(false);
      onLogged?.();
      setTimeout(() => setSubmitted(false), 2500);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="card">
      <h2 className="card-title">Log an obligation</h2>
      <p className="card-subtitle">
        Anything due on a specific date — a bill, a vendor payment, a subscription. Use certainty to tell the forecast how hard it should lean on that number.
      </p>

      {submitted && <div className="success-banner">Logged — check your dashboard.</div>}

      <form onSubmit={handleSubmit} className="stacked-form">
        <label className="form-label">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rent, Affirm payment, Vendor deposit" required />
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
        <button type="submit" className="btn-primary">Log obligation</button>
      </form>
    </div>
  );
}

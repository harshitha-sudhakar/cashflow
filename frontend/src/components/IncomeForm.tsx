import { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/authContext";

interface IncomeFormProps {
  onLogged?: () => void;
}

export function IncomeForm({ onLogged }: IncomeFormProps) {
  const { user } = useAuth();
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"confirmed" | "pledged">("confirmed");
  const [confidence, setConfidence] = useState("0.7");
  const [expectedDate, setExpectedDate] = useState("");
  const [category, setCategory] = useState("gig");
  const [recurring, setRecurring] = useState(false);
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
      await addDoc(collection(db, "incomeEvents"), {
        userId: user.uid,
        source,
        amount: parseFloat(amount),
        status,
        confidence: status === "confirmed" ? 1 : parseFloat(confidence),
        expectedDate,
        category,
        recurring,
      });
      setSubmitted(true);
      setSource("");
      setAmount("");
      setExpectedDate("");
      setRecurring(false);
      onLogged?.();
      setTimeout(() => setSubmitted(false), 2500);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="card">
      <h2 className="card-title">Log income</h2>
      <p className="card-subtitle">
        "Highly likely" is money that's landed or contractually guaranteed. "Likely / speculative" is
        anything not certain yet — set how confident you are with the slider.
      </p>

      {submitted && <div className="success-banner">Logged — check your dashboard.</div>}

      <form onSubmit={handleSubmit} className="stacked-form">
        <label className="form-label">
          Source
          <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. DoorDash, Sponsor - Acme Corp" required />
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
            Likelihood
            <select value={status} onChange={(e) => setStatus(e.target.value as "confirmed" | "pledged")}>
              <option value="confirmed">Highly likely</option>
              <option value="pledged">Likely / speculative</option>
            </select>
          </label>
          {status === "pledged" && (
            <label className="form-label">
              Confidence ({Math.round(parseFloat(confidence) * 100)}%)
              <input type="range" min="0.1" max="0.9" step="0.1" value={confidence} onChange={(e) => setConfidence(e.target.value)} />
            </label>
          )}
        </div>

        <div className="form-row">
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
          <label className="form-checkbox">
            <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
            Recurring (e.g. every weekend)
          </label>
        </div>

        {error && <p className="auth-error">{error}</p>}
        <button type="submit" className="btn-primary">Log income</button>
      </form>
    </div>
  );
}
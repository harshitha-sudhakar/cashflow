import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/authContext";
import type { Account } from "../lib/types";

export function AccountsPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function loadAccounts() {
    if (!user) return;
    const snap = await getDocs(query(collection(db, "accounts"), where("userId", "==", user.uid)));
    setAccounts(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Account));
    setLoading(false);
  }

  useEffect(() => {
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  function startEdit(account: Account) {
    setEditingId(account.id!);
    setName(account.name);
    setBalance(String(account.balance));
    setError(null);
  }

  function cancelForm() {
    setEditingId(null);
    setName("");
    setBalance("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);

    const data = {
      userId: user.uid,
      name,
      balance: parseFloat(balance),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "accounts", editingId), data);
      } else {
        await addDoc(collection(db, "accounts"), data);
      }
      cancelForm();
      await loadAccounts();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="page-stack">
      <section className="page-hero card">
        <p className="eyebrow">Accounts</p>
        <h1 className="page-title">Your account balances</h1>
        <p className="page-description">
          These totals feed the forecast starting balance. Add checking, savings, or any account you track.
        </p>
        <div className="hero-stat">
          <span>Combined balance</span>
          <strong className="gradient-number">${totalBalance.toFixed(2)}</strong>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">{editingId ? "Edit account" : "Add account"}</h2>
        <form onSubmit={handleSubmit} className="stacked-form">
          <div className="form-row">
            <label className="form-label">
              Account name
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Checking, Savings" required />
            </label>
            <label className="form-label">
              Current balance ($)
              <input type="number" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} required />
            </label>
          </div>
          {error && <p className="auth-error">{error}</p>}
          <div className="form-actions">
            <button type="submit" className="btn-primary">{editingId ? "Save changes" : "Add account"}</button>
            {editingId && (
              <button type="button" className="btn-ghost" onClick={cancelForm}>Cancel</button>
            )}
          </div>
        </form>
      </section>

      <section className="card">
        <h2 className="card-title">All accounts</h2>
        {loading ? (
          <p className="card-subtitle">Loading...</p>
        ) : accounts.length === 0 ? (
          <p className="card-subtitle">No accounts yet. Add one above to start forecasting.</p>
        ) : (
          <ul className="data-table">
            {accounts.map((a) => (
              <li key={a.id} className="data-row">
                <div className="data-row-main">
                  <span className="data-name">{a.name}</span>
                  <span className="data-amount">${a.balance.toFixed(2)}</span>
                </div>
                <div className="data-row-meta">
                  <span>Updated {new Date(a.updatedAt).toLocaleDateString()}</span>
                  <button className="btn-ghost btn-sm" onClick={() => startEdit(a)}>Edit</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(humanizeAuthError((err as Error).message));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-panel">
        <div className="auth-mark" aria-hidden="true">
          <svg viewBox="0 0 64 40" width="52" height="32">
            <path d="M2 30 C 16 30, 20 10, 32 10 C 44 10, 48 30, 62 30" fill="none" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round" />
            <path d="M2 34 C 16 34, 20 18, 32 18 C 44 18, 48 34, 62 34" fill="none" stroke="var(--color-amber)" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
          </svg>
        </div>
        <h1 className="auth-title">Cashflow Clarity</h1>
        <p className="auth-tagline">Know where you stand before the money does.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-label">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label className="auth-label">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        <button
          type="button"
          className="auth-switch"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
          }}
        >
          {mode === "login" ? "New here? Create an account" : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  );
}

function humanizeAuthError(message: string): string {
  if (message.includes("auth/invalid-credential") || message.includes("auth/wrong-password")) {
    return "That email and password don't match our records.";
  }
  if (message.includes("auth/email-already-in-use")) {
    return "An account already exists for that email. Try logging in instead.";
  }
  if (message.includes("auth/weak-password")) {
    return "Password should be at least 6 characters.";
  }
  if (message.includes("auth/invalid-email")) {
    return "That doesn't look like a valid email address.";
  }
  return "Something went wrong. Try again.";
}

import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "signup">("login");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (

    <form onSubmit={handleSubmit} style={{ maxWidth: 320, margin: "4rem auto" }}>
      <h2>{mode === "login" ? "Log in" : "Sign up"}</h2>
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ display: "block", width: "100%", marginBottom: 8 }} />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ display: "block", width: "100%", marginBottom: 8 }} />
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <button type="submit">{mode === "login" ? "Log in" : "Sign up"}</button>
      <p onClick={() => setMode(mode === "login" ? "signup" : "login")} style={{ cursor: "pointer", color: "gray", fontSize: 14 }}>
        {mode === "login" ? "Need an account? Sign up" : "Already have an account? Log in"}
      </p>
      
    </form>
  );
}


import { NavLink } from "react-router-dom";
import { useAuth } from "../lib/authContext";

const routes = [
  { to: "/", label: "Overview", end: true },
  { to: "/accounts", label: "Accounts" },
  { to: "/income", label: "Income" },
  { to: "/obligations", label: "Obligations" },
  { to: "/forecast", label: "Forecast" },
  { to: "/scratchpad", label: "Scratchpad" },
  { to: "/ask", label: "Ask" },
];

export function NavBar() {
  const { user, signOut } = useAuth();

  return (
    <header className="navbar">
      <NavLink to="/" className="navbar-brand">
        <svg viewBox="0 0 64 40" width="28" height="18" aria-hidden="true">
          <path d="M2 30 C 16 30, 20 10, 32 10 C 44 10, 48 30, 62 30" fill="none" stroke="var(--color-primary-bright)" strokeWidth="4" strokeLinecap="round" />
        </svg>
        <span>Cashflow Clarity</span>
      </NavLink>

      <nav className="navbar-tabs">
        {routes.map((r) => (
          <NavLink
            key={r.to}
            to={r.to}
            end={r.end}
            className={({ isActive }) => (isActive ? "tab active" : "tab")}
          >
            {r.label}
          </NavLink>
        ))}
      </nav>

      <div className="navbar-user">
        <span className="navbar-email">{user?.email}</span>
        <button className="btn-ghost" onClick={() => signOut()}>
          Sign out
        </button>
      </div>
    </header>
  );
}

import { NavLink } from "react-router-dom";
import { useAuth } from "../lib/authContext";

export function NavBar() {
  const { user, signOut } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <svg viewBox="0 0 64 40" width="28" height="18" aria-hidden="true">
          <path
            d="M2 30 C 16 30, 20 10, 32 10 C 44 10, 48 30, 62 30"
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>

        <span>Runway</span>
      </div>

      <nav className="navbar-tabs">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            isActive ? "tab active" : "tab"
          }
        >
          Dashboard
        </NavLink>

        <NavLink
          to="/income"
          className={({ isActive }) =>
            isActive ? "tab active" : "tab"
          }
        >
          Income
        </NavLink>

        <NavLink
          to="/obligations"
          className={({ isActive }) =>
            isActive ? "tab active" : "tab"
          }
        >
          Obligations
        </NavLink>

        <NavLink
          to="/forecast"
          className={({ isActive }) =>
            isActive ? "tab active" : "tab"
          }
        >
          Forecast
        </NavLink>

        <NavLink
          to="/accounts"
          className={({ isActive }) =>
            isActive ? "tab active" : "tab"
          }
        >
          Accounts
        </NavLink>
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

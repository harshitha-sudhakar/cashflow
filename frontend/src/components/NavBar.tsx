import { useAuth } from "../lib/authContext";

interface NavBarProps {
  activeTab: "dashboard" | "income" | "obligations";
  onTabChange: (tab: "dashboard" | "income" | "obligations") => void;
}

export function NavBar({ activeTab, onTabChange }: NavBarProps) {
  const { user, signOut } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <svg viewBox="0 0 64 40" width="28" height="18" aria-hidden="true">
          <path d="M2 30 C 16 30, 20 10, 32 10 C 44 10, 48 30, 62 30" fill="none" stroke="var(--color-primary)" strokeWidth="4" strokeLinecap="round" />
        </svg>
        <span>Cashflow Clarity</span>
      </div>

      <nav className="navbar-tabs">
        <button className={activeTab === "dashboard" ? "tab active" : "tab"} onClick={() => onTabChange("dashboard")}>
          Dashboard
        </button>
        <button className={activeTab === "income" ? "tab active" : "tab"} onClick={() => onTabChange("income")}>
          Log income
        </button>
        <button className={activeTab === "obligations" ? "tab active" : "tab"} onClick={() => onTabChange("obligations")}>
          Log obligations
        </button>
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

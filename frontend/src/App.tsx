import { useState } from "react";
import { useAuth } from "./lib/authContext";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { NavBar } from "./components/NavBar";
import { IncomeForm } from "./components/IncomeForm";
import { ObligationForm } from "./components/ObligationForm";
import "./index.css";

type Tab = "dashboard" | "income" | "obligations";

function App() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);

  if (loading) {
    return (
      <div className="auth-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="app-shell">
      <NavBar activeTab={tab} onTabChange={setTab} />
      <main className="app-content">
        {tab === "dashboard" && <DashboardPage key={refreshKey} />}
        {tab === "income" && <IncomeForm onLogged={() => setRefreshKey((k) => k + 1)} />}
        {tab === "obligations" && <ObligationForm onLogged={() => setRefreshKey((k) => k + 1)} />}
      </main>
    </div>
  );
}

export default App;

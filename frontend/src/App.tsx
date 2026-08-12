import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./lib/authContext";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { AccountsPage } from "./pages/AccountsPage";
import { IncomePage } from "./pages/IncomePage";
import { ObligationsPage } from "./pages/ObligationsPage";
import { ForecastPage } from "./pages/ForecastPage";
import { ScratchpadPage } from "./pages/ScratchpadPage";
import { AskPage } from "./pages/AskPage";
import { NavBar } from "./components/NavBar";
import "./index.css";

function AppRoutes() {
  const { user, loading } = useAuth();

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
      <NavBar />
      <main className="app-content">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/income" element={<IncomePage />} />
          <Route path="/obligations" element={<ObligationsPage />} />
          <Route path="/forecast" element={<ForecastPage />} />
          <Route path="/scratchpad" element={<ScratchpadPage />} />
          <Route path="/ask" element={<AskPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;

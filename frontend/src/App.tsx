import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "./lib/authContext";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { AccountsPage } from "./pages/AccountsPage";
import { IncomePage } from "./pages/IncomePage";
import { ObligationsPage } from "./pages/ObligationsPage";
import { ForecastPage } from "./pages/ForecastPage";
import { SandboxPage } from "./pages/SandboxPage";
import { AskPage } from "./pages/AskPage";
import { NavBar } from "./components/NavBar";
import { AmbientBackground } from "./components/AmbientBackground";
import "./index.css";



function AppRoutes() {
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  if (loading) {
    return (
      <>
        <AmbientBackground />
        <div className="auth-screen">
          <p>Loading...</p>
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <AmbientBackground />
        {showAuth ? <LoginPage onBack={() => setShowAuth(false)} /> : <LandingPage onGetStarted={() => setShowAuth(true)} />}
      </>
    );
  }

  return (
    <>
      <AmbientBackground />
      <div className="app-shell">
        <NavBar />
        <main className="app-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/income" element={<IncomePage />} />
            <Route path="/obligations" element={<ObligationsPage />} />
            <Route path="/forecast" element={<ForecastPage />} />
            <Route path="/sandbox" element={<SandboxPage />} />
            <Route path="/ask" element={<AskPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </>
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

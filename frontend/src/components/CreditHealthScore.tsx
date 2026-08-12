import type { IncomeEvent, Obligation, Forecast } from "../lib/types";

interface CreditHealthScoreProps {
  income: IncomeEvent[];
  obligations: Obligation[];
  forecast: Forecast | null;
}

interface ScoreBreakdown {
  score: number;
  label: string;
  factors: { name: string; detail: string; impact: number }[];
}

/**
 * Deliberately not a black-box score. Fintech "health scores" that can't
 * explain themselves are a red flag - this one lists exactly what moved
 * the number, in plain language, every time.
 */
function computeHealthScore(income: IncomeEvent[], obligations: Obligation[], forecast: Forecast | null): ScoreBreakdown {
  if (income.length === 0 && obligations.length === 0) {
    return {
      score: 0,
      label: "No data yet",
      factors: [{ name: "Get started", detail: "Log income and obligations to see your score", impact: 0 }],
    };
  }

  const factors: { name: string; detail: string; impact: number }[] = [];
  let score = 100;

  const confirmed = income.filter((e) => e.status === "confirmed");
  const pledged = income.filter((e) => e.status === "pledged");
  const totalIncome = confirmed.reduce((s, e) => s + e.amount, 0) + pledged.reduce((s, e) => s + e.amount, 0);
  const pledgedShare = totalIncome > 0 ? pledged.reduce((s, e) => s + e.amount, 0) / totalIncome : 0;

  if (pledgedShare > 0.5) {
    const impact = -Math.round(pledgedShare * 20);
    score += impact;
    factors.push({
      name: "Income certainty",
      detail: `${Math.round(pledgedShare * 100)}% of logged income is pledged, not confirmed`,
      impact,
    });
  } else {
    factors.push({ name: "Income certainty", detail: "Most income is confirmed, not just pledged", impact: 0 });
  }

  const fixedObligations = obligations.filter((o) => o.priority === "fixed").reduce((s, o) => s + o.amount, 0);
  const confirmedIncome = confirmed.reduce((s, e) => s + e.amount, 0);
  if (fixedObligations > 0) {
    const coverageRatio = confirmedIncome / fixedObligations;
    if (coverageRatio < 1) {
      const impact = -25;
      score += impact;
      factors.push({
        name: "Obligation coverage",
        detail: "Confirmed income alone doesn't cover fixed obligations",
        impact,
      });
    } else if (coverageRatio < 1.5) {
      const impact = -10;
      score += impact;
      factors.push({
        name: "Obligation coverage",
        detail: "Confirmed income covers fixed obligations, but with little buffer",
        impact,
      });
    } else {
      factors.push({ name: "Obligation coverage", detail: "Confirmed income comfortably covers fixed obligations", impact: 0 });
    }
  }

  if (forecast) {
    const shortfallDays = forecast.shortfallDates.length;
    if (shortfallDays > 0) {
      const impact = -Math.min(30, shortfallDays * 4);
      score += impact;
      factors.push({
        name: "Shortfall risk",
        detail: `${shortfallDays} day(s) in the next ${forecast.horizonDays} are at risk of a shortfall`,
        impact,
      });
    } else {
      factors.push({ name: "Shortfall risk", detail: "No shortfall risk detected in the current forecast window", impact: 0 });
    }
  }

  score = Math.max(0, Math.min(100, score));
  const label = score >= 80 ? "Strong" : score >= 60 ? "Stable" : score >= 40 ? "Fragile" : "At risk";

  return { score, label, factors };
}

export function CreditHealthScore({ income, obligations, forecast }: CreditHealthScoreProps) {
  const { score, label, factors } = computeHealthScore(income, obligations, forecast);

  return (
    <div className="card health-card">
      <h2 className="card-title">Cash health score</h2>
      <p className="card-subtitle">
        Not a credit score — a plain-language read on how exposed your near-term cash flow is right now.
      </p>

      <div className="health-score-row">
        <div className="health-gauge" style={{ "--score": score } as React.CSSProperties}>
          <span className="health-number">{score}</span>
        </div>
        <span className="health-label">{label}</span>
      </div>

      <ul className="health-factors">
        {factors.map((f) => (
          <li key={f.name}>
            <span className="health-factor-name">{f.name}</span>
            <span className="health-factor-detail">{f.detail}</span>
            {f.impact !== 0 && <span className="health-factor-impact">{f.impact}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

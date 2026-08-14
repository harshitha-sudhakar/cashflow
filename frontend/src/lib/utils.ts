import type { IncomeEvent, Obligation } from "./types";

export const ML_SERVICE_URL = "http://localhost:5001";
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:4000";
export const CHAT_SERVICE_URL = "http://localhost:5002";

export const certaintyWeights = {
  confirmed: 1,
  likely: 0.7,
  speculative: 0.35,
} as const;

export function certaintyValue(item: { certainty?: string; status?: string }) {
  if (item.certainty === "confirmed" || item.certainty === "likely" || item.certainty === "speculative") {
    return item.certainty;
  }
  if (item.status === "confirmed" || item.status === "likely" || item.status === "speculative") {
    return item.status;
  }
  return "confirmed" as const;
}

export function computeRecurrenceWindow(obligations: Obligation[], name: string) {
  const instances = obligations.filter((o) => o.name === name);
  if (instances.length < 2) return null;

  const days = instances.map((o) => new Date(o.dueDate).getDate());
  return { minDay: Math.min(...days), maxDay: Math.max(...days), count: instances.length };
}

export function computeAmountSparkline(obligations: Obligation[], name: string) {
  const instances = obligations
    .filter((o) => o.name === name)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  if (instances.length < 2) return null;
  return instances.map((o) => o.amount);
}

export function weightedIncomeTotal(income: IncomeEvent[]) {
  return income
    .filter((i) => !i.excludedFromForecast)
    .reduce((sum, item) => sum + item.amount * certaintyWeights[certaintyValue(item)], 0);
}

export function weightedObligationTotal(obligations: Obligation[]) {
  return obligations.reduce(
    (sum, item) => sum + item.amount * certaintyWeights[certaintyValue(item)],
    0,
  );
}

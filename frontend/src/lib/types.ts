export type CashFlowCertainty = "confirmed" | "likely" | "speculative";

export interface Account {
  id?: string;
  userId: string;
  name: string;
  balance: number;
  updatedAt: string;
}

export interface UserSettings {
  forecastHorizonDays: 14 | 30 | 60 | 90;
  comfortBuffer: number;
}

export interface IncomeEvent {
  id?: string;
  userId: string;
  source: string;
  amount: number;
  status: "confirmed" | "likely" | "speculative" | "historical";
  confidence: number;
  expectedDate: string;
  category: "gig" | "sponsorship" | "freelance" | "salary" | "other";
  certainty?: CashFlowCertainty;
  excludedFromForecast?: boolean;
}

export interface Obligation {
  id?: string;
  userId: string;
  name: string;
  amount: number;
  dueDate: string;
  status: "upcoming" | "paid" | "overdue";
  recurring: boolean;
  priority: "fixed" | "flexible";
  certainty?: CashFlowCertainty;
}

export interface ForecastPoint {
  date: string;
  projectedBalance: number;
  confidenceLow: number;
  confidenceHigh: number;
}

export interface Shortfall {
  date: string;
  shortfallAmount: number;
}

export interface Forecast {
  userId: string;
  generatedAt: string;
  horizonDays: number;
  startingBalance?: number;
  dailyProjection: ForecastPoint[];
  shortfallDates: Shortfall[];
}

export interface HypotheticalEntry {
  type: "income" | "expense";
  amount: number;
  date: string;
  name?: string;
}

export interface BillPatternProjection {
  month: number;
  monthLabel: string;
  averageAmount: number;
  sampleCount: number;
}

export interface BillPatternSummary {
  payee: string;
  count: number;
  recurrenceWindow: {
    minDay: number;
    maxDay: number;
  };
  averageAmount: number;
  seasonalProjection: BillPatternProjection[];
  sampleDates: string[];
}

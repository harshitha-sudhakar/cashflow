export interface IncomeEvent {
  id?: string;
  userId: string;
  source: string;
  amount: number;
  status: "confirmed" | "pledged" | "historical";
  confidence: number;
  expectedDate: string;
  category: "gig" | "sponsorship" | "freelance" | "salary" | "other";
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
  dailyProjection: ForecastPoint[];
  shortfallDates: Shortfall[];
}

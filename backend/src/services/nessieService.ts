const NESSIE_BASE_URL = "https://prod-api.nessieisreal.com";

export interface NessieBill {
  _id?: string;
  status?: "pending" | "recurring" | "cancelled";
  payee: string;
  nickname: string;
  payment_date: string;
  recurring_date?: number;
  payment_amount: number;
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

function requireApiKey(): string {
  const key = process.env.NESSIE_API_KEY;
  if (!key) throw new Error("NESSIE_API_KEY is not set in .env");
  return key;
}

async function nessieFetch<T>(path: string): Promise<T> {
  const key = requireApiKey();
  const separator = path.includes("?") ? "&" : "?";
  const res = await fetch(`${NESSIE_BASE_URL}${path}${separator}key=${key}`);
  const body = await res.text();

  if (!res.ok) {
    throw new Error(`Nessie API error ${res.status} on ${path}: ${body.slice(0, 200)}`);
  }

  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error(`Nessie API returned non-JSON on ${path}: ${body.slice(0, 200)}`);
  }
}

export interface NessieCustomer {
  _id: string;
  first_name: string;
  last_name: string;
}

export function getAllCustomers(): Promise<NessieCustomer[]> {
  return nessieFetch<NessieCustomer[]>("/customers");
}

//TEST CUSTOMER
export interface NessieCustomerInput {
  first_name: string;
  last_name: string;
  address: {
    street_number: string;
    street_name: string;
    city: string;
    state: string;
    zip: string;
  };
}

export async function createCustomer(customer: NessieCustomerInput) {
  const key = requireApiKey();
  const res = await fetch(`${NESSIE_BASE_URL}/customers?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(customer),
  });
  if (!res.ok) throw new Error(`Nessie API error ${res.status} creating customer`);
  return res.json();
}

//CREATE ACCOUNT
export interface NessieAccountInput {
  type: "Credit Card" | "Checking" | "Savings";
  nickname: string;
  rewards: number;
  balance: number;
}

export async function createAccount(customerId: string, account: NessieAccountInput) {
  const key = requireApiKey();
  const res = await fetch(`${NESSIE_BASE_URL}/customers/${customerId}/accounts?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(account),
  });
  if (!res.ok) throw new Error(`Nessie API error ${res.status} creating account`);
  return res.json();
}

// BILLS
export interface NessieBillInput {
  status: "pending" | "recurring" | "cancelled";
  payee: string;
  nickname: string;
  payment_date: string; // YYYY-MM-DD
  recurring_date?: number; // day of month, if recurring
  payment_amount: number;
}

export async function createBill(accountId: string, bill: NessieBillInput) {
  const key = requireApiKey();
  const res = await fetch(`${NESSIE_BASE_URL}/accounts/${accountId}/bills?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bill),
  });
  if (!res.ok) throw new Error(`Nessie API error ${res.status} creating bill`);
  return res.json();
}

export async function getBillsForAccount(accountId: string): Promise<NessieBill[]> {
  return nessieFetch<NessieBill[]>(`/accounts/${accountId}/bills`);
}

function monthLabel(month: number): string {
  return new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(2024, month - 1, 1));
}

export function analyzeBillHistory(bills: NessieBill[]): BillPatternSummary[] {
  const byPayee = new Map<string, NessieBill[]>();

  for (const bill of bills) {
    const bucket = byPayee.get(bill.payee) ?? [];
    bucket.push(bill);
    byPayee.set(bill.payee, bucket);
  }

  return [...byPayee.entries()].map(([payee, payeeBills]) => {
    const days = payeeBills
      .map((bill) => new Date(bill.payment_date).getDate())
      .filter((day) => Number.isFinite(day));
    const amounts = payeeBills.map((bill) => bill.payment_amount).filter((amount) => Number.isFinite(amount));
    const monthGroups = new Map<number, { total: number; count: number }>();

    for (const bill of payeeBills) {
      const billDate = new Date(bill.payment_date);
      const month = billDate.getMonth() + 1;
      const group = monthGroups.get(month) ?? { total: 0, count: 0 };
      group.total += bill.payment_amount;
      group.count += 1;
      monthGroups.set(month, group);
    }

    return {
      payee,
      count: payeeBills.length,
      recurrenceWindow: {
        minDay: days.length > 0 ? Math.min(...days) : 0,
        maxDay: days.length > 0 ? Math.max(...days) : 0,
      },
      averageAmount: amounts.length > 0 ? amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length : 0,
      seasonalProjection: [...monthGroups.entries()]
        .sort(([left], [right]) => left - right)
        .map(([month, stats]) => ({
          month,
          monthLabel: monthLabel(month),
          averageAmount: stats.total / stats.count,
          sampleCount: stats.count,
        })),
      sampleDates: payeeBills.map((bill) => bill.payment_date).sort(),
    };
  }).sort((left, right) => right.count - left.count);
}

export async function getBillPatternsForAccount(accountId: string, payee?: string): Promise<BillPatternSummary[]> {
  const bills = await getBillsForAccount(accountId);
  const filteredBills = payee ? bills.filter((bill) => bill.payee === payee) : bills;
  return analyzeBillHistory(filteredBills);
}
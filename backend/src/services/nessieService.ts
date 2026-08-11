const NESSIE_BASE_URL = "http://api.nessieisreal.com";

function requireApiKey(): string {
  const key = process.env.NESSIE_API_KEY;
  if (!key) throw new Error("NESSIE_API_KEY is not set in .env");
  return key;
}

async function nessieFetch<T>(path: string): Promise<T> {
  const key = requireApiKey();
  const separator = path.includes("?") ? "&" : "?";
  const res = await fetch(`${NESSIE_BASE_URL}${path}${separator}key=${key}`);
  if (!res.ok) throw new Error(`Nessie API error ${res.status} on ${path}`);
  return res.json() as Promise<T>;
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

export async function getBillsForAccount(accountId: string) {
  return nessieFetch<any[]>(`/accounts/${accountId}/bills`);
}
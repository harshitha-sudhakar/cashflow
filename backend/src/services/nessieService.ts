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
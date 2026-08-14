import express from "express";
import cors from "cors";
import "dotenv/config"
import { getAllCustomers, createCustomer, createAccount, createBill, getBillsForAccount, getBillPatternsForAccount } from "./services/nessieService.js";
import {db} from "./config/firebase.js";



const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT ?? 4000;




app.get("/api/nessie/snapshot", async (_req, res) => {
  try {
    const accountId = process.env.NESSIE_ACCOUNT_ID;
    if (!accountId) {
      return res.status(503).json({ error: "NESSIE_ACCOUNT_ID is not configured on the backend." });
    }

    const bills = await getBillsForAccount(accountId);
    const patterns = await getBillPatternsForAccount(accountId);
    res.json({
      source: "nessie",
      fetchedAt: new Date().toISOString(),
      bills,
      patterns,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/api/test-nessie", async (_req, res) => {
  try {
    const customers = await getAllCustomers();
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});


app.listen(PORT, () => {
  console.log(`cashflow-clarity backend listening on port ${PORT}`);
});

// local server

//TEST CUSTOMER

app.post("/api/test-nessie/customer", async (_req, res) => {
  try {
    const customer = await createCustomer({
      first_name: "Emily",
      last_name: "Walker",
      address: {
        street_number: "123",
        street_name: "Main St",
        city: "College Station",
        state: "TX",
        zip: "77840",
      },
    });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

//ROUTE ACCOUNT

app.post("/api/test-nessie/account/:customerId", async (req, res) => {
  try {
    const account = await createAccount(req.params.customerId, {
      type: "Checking",
      nickname: "Main Checking",
      rewards: 0,
      balance: 500,
    });
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

//BILL ROUTES

app.post("/api/test-nessie/bill/:accountId", async (req, res) => {
  try {
    const bill = await createBill(req.params.accountId, {
      status: "recurring",
      payee: "Spotify",
      nickname: "Monthly subscription",
      payment_date: "2026-09-01",
      recurring_date: 1,
      payment_amount: 11.99,
    });
    res.json(bill);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/api/test-nessie/bills/:accountId", async (req, res) => {
  try {
    const bills = await getBillsForAccount(req.params.accountId);
    res.json(bills);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/api/test-nessie/patterns/:accountId", async (req, res) => {
  try {
    const patterns = await getBillPatternsForAccount(req.params.accountId, req.query.payee as string | undefined);
    res.json(patterns);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

//ADD DB

app.post("/api/test-firestore", async (_req, res) => {
  try {
    const ref = await db.collection("obligations").add({
      userId: "test-user",
      name: "Test obligation from Nessie bill",
      amount: 11.99,
      dueDate: "2026-09-01",
      status: "upcoming",
      priority: "fixed",
    });
    res.json({ id: ref.id });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
// export FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"


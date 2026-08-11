import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT ?? 4000;

import { getAllCustomers } from "./services/nessieService.js";

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
import { createCustomer } from "./services/nessieService.js";

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
import { createAccount } from "./services/nessieService.js";

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
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

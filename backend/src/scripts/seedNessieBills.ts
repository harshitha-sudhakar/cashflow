import "dotenv/config";
import { createBill, type NessieBillInput } from "../services/nessieService.js";

type ObligationSeed = {
  kind: "utility" | "subscription" | "rent";
  payee: string;
  nickname: string;
  baseAmount: number;
  variation: number;
  dayOfMonth: number;
};

const obligationSeeds: ObligationSeed[] = [
  {
    kind: "utility",
    payee: "Blue Peak Electric",
    nickname: "Electric bill",
    baseAmount: 112,
    variation: 0.18,
    dayOfMonth: 10,
  },
  {
    kind: "subscription",
    payee: "Streamline Music",
    nickname: "Streaming subscription",
    baseAmount: 14.99,
    variation: 0.02,
    dayOfMonth: 3,
  },
  {
    kind: "rent",
    payee: "Homebase Apartments",
    nickname: "Monthly rent",
    baseAmount: 1450,
    variation: 0.01,
    dayOfMonth: 1,
  },
];

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function monthDateOffset(monthsBack: number) {
  return new Date(new Date().getFullYear(), new Date().getMonth() - monthsBack, 1);
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function utilityAmount(monthIndex: number, baseAmount: number, variation: number) {
  const seasonalLift = 1 + 0.16 * Math.sin(((monthIndex + 1) / 12) * Math.PI * 2 - Math.PI / 2) + 0.08 * Math.sin(((monthIndex + 1) / 6) * Math.PI * 2);
  const noisyAmount = baseAmount * seasonalLift * (1 + randomBetween(-variation, variation));
  return Math.max(50, Number(noisyAmount.toFixed(2)));
}

function stableAmount(baseAmount: number, variation: number) {
  const noisyAmount = baseAmount * (1 + randomBetween(-variation, variation));
  return Number(noisyAmount.toFixed(2));
}

function jitterUtilityDay(baseDay: number) {
  return Math.min(13, Math.max(10, baseDay + Math.floor(randomBetween(0, 4))));
}

async function seedBill(seed: ObligationSeed, monthsBack: number, monthIndex: number) {
  const accountId = getAccountId();
  const month = monthDateOffset(monthsBack);
  const paymentDate = new Date(month.getFullYear(), month.getMonth(), seed.kind === "utility" ? jitterUtilityDay(seed.dayOfMonth) : seed.dayOfMonth);
  const paymentAmount = seed.kind === "utility"
    ? utilityAmount(monthIndex, seed.baseAmount, seed.variation)
    : stableAmount(seed.baseAmount, seed.variation);

  const bill: NessieBillInput = {
    status: "recurring",
    payee: seed.payee,
    nickname: seed.nickname,
    payment_date: formatDate(paymentDate),
    recurring_date: paymentDate.getDate(),
    payment_amount: paymentAmount,
  };

  const created = await createBill(accountId, bill);
  console.log(`[seeded] ${seed.payee} ${bill.payment_date} $${bill.payment_amount.toFixed(2)} -> ${created._id ?? "ok"}`);
}

function getAccountId() {
  const accountId = process.env.NESSIE_ACCOUNT_ID;
  if (!accountId) {
    throw new Error("NESSIE_ACCOUNT_ID is not set. Set it to the Nessie account you want to seed.");
  }

  return accountId;
}

async function main() {
  for (const seed of obligationSeeds) {
    for (let monthsBack = 5; monthsBack >= 0; monthsBack -= 1) {
      const monthIndex = new Date().getMonth() - monthsBack;
      await seedBill(seed, monthsBack, monthIndex);
    }
  }

  console.log("Seed complete.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
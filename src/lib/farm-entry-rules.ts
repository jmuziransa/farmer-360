// Farm entry validation and derived totals, ported from Farm360's
// farm-entry-rules. Validation lives in the server functions; these pure
// helpers are shared by server and client code.

export const entryModules = [
  "crops", "livestock", "poultry", "eggs", "milk",
  "tasks", "diseases", "soil", "warehouse", "finance", "budget",
] as const;

export type EntryModule = (typeof entryModules)[number];

export const moduleLabels: Record<EntryModule, string> = {
  crops: "Crops",
  livestock: "Livestock",
  poultry: "Poultry",
  eggs: "Eggs",
  milk: "Milk",
  tasks: "Tasks",
  diseases: "Diseases",
  soil: "Soil",
  warehouse: "Store",
  finance: "Finance",
  budget: "Budget",
};

export type EntryInput = {
  id?: number;
  farmId: number;
  module: EntryModule;
  name: string;
  detail: string;
  status: string;
  quantity: number;
  unit: string;
  amount: number;
  date: string;
};

const MAX_SAFE = 9007199254740991;

export function validateEntry(input: EntryInput): EntryInput {
  if (!input.farmId) throw new Error("Choose a farm first.");
  if (!entryModules.includes(input.module)) throw new Error("Unknown record type.");
  const name = input.name?.trim();
  if (!name || name.length > 150) throw new Error("Give the record a name (up to 150 characters).");
  const detail = (input.detail ?? "").slice(0, 4000);
  const status = (input.status ?? "").trim().slice(0, 100) || "Active";
  const quantity = Number(input.quantity);
  if (!Number.isFinite(quantity) || quantity < 0 || quantity > 999_999_999) {
    throw new Error("Quantity must be zero or more.");
  }
  const unit = (input.unit ?? "").slice(0, 30);
  const amount = Math.round(Number(input.amount ?? 0));
  if (!Number.isInteger(amount) || amount < 0 || amount > MAX_SAFE) {
    throw new Error("Amount must be zero or more.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date ?? "")) throw new Error("Choose a valid date.");
  if (input.module === "finance" && !["Income", "Expense"].includes(status)) {
    throw new Error("Choose income or expense.");
  }
  return { ...input, name, detail, status, quantity, unit, amount };
}

export function stockBalance(movements: readonly { quantity: number }[]): number {
  return Math.round(movements.reduce((sum, m) => sum + m.quantity, 0) * 1000) / 1000;
}

export type FinanceRow = { module: string; status: string; amountUgx: number; archivedAt: string | null };

export function financeTotals(rows: readonly FinanceRow[]): { income: number; expense: number; profit: number } {
  const finance = rows.filter((r) => r.module === "finance" && !r.archivedAt);
  const income = finance.filter((r) => r.status === "Income").reduce((sum, r) => sum + r.amountUgx, 0);
  const expense = finance.filter((r) => r.status === "Expense").reduce((sum, r) => sum + r.amountUgx, 0);
  return { income, expense, profit: income - expense };
}

export function todayInUganda(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Kampala", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

export function displayDate(value: string): string {
  const [y, m, d] = value.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

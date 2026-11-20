import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  displayDate,
  entryModules,
  financeTotals,
  stockBalance,
  todayInUganda,
  validateEntry,
  type EntryInput,
} from "./farm-entry-rules.ts";

const base: EntryInput = {
  farmId: 1,
  module: "crops",
  name: "Maize",
  detail: "Longe 10H",
  status: "Growing",
  quantity: 3.5,
  unit: "acres",
  amount: 0,
  date: "2026-11-01",
};

describe("validateEntry", () => {
  it("accepts a valid record unchanged in the money field", () => {
    assert.equal(validateEntry(base).amount, 0);
  });

  it("requires a farm", () => {
    assert.throws(() => validateEntry({ ...base, farmId: 0 }), /Choose a farm/);
  });

  it("rejects unknown record types", () => {
    assert.throws(
      () => validateEntry({ ...base, module: "weather" as EntryInput["module"] }),
      /Unknown record type/,
    );
    assert.ok(entryModules.includes("finance"));
  });

  it("trims the name and rejects blank or over-long names", () => {
    assert.equal(validateEntry({ ...base, name: "  Maize  " }).name, "Maize");
    assert.throws(() => validateEntry({ ...base, name: "   " }), /name/);
    assert.throws(() => validateEntry({ ...base, name: "x".repeat(151) }), /name/);
    assert.equal(validateEntry({ ...base, name: "x".repeat(150) }).name.length, 150);
  });

  it("caps the detail at 4000 characters", () => {
    assert.equal(validateEntry({ ...base, detail: "d".repeat(4500) }).detail.length, 4000);
  });

  it("defaults a missing status to Active", () => {
    assert.equal(validateEntry({ ...base, status: "" }).status, "Active");
    assert.equal(validateEntry({ ...base, status: "  " }).status, "Active");
  });

  it("keeps quantity at zero and rejects negatives, NaN and values over the cap", () => {
    assert.equal(validateEntry({ ...base, quantity: 0 }).quantity, 0);
    assert.equal(validateEntry({ ...base, quantity: 999_999_999 }).quantity, 999_999_999);
    assert.throws(() => validateEntry({ ...base, quantity: -0.5 }), /Quantity/);
    assert.throws(() => validateEntry({ ...base, quantity: 999_999_999.5 }), /Quantity/);
    assert.throws(() => validateEntry({ ...base, quantity: Number.NaN }), /Quantity/);
  });

  it("rounds money to whole UGX and rejects negatives", () => {
    assert.equal(validateEntry({ ...base, amount: 45000.4 }).amount, 45000);
    assert.equal(validateEntry({ ...base, amount: 45000.5 }).amount, 45001);
    assert.throws(() => validateEntry({ ...base, amount: -1 }), /Amount/);
    assert.throws(() => validateEntry({ ...base, amount: Number.NaN }), /Amount/);
  });

  it("accepts only ISO-shaped dates", () => {
    assert.equal(validateEntry({ ...base, date: "2026-11-01" }).date, "2026-11-01");
    assert.throws(() => validateEntry({ ...base, date: "01/11/2026" }), /date/);
    assert.throws(() => validateEntry({ ...base, date: "2026-11-1" }), /date/);
    assert.throws(() => validateEntry({ ...base, date: "" }), /date/);
  });

  it("limits finance records to income or expense", () => {
    assert.equal(validateEntry({ ...base, module: "finance", status: "Income" }).status, "Income");
    assert.throws(
      () => validateEntry({ ...base, module: "finance", status: "Growing" }),
      /income or expense/,
    );
    assert.equal(validateEntry({ ...base, module: "crops", status: "Growing" }).status, "Growing");
  });
});

describe("financeTotals", () => {
  it("counts only unarchived finance rows", () => {
    assert.deepEqual(
      financeTotals([
        { module: "finance", status: "Income", amountUgx: 100000, archivedAt: null },
        { module: "finance", status: "Expense", amountUgx: 45000, archivedAt: null },
        { module: "crops", status: "Expense", amountUgx: 45000, archivedAt: null },
        { module: "finance", status: "Expense", amountUgx: 30000, archivedAt: "2026-10-26" },
        { module: "market", status: "Income", amountUgx: 7000, archivedAt: null },
      ]),
      { income: 100000, expense: 45000, profit: 55000 },
    );
  });

  it("matches status names exactly", () => {
    assert.deepEqual(
      financeTotals([{ module: "finance", status: "income", amountUgx: 50000, archivedAt: null }]),
      { income: 0, expense: 0, profit: 0 },
    );
  });

  it("returns zeros for no rows", () => {
    assert.deepEqual(financeTotals([]), { income: 0, expense: 0, profit: 0 });
  });
});

describe("stockBalance", () => {
  it("sums an append-only movement ledger", () => {
    assert.equal(stockBalance([{ quantity: 50 }, { quantity: -12.5 }, { quantity: 3 }]), 40.5);
  });

  it("rounds away binary-float drift to three decimals", () => {
    assert.equal(stockBalance([{ quantity: 0.1 }, { quantity: 0.2 }]), 0.3);
  });

  it("is zero with no movements", () => {
    assert.equal(stockBalance([]), 0);
  });
});

describe("dates", () => {
  it("displays as DD/MM/YYYY from date or datetime strings", () => {
    assert.equal(displayDate("2026-10-14"), "14/10/2026");
    assert.equal(displayDate("2026-10-14T09:00:00Z"), "14/10/2026");
  });

  it("derives today from the Uganda timezone", () => {
    assert.match(todayInUganda(), /^\d{4}-\d{2}-\d{2}$/);
  });
});

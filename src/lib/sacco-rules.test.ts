import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loanOutstanding, parseUgx, savingsBalance } from "./sacco-rules.ts";

describe("savingsBalance", () => {
  it("deposits add and withdrawals subtract", () => {
    assert.equal(
      savingsBalance([
        { kind: "deposit", amount_ugx: 50000 },
        { kind: "withdrawal", amount_ugx: 20000 },
      ]),
      30000,
    );
  });

  it("counts the ledger's canonical lowercase kinds", () => {
    assert.equal(savingsBalance([{ kind: "deposit", amount_ugx: 450000 }]), 450000);
    assert.equal(
      savingsBalance([{ kind: "deposit", amount_ugx: 1000 }, { kind: "deposit", amount_ugx: 2000 }]),
      3000,
    );
  });

  it("tolerates capitalized legacy kinds", () => {
    assert.equal(savingsBalance([{ kind: "Deposit", amount_ugx: 7000 }]), 7000);
    assert.equal(savingsBalance([{ kind: "Withdrawal", amount_ugx: 7000 }]), -7000);
  });

  it("treats any other kind as a debit", () => {
    assert.equal(savingsBalance([{ kind: "adjustment", amount_ugx: 500 }]), -500);
  });
});

describe("loanOutstanding", () => {
  it("subtracts only that loan's repayments", () => {
    assert.equal(
      loanOutstanding(500000, "a", [
        { loan_id: "a", amount_ugx: 100000 },
        { loan_id: "b", amount_ugx: 300000 },
      ]),
      400000,
    );
  });

  it("never goes below zero when over-repaid", () => {
    assert.equal(loanOutstanding(100000, "a", [{ loan_id: "a", amount_ugx: 150000 }]), 0);
  });

  it("is the full principal with no repayments", () => {
    assert.equal(loanOutstanding(500000, "a", []), 500000);
  });
});

describe("parseUgx", () => {
  it("accepts whole positive shillings with separators", () => {
    assert.equal(parseUgx("1,500"), 1500);
    assert.equal(parseUgx(" 2 000 "), 2000);
    assert.equal(parseUgx(1500), 1500);
  });

  it("rejects fractions, zero, negatives and junk", () => {
    assert.equal(parseUgx("10.5"), null);
    assert.equal(parseUgx("0"), null);
    assert.equal(parseUgx("-500"), null);
    assert.equal(parseUgx("abc"), null);
    assert.equal(parseUgx(""), null);
    assert.equal(parseUgx(undefined), null);
  });
});

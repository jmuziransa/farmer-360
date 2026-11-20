export type Saving = { kind: string; amount_ugx: number };
export type Repayment = { loan_id: string; amount_ugx: number };
// The ledger's canonical kinds are lowercase ("deposit" / "withdrawal") —
// normalize defensively so a capitalized legacy row still counts as a deposit.
export function savingsBalance(rows: readonly Saving[]) {
  return rows.reduce((t, r) => t + (r.kind.trim().toLowerCase() === 'deposit' ? r.amount_ugx : -r.amount_ugx), 0);
}
export function loanOutstanding(principal: number, loanId: string, repayments: readonly Repayment[]) {
  const paid = repayments.filter(r => r.loan_id === loanId).reduce((t, r) => t + r.amount_ugx, 0);
  return Math.max(0, principal - paid);
}
export function parseUgx(value: unknown) {
  const n = Number(String(value ?? '').replace(/[,\s]/g, ''));
  return Number.isInteger(n) && n > 0 ? n : null;
}

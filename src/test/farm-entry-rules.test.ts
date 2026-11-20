import { describe, expect, it } from 'vitest';
import { entrySchema, privateFinanceTotals, stockBalance } from '@/lib/farm-entry-rules';
const entry = { farmId: 'f24ce3d8-a395-4ddc-a648-2c16c02d61da', module: 'finance', name: 'Seed', status: 'Expense', quantity: 1, amount: 45000, date: '2026-10-26' };
describe('Private farm financial safety', () => {
  it('stores whole UGX and rejects fractional money', () => {
    expect(entrySchema.safeParse(entry).success).toBe(true);
    expect(entrySchema.safeParse({ ...entry, amount: 45000.5 }).success).toBe(false);
  });
  it('does not turn crop activities or inventory valuations into finance', () => {
    expect(privateFinanceTotals([
      { module: 'finance', status: 'Income', amount_ugx: 100000, archived_at: null },
      { module: 'finance', status: 'Expense', amount_ugx: 45000, archived_at: null },
      { module: 'crops', status: 'Expense', amount_ugx: 45000, archived_at: null },
      { module: 'finance', status: 'Expense', amount_ugx: 30000, archived_at: '2026-10-26' },
    ])).toEqual({ income: 100000, expense: 45000, profit: 55000 });
  });
  it('derives stock from an append-only movement ledger', () => {
    expect(stockBalance([{ quantity: 50 }, { quantity: -12.5 }, { quantity: 3 }])).toBe(40.5);
  });
});
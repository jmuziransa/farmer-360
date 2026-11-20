import { describe, it, expect } from 'vitest';
import { savingsBalance, loanOutstanding, parseUgx } from '@/lib/sacco-rules';

describe('SACCO rules', () => {
  it('withdrawals reduce the savings balance', () => {
    expect(savingsBalance([{ kind: 'Deposit', amount_ugx: 50000 }, { kind: 'Withdrawal', amount_ugx: 20000 }])).toBe(30000);
  });
  it('outstanding loan balance subtracts only that loan’s repayments', () => {
    expect(loanOutstanding(500000, 'a', [{ loan_id: 'a', amount_ugx: 100000 }, { loan_id: 'b', amount_ugx: 300000 }])).toBe(400000);
  });
  it('UGX amounts must be whole positive shillings', () => {
    expect(parseUgx('1,500')).toBe(1500);
    expect(parseUgx('10.5')).toBeNull();
    expect(parseUgx('0')).toBeNull();
  });
});

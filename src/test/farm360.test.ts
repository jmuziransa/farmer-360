import { describe, it, expect } from 'vitest';
import { displayDate, money, financeTotals } from '@/lib/farm360';
describe('Farm360 formatting and totals',()=>{
 it('uses UGX for all monetary displays',()=>{ expect(money(1500000)).toBe('UGX 1,500,000'); });
 it('displays dates as DD/MM/YYYY',()=>{ expect(displayDate('2026-10-14')).toBe('14/10/2026'); });
 it('counts only income and expenses, not market valuations',()=>{
  expect(financeTotals([{module:'finance',status:'Income',amount:3240000},{module:'finance',status:'Expense',amount:1720000},{module:'market',status:'Income',amount:7000}])).toEqual({income:3240000,expense:1720000,profit:1520000});
 });
});

import { z } from 'zod';
export const entryModules = ['crops','livestock','poultry','eggs','milk','tasks','diseases','soil','warehouse','finance','budget'] as const;
export const entrySchema = z.object({
  id: z.string().uuid().optional(), farmId: z.string().uuid(), module: z.enum(entryModules),
  name: z.string().trim().min(1).max(150), detail: z.string().max(4000).default(''),
  status: z.string().max(100).default('Active'), quantity: z.number().finite().nonnegative().max(999999999),
  unit: z.string().max(30).default(''), amount: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).refine(value => value.module !== 'finance' || ['Income','Expense'].includes(value.status), { message: 'Choose income or expense.', path: ['status'] });
export function stockBalance(movements: readonly { quantity: number }[]) {
  return Math.round(movements.reduce((sum, m) => sum + m.quantity, 0) * 1000) / 1000;
}
export function privateFinanceTotals(entries: readonly { module: string; status: string; amount_ugx: number; archived_at: string | null }[]) {
  const finance = entries.filter(e => e.module === 'finance' && !e.archived_at);
  const income = finance.filter(e => e.status === 'Income').reduce((sum, e) => sum + e.amount_ugx, 0);
  const expense = finance.filter(e => e.status === 'Expense').reduce((sum, e) => sum + e.amount_ugx, 0);
  return { income, expense, profit: income - expense };
}
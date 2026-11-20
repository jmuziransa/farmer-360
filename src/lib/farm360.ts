import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import type { Database, Tables } from '@/integrations/supabase/types';

export type FarmRecord = Tables<'demo_farm_records'>;
export const getDemoRecords = createServerFn({ method: 'GET' }).handler(async () => {
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) throw new Error('Farm records are temporarily unavailable.');
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith('sb_')) { headers.delete('authorization'); headers.set('apikey', key); }
      return fetch(input, { ...init, headers });
    } },
  });
  const { data, error } = await client.from('demo_farm_records').select('*').order('created_at');
  if (error) throw new Error('Farm records could not be loaded. Please try again.');
  return data;
});
export function money(value: number) { return 'UGX ' + new Intl.NumberFormat('en-UG').format(value); }
export function displayDate(value: string) { const [y,m,d] = value.slice(0,10).split('-'); return `${d}/${m}/${y}`; }
export function financeTotals(records: Pick<FarmRecord,'module'|'status'|'amount'>[]) {
  const rows = records.filter(r => r.module === 'finance');
  const income = rows.filter(r=>r.status==='Income').reduce((a,r)=>a+Number(r.amount),0);
  const expense = rows.filter(r=>r.status==='Expense').reduce((a,r)=>a+Number(r.amount),0);
  return { income, expense, profit: income-expense };
}
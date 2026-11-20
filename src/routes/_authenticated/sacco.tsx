import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { PiggyBank, HandCoins, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Shell } from '@/components/farm360/shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { savingsBalance, loanOutstanding, parseUgx } from '@/lib/sacco-rules';
import { money, displayDate } from '@/lib/farm360';

export const Route = createFileRoute('/_authenticated/sacco')({
  head: () => ({ meta: [
    { title: 'SACCO management — Farm360' },
    { name: 'description', content: 'Track your SACCO savings, apply for loans and record repayments.' },
    { property: 'og:title', content: 'Farm360 SACCO management' },
    { property: 'og:description', content: 'Savings, loan applications and repayments for farmer SACCO members.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  component: Sacco,
});

function friendly(e: { message: string }) {
  return /balance|approved|future|outstanding/i.test(e.message) ? e.message : 'This could not be saved. Check the details and try again.';
}

function Sacco() {
  const { user } = Route.useRouteContext();
  const queries = useQueryClient();
  const [tab, setTab] = useState<'savings' | 'loans' | 'repayments'>('savings');
  const data = useQuery({ queryKey: ['sacco', user.id], queryFn: async () => {
    const [s, l, r] = await Promise.all([
      supabase.from('sacco_savings').select('*').eq('owner_id', user.id).order('record_date', { ascending: false }),
      supabase.from('sacco_loans').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }),
      supabase.from('sacco_repayments').select('*').eq('owner_id', user.id).order('record_date', { ascending: false }),
    ]);
    if (s.error || l.error || r.error) throw new Error('SACCO records could not be loaded.');
    return { savings: s.data, loans: l.data, repayments: r.data };
  } });
  const savings = data.data?.savings ?? []; const loans = data.data?.loans ?? []; const repayments = data.data?.repayments ?? [];
  const balance = savingsBalance(savings.map(s => ({ kind: s.kind, amount_ugx: Number(s.amount_ugx) })));
  const reps = repayments.map(r => ({ loan_id: r.loan_id, amount_ugx: Number(r.amount_ugx) }));
  const active = loans.filter(l => l.status === 'Approved');
  const outstanding = active.reduce((t, l) => t + loanOutstanding(Number(l.principal_ugx), l.id, reps), 0);
  const refresh = () => queries.invalidateQueries({ queryKey: ['sacco', user.id] });

  async function run(e: FormEvent<HTMLFormElement>, fn: (f: FormData, amount: number) => PromiseLike<{ error: { message: string } | null }>, ok: string) {
    e.preventDefault(); const form = e.currentTarget; const f = new FormData(form); const amount = parseUgx(f.get('amount'));
    if (!amount) { toast.error('Enter a whole UGX amount.'); return; }
    const { error } = await fn(f, amount);
    if (error) toast.error(friendly(error)); else { toast.success(ok); form.reset(); await refresh(); }
  }
  const today = new Date().toISOString().slice(0, 10);
  return <Shell><main className="module-page">
    <div className="page-heading"><div><div className="eyebrow">YOUR SACCO ACCOUNT</div><h1>SACCO management</h1><p className="module-description">Record savings, apply for loans and keep repayments on track. Records are append-only.</p></div></div>
    <div className="module-stats">
      <article className="module-stat"><PiggyBank className="text-primary mb-3" /><p>Savings balance</p><strong>{money(balance)}</strong></article>
      <article className="module-stat"><HandCoins className="text-primary mb-3" /><p>Active loans</p><strong>{active.length}</strong></article>
      <article className="module-stat"><Receipt className="text-primary mb-3" /><p>Outstanding</p><strong>{money(outstanding)}</strong></article>
    </div>
    <div className="module-toolbar">{(['savings', 'loans', 'repayments'] as const).map(t => <Button key={t} variant={tab === t ? 'default' : 'outline'} onClick={() => setTab(t)}>{t === 'savings' ? 'Savings' : t === 'loans' ? 'Loan applications' : 'Repayments'}</Button>)}</div>
    {data.isError && <p role="alert" className="text-destructive">SACCO records could not be loaded. Try again shortly.</p>}
    {tab === 'savings' && <section className="info-band"><h2>Log a savings entry</h2>
      <form className="record-form" onSubmit={e => run(e, (f, amount) => supabase.from('sacco_savings').insert({ owner_id: user.id, kind: String(f.get('kind')), amount_ugx: amount, note: String(f.get('note')).trim(), record_date: String(f.get('date')) }), 'Savings entry recorded')}>
        <label>Type<select name="kind"><option>Deposit</option><option>Withdrawal</option></select></label><label>Amount (UGX)<Input name="amount" inputMode="numeric" required /></label><label>Date<Input name="date" type="date" max={today} defaultValue={today} required /></label><label>Note<Input name="note" maxLength={300} /></label><Button type="submit">Save entry</Button></form>
      <List rows={savings.map(s => ({ id: s.id, title: `${s.kind} · ${money(Number(s.amount_ugx))}`, sub: `${displayDate(s.record_date)}${s.note ? ` · ${s.note}` : ''}` }))} empty="No savings entries yet." /></section>}
    {tab === 'loans' && <section className="info-band"><h2>Apply for a loan</h2>
      <form className="record-form" onSubmit={e => run(e, (f, amount) => supabase.from('sacco_loans').insert({ owner_id: user.id, principal_ugx: amount, purpose: String(f.get('purpose')).trim(), term_months: Number(f.get('term')) }), 'Loan application submitted for review')}>
        <label>Amount (UGX)<Input name="amount" inputMode="numeric" required /></label><label>Term (months)<Input name="term" type="number" min={1} max={60} defaultValue={6} required /></label><label>Purpose<Input name="purpose" minLength={3} maxLength={300} required /></label><Button type="submit">Submit application</Button></form>
      <List rows={loans.map(l => ({ id: l.id, title: `${money(Number(l.principal_ugx))} · ${l.term_months} months`, sub: `${l.purpose}${l.review_reason ? ` · ${l.review_reason}` : ''}`, badge: l.status === 'Approved' ? `Approved · ${money(loanOutstanding(Number(l.principal_ugx), l.id, reps))} left` : l.status }))} empty="No loan applications yet." /></section>}
    {tab === 'repayments' && <section className="info-band"><h2>Record a repayment</h2>
      {active.length === 0 ? <p>You need an approved loan before recording repayments.</p> :
        <form className="record-form" onSubmit={e => run(e, (f, amount) => supabase.from('sacco_repayments').insert({ owner_id: user.id, loan_id: String(f.get('loan')), amount_ugx: amount, record_date: String(f.get('date')) }), 'Repayment recorded')}>
          <label>Loan<select name="loan">{active.map(l => <option key={l.id} value={l.id}>{l.purpose} · {money(loanOutstanding(Number(l.principal_ugx), l.id, reps))} outstanding</option>)}</select></label><label>Amount (UGX)<Input name="amount" inputMode="numeric" required /></label><label>Date<Input name="date" type="date" max={today} defaultValue={today} required /></label><Button type="submit">Save repayment</Button></form>}
      <List rows={repayments.map(r => ({ id: r.id, title: money(Number(r.amount_ugx)), sub: `${displayDate(r.record_date)} · ${loans.find(l => l.id === r.loan_id)?.purpose ?? 'Loan'}` }))} empty="No repayments yet." /></section>}
  </main></Shell>;
}
function List({ rows, empty }: { rows: { id: string; title: string; sub: string; badge?: string }[]; empty: string }) {
  if (!rows.length) return <p className="mt-6 text-muted-foreground">{empty}</p>;
  return <div className="mt-6 divide-y divide-border">{rows.map(r => <div key={r.id} className="flex flex-wrap justify-between gap-3 py-3"><span><strong>{r.title}</strong><small className="block text-muted-foreground">{r.sub}</small></span>{r.badge && <span className="status-badge">{r.badge}</span>}</div>)}</div>;
}

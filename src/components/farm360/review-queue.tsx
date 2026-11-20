import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { money, displayDate } from '@/lib/farm360';

type Item = { id: string; title: string; sub: string; date: string };

export function ReviewQueues() {
  const queries = useQueryClient();
  const q = useQuery({ queryKey: ['admin-queues'], queryFn: async () => {
    const [l, s] = await Promise.all([
      supabase.from('marketplace_listings').select('*').eq('status', 'Pending').order('created_at'),
      supabase.from('sacco_loans').select('*').eq('status', 'Pending').order('created_at'),
    ]);
    if (l.error || s.error) throw new Error('Queues could not be loaded.');
    return {
      listings: l.data.map(r => ({ id: r.id, title: `${r.title} · ${money(Number(r.price_ugx))} / ${r.unit}`, sub: `${r.category} · ${r.district} · ${r.contact_phone}${r.description ? ` · ${r.description}` : ''}`, date: r.created_at })),
      loans: s.data.map(r => ({ id: r.id, title: `${money(Number(r.principal_ugx))} · ${r.term_months} months`, sub: r.purpose, date: r.created_at })),
    };
  } });
  async function decide(kind: 'listing' | 'loan', id: string, decision: 'Approved' | 'Rejected', reason: string) {
    const fn = kind === 'listing' ? 'review_marketplace_listing' : 'review_sacco_loan';
    const args = kind === 'listing' ? { _listing_id: id, _decision: decision, _reason: reason } : { _loan_id: id, _decision: decision, _reason: reason };
    const { error } = await supabase.rpc(fn as 'review_marketplace_listing', args as { _listing_id: string; _decision: string; _reason: string });
    if (error) { toast.error(/reason/i.test(error.message) ? 'Add a reason before rejecting.' : 'Decision could not be saved.'); return; }
    toast.success(decision === 'Approved' ? 'Approved' : 'Rejected');
    await queries.invalidateQueries({ queryKey: ['admin-queues'] });
    await queries.invalidateQueries({ queryKey: ['platform-overview'] });
  }
  if (q.isError) return <p role="alert" className="text-destructive">Review queues could not be loaded.</p>;
  return <>
    <Queue title="Pending marketplace listings" items={q.data?.listings} onDecide={(id, d, r) => decide('listing', id, d, r)} />
    <Queue title="Pending SACCO loan applications" items={q.data?.loans} onDecide={(id, d, r) => decide('loan', id, d, r)} />
  </>;
}

function Queue({ title, items, onDecide }: { title: string; items: Item[] | undefined; onDecide: (id: string, d: 'Approved' | 'Rejected', reason: string) => void }) {
  return <section className="info-band"><h2>{title} <span className="count-pill">{items?.length ?? 0}</span></h2>
    {!items ? <p>Loading…</p> : items.length === 0 ? <p>Nothing waiting for review.</p> :
      <div className="divide-y divide-border">{items.map(i => <Row key={i.id} item={i} onDecide={onDecide} />)}</div>}
  </section>;
}
function Row({ item, onDecide }: { item: Item; onDecide: (id: string, d: 'Approved' | 'Rejected', reason: string) => void }) {
  const [reason, setReason] = useState('');
  return <article className="py-4 grid gap-3">
    <div><strong className="text-sm">{item.title}</strong><small className="block text-muted-foreground">{item.sub} · {displayDate(item.date.slice(0, 10))}</small></div>
    <div className="flex flex-wrap gap-2"><Input className="max-w-sm" placeholder="Reason / feedback (required to reject)" aria-label={`Reason for ${item.title}`} value={reason} maxLength={500} onChange={e => setReason(e.target.value)} />
      <Button size="sm" onClick={() => onDecide(item.id, 'Approved', reason)}>Approve</Button>
      <Button size="sm" variant="outline" onClick={() => onDecide(item.id, 'Rejected', reason)}>Reject</Button></div>
  </article>;
}

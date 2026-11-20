import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Phone, Plus, MapPin, Search } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Shell } from '@/components/farm360/shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useSessionAccess } from '@/lib/use-platform-admin';
import { parseUgx } from '@/lib/sacco-rules';
import { money, displayDate } from '@/lib/farm360';

export const Route = createFileRoute('/marketplace')({
  ssr: false,
  head: () => ({ meta: [
    { title: 'Produce marketplace — Farm360' },
    { name: 'description', content: 'Browse approved farm produce listings from Ugandan farmers and contact sellers directly.' },
    { property: 'og:title', content: 'Farm360 produce marketplace' },
    { property: 'og:description', content: 'Approved listings with prices in UGX and seller contacts.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  component: Marketplace,
});

function Marketplace() {
  const { user, isAdmin } = useSessionAccess();
  const queries = useQueryClient();
  const [q, setQ] = useState(''); const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false);
  const live = useQuery({ queryKey: ['market-live'], queryFn: async () => {
    const { data, error } = await supabase.from('marketplace_listings').select('*').eq('status', 'Approved').order('created_at', { ascending: false }).limit(200);
    if (error) throw error; return data;
  } });
  const mine = useQuery({ queryKey: ['market-mine', user?.id], enabled: !!user, queryFn: async () => {
    const { data, error } = await supabase.from('marketplace_listings').select('*').eq('seller_id', user!.id).order('created_at', { ascending: false });
    if (error) throw error; return data;
  } });
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!user) return; const f = new FormData(e.currentTarget);
    const price = parseUgx(f.get('price')); if (!price) { toast.error('Enter a whole UGX price.'); return; }
    setBusy(true);
    const { error } = await supabase.from('marketplace_listings').insert({
      seller_id: user.id, title: String(f.get('title')).trim(), category: String(f.get('category')), quantity: Number(f.get('quantity') || 0),
      unit: String(f.get('unit')).trim() || 'kg', price_ugx: price, district: String(f.get('district')).trim(), contact_phone: String(f.get('phone')).trim(), description: String(f.get('description')).trim(),
    });
    setBusy(false);
    if (error) { toast.error('Listing could not be submitted. Check the details and try again.'); return; }
    toast.success(isAdmin ? 'Product published to the marketplace.' : 'Listing submitted. It goes live after an administrator approves it.');
    setOpen(false); await queries.invalidateQueries({ queryKey: ['market-live'] }); await queries.invalidateQueries({ queryKey: ['market-mine'] });
  }
  const rows = (live.data ?? []).filter(r => `${r.title} ${r.category} ${r.district}`.toLowerCase().includes(q.toLowerCase()));
  return <Shell><main className="module-page">
    <div className="page-heading"><div><div className="eyebrow">COMMUNITY</div><h1>Produce marketplace</h1><p className="module-description">Approved listings from farmers. Contact sellers directly to agree on delivery.</p></div>
      {user ? <Button onClick={() => setOpen(true)}><Plus />{isAdmin ? 'Add product' : 'Submit a listing'}</Button> : <Button asChild><Link to="/auth" search={{ redirect: '/marketplace' }}>Sign in to sell</Link></Button>}</div>
    <div className="module-toolbar"><Input placeholder="Search produce or district..." aria-label="Search listings" value={q} onChange={e => setQ(e.target.value)} /></div>
    {live.isLoading ? <p className="text-muted-foreground">Loading listings…</p> : live.isError ? <p role="alert" className="text-destructive">Listings could not be loaded. Try again shortly.</p> :
      rows.length === 0 ? <div className="info-band"><Search className="text-primary mb-3" /><h2>No live listings yet</h2><p>Approved produce will appear here.</p></div> :
      <div className="guide-list">{rows.map(r => <article className="guide" key={r.id}><div className="eyebrow">{r.category.toUpperCase()}</div><h2>{r.title}</h2><p className="text-2xl font-semibold text-primary my-2">{money(Number(r.price_ugx))}<span className="text-sm text-muted-foreground"> / {r.unit}</span></p><p>{r.description}</p><p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><MapPin size={14} />{r.district || 'Uganda'} · {Number(r.quantity)} {r.unit} available</p><Button asChild variant="outline" className="mt-4"><a href={`tel:${r.contact_phone}`}><Phone />Contact seller · {r.contact_phone}</a></Button></article>)}</div>}
    {user && (mine.data?.length ?? 0) > 0 && <section className="info-band"><h2>My listings</h2><div className="divide-y divide-border">{mine.data!.map(r => <div key={r.id} className="flex flex-wrap justify-between gap-3 py-3"><span><strong>{r.title}</strong> · {money(Number(r.price_ugx))}<small className="block text-muted-foreground">{displayDate(r.created_at.slice(0, 10))}{r.review_reason ? ` · ${r.review_reason}` : ''}</small></span><span className="status-badge">{r.status === 'Pending' ? 'Pending approval' : r.status === 'Approved' ? 'Live' : 'Rejected'}</span></div>)}</div></section>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogTitle>{isAdmin ? 'Add a product' : 'Submit a produce listing'}</DialogTitle><DialogDescription>{isAdmin ? 'Administrator products go live immediately.' : 'Your listing stays private until an administrator approves it.'}</DialogDescription>
      <form className="record-form" onSubmit={submit}><label>Product<Input name="title" required minLength={2} maxLength={120} /></label><label>Category<select name="category"><option>Crops</option><option>Livestock</option><option>Poultry</option><option>Dairy</option><option>Inputs</option></select></label>
        <label>Quantity<Input name="quantity" type="number" min={0} step="any" required /></label><label>Unit<Input name="unit" defaultValue="kg" maxLength={20} /></label><label>Price per unit (UGX)<Input name="price" inputMode="numeric" required /></label>
        <label>District<Input name="district" maxLength={100} required /></label><label>Contact phone<Input name="phone" type="tel" required minLength={7} maxLength={30} /></label><label>Description<Input name="description" maxLength={1000} /></label>
        <Button type="submit" disabled={busy}>{busy ? 'Submitting…' : isAdmin ? 'Publish product' : 'Submit for approval'}</Button></form></DialogContent></Dialog>
  </main></Shell>;
}

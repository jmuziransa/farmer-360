import { createFileRoute, Link } from '@tanstack/react-router';
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useState, type FormEvent } from 'react';
import { Sparkles, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Brand } from '@/components/farm360/shell';
import { getPrivateWorkspace } from '@/lib/private-farm.functions';
import { getProblemAdvice } from '@/lib/problem-advice.functions';
const farmsQuery = queryOptions({ queryKey: ['private-workspace'], queryFn: () => getPrivateWorkspace() });
export const Route = createFileRoute('/_authenticated/advice')({
  head: () => ({ meta: [{ title: 'Crop & livestock AI advice — Farm360' }, { name: 'description', content: 'Describe a farm problem and receive safe, practical AI-powered next steps.' }, { property: 'og:title', content: 'Farm360 crop and livestock advice' }, { property: 'og:description', content: 'Practical next steps for Ugandan farmers, with guidance on when to contact an expert.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(farmsQuery), component: Advice,
});
function Advice() {
  const { data } = useSuspenseQuery(farmsQuery); const ask = useServerFn(getProblemAdvice);
  const [kind, setKind] = useState<'crop'|'livestock'>('crop'); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [answer, setAnswer] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); setBusy(true); setError(''); setAnswer(''); const form = new FormData(e.currentTarget); try { const result = await ask({ data: { farmId: String(form.get('farm')), kind, subject: String(form.get('subject')), problem: String(form.get('problem')) } }); setAnswer(result.text); } catch (error) { setError(error instanceof Error ? error.message : 'Unable to get advice.'); } finally { setBusy(false); } }
  return <main className="mx-auto max-w-3xl px-5 py-8"><header className="flex flex-wrap justify-between gap-4"><Brand /><Button asChild variant="outline"><Link to="/workspace"><ArrowLeft />Farm records</Link></Button></header><div className="page-heading mt-10"><div><div className="eyebrow">AI-POWERED FARM SUPPORT</div><h1>What’s happening on your farm?</h1></div><Sparkles className="text-primary" /></div>
    {!data.farms.length ? <section className="info-band"><h2>Add a farm first</h2><Button asChild><Link to="/account">Create your farm</Link></Button></section> : <form className="record-form" onSubmit={submit}><label>Farm<select name="farm" required>{data.farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label><div className="flex gap-2"><Button type="button" variant={kind==='crop'?'default':'outline'} onClick={() => setKind('crop')}>Crop problem</Button><Button type="button" variant={kind==='livestock'?'default':'outline'} onClick={() => setKind('livestock')}>Livestock problem</Button></div><label>{kind==='crop'?'Crop and variety':'Animal or poultry type'}<Input name="subject" required minLength={2} maxLength={100} placeholder={kind==='crop'?'Maize, beans, tomatoes…':'Cattle, goats, chickens…'} /></label><label>Describe the problem<textarea className="rounded-md border border-input bg-background p-3 text-base" name="problem" rows={6} required minLength={10} maxLength={3000} placeholder="What changed, when it started, how many are affected, and what you have already tried." /></label><Button type="submit" disabled={busy}><Sparkles />{busy?'Preparing practical advice…':'Suggest next steps'}</Button></form>}
    {error && <p role="alert" className="text-destructive mt-6">{error}</p>}{answer && <section className="info-band" aria-live="polite"><h2>Suggested next steps</h2><div className="whitespace-pre-wrap text-base leading-7">{answer}</div></section>}<div className="mt-8 flex gap-3 border-t border-border pt-5 text-sm text-muted-foreground"><AlertTriangle className="shrink-0" /><p>AI advice is not a diagnosis. For severe symptoms or unexpected deaths, contact an extension officer or veterinarian immediately.</p></div>
  </main>;
}
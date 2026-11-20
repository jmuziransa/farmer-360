import { createFileRoute, Link } from '@tanstack/react-router';
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { ShieldCheck, Users, Sprout, ClipboardList, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Brand } from '@/components/farm360/shell';
import { getPlatformOverview } from '@/lib/platform.functions';
import { displayDate } from '@/lib/farm360';
import { ReviewQueues } from '@/components/farm360/review-queue';
const platformQuery = queryOptions({ queryKey: ['platform-overview'], queryFn: () => getPlatformOverview() });
export const Route = createFileRoute('/_authenticated/admin')({
  head: () => ({ meta: [
    { title: 'Platform administration — Farm360' },
    { name: 'description', content: 'Secure Farm360 platform overview and administrator audit history.' },
    { property: 'og:title', content: 'Farm360 platform administration' },
    { property: 'og:description', content: 'Permission-controlled platform management without exposing private farm records.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(platformQuery),
  component: Administration,
});
function Administration() {
  const { data } = useSuspenseQuery(platformQuery);
  return <main className="mx-auto max-w-5xl px-5 py-8">
    <header className="flex flex-wrap justify-between gap-5"><Brand /><Button asChild variant="outline"><Link to="/account"><ArrowLeft />My account</Link></Button></header>
    <div className="page-heading mt-10"><div><div className="eyebrow">PLATFORM WORKSPACE</div><h1>Administration</h1></div><ShieldCheck className="text-primary" /></div>
    {!data.allowed ? <section className="info-band"><h2>Administrator permission required</h2><p>This account does not have platform administrator access.</p></section> : <>
      <div className="module-stats">{[
        ['Registered users', data.counts.users, Users], ['Active farms', data.counts.farms, Sprout], ['Pending access requests', data.counts.pendingRequests, ClipboardList],
      ].map(([label, value, Icon]) => { const Symbol = Icon as typeof Users; return <article className="module-stat" key={String(label)}><Symbol className="text-primary mb-4" /><p>{String(label)}</p><strong>{String(value)}</strong></article>; })}</div>
      <ReviewQueues />
      <section className="info-band"><h2>Administrator activity</h2><div className="divide-y divide-border">{data.audit.length ? data.audit.map(entry => <article key={entry.id} className="flex flex-wrap justify-between gap-3 py-4"><strong className="text-sm">{entry.action.replaceAll('_', ' ')}</strong><span className="text-sm text-muted-foreground">{displayDate(entry.created_at)}</span></article>) : <p>No administrator actions recorded yet.</p>}</div></section>
    </>}
  </main>;
}
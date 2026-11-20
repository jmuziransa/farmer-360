import { createFileRoute, useRouter } from '@tanstack/react-router';
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { getDemoRecords } from '@/lib/farm360';
import { Dashboard } from '@/components/farm360/dashboard';
import { Shell } from '@/components/farm360/shell';
export const demoQuery = queryOptions({queryKey:['demo-records'],queryFn:()=>getDemoRecords()});
export const Route = createFileRoute('/')({
 head:()=>({meta:[{title:'Farm360 — Your farm overview'},{name:'description',content:'A connected farm workspace for Ugandan farmers. Explore production, finances, weather and markets with fictional demonstration records.'},{property:'og:title',content:'Farm360 — Your farm overview'},{property:'og:description',content:'Grow better together. Explore your Ugandan smart farming workspace.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 loader:({context})=>context.queryClient.ensureQueryData(demoQuery),
 component:Index,
 errorComponent:({reset})=>{const router=useRouter();return <main className="mx-auto max-w-xl px-5 py-20 text-center"><h1 className="text-2xl font-semibold">Farm records are still loading</h1><p className="mt-3 text-muted-foreground">The farm data service is starting up. Please try again in a minute.</p><button className="mt-6 rounded-md bg-primary px-4 py-2 text-primary-foreground" onClick={()=>{router.invalidate();reset();}}>Try again</button></main>;},
 notFoundComponent:()=><p className="p-10 text-center">Page not found.</p>,
});
function Index(){const {data}=useSuspenseQuery(demoQuery);return <Shell><Dashboard records={data}/></Shell>;}

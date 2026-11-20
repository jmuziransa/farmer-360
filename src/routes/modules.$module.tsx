import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { demoQuery } from './index';
import { Shell,modules } from '@/components/farm360/shell';
import { ModuleContent } from '@/components/farm360/module-content';
export const Route=createFileRoute('/modules/$module')({
 head:({params})=>{const name=modules.find(m=>m.slug===params.module)?.name??'Page unavailable';const title=`${name} — Farm360`;const description=`Explore ${name.toLowerCase()} in the Farm360 Ugandan farming demonstration workspace.`;return {meta:[{title},{name:'description',content:description},{property:'og:title',content:title},{property:'og:description',content:description},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]};},
 loader:({context})=>context.queryClient.ensureQueryData(demoQuery),component:Module,
});
function Module(){const {module}=Route.useParams();const {data}=useSuspenseQuery(demoQuery);return <Shell><ModuleContent module={module} records={data}/></Shell>;}

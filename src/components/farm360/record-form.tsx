import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RecordFields } from './record-fields';
import { useDemo } from './provider';

export function RecordForm({module='crops',label='Add record',defaultStatus='Income'}:{module?:string;label?:string;defaultStatus?:string}) {
  const [open,setOpen] = useState(false);
  const {add} = useDemo();
  function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault(); const data = new FormData(e.currentTarget);
    const quantity=Number(data.get('quantity')); const amount=Number(data.get('amount')??0);
    if (!Number.isFinite(quantity)||quantity<0||!Number.isFinite(amount)||amount<0) return;
    add({id:crypto.randomUUID(),module,name:String(data.get('name')).trim(),detail:String(data.get('detail')),status:String(data.get('status')||'Active'),quantity,unit:String(data.get('unit')),amount,record_date:String(data.get('date')),created_at:new Date().toISOString()});
    toast.success('Added to your demo session');
  }
  return <><Button aria-label={label} onClick={()=>setOpen(v=>!v)}><Plus/> {label}</Button>{open && <section className="inline-record-entry"><h2 className="mb-2 text-lg font-semibold">{label}</h2><p className="mb-5 text-sm text-muted-foreground">Demo record — stays in this session only, not your private farm.</p><form onSubmit={submit} className="record-form">
    <RecordFields module={module}/><label>Details<Input name="detail" maxLength={300}/></label>
    <label>Date<Input name="date" type="date" defaultValue={new Intl.DateTimeFormat('en-CA', {timeZone:'Africa/Kampala',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())} required/></label>
    {module==='finance'?<><label>Type<select name="status" defaultValue={defaultStatus}><option>Income</option><option>Expense</option></select></label><label>Amount (UGX)<Input name="amount" type="number" min="0" step="1" required/></label></>:<label>Status<select name="status"><option>Active</option><option>Growing</option><option>Harvesting</option><option>Planned</option><option>Healthy</option></select></label>}
    <Button className="w-full" type="submit">Add to demo</Button></form></section>}</>;
}

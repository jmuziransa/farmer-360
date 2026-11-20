import { useState } from 'react';
import { Sprout, Beef, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { defaultCategory, recordChoices, recordUnits, type RecordCategory } from '@/lib/record-catalog';

export function RecordFields({ module, initial }: { module: string; initial?: { name: string; quantity: number; unit: string } | undefined }) {
  const suggested = defaultCategory(module);
  const initialCategory = initial && !recordChoices(suggested, module).includes(initial.name) ? 'custom' : suggested;
  const [category, setCategory] = useState<RecordCategory>(initialCategory);
  const [name, setName] = useState(initial?.name ?? recordChoices(initialCategory, module)[0] ?? '');
  const [unit, setUnit] = useState(initial?.unit || recordUnits(initialCategory, name, module)[0]);
  const choices = recordChoices(category, module);
  const units = recordUnits(category, name, module);
  function changeCategory(next: RecordCategory) {
    const nextName = recordChoices(next, module)[0] ?? '';
    setCategory(next); setName(nextName); setUnit(recordUnits(next, nextName, module)[0]);
  }
  return <>
    <fieldset className="min-w-0"><legend className="mb-2 text-xs font-medium">Record type</legend><div className="grid grid-cols-3 gap-2">
      {([{ value: 'crops', label: 'Crops', icon: Sprout }, { value: 'animals', label: 'Animals', icon: Beef }, { value: 'custom', label: 'Custom', icon: Pencil }] as const).map(c => <Button key={c.value} type="button" size="sm" variant={category === c.value ? 'default' : 'outline'} aria-pressed={category === c.value} onClick={() => changeCategory(c.value)}><c.icon className="size-4" />{c.label}</Button>)}
    </div></fieldset>
    <label>{category === 'crops' ? 'Crop' : category === 'animals' ? 'Animal' : 'Name'}{category === 'custom' ? <Input name="name" required maxLength={150} value={name} onChange={e => setName(e.target.value)} /> : <select name="name" aria-label={category === 'crops' ? 'Crop' : 'Animal'} value={name} onChange={e => { setName(e.target.value); setUnit(recordUnits(category, e.target.value, module)[0]); }}>{choices.map(n => <option key={n}>{n}</option>)}</select>}</label>
    <div className="grid grid-cols-2 gap-4"><label>Quantity<Input name="quantity" type="number" min="0" step="0.001" required defaultValue={initial?.quantity ?? 1} /></label><label>Unit<select name={unit === '__custom' ? undefined : 'unit'} aria-label="Unit" value={unit} onChange={e => setUnit(e.target.value)}>{[...new Set([...units, ...(initial?.unit ? [initial.unit] : [])])].map(u => <option key={u}>{u}</option>)}{category === 'custom' && <option value="__custom">Custom unit</option>}</select></label></div>
    {unit === '__custom' && <label>Custom unit<Input name="unit" required maxLength={30} /></label>}
  </>;
}
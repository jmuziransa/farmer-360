import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { entrySchema } from '@/lib/farm-entry-rules';

export const getPrivateWorkspace = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const results = await Promise.all([
    context.supabase.from('farms').select('*').eq('owner_id', context.userId).order('created_at'),
    context.supabase.from('farm_entries').select('*').eq('owner_id', context.userId).order('record_date', { ascending: false }),
    context.supabase.from('inventory_items').select('*').eq('owner_id', context.userId).order('name'),
    context.supabase.from('inventory_movements').select('*').eq('owner_id', context.userId).order('created_at', { ascending: false }),
  ]);
  if (results.some(r => r.error)) throw new Error('Your farm records could not be loaded.');
  return { farms: results[0].data ?? [], entries: results[1].data ?? [], items: results[2].data ?? [], movements: results[3].data ?? [] };
});
export const savePrivateEntry = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => entrySchema.parse(data)).handler(async ({ data, context }) => {
    const farm = await context.supabase.from('farms').select('id').eq('id', data.farmId).eq('owner_id', context.userId).eq('archived', false).maybeSingle();
    if (farm.error || !farm.data) throw new Error('Farm not found.');
    const payload = { farm_id: data.farmId, owner_id: context.userId, module: data.module, name: data.name, detail: data.detail, status: data.status, quantity: data.quantity, unit: data.unit, amount_ugx: data.amount, record_date: data.date };
    const result = data.id ? await context.supabase.from('farm_entries').update(payload).eq('id', data.id).eq('farm_id', data.farmId).eq('owner_id', context.userId).select('id').maybeSingle() : await context.supabase.from('farm_entries').insert(payload).select('id').single();
    if (result.error || !result.data) throw new Error('Unable to save this record. Check its date and values.');
    return { id: result.data.id };
  });
export const archivePrivateEntry = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid(), farmId: z.string().uuid(), restore: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    const result = await context.supabase.from('farm_entries').update({ archived_at: data.restore ? null : new Date().toISOString() }).eq('id', data.id).eq('farm_id', data.farmId).eq('owner_id', context.userId).select('id').maybeSingle();
    if (result.error || !result.data) throw new Error('Record not found.');
    return { ok: true };
  });
export const createInventoryItem = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ farmId: z.string().uuid(), name: z.string().trim().min(1).max(150), unit: z.string().min(1).max(30), minimum: z.number().nonnegative().max(999999999) }).parse(data))
  .handler(async ({ data, context }) => {
    const farm = await context.supabase.from('farms').select('id').eq('id', data.farmId).eq('owner_id', context.userId).eq('archived', false).maybeSingle();
    if (!farm.data || farm.error) throw new Error('Farm not found.');
    const result = await context.supabase.from('inventory_items').insert({ farm_id: data.farmId, owner_id: context.userId, name: data.name, unit: data.unit, minimum_stock: data.minimum }).select('id').single();
    if (result.error) throw new Error('The stock item could not be saved.');
    return result.data;
  });
export const recordStockMovement = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ itemId: z.string().uuid(), farmId: z.string().uuid(), quantity: z.number().finite().refine(n => n !== 0).refine(n => Math.abs(n) <= 999999999), reason: z.string().trim().min(1).max(500), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(data))
  .handler(async ({ data, context }) => {
    const item = await context.supabase.from('inventory_items').select('id').eq('id', data.itemId).eq('farm_id', data.farmId).eq('owner_id', context.userId).maybeSingle();
    if (item.error || !item.data) throw new Error('Stock item not found.');
    const result = await context.supabase.from('inventory_movements').insert({ item_id: data.itemId, farm_id: data.farmId, owner_id: context.userId, quantity: data.quantity, reason: data.reason, record_date: data.date });
    if (result.error) throw new Error('Stock movement refused. Check available stock and the date.');
    return { ok: true };
  });
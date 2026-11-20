import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const getPlatformOverview = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: allowed, error: permissionError } = await context.supabase.rpc('can_platform', { _permission: 'admin.platform' });
    if (permissionError || !allowed) return { allowed: false as const, counts: null, audit: [] };
    const [overview, audit] = await Promise.all([
      context.supabase.rpc('platform_overview'),
      context.supabase.from('platform_audit').select('id,action,created_at,entity_id').order('created_at', { ascending: false }).limit(50),
    ]);
    if (overview.error || audit.error) throw new Error('Administration is temporarily unavailable.');
    const raw = overview.data;
    const counts = raw && typeof raw === 'object' && !Array.isArray(raw) ? {
      users: Number(raw['users'] ?? 0), farms: Number(raw['farms'] ?? 0), pendingRequests: Number(raw['pending_requests'] ?? 0),
    } : { users: 0, farms: 0, pendingRequests: 0 };
    return { allowed: true as const, counts, audit: audit.data };
  });
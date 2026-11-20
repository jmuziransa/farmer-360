import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { canPlatform } from '@/lib/platform-permissions';

/** UI-only hint for showing admin links. The server and database enforce real access. */
export function useSessionAccess() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let active = true;
    async function load(u: User | null) {
      if (!active) return;
      setUser(u);
      if (!u) { setIsAdmin(false); return; }
      const { data } = await supabase.from('platform_roles').select('role').eq('user_id', u.id);
      if (active) setIsAdmin(canPlatform((data ?? []).map(r => r.role), 'admin.platform'));
    }
    void supabase.auth.getUser().then(({ data }) => load(data.user));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') void load(session?.user ?? null);
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  return { user, isAdmin };
}

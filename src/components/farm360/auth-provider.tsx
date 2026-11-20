import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
const AuthContext=createContext<{user:User|null;loading:boolean}>({user:null,loading:true});
export function AuthProvider({children}:{children:ReactNode}){
 const [user,setUser]=useState<User|null>(null);const [loading,setLoading]=useState(true);const router=useRouter();const queries=useQueryClient();
 useEffect(()=>{
  let active=true;
  const {data}=supabase.auth.onAuthStateChange((event,session)=>{
   if(event==='INITIAL_SESSION')return;
   if(event!=='SIGNED_IN'&&event!=='SIGNED_OUT'&&event!=='USER_UPDATED')return;
   setUser(session?.user??null);setLoading(false);
   void router.invalidate();if(event!=='SIGNED_OUT')void queries.invalidateQueries();
  });
  void supabase.auth.getUser().then(({data})=>{if(active){setUser(data.user);setLoading(false);}});
  return()=>{active=false;data.subscription.unsubscribe();};
 },[router,queries]);
 return <AuthContext.Provider value={{user,loading}}>{children}</AuthContext.Provider>;
}
export const useFarmAuth=()=>useContext(AuthContext);
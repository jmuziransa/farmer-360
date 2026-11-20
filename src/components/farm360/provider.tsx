import { createContext, useContext, useState, type ReactNode } from 'react';
import type { FarmRecord } from '@/lib/farm360';
type DemoContextValue = { additions: FarmRecord[]; add: (record: FarmRecord)=>void; completed: string[]; complete:(id:string)=>void };
const DemoContext = createContext<DemoContextValue>({additions:[],add:()=>{},completed:[],complete:()=>{}});
export function DemoProvider({children}:{children:ReactNode}) {
  const [additions,setAdditions] = useState<FarmRecord[]>([]);
  const [completed,setCompleted] = useState<string[]>([]);
  return <DemoContext.Provider value={{additions,add:r=>setAdditions(p=>[r,...p]),completed,complete:id=>setCompleted(p=>[...p,id])}}>{children}</DemoContext.Provider>;
}
export const useDemo = ()=>useContext(DemoContext);
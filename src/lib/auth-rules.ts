export function requestedRole(value:string):'sacco_member'|'sacco_admin'|'admin'|null {
 return value==='sacco_member'||value==='sacco_admin'||value==='admin'?value:null;
}
export const defaultGrantedRole='farmer';
export function safeReturnPath(value:unknown){return typeof value==='string'&&value.startsWith('/')&&!value.startsWith('//')&&!value.includes('\\')?value:'/account';}
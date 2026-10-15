export const REMEMBER_KEY = 'soundbridge:remember-login';
export interface AuthStore { getItem(key:string):string|null; setItem(key:string,value:string):void; removeItem(key:string):void }
export function sessionStore(persistent: AuthStore, temporary: AuthStore) {
 const selected=()=>persistent.getItem(REMEMBER_KEY)==='yes'?persistent:temporary;
 return {
 getItem:(key:string)=>selected().getItem(key),
 setItem:(key:string,value:string)=>{selected().setItem(key,value);(selected()===persistent?temporary:persistent).removeItem(key);},
 removeItem:(key:string)=>{persistent.removeItem(key);temporary.removeItem(key);}
 };
}
export function rememberLogin(remember:boolean){localStorage.setItem(REMEMBER_KEY,remember?'yes':'no');}

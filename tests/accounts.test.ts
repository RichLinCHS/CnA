import { expect,it } from 'vitest';
import { captureBackup, restoreBackup } from '../lib/account-backup';
import { FAVORITES_KEY } from '../lib/storage';
import { fallback } from '../lib/vocabulary';
function storage(){const values=new Map<string,string>();return {getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);}};}
it('captures and restores favorites without replacing local favorites',()=>{const source=storage();source.setItem(FAVORITES_KEY,JSON.stringify([fallback('apple')!.sentence]));const target=storage();target.setItem(FAVORITES_KEY,JSON.stringify([fallback('water')!.sentence]));restoreBackup(target,captureBackup(source));expect(captureBackup(target).favorites).toHaveLength(2);});
it('rejects malformed cloud data before modifying local storage',()=>{const target=storage();expect(()=>restoreBackup(target,{version:1})).toThrow();expect(target.getItem(FAVORITES_KEY)).toBeNull();});
it('does not silently discard corrupt local data',()=>{const target=storage();target.setItem(FAVORITES_KEY,'bad json');expect(()=>captureBackup(target)).toThrow();});

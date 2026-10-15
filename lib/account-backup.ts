import { z } from 'zod';
import { cardSchema, learningSchema } from './schema';
import { lessonSchema } from './chat-schema';
import { librarySchema, readLibrary } from './conversations';
import { FAVORITES_KEY, HISTORY_KEY, type StorageLike } from './storage';
import { LESSONS_KEY } from './chat-storage';
export const backupSchema = z.object({ version: z.literal(1), favorites: z.array(cardSchema).max(100), history: z.array(learningSchema).max(20), lessons: z.array(lessonSchema).max(20), library: librarySchema }).strict();
export function captureBackup(storage: StorageLike) {
 const data = backupSchema.parse({version:1,favorites:JSON.parse(storage.getItem(FAVORITES_KEY) ?? '[]'),history:JSON.parse(storage.getItem(HISTORY_KEY) ?? '[]'),lessons:JSON.parse(storage.getItem(LESSONS_KEY) ?? '[]'),library:readLibrary(storage)});
 if (new TextEncoder().encode(JSON.stringify(data)).length > 2000000) throw new Error('Backup exceeds 2 MB. Export conversations separately.');
 return data;
}
import { LIBRARY_KEY, mergeBackup, writeLibrary } from './conversations';
export function restoreBackup(storage: StorageLike, value: unknown) {
 const incoming=backupSchema.parse(value); const current=captureBackup(storage);
 const combine=<T,>(a:T[],b:T[],max:number)=>{const result=[...a];for(const item of b)if(!result.some(existing=>JSON.stringify(existing)===JSON.stringify(item)))result.push(item);if(result.length>max)throw new Error('Combined data exceeds the local limit. Download the backup instead; nothing was changed.');return result;};
 const favorites=combine(current.favorites,incoming.favorites,100); const history=combine(current.history,incoming.history,20); const lessons=combine(current.lessons,incoming.lessons,20); const library=mergeBackup(current.library,incoming.library);
 const keys=[FAVORITES_KEY,HISTORY_KEY,LESSONS_KEY,LIBRARY_KEY];const old=keys.map(k=>storage.getItem(k));
 try{storage.setItem(FAVORITES_KEY,JSON.stringify(favorites));storage.setItem(HISTORY_KEY,JSON.stringify(history));storage.setItem(LESSONS_KEY,JSON.stringify(lessons));writeLibrary(storage,library);}catch(error){keys.forEach((k,i)=>{if(old[i]!==null)storage.setItem(k,old[i]!);else storage.setItem(k,JSON.stringify(k===LIBRARY_KEY?current.library:[]));});throw error;}
}

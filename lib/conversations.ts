import { z } from 'zod';
import { defaultSettings, settingsSchema } from './chat-schema';
import { CHAT_KEY, turnSchema } from './chat-storage';
import { learnerSchema, emptyLearner } from './learner';
import type { StorageLike } from './storage';
export const LIBRARY_KEY = 'soundbridge:conversations:v2';
export const conversationSchema = z.object({ id: z.string().min(1).max(100), title: z.string().min(1).max(120), createdAt: z.string().datetime(), updatedAt: z.string().datetime(), settings: settingsSchema, turns: z.array(turnSchema), draft: z.string().max(1000), remember: z.boolean() }).strict();
export const librarySchema = z.object({ version: z.literal(2), revision: z.number().int().nonnegative(), activeId: z.string().max(100), profile: learnerSchema, memoryEnabled: z.boolean(), conversations: z.array(conversationSchema) }).strict().superRefine((data, ctx) => {
  if (new Set(data.conversations.map(c => c.id)).size !== data.conversations.length || !data.conversations.some(c => c.id === data.activeId)) ctx.addIssue({ code: 'custom', message: 'Invalid conversation identifiers' });
});
export type Conversation = z.infer<typeof conversationSchema>;
export type Library = z.infer<typeof librarySchema>;
export function newConversation(settings = defaultSettings): Conversation {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), title: 'New conversation', createdAt: now, updatedAt: now, settings: { ...settings }, turns: [], draft: '', remember: true };
}
export function emptyLibrary(): Library {
  const first = newConversation(); return { version: 2, revision: 0, activeId: first.id, profile: { ...emptyLearner }, memoryEnabled: true, conversations: [first] };
}
export function readLibrary(storage: StorageLike): Library {
  const raw = storage.getItem(LIBRARY_KEY);
  if (raw !== null) return librarySchema.parse(JSON.parse(raw)); // Never silently replace damaged saved chats.
  const library = emptyLibrary(); const old = storage.getItem(CHAT_KEY);
  if (old !== null) {
    const legacy = z.object({ settings: settingsSchema, turns: z.array(turnSchema) }).parse(JSON.parse(old));
    const conversation = library.conversations[0]; conversation.settings = legacy.settings; conversation.turns = legacy.turns;
    conversation.title = legacy.turns[0]?.user.slice(0,120) || 'New conversation';
  }
  return library;
}
export function writeLibrary(storage: StorageLike, library: Library): Library {
  const previous = storage.getItem(LIBRARY_KEY);
  if (previous !== null && librarySchema.parse(JSON.parse(previous)).revision !== library.revision) throw new Error('Another tab updated your chats. Export unsaved work, then reload before editing.');
  const next = librarySchema.parse({ ...library, revision: library.revision + 1 });
  storage.setItem(LIBRARY_KEY, JSON.stringify(next)); return next;
}
export function learningMemory(library: Library) {
  if (!library.memoryEnabled) return [];
  return library.conversations.filter(c => c.id !== library.activeId && c.remember && c.turns.length).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0,5).map(c => ({ topic: `${c.settings.category}: ${c.settings.scenario}`, request: c.turns[0].user }));
}
export function mergeBackup(current: Library, value: unknown): Library {
  const backup = librarySchema.parse(value);
  const conversations = [...current.conversations];
  for (const saved of backup.conversations) {
    const existing = conversations.find(c => c.id === saved.id);
    if (!existing) conversations.push(saved);
    else if (JSON.stringify(existing) !== JSON.stringify(saved)) conversations.push({...saved,id:crypto.randomUUID(),title:`${saved.title.slice(0,108)} (restored)`});
  }
  const hasProfile = Object.values(current.profile).some(value => value.trim());
  return {...current,conversations,profile:hasProfile ? current.profile : backup.profile};
}

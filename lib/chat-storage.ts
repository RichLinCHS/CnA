import { z } from 'zod';
import { chatResponseSchema, defaultSettings, lessonSchema, settingsSchema, summarizeResponse, type ChatResponse, type Lesson, type Message, type Settings } from './chat-schema';
import type { StorageLike } from './storage';
export const CHAT_KEY = 'soundbridge:chat:v1';
export const LESSONS_KEY = 'soundbridge:lessons:v1';
const turnSchema = z.object({ user: z.string().min(1).max(1000), response: chatResponseSchema }).strict();
const sessionSchema = z.object({ settings: settingsSchema, turns: z.array(turnSchema).max(12) }).strict();
export type Turn = z.infer<typeof turnSchema>;
export type Session = z.infer<typeof sessionSchema>;
export function readSession(storage: StorageLike): Session {
  try { return sessionSchema.parse(JSON.parse(storage.getItem(CHAT_KEY) ?? 'null')); } catch { return { settings: { ...defaultSettings }, turns: [] }; }
}
export function saveSession(storage: StorageLike, settings: Settings, turns: Turn[]) {
  const data = sessionSchema.parse({ settings, turns: turns.slice(-12) });
  storage.setItem(CHAT_KEY, JSON.stringify(data)); return data;
}
export function contextMessages(turns: Turn[]): Message[] {
  const pairs = turns.slice(-6).map(t => [{ role: 'user' as const, content: t.user }, { role: 'assistant' as const, content: summarizeResponse(t.response) }]);
  while (pairs.reduce((n, p) => n + p[0].content.length + p[1].content.length, 0) > 18000) pairs.shift();
  return pairs.flat();
}
export function readLessons(storage: StorageLike): Lesson[] {
  try { return z.array(lessonSchema).max(20).parse(JSON.parse(storage.getItem(LESSONS_KEY) ?? '[]')); } catch { return []; }
}
export function saveLesson(storage: StorageLike, lesson: Lesson): Lesson[] {
  const valid = lessonSchema.parse(lesson); const signature = JSON.stringify(valid);
  const next = [valid, ...readLessons(storage).filter(l => JSON.stringify(l) !== signature)].slice(0, 20);
  storage.setItem(LESSONS_KEY, JSON.stringify(next)); return next;
}
export function appendTurn(turns: Turn[], user: string, response: ChatResponse): Turn[] { return [...turns, turnSchema.parse({ user, response })].slice(-12); }

import { z } from 'zod';
import { cardSchema, learningSchema, type Card, type Learning } from './schema';
export const FAVORITES_KEY = 'soundbridge:favorites:v1';
export const HISTORY_KEY = 'soundbridge:history:v1';
export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }
export function readFavorites(storage: StorageLike): Card[] {
  try { return z.array(cardSchema).max(100).parse(JSON.parse(storage.getItem(FAVORITES_KEY) ?? '[]')); } catch { return []; }
}
export function readHistory(storage: StorageLike): Learning[] {
  try { return z.array(learningSchema).max(20).parse(JSON.parse(storage.getItem(HISTORY_KEY) ?? '[]')); } catch { return []; }
}
export function toggleFavorite(storage: StorageLike, card: Card): Card[] {
  const current = readFavorites(storage);
  const exists = current.some(c => c.english.toLowerCase() === card.english.toLowerCase());
  const next = exists ? current.filter(c => c.english.toLowerCase() !== card.english.toLowerCase()) : [cardSchema.parse(card), ...current].slice(0, 100);
  storage.setItem(FAVORITES_KEY, JSON.stringify(next));
  return next;
}
export function saveHistory(storage: StorageLike, data: Learning): Learning[] {
  const next = [learningSchema.parse(data), ...readHistory(storage).filter(x => x.originalText !== data.originalText)].slice(0, 20);
  storage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

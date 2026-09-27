import { describe, expect, it } from 'vitest';
import { fallback } from '../lib/vocabulary';
import { FAVORITES_KEY, HISTORY_KEY, readFavorites, readHistory, saveHistory, toggleFavorite } from '../lib/storage';
function storage() { const map = new Map<string, string>(); return { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); } }; }
describe('localStorage persistence', () => {
  it('saves, retrieves and removes a favorite', () => { const s = storage(); const card = fallback('apple')!.sentence; expect(toggleFavorite(s, card)).toHaveLength(1); expect(readFavorites(s)[0]).toEqual(card); expect(toggleFavorite(s, card)).toHaveLength(0); expect(readFavorites(s)).toEqual([]); });
  it('handles corrupt and invalid stored data', () => { const s = storage(); s.setItem(FAVORITES_KEY, '{'); s.setItem(HISTORY_KEY, '[{}]'); expect(readFavorites(s)).toEqual([]); expect(readHistory(s)).toEqual([]); });
  it('saves history and removes duplicate entries', () => { const s = storage(); const a = fallback('apple')!; saveHistory(s, a); saveHistory(s, fallback('beautiful')!); saveHistory(s, a); expect(readHistory(s)).toHaveLength(2); expect(readHistory(s)[0]).toEqual(a); });
  it('surfaces unavailable storage for a friendly UI message', () => { const s = { getItem: () => null, setItem: () => { throw new Error('Quota exceeded'); } }; expect(() => toggleFavorite(s, fallback('apple')!.sentence)).toThrow('Quota exceeded'); });
});

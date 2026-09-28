import { createHash } from 'node:crypto';

export const hash = (s: string) => createHash('sha256').update(s).digest('hex');
// Best-effort per-instance limits. Counters reset on cold starts and are not shared.
const counters = new Map<string, { count: number; until: number }>();
export async function consume(key: string, limit: number, seconds: number): Promise<boolean> {
  const now = Date.now();
  for (const [k, value] of counters) if (value.until <= now) counters.delete(k);
  if (!counters.has(key) && counters.size >= 10000) return false;
  const current = counters.get(key) ?? { count: 0, until: now + seconds * 1000 };
  current.count++; counters.set(key, current);
  return current.count <= limit;
}
export function boundedEnv(name: string, defaultValue: number, max: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.min(Math.floor(value), max) : defaultValue;
}

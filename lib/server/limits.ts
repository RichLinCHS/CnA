import { createHash } from 'node:crypto';

export const hash = (s: string) => createHash('sha256').update(s).digest('hex');
export function sharedConfigured() { return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN); }
export async function redis(command: (string | number)[]): Promise<unknown> {
  const response = await fetch(process.env.UPSTASH_REDIS_REST_URL!, { method: 'POST', headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(command), signal: AbortSignal.timeout(3000), cache: 'no-store' });
  if (!response.ok) throw new Error('Usage controls unavailable');
  const data = await response.json();
  if (data.error) throw new Error('Usage controls unavailable');
  return data.result;
}
const counters = new Map<string, { count: number; until: number }>();
export async function consume(key: string, limit: number, seconds: number): Promise<boolean> {
  if (sharedConfigured()) {
    const count = await redis(['EVAL', "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n", 1, `sb:v1:limit:${key}`, seconds]);
    return Number(count) <= limit;
  }
  if (process.env.NODE_ENV === 'production') throw new Error('Shared limits must be configured in production');
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

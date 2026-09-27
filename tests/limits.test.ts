import { afterEach, expect, it, vi } from 'vitest';
import { consume } from '../lib/server/limits';
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it('enforces a local request window and resets on expiry', async () => {
  vi.stubEnv('NODE_ENV', 'development'); vi.stubEnv('UPSTASH_REDIS_REST_URL', ''); vi.useFakeTimers();
  expect(await consume('test-window', 2, 60)).toBe(true);
  expect(await consume('test-window', 2, 60)).toBe(true);
  expect(await consume('test-window', 2, 60)).toBe(false);
  vi.advanceTimersByTime(60001); expect(await consume('test-window', 2, 60)).toBe(true);
});
it('fails closed in production without Redis', async () => {
  vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
  await expect(consume('production', 2, 60)).rejects.toThrow('Shared limits');
});
it('refuses requests over the shared Redis limit', async () => {
  vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://example.invalid'); vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test');
  const mock = vi.fn(async () => Response.json({ result: 11 })); vi.stubGlobal('fetch', mock);
  expect(await consume('shared', 10, 60)).toBe(false); expect(mock).toHaveBeenCalledOnce();
});

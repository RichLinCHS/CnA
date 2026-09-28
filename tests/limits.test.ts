import { afterEach, expect, it, vi } from 'vitest';
import { consume } from '../lib/server/limits';
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it('enforces a local request window and resets on expiry', async () => {
  vi.useFakeTimers();
  expect(await consume('test-window', 2, 60)).toBe(true);
  expect(await consume('test-window', 2, 60)).toBe(true);
  expect(await consume('test-window', 2, 60)).toBe(false);
  vi.advanceTimersByTime(60001); expect(await consume('test-window', 2, 60)).toBe(true);
});
it('works in production without an external database', async () => {
  vi.stubEnv('NODE_ENV', 'production');
  const mock = vi.fn(); vi.stubGlobal('fetch', mock);
  expect(await consume('production', 1, 60)).toBe(true);
  expect(await consume('production', 1, 60)).toBe(false);
  expect(mock).not.toHaveBeenCalled();
});
it('keeps client buckets independent', async () => {
  expect(await consume('client-a', 1, 60)).toBe(true);
  expect(await consume('client-a', 1, 60)).toBe(false);
  expect(await consume('client-b', 1, 60)).toBe(true);
});

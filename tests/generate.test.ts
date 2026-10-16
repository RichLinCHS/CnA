import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../lib/server/limits', () => ({ consume: vi.fn(async () => true), hash: (s: string) => s, boundedEnv: (_: string, d: number) => d }));
import { consume } from '../lib/server/limits';
import { clearCache, generate } from '../lib/server/generate';
import { fallback, vocabulary } from '../lib/vocabulary';
import { validateLearning } from '../lib/schema';
import { POST } from '../app/api/generate/route';

const reply = (data: unknown, extra = {}) => new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(data) }, ...extra }] }), { status: 200 });
beforeEach(() => { clearCache(); vi.stubEnv('OPENAI_API_KEY', 'test-key'); vi.mocked(consume).mockResolvedValue(true); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe('AI generation', () => {
  it('generates a single word with a strict JSON schema', async () => {
    const mock = vi.fn(async () => reply(fallback('apple'))); vi.stubGlobal('fetch', mock);
    const result = await generate({ text: 'apple' }, 'test');
    expect(result.source).toBe('ai'); expect(result.data.words[0].translation).toBe('苹果');
    const options = (mock.mock.calls as unknown[][])[0][1] as RequestInit;
    expect(JSON.parse(options.body as string).response_format.json_schema.strict).toBe(true);
  });
  it('generates a sentence and preserves ordered duplicate words', async () => {
    const base = fallback('how are you')!;
    const data = { ...base, originalText: 'How are you today?', sentence: { ...base.sentence, english: 'How are you today?', soundAlike: '好 阿 优 特得诶', translation: '你今天好吗？', ipa: '/haʊ ɑr ju təˈdeɪ/' }, words: [{ ...base.words[0], english: 'How' }, ...base.words.slice(1), fallback('today')!.words[0]] };
    vi.stubGlobal('fetch', vi.fn(async () => reply(data)));
    expect((await generate({ text: data.originalText }, 'test')).data.words.map(w => w.english)).toEqual(['How','are','you','today']);
    expect(() => validateLearning({ ...data, words: [...data.words].reverse() }, data.originalText)).toThrow();
    const repeated = { originalText: 'you you', sentence: { ...base.sentence, english: 'you you' }, words: [base.words[2], base.words[2]] };
    expect(validateLearning(repeated, 'you you').words).toHaveLength(2);
  });
  it.each(['', '   ', 'a'.repeat(301), '你好'])('rejects invalid input: %s', async text => { await expect(generate({ text }, 'test')).rejects.toMatchObject({ status: 400 }); });
  it('rejects malformed AI responses for unknown vocabulary', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reply({ words: [] })));
    await expect(generate({ text: 'unlisted' }, 'test')).rejects.toMatchObject({ status: 502 });
  });
  it('rejects truncated and refused output', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reply({}, { finish_reason: 'length' })));
    await expect(generate({ text: 'unlisted' }, 'test')).rejects.toMatchObject({ status: 502 });
  });
  it('handles API failures without leaking provider details', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('secret provider error', { status: 401 })));
    await expect(generate({ text: 'unlisted' }, 'test')).rejects.toMatchObject({ status: 502 });
    expect((await generate({ text: 'apple' }, 'test')).source).toBe('fallback');
  });
  it('handles a timeout', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new DOMException('timed out', 'TimeoutError'); }));
    await expect(generate({ text: 'unlisted' }, 'test')).rejects.toMatchObject({ status: 504 });
  });
  it('handles missing keys with complete original vocabulary fallback', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    for (const text of Object.keys(vocabulary)) { const result = await generate({ text }, 'test'); expect(result.source).toBe('fallback'); expect(validateLearning(result.data, text)).toBeTruthy(); }
    await expect(generate({ text: 'unlisted' }, 'test')).rejects.toMatchObject({ status: 503 });
  });
  it('caches successful results', async () => {
    const mock = vi.fn(async () => reply(fallback('apple'))); vi.stubGlobal('fetch', mock);
    await generate({ text: 'apple' }, 'test'); expect((await generate({ text: 'apple' }, 'test')).source).toBe('cache'); expect(mock).toHaveBeenCalledTimes(1);
  });
  it('deduplicates concurrent calls', async () => {
    const mock = vi.fn(async () => reply(fallback('apple'))); vi.stubGlobal('fetch', mock);
    await Promise.all([generate({ text: 'apple' }, 'test'), generate({ text: 'apple' }, 'test')]); expect(mock).toHaveBeenCalledTimes(1);
  });
  it('enforces request limits before calling the provider', async () => {
    vi.mocked(consume).mockResolvedValue(false); const mock = vi.fn(); vi.stubGlobal('fetch', mock);
    await expect(generate({ text: 'apple' }, 'test')).rejects.toMatchObject({ status: 429 }); expect(mock).not.toHaveBeenCalled();
  });
});
describe('POST /api/generate', () => {
  const request = (body: string, headers = {}) => new Request('http://localhost/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body });
  it('returns a valid fallback response without a key', async () => { vi.stubEnv('OPENAI_API_KEY', ''); expect((await POST(request('{"text":"apple"}'))).status).toBe(200); });
  it('rejects malformed JSON', async () => { expect((await POST(request('{'))).status).toBe(400); });
  it('rejects oversized bodies', async () => { expect((await POST(request('x'.repeat(4097)))).status).toBe(413); });
  it('rejects cross-origin requests', async () => { expect((await POST(request('{}', { Origin: 'https://other.example' }))).status).toBe(403); });
  it('accepts the actual Host when Next normalizes its internal URL', async () => { vi.stubEnv('OPENAI_API_KEY', ''); expect((await POST(request('{"text":"apple"}', { Origin: 'http://127.0.0.1:3000', Host: '127.0.0.1:3000' }))).status).toBe(200); });
});
it('accepts compact words without repeated limitation essays',async()=>{const data=fallback('hello')!;const compact={...data,words:data.words.map(({limitations,...word})=>word)};const mock=vi.fn(async()=>reply(compact));vi.stubGlobal('fetch',mock);const result=await generate({text:'hello'},'test');expect(result.data.words[0].limitations.length).toBeGreaterThan(0);const body=JSON.parse(((mock.mock.calls as unknown[][])[0][1] as RequestInit).body as string);expect(body.response_format.json_schema.schema.properties.words.items.properties.limitations).toBeUndefined();});

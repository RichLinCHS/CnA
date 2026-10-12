import { afterEach, expect, it, vi } from 'vitest';
import { inputSchema, validateLearning } from '../lib/schema';
import { generate, clearCache } from '../lib/server/generate';
import { fallback } from '../lib/vocabulary';
vi.mock('../lib/server/limits', () => ({ consume: async () => true, hash: (s: string) => s, boundedEnv: (_: string, d: number) => d }));
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); clearCache(); });
it('accepts Chinese only in Chinese mode and keeps length limits', () => {
 expect(inputSchema.safeParse({text:'你好吗',inputLanguage:'zh'}).success).toBe(true);
 expect(inputSchema.safeParse({text:'你好吗'}).success).toBe(false);
 expect(inputSchema.safeParse({text:'你'.repeat(301),inputLanguage:'zh'}).success).toBe(false);
});
it('generates and validates translated English while preserving Chinese source', async () => {
 vi.stubEnv('OPENAI_API_KEY','test');
 const data = {...fallback('how are you')!, originalText:'你好吗'};
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(data)}}]})));
 expect((await generate({text:'你好吗',inputLanguage:'zh'},'test')).data.sentence.english).toBe('how are you');
 expect(() => validateLearning({...data,words:[]},'你好吗','zh')).toThrow();
 expect(() => validateLearning({...data,originalText:'不同'},'你好吗','zh')).toThrow();
});

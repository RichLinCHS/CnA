import { afterEach, expect, it, vi } from 'vitest';
import { structuredModel } from '../lib/server/model';
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('uses NVIDIA model and max_tokens while retaining strict schema validation', async()=>{
  vi.stubEnv('OPENAI_BASE_URL','https://integrate.api.nvidia.com/v1');vi.stubEnv('OPENAI_MODEL','deepseek-ai/deepseek-v4.1-flash');vi.stubEnv('OPENAI_API_KEY','test-only');
  const fetcher=vi.fn(async()=>Response.json({choices:[{finish_reason:'stop',message:{content:'{"ok":true}'}}]}));vi.stubGlobal('fetch',fetcher);
  const result=await structuredModel('test',{type:'object'},[{role:'user',content:'Test'}],data=>data);
  expect(result).toEqual({ok:true});const args=(fetcher.mock.calls as unknown[][])[0];expect(String(args[0])).toBe('https://integrate.api.nvidia.com/v1/chat/completions');const body=JSON.parse((args[1] as RequestInit).body as string);expect(body.max_tokens).toBe(12000);expect(body.max_completion_tokens).toBeUndefined();expect(body.model).toBe('deepseek-ai/deepseek-v4.1-flash');expect(body.response_format.json_schema.strict).toBe(true);
});
it('still rejects invalid NVIDIA response content',async()=>{
  vi.stubEnv('OPENAI_BASE_URL','https://integrate.api.nvidia.com/v1');vi.stubGlobal('fetch',vi.fn(async()=>Response.json({choices:[{finish_reason:'stop',message:{content:'not JSON'}}]})));
  await expect(structuredModel('test',{},[],data=>data)).rejects.toMatchObject({status:502});
});

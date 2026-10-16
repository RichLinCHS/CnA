import { afterEach, expect, it, vi } from 'vitest';
import { structuredModel } from '../lib/server/model';
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('normalizes the NVIDIA Nemotron short name and disables reasoning', async()=>{
  vi.stubEnv('OPENAI_BASE_URL','https://integrate.api.nvidia.com/v1');
  vi.stubEnv('OPENAI_MODEL','nemotron-3-super-120b-a12b');
  const fetcher=vi.fn(async()=>Response.json({choices:[{finish_reason:'stop',message:{content:'{}'}}]}));
  vi.stubGlobal('fetch',fetcher);
  await structuredModel('test',{},[],data=>data);
  const body=JSON.parse(((fetcher.mock.calls as unknown[][])[0][1] as RequestInit).body as string);
  expect(body.model).toBe('nvidia/nemotron-3-super-120b-a12b');
  expect(body.reasoning_effort).toBe('none');
  expect(body.response_format.json_schema.strict).toBe(true);
});
it.each([401,403,404,400,422,429,500])('reports provider HTTP %s safely',async status=>{
  vi.stubGlobal('fetch',vi.fn(async()=>new Response('secret provider detail',{status})));
  await expect(structuredModel('test',{},[],data=>data)).rejects.toMatchObject({status:502});
  await expect(structuredModel('test',{},[],data=>data)).rejects.not.toThrow('secret provider detail');
});
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
it('does not restart a timed-out generation',async()=>{const fetcher=vi.fn(async()=>{throw new DOMException('slow','TimeoutError');});vi.stubGlobal('fetch',fetcher);await expect(structuredModel('test',{},[],v=>v)).rejects.toMatchObject({status:504});expect(fetcher).toHaveBeenCalledTimes(1);});
it('retries a quick service error with the same deadline and strict schema',async()=>{const fetcher=vi.fn().mockResolvedValueOnce(new Response('',{status:503})).mockResolvedValueOnce(Response.json({choices:[{finish_reason:'stop',message:{content:'{}'}}]}));vi.stubGlobal('fetch',fetcher);await structuredModel('test',{},[],v=>v);expect(fetcher).toHaveBeenCalledTimes(2);expect(fetcher.mock.calls[0][1].signal).toBe(fetcher.mock.calls[1][1].signal);expect(JSON.parse(fetcher.mock.calls[1][1].body).response_format.json_schema.strict).toBe(true);});

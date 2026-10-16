import { boundedEnv } from './limits';
export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export type ModelMessage = { role: 'system' | 'user' | 'assistant'; content: string };
export async function structuredModel<T>(name: string, schema: object, messages: ModelMessage[], validate: (data: unknown) => T): Promise<T> {
  try {
    const base = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    const url = new URL(`${base.replace(/\/$/, '')}/chat/completions`);
    const nvidia = url.hostname === 'integrate.api.nvidia.com';
    // Keep Chinese-content checks in Zod. NVIDIA's grammar compiler can treat
    // substring patterns as whole values or stall on broad Unicode alternatives.
    const providerSchema = nvidia ? JSON.parse(JSON.stringify(schema, (key, value) =>
      key === 'pattern' && typeof value === 'string' && value.includes('u3400') ? undefined : value)) : schema;
    const configuredModel = process.env.OPENAI_MODEL?.trim();
    const model = nvidia && (!configuredModel || configuredModel === 'nemotron-3-super-120b-a12b')
      ? 'nvidia/nemotron-3-super-120b-a12b' : configuredModel || 'gpt-4o-mini';
    if (url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new ApiError(503, 'AI provider configuration is unavailable.');
    // One deadline covers fetch, body parsing and any quick transient retry.
    // Never restart a slow generation after dividing the deadline into attempts.
    const signal = AbortSignal.timeout(boundedEnv('AI_TIMEOUT_MS', nvidia ? 90000 : 30000, 90000));
    const started = Date.now();
    const attempts = boundedEnv('AI_FETCH_RETRIES', 2, 2);
    let response!: Response;
    for (let attempt=0;attempt<attempts;attempt++) {
    response = await fetch(url, {
      method: 'POST', cache: 'no-store', signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model, ...(nvidia ? { max_tokens: 12000 } : { max_completion_tokens: 12000 }), ...(nvidia && model === 'nvidia/nemotron-3-super-120b-a12b' ? { reasoning_effort: 'none' } : {}), stream: false, messages, response_format: { type: 'json_schema', json_schema: { name, strict: true, schema: providerSchema } } }),
    });
    if (![502,503,504].includes(response.status) || Date.now()-started>5000 || attempt+1>=attempts) break;
    await response.body?.cancel();
    await new Promise(resolve=>setTimeout(resolve,250));
    signal.throwIfAborted();
    }
    console.info(JSON.stringify({event:'ai_response',name,status:response.status,elapsedMs:Date.now()-started}));
    if (!response.ok) {
      // Never return provider bodies: they may contain credentials or user content.
      const explanations: Record<number, string> = {
        401: 'The AI provider rejected the API key. Check OPENAI_API_KEY in Vercel and redeploy.',
        403: 'The AI provider denied access. Check that the key has access to the configured model.',
        404: 'The AI model or endpoint was not found. Check OPENAI_MODEL and OPENAI_BASE_URL in Vercel and redeploy.',
        400: 'The AI provider rejected the request format. Check model support for structured JSON output.',
        422: 'The AI provider rejected the request format. Check model support for structured JSON output.',
        429: 'The AI provider usage limit was reached. Check provider quota or try again later.',
      };
      throw new ApiError(502, explanations[response.status] || `The AI provider returned HTTP ${response.status}. Please try again later.`);
    }
    const envelope = await response.json(); const choice = envelope.choices?.[0];
    if (choice?.finish_reason !== 'stop' || choice.message?.refusal || typeof choice.message?.content !== 'string') throw new ApiError(502, 'The AI returned an incomplete response. Please try again.');
    return validate(JSON.parse(choice.message.content));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name)) throw new ApiError(504, 'Generation timed out. Please try again.');
    throw new ApiError(502, 'The AI response could not be validated. Please try again.');
  }
}

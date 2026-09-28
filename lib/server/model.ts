import { boundedEnv } from './limits';
export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export type ModelMessage = { role: 'system' | 'user' | 'assistant'; content: string };
export async function structuredModel<T>(name: string, schema: object, messages: ModelMessage[], validate: (data: unknown) => T): Promise<T> {
  try {
    const base = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    const url = new URL(`${base.replace(/\/$/, '')}/chat/completions`);
    const nvidia = url.hostname === 'integrate.api.nvidia.com';
    if (url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new ApiError(503, 'AI provider configuration is unavailable.');
    const response = await fetch(url, {
      method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(boundedEnv('AI_TIMEOUT_MS', nvidia ? 45000 : 20000, 45000)),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || (nvidia ? 'deepseek-ai/deepseek-v4.1-flash' : 'gpt-4o-mini'), ...(nvidia ? { max_tokens: 12000 } : { max_completion_tokens: 12000 }), stream: false, messages, response_format: { type: 'json_schema', json_schema: { name, strict: true, schema } } }),
    });
    if (!response.ok) throw new ApiError(502, 'AI is unavailable. Please try again later.');
    const envelope = await response.json(); const choice = envelope.choices?.[0];
    if (choice?.finish_reason !== 'stop' || choice.message?.refusal || typeof choice.message?.content !== 'string') throw new ApiError(502, 'The AI returned an incomplete response. Please try again.');
    return validate(JSON.parse(choice.message.content));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name)) throw new ApiError(504, 'Generation timed out. Please try again.');
    throw new ApiError(502, 'The AI response could not be validated. Please try again.');
  }
}

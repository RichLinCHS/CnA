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

    // Determine timeouts and retry policy via envs with safe bounds.
    // totalTimeoutMs should be less than the serverless function maxDuration (keep a buffer)
    const totalTimeoutMs = boundedEnv('AI_TIMEOUT_MS', nvidia ? 90000 : 30000, 290000);
    const maxAttempts = Math.max(1, boundedEnv('AI_FETCH_RETRIES', 2, 5));
    const baseDelayMs = boundedEnv('AI_RETRY_BASE_MS', 1000, 10000);

    // Helper to build the request body
    const requestBody = () => ({
      model,
      ...(nvidia ? { max_tokens: 12000 } : { max_completion_tokens: 12000 }),
      ...(nvidia && model === 'nvidia/nemotron-3-super-120b-a12b' ? { reasoning_effort: 'none' } : {}),
      messages
    });

    let attempt = 0;
    let lastError: unknown = null;
    const startAll = Date.now();

    // Split total timeout across attempts to avoid a single attempt using all time
    while (attempt < maxAttempts) {
      attempt++;
      const attemptStart = Date.now();
      // Ensure at least 10s per attempt and not exceed totalTimeoutMs
      const perAttemptTimeout = Math.min(totalTimeoutMs, Math.max(10000, Math.floor(totalTimeoutMs / maxAttempts)));
      console.info(`[model:${name}] attempt=${attempt}/${maxAttempts} model=${model} timeout=${perAttemptTimeout}ms`);
      try {
        const response = await fetch(url, {
          method: 'POST',
          cache: 'no-store',
          signal: AbortSignal.timeout(perAttemptTimeout),
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
          body: JSON.stringify(requestBody()),
        });

        const took = Date.now() - attemptStart;
        console.info(`[model:${name}] response status=${response.status} took=${took}ms attempt=${attempt}`);

        if (!response.ok) {
          // Retry on transient provider errors
          if ([429, 502, 503, 504].includes(response.status) && attempt < maxAttempts) {
            const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), 60000);
            console.warn(`[model:${name}] transient status ${response.status}, retrying after ${delay}ms`);
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
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

        const envelope = await response.json();
        const choice = envelope.choices?.[0];
        if (choice?.finish_reason !== 'stop' || choice.message?.refusal || typeof choice.message?.content !== 'string') {
          // Consider this transient unless it's the last attempt
          if (attempt < maxAttempts) {
            const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), 60000);
            console.warn(`[model:${name}] incomplete response, retrying after ${delay}ms`);
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
          throw new ApiError(502, 'The AI returned an incomplete response. Please try again.');
        }

        // Successful — validate and return
        const validateStart = Date.now();
        const parsed = validate(JSON.parse(choice.message.content));
        console.info(`[model:${name}] validation took ${Date.now() - validateStart}ms total=${Date.now() - startAll}ms`);
        return parsed;

      } catch (err) {
        lastError = err;
        // If this was a timeout or AbortError and we can retry, backoff then retry
        if (err instanceof Error && ['AbortError', 'TimeoutError'].includes(err.name) && attempt < maxAttempts) {
          const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), 60000);
          console.warn(`[model:${name}] attempt ${attempt} aborted (${err.name}), retrying after ${delay}ms`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        // Non-retryable or out of attempts: rethrow mapped errors
        if (err instanceof ApiError) throw err;
        if (err instanceof Error && ['AbortError', 'TimeoutError'].includes(err.name)) throw new ApiError(504, 'Generation timed out. Please try again.');
        throw new ApiError(502, 'The AI response could not be validated. Please try again.');
      }
    }
    throw lastError instanceof ApiError ? lastError : new ApiError(502, 'The AI response could not be validated after retries.');

  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name)) throw new ApiError(504, 'Generation timed out. Please try again.');
    throw new ApiError(502, 'The AI response could not be validated. Please try again.');
  }
}

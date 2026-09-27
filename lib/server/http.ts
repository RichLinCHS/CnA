import { ApiError } from './model';
export async function readRequest(request: Request, limit: number) {
  const origin = request.headers.get('origin');
  if (origin) {
    let allowed = false;
    try { const parsed = new URL(origin); allowed = ['http:', 'https:'].includes(parsed.protocol) && parsed.host === (request.headers.get('host') || new URL(request.url).host); } catch { /* Invalid origin. */ }
    if (!allowed) throw new ApiError(403, 'Cross-origin requests are not allowed.');
  }
  if (!request.headers.get('content-type')?.includes('application/json')) throw new ApiError(415, 'Send application/json.');
  const reader = request.body?.getReader(); if (!reader) throw new ApiError(400, 'A JSON body is required.');
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    length += value.byteLength;
    if (length > limit) { await reader.cancel(); throw new ApiError(413, 'Request is too large.'); }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown; } catch { throw new ApiError(400, 'Invalid JSON.'); }
}
export const clientIdentity = (request: Request) => process.env.VERCEL ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim() || 'unknown' : 'local';
export function errorResponse(error: unknown) {
  const known = error instanceof ApiError; const status = known ? error.status : 500;
  return Response.json({ error: known ? error.message : 'Something went wrong. Please try again.' }, { status, headers: { 'Cache-Control': 'no-store', ...(status === 429 ? { 'Retry-After': '60' } : {}) } });
}

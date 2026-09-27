import { generate } from '../../../lib/server/generate';
import { clientIdentity, errorResponse, readRequest } from '../../../lib/server/http';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  try { return Response.json(await generate(await readRequest(request, 4096), clientIdentity(request)), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return errorResponse(error); }
}

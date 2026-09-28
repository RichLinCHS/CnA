import { chat } from '../../../lib/server/chat';
import { clientIdentity, errorResponse, readRequest } from '../../../lib/server/http';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  try { return Response.json({ data: await chat(await readRequest(request, 100000), clientIdentity(request)) }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return errorResponse(error); }
}

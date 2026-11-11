/**
 * The address of a quiz duel's room, /api/duel/<room>: a WebSocket to the room's Durable Object
 * (src/server/quiz-duel.ts). Checked here first: a room name a browser made at random (not one
 * a visitor could guess), a WebSocket opened by this site's own pages (another site's page could
 * otherwise join rooms in its visitors' names), and a per-visitor rate limit.
 */
import { rateLimitKey } from './rate-limit-key';

/** The room's name, as src/components/duel/ makes it: 22 random base64url characters. */
const ROOM = /^\/api\/duel\/([A-Za-z0-9_-]{22})$/;

interface Rooms {
  idFromName(name: string): unknown;
  get(id: unknown): { fetch(request: Request): Promise<Response> };
}

interface Limiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/** The room's answer, a refusal, or null when the request isn't for a room. */
export async function duelRoom(
  request: Request,
  { rooms, limiter, clientAddress }: { rooms: Rooms; limiter: Limiter; clientAddress: string },
): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/duel/')) return null;
  const name = ROOM.exec(url.pathname)?.[1];
  if (!name) return new Response('Not found', { status: 404 });
  if (request.headers.get('Upgrade') !== 'websocket')
    return new Response('Expected a WebSocket', { status: 426 });
  if (request.headers.get('Origin') !== url.origin)
    return new Response('Forbidden', { status: 403 });
  const { success } = await limiter.limit({ key: rateLimitKey(clientAddress) });
  if (!success) return new Response('Too many requests', { status: 429 });
  return rooms.get(rooms.idFromName(name)).fetch(request);
}

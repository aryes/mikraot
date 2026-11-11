import { describe, expect, it } from 'vitest';
import { duelRoom } from './duel-route';

const ROOM = 'abcdefghijklmnopqrstuv';
const rooms = {
  idFromName: (name: string) => name,
  get: () => ({ fetch: () => Promise.resolve(new Response('room')) }),
};
const allow = { limit: () => Promise.resolve({ success: true }) };
const deny = { limit: () => Promise.resolve({ success: false }) };

const request = (path: string, headers: Record<string, string> = {}) =>
  new Request(`https://mikraot.net${path}`, { headers });
const socket = { Upgrade: 'websocket', Origin: 'https://mikraot.net' };

/** The status a request gets, or undefined when it isn't for a room. */
const status = async (path: string, headers: Record<string, string>, limiter = allow) =>
  (await duelRoom(request(path, headers), { rooms, limiter, clientAddress: '' }))?.status;

describe('duelRoom', () => {
  it('leaves other addresses alone', async () => {
    expect(
      await duelRoom(request('/api/comments'), { rooms, limiter: allow, clientAddress: '' }),
    ).toBeNull();
  });

  it('hands a WebSocket from the site itself to the room', async () => {
    const answer = await duelRoom(request(`/api/duel/${ROOM}`, socket), {
      rooms,
      limiter: allow,
      clientAddress: '203.0.113.7',
    });
    expect(await answer?.text()).toBe('room');
  });

  it('refuses a made-up room, a plain request, another site and too many', async () => {
    expect(await status('/api/duel/short', socket)).toBe(404);
    expect(await status(`/api/duel/${ROOM}`, {})).toBe(426);
    expect(await status(`/api/duel/${ROOM}`, { ...socket, Origin: 'https://evil.example' })).toBe(
      403,
    );
    expect(await status(`/api/duel/${ROOM}`, socket, deny)).toBe(429);
  });
});

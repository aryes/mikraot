/**
 * A quiz duel's room (src/lib/duel.ts has its rules): a Durable Object, one per room, holding
 * the learners' WebSockets and the room's state. It uses the WebSocket Hibernation API, so a
 * room waiting for its learners' next answers isn't billed (and stays within the free plan),
 * and keeps its state in its own storage, so it survives being put to sleep.
 *
 * Its time is over ROOM_LIFETIME after it opened (an alarm): it closes its sockets (CLOSED, which
 * the browsers don't reconnect after) and keeps only that it is closed, so a reconnecting tab
 * can't open it again; a day later even that is deleted.
 *
 * Free-plan quotas are shared by every room, so one socket can't use them up: at most
 * MAX_SOCKETS learners' connections a room (and MAX_SILENT that haven't said hello), MAX_MOVES
 * messages a minute a socket, and a move that changes nothing is neither written nor sent on.
 * Reached through the Worker (src/worker.ts, src/server/duel-route.ts), which checks the request
 * first.
 */
import { DurableObject } from 'cloudflare:workers';
import {
  apply,
  closedState,
  emptyState,
  leave,
  parseMove,
  refusal,
  ROOM_LIFETIME,
  viewFor,
  type DuelState,
} from '../lib/duel';

/** The close codes the browsers know (src/components/duel/useDuel.ts): don't reconnect. */
export const CLOSED = 4000;
export const REFUSED = 4001;
const POLICY = 1008;
/** Learners' connections a room takes at once: a learner may have a second tab, or reconnect. */
const MAX_SOCKETS = 16;
/** Connections that haven't said hello yet: past this, the oldest of them is closed. */
const MAX_SILENT = 4;
/** The close codes of a learner leaving on purpose (the leave button, or closing the page). */
const LEAVING = new Set([1000, 1001]);
/** Messages a socket may send a minute: a round of ten needs about fifteen. */
const MAX_MOVES = 60;
/** How long the mark of a closed room is kept. */
const CLOSED_KEPT = 24 * 60 * 60 * 1000;

/** What each socket remembers through hibernation: whose it is, and its recent messages. */
interface Attachment {
  player: string | null;
  minute: number;
  moves: number;
}

function attachmentOf(socket: WebSocket): Attachment {
  const value: unknown = socket.deserializeAttachment();
  const field = (name: string): unknown =>
    value && typeof value === 'object' ? Reflect.get(value, name) : undefined;
  const [player, minute, moves] = [field('player'), field('minute'), field('moves')];
  return {
    player: typeof player === 'string' ? player : null,
    minute: typeof minute === 'number' ? minute : 0,
    moves: typeof moves === 'number' ? moves : 0,
  };
}

export class QuizDuel extends DurableObject {
  private state: DuelState = emptyState();

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
    // Before any message: the state as it was when the room last went to sleep.
    void ctx.blockConcurrencyWhile(async () => {
      this.state = (await ctx.storage.get<DuelState>('state')) ?? emptyState();
    });
  }

  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket')
      return new Response('Expected a WebSocket', { status: 426 });
    const sockets = this.ctx.getWebSockets();
    if (sockets.filter((socket) => attachmentOf(socket).player).length >= MAX_SOCKETS)
      return new Response('The room is full', { status: 503 });
    // Sockets that never say hello can't crowd learners out.
    const silent = sockets.filter((socket) => !attachmentOf(socket).player);
    if (silent.length >= MAX_SILENT) silent[0]?.close(POLICY, 'No hello');
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ player: null, minute: 0, moves: 0 } satisfies Attachment);
    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const attachment = attachmentOf(socket);
    const minute = Math.floor(Date.now() / 60_000);
    const moves = attachment.minute === minute ? attachment.moves + 1 : 1;
    const move = typeof message === 'string' ? parseMove(message) : null;
    if (!move || moves > MAX_MOVES) {
      socket.close(POLICY, move ? 'Too many messages' : 'Not a move');
      return;
    }
    // A socket speaks for one learner: the one it said hello as.
    const player = move.t === 'hello' ? move.player : attachment.player;
    socket.serializeAttachment({ ...attachment, minute, moves } satisfies Attachment);
    if (!player || (attachment.player && attachment.player !== player)) return;
    if (move.t === 'hello') {
      const why = refusal(this.state, move);
      if (why) {
        socket.send(JSON.stringify({ t: 'refused', why }));
        socket.close(REFUSED, why);
        return;
      }
      socket.serializeAttachment({ player, minute, moves } satisfies Attachment);
      // The room's end, set once, when it is opened.
      if (this.state.joined === 0) await this.ctx.storage.setAlarm(Date.now() + ROOM_LIFETIME);
    }
    const next = apply(this.state, player, move, Date.now());
    if (next) await this.save(next);
    // A hello always gets the room's view, even when it changed nothing (a reconnection).
    else if (move.t === 'hello') this.send(socket, player);
  }

  override async webSocketClose(socket: WebSocket, code: number): Promise<void> {
    // Leaving on purpose (not a dropped connection, which reconnects as the same learner, the
    // host still the host): with their last connection, before the start, they leave the room.
    const { player } = attachmentOf(socket);
    const others = this.ctx
      .getWebSockets()
      .filter((other) => other !== socket && attachmentOf(other).player === player);
    const next =
      player && LEAVING.has(code) && others.length === 0 ? leave(this.state, player) : null;
    if (next) await this.save(next);
  }

  override async alarm(): Promise<void> {
    if (this.state.closed) {
      await this.ctx.storage.deleteAll();
      return;
    }
    for (const socket of this.ctx.getWebSockets()) socket.close(CLOSED, 'The room has closed');
    this.state = closedState();
    await this.ctx.storage.deleteAll();
    await this.ctx.storage.put('state', this.state);
    await this.ctx.storage.setAlarm(Date.now() + CLOSED_KEPT);
  }

  private async save(next: DuelState): Promise<void> {
    this.state = next;
    await this.ctx.storage.put('state', next);
    for (const socket of this.ctx.getWebSockets()) {
      const { player } = attachmentOf(socket);
      if (player) this.send(socket, player);
    }
  }

  /** The learner's own view of the room, to one socket of theirs. */
  private send(socket: WebSocket, player: string): void {
    socket.send(JSON.stringify({ t: 'view', view: viewFor(this.state, player) }));
  }
}

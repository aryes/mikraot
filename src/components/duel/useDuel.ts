/**
 * A quiz's connection to a duel's room (src/lib/duel.ts; the room: src/server/quiz-duel.ts). The
 * room is named in the page's address (?duel=<room>), so the link to share is the page itself.
 * partysocket's ReconnectingWebSocket reopens a dropped connection (a phone switching networks),
 * and the learner says hello again each time, as the same learner (their id stays in the
 * browser).
 */
import ReconnectingWebSocket from 'partysocket/ws';
import { useEffect, useRef, useState } from 'react';
import type { DuelRound, DuelView, Move } from '../../lib/duel';

/** The address's parameter that names the room. */
export const DUEL_PARAM = 'duel';
const PLAYER_KEY = 'quiz-duel-player';

/** 22 random base64url characters (128 bits): a room nobody can guess. */
function randomName(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCodePoint(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

/** This browser's learner id, made once and kept (or made anew when storage is blocked). */
function playerId(): string {
  try {
    const saved = localStorage.getItem(PLAYER_KEY);
    if (saved) return saved;
    const made = randomName();
    localStorage.setItem(PLAYER_KEY, made);
    return made;
  } catch {
    return randomName();
  }
}

/** The page's address with the room in it, or without any. */
export function roomUrl(room: string | null): string {
  const url = new URL(location.href);
  if (room) url.searchParams.set(DUEL_PARAM, room);
  else url.searchParams.delete(DUEL_PARAM);
  url.hash = '';
  return url.toString();
}

/**
 * Where the learner is with a room: none; invited by the address; connecting (or reconnecting);
 * in it; refused (full, or already started), gone (closed, or never opened), cut off (the
 * connection lost for good), or in another quiz's room.
 */
export type DuelStatus =
  'none' | 'invited' | 'connecting' | 'open' | 'refused' | 'gone' | 'lost' | 'other';

/** The room's close codes (src/server/quiz-duel.ts): closed for good, or this learner refused. */
const CLOSED = 4000;
const REFUSED = 4001;
/** Reconnections tried before telling the learner the connection is lost. */
const RETRIES = 10;

export interface Duel {
  status: DuelStatus;
  view: DuelView | null;
  /** The room's link, to share. */
  link: string | null;
  /** Opens a room for this round, as its host. */
  host(name: string, round: DuelRound): void;
  /** Joins the room the address names. */
  join(name: string): void;
  start(): void;
  answer(index: number, choice: string): void;
  /** Leaves the room (the address forgets it). */
  leave(): void;
}

/**
 * The room the page's address invites to, if any. Only in the browser: on the server the quiz
 * draws its loading line, the same whatever this says, so the two drawings still agree.
 */
function invitation(): string | null {
  if (typeof location === 'undefined') return null;
  const invited = new URL(location.href).searchParams.get(DUEL_PARAM);
  return invited && /^[A-Za-z0-9_-]{22}$/.test(invited) ? invited : null;
}

/** A message from the room, if it is one the quiz knows. */
function parseMessage(
  text: string,
): { t: 'refused'; why: unknown } | { t: 'view'; view: DuelView } | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  const kind: unknown = Reflect.get(data, 't');
  const view: unknown = Reflect.get(data, 'view');
  if (kind === 'refused') return { t: 'refused', why: Reflect.get(data, 'why') };
  return kind === 'view' && isView(view) ? { t: 'view', view } : null;
}

/** The room's own answer (src/lib/duel.ts viewFor): checked for what the quiz reads first. */
function isView(value: unknown): value is DuelView {
  if (!value || typeof value !== 'object') return false;
  return (
    typeof Reflect.get(value, 'you') === 'string' && Array.isArray(Reflect.get(value, 'players'))
  );
}

/**
 * `onStart` is called once, with the room's round, when its host starts it; it returns false
 * for a round it can't play (another quiz's), and the learner leaves the room ('other').
 */
export function useDuel(onStart: (view: DuelView) => boolean): Duel {
  const [room, setRoom] = useState<string | null>(invitation);
  const [status, setStatus] = useState<DuelStatus>(() => (invitation() ? 'invited' : 'none'));
  const [view, setView] = useState<DuelView | null>(null);
  const socket = useRef<ReconnectingWebSocket | null>(null);
  const started = useRef(false);
  /** This learner's answers, sent again after a reconnection (the room ignores repeats). */
  const answers = useRef<string[]>([]);
  const startHandler = useRef(onStart);
  useEffect(() => {
    startHandler.current = onStart;
  });

  useEffect(() => () => socket.current?.close(), []);

  const send = (move: Move) => socket.current?.send(JSON.stringify(move));

  function connect(name: string, to: string, round?: DuelRound): void {
    socket.current?.close();
    started.current = false;
    answers.current = [];
    setStatus('connecting');
    const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/duel/${to}`;
    const ws = new ReconnectingWebSocket(url, [], {
      maxRetries: RETRIES,
      // Nothing waits for a closed socket: after each hello, the answers are sent again instead
      // (a move queued before the hello would reach the room from a stranger, and be lost).
      maxEnqueuedMessages: 0,
      shouldReconnectOnClose: (event) => event.code !== CLOSED && event.code !== REFUSED,
    });
    const player = playerId();
    const say = (move: Move) => ws.send(JSON.stringify(move));
    ws.addEventListener('open', () => {
      setStatus('open');
      say({ t: 'hello', player, name, opening: Boolean(round) });
      // The room takes only its first round: sending it again after a reconnection is harmless.
      if (round) say({ t: 'round', round });
      answers.current.forEach((choice, index) => say({ t: 'answer', index, choice }));
    });
    ws.addEventListener('close', (event: CloseEvent) => {
      if (event.code === CLOSED) setStatus('gone');
      else if (event.code !== REFUSED) setStatus(ws.retryCount >= RETRIES ? 'lost' : 'connecting');
    });
    ws.addEventListener('message', (event: MessageEvent) => {
      if (typeof event.data !== 'string') return;
      const data = parseMessage(event.data);
      if (!data) return;
      if (data.t === 'refused') {
        setStatus(data.why === 'gone' ? 'gone' : 'refused');
        return;
      }
      setView(data.view);
      if (data.view.startedAt !== null && data.view.round && !started.current) {
        started.current = true;
        if (!startHandler.current(data.view)) {
          ws.close();
          setView(null);
          setStatus('other');
        }
      }
    });
    socket.current = ws;
  }

  return {
    status,
    view,
    link: room ? roomUrl(room) : null,
    host(name, round) {
      const made = randomName();
      setRoom(made);
      history.replaceState(history.state, '', roomUrl(made));
      connect(name, made, round);
    },
    join(name) {
      if (room) connect(name, room);
    },
    start: () => send({ t: 'start' }),
    answer(index, choice) {
      answers.current[index] = choice;
      send({ t: 'answer', index, choice });
    },
    leave() {
      socket.current?.close();
      socket.current = null;
      setRoom(null);
      setView(null);
      setStatus('none');
      history.replaceState(history.state, '', roomUrl(null));
    },
  };
}

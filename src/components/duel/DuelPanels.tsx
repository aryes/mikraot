/**
 * What a quiz shows of a duel (src/components/duel/useDuel.ts): joining by an invitation, the
 * room before its start, the other learners while playing, and everyone's score at the end.
 * Names are the learners' own, shown as text (never as markup).
 */
import { Check, Copy, Share2, X, Zap } from 'lucide-react';
import React, { useId, useState } from 'react';
import type { DuelView, PlayerView } from '../../lib/duel';
import { MAX_NAME } from '../../lib/duel';

const BUTTON =
  'bg-brand-strong hover:bg-brand-deep inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-base font-bold text-white shadow-xs transition-all disabled:cursor-not-allowed disabled:opacity-50';
const QUIET =
  'inline-flex cursor-pointer items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800';

/** A link as people read it; as it is if it can't be decoded (a stray % in the address). */
function readable(link: string): string {
  try {
    return decodeURI(link);
  } catch {
    return link;
  }
}

/** The learner's name, before joining or opening a room. */
export const NameField: React.FC<{ value: string; onChange: (name: string) => void }> = ({
  value,
  onChange,
}) => {
  const id = useId();
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block">
        השם שלכם (רשות)
      </label>
      <input
        id={id}
        value={value}
        maxLength={MAX_NAME}
        autoComplete="nickname"
        onInput={(event) => onChange(event.currentTarget.value)}
        className="w-48 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-center dark:border-slate-600 dark:bg-slate-900"
      />
    </div>
  );
};

/** The room before its start: the link to send, who is in, and (for its host) the start. */
export const DuelLobby: React.FC<{
  view: DuelView;
  link: string;
  onStart: () => void;
  onLeave: () => void;
}> = ({ view, link, onStart, onLeave }) => {
  const [copied, setCopied] = useState(false);
  const hosting = view.host === view.you;
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator;
  return (
    <div className="space-y-4 text-center">
      <div className="text-lg">שלחו את הקישור לחברים:</div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <input
          readOnly
          // Readable (the page's Hebrew name, not its %-codes); copied and shared as it is.
          value={readable(link)}
          aria-label="הקישור לחידון"
          dir="ltr"
          onFocus={(event) => event.currentTarget.select()}
          className="w-full max-w-sm rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"
        />
        <button
          type="button"
          className={QUIET}
          onClick={() => {
            void navigator.clipboard.writeText(link).then(() => setCopied(true));
          }}
        >
          {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
          {copied ? 'הועתק' : 'להעתיק'}
        </button>
        {canShare && (
          <button
            type="button"
            className={QUIET}
            onClick={() => {
              void navigator.share({ url: link }).catch(() => {
                // Closed without sharing.
              });
            }}
          >
            <Share2 size={16} aria-hidden="true" />
            לשתף
          </button>
        )}
      </div>
      <div aria-live="polite">
        <div>בחדר:</div>
        {/* Important: the content's list style (.wp-content-rendered ul) would win. */}
        <ul className="list-none! p-0 font-bold">
          {view.players.map((player) => (
            <li key={player.id}>
              {player.name}
              {player.id === view.you && ' (אתם)'}
            </li>
          ))}
        </ul>
      </div>
      {hosting ? (
        <button
          type="button"
          className={BUTTON}
          disabled={view.players.length < 2}
          onClick={onStart}
        >
          להתחיל
        </button>
      ) : (
        <div>ממתינים שהחידון יתחיל…</div>
      )}
      <div>
        <button type="button" className={QUIET} onClick={onLeave}>
          לצאת מהחדר
        </button>
      </div>
    </div>
  );
};

/**
 * Everyone's score while playing, this learner's first; beside each other learner, on the
 * question asked now, a flash once they answered it (before this learner), and once this learner
 * answered too, whether they were right (the flash staying if they were first).
 */
export const DuelScores: React.FC<{ view: DuelView; index: number; answered: boolean }> = ({
  view,
  index,
  answered,
}) => (
  <ul
    aria-label="הניקוד בחדר"
    className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm"
  >
    {view.players
      .filter((player) => player.id === view.you)
      .concat(view.players.filter((player) => player.id !== view.you))
      .map((player) => (
        <li key={player.id} className="inline-flex items-center gap-1">
          <span className="font-bold">{player.id === view.you ? 'אתם' : player.name}:</span>
          <span>{player.score}</span>
          {player.id !== view.you && <Status player={player} index={index} answered={answered} />}
        </li>
      ))}
  </ul>
);

/** An icon that says something: named for screen readers, and on hover. */
const Mark: React.FC<{ Icon: typeof Zap; label: string; colour: string }> = ({
  Icon,
  label,
  colour,
}) => (
  <span role="img" aria-label={label} title={label} className="inline-flex">
    <Icon size={14} aria-hidden="true" className={colour} />
  </span>
);

const FIRST = 'text-amber-600 dark:text-amber-400';

const Status: React.FC<{ player: PlayerView; index: number; answered: boolean }> = ({
  player,
  index,
  answered,
}) => {
  const result = player.results[index];
  if (result === undefined) return null;
  // Right or wrong only once this learner answered too; until then, that they answered.
  if (!answered) return <Mark Icon={Zap} label="כבר יש תשובה" colour={FIRST} />;
  return (
    <>
      {player.first[index] && <Mark Icon={Zap} label="ענו לפניכם" colour={FIRST} />}
      {result ? (
        <Mark Icon={Check} label="נכון" colour="text-green-700 dark:text-green-400" />
      ) : (
        <Mark Icon={X} label="לא נכון" colour="text-red-700 dark:text-red-400" />
      )}
    </>
  );
};

/** Everyone's score at the end, highest first; those still playing say how far they are. */
export const DuelResults: React.FC<{ view: DuelView; size: number }> = ({ view, size }) => (
  <ol className="mx-auto max-w-xs space-y-1">
    {view.players
      .slice()
      // oxlint-disable-next-line unicorn/no-array-sort -- a fresh array; toSorted needs Safari 16
      .sort((a, b) => b.score - a.score)
      .map((player) => (
        <li key={player.id} className="flex justify-between gap-4">
          <span className="font-bold">
            {player.name}
            {player.id === view.you && ' (אתם)'}
          </span>
          <span>
            {player.score}
            {player.results.length < size && ` (בשאלה ${player.results.length + 1})`}
          </span>
        </li>
      ))}
  </ol>
);

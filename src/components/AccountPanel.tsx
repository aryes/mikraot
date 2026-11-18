import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { LogOut, Mail, Trash2 } from 'lucide-react';
import {
  currentAccount,
  deleteAccount,
  remember,
  requestLink,
  signInWithToken,
  signOut,
  type Account,
} from '../lib/account';
import { PRIVACY_POLICY_URL } from '../lib/urls';
import { Turnstile } from './Turnstile';

type View =
  | { kind: 'loading' }
  | { kind: 'signed-out'; notice?: string }
  | { kind: 'sent'; email: string; link?: string | undefined }
  | { kind: 'signed-in'; account: Account; notice?: string }
  | { kind: 'deleted' }
  | { kind: 'error' };

const BUTTON =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-base font-bold transition-all disabled:cursor-default disabled:opacity-60';
const PRIMARY = `${BUTTON} bg-brand-strong text-white shadow-xs hover:bg-brand-deep`;
const SECONDARY = `${BUTTON} border border-slate-400 text-slate-700 hover:bg-slate-100 dark:border-slate-500 dark:text-slate-200 dark:hover:bg-slate-800`;
const FIELD =
  'w-full rounded-xl border border-slate-500 bg-white px-3.5 py-2 text-right text-base text-slate-900 transition-all focus:border-transparent focus:ring-2 focus:ring-brand focus:outline-none aria-invalid:border-red-400 dark:border-slate-400 dark:bg-slate-800 dark:text-white';
const TEXT = 'text-slate-600 dark:text-slate-300';
const ERROR = 'text-sm text-red-700 dark:text-red-300';
const LINK = 'text-brand-strong underline hover:text-brand-deep dark:text-brand-light';
/** An address on its own line: inside a Hebrew sentence its punctuation lands on the wrong side. */
const ADDRESS = 'block text-start font-semibold text-slate-800 dark:text-slate-100';

/** The token of a sign-in link (src/server/auth.ts `signInLink`), taken off the address. */
function takeToken(): string | null {
  const match = /^#signin=(.+)$/.exec(location.hash);
  if (!match?.[1]) return null;
  history.replaceState(null, '', location.pathname + location.search);
  return decodeURIComponent(match[1]);
}

/**
 * The account page (src/pages/account.astro): asking for a sign-in link, signing in with one,
 * and, once signed in, signing out or deleting the account.
 */
export const AccountPanel: React.FC = () => {
  const [view, setView] = useState<View>({ kind: 'loading' });
  const box = useRef<HTMLDivElement>(null);
  /** Changed by the learner (not the first load): focus goes to what replaced their button. */
  const [acted, setActed] = useState(false);
  const change = (next: View) => {
    setActed(true);
    setView(next);
  };

  useEffect(() => {
    // 'sent' focuses its own message.
    if (acted && view.kind !== 'loading' && view.kind !== 'sent') box.current?.focus();
  }, [view, acted]);

  useEffect(() => {
    const show = (token: string | null) => {
      const signedIn = token ? signInWithToken(token) : currentAccount();
      signedIn
        .then((account) => {
          // Signing in from a link: the result is announced like a change.
          if (token) setActed(true);
          remember(account);
          if (account) setView({ kind: 'signed-in', account });
          else if (token)
            setView({
              kind: 'signed-out',
              notice: 'הקישור כבר שימש או שעבר זמנו. אפשר לבקש קישור חדש.',
            });
          else setView({ kind: 'signed-out' });
        })
        .catch(() => setView({ kind: 'error' }));
    };
    const first = takeToken();
    show(first);
    // A link opened in this same tab (where it is shown, on test sites) changes only the `#` part.
    const onHash = () => {
      const token = takeToken();
      if (!token) return;
      setActed(true);
      setView({ kind: 'loading' });
      show(token);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <div ref={box} tabIndex={-1} className="outline-none">
      {panel(view, change)}
    </div>
  );
};

function panel(view: View, change: (next: View) => void): React.ReactNode {
  switch (view.kind) {
    case 'loading':
      return <p className={TEXT}>רגע…</p>;
    case 'error':
      return <p className={ERROR}>משהו השתבש. רעננו את העמוד ונסו שוב.</p>;
    case 'deleted':
      return <p className={TEXT}>החשבון נמחק.</p>;
    case 'sent':
      return <Sent email={view.email} link={view.link} />;
    case 'signed-out':
      return (
        <SignInForm
          notice={view.notice}
          onSent={(email, link) => change({ kind: 'sent', email, link })}
        />
      );
    default: // signed in
      return (
        <SignedIn
          account={view.account}
          notice={view.notice}
          onSignedOut={() => change({ kind: 'signed-out' })}
          onDeleted={() => change({ kind: 'deleted' })}
          onStale={() =>
            change({
              kind: 'signed-out',
              notice: 'כדי למחוק את החשבון, התחברו שוב ואז לחצו על ״מחיקת החשבון״.',
            })
          }
        />
      );
  }
}

const SignInForm: React.FC<{
  notice?: string | undefined;
  onSent: (email: string, link?: string) => void;
}> = ({ notice, onSent }) => {
  const id = useId();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [sending, setSending] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // Sent before the human check finished: sent as soon as it does.
  useEffect(() => {
    if (waiting && token) form.current?.requestSubmit();
  }, [waiting, token]);

  const send = async (checkToken: string) => {
    setWaiting(false);
    setSending(true);
    try {
      const answer = await requestLink(email.trim(), checkToken);
      if (answer.ok) {
        onSent(email.trim(), answer.link);
        return;
      }
      setError(
        answer.status === 429
          ? 'נשלחו כבר כמה קישורים. נסו שוב בעוד דקה.'
          : 'לא הצלחנו לשלוח את הקישור. נסו שוב.',
      );
    } catch {
      setError('לא הצלחנו לשלוח את הקישור. בדקו את החיבור לאינטרנט ונסו שוב.');
    }
    setSending(false);
    // A token works once.
    setToken('');
    setTurnstileKey((key) => key + 1);
  };

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('נא לכתוב כתובת אימייל תקינה');
      emailRef.current?.focus();
      return;
    }
    setError('');
    if (token) void send(token);
    else {
      setWaiting(true);
      setSending(true);
    }
  };

  const handleCheckError = useCallback(() => {
    setWaiting((wasWaiting) => {
      if (wasWaiting) {
        setError('בדיקת ״האם אתם אדם״ לא נטענה. רעננו את העמוד ונסו שוב.');
        setSending(false);
      }
      return false;
    });
    setTurnstileKey((key) => key + 1);
  }, []);

  return (
    <form ref={form} noValidate onSubmit={handleSubmit} className="space-y-4">
      {notice && <p className="font-semibold text-slate-800 dark:text-slate-100">{notice}</p>}
      <p className={TEXT}>אין צורך בסיסמה: נשלח אליכם אימייל עם קישור, ולחיצה עליו תחבר אתכם.</p>
      <div>
        <label
          htmlFor={`${id}-email`}
          className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200"
        >
          אימייל
        </label>
        <input
          id={`${id}-email`}
          ref={emailRef}
          type="email"
          dir="ltr"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error !== ''}
          aria-describedby={error ? `${id}-error` : undefined}
          className={FIELD}
        />
        {error && (
          <p id={`${id}-error`} role="alert" className={`mt-1 ${ERROR}`}>
            {error}
          </p>
        )}
      </div>
      <Turnstile
        key={turnstileKey}
        action="signin"
        onToken={setToken}
        onError={handleCheckError}
        appearance="interaction-only"
      />
      <button type="submit" disabled={sending} className={PRIMARY}>
        <Mail className="h-4 w-4" aria-hidden="true" />
        {sending ? 'שולחים…' : 'שלחו לי קישור'}
      </button>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        מה נשמר בחשבון ולמה:{' '}
        <a href={PRIVACY_POLICY_URL} className={LINK}>
          מדיניות הפרטיות
        </a>
      </p>
    </form>
  );
};

const Sent: React.FC<{ email: string; link?: string | undefined }> = ({ email, link }) => {
  const message = useRef<HTMLDivElement>(null);
  useEffect(() => message.current?.focus(), []);
  return (
    <div ref={message} tabIndex={-1} className="space-y-3 outline-none">
      <p className="font-semibold text-slate-800 dark:text-slate-100">
        שלחנו קישור להתחברות אל:
        <bdi dir="ltr" className={ADDRESS}>
          {email}
        </bdi>
      </p>
      <p className={TEXT}>
        הוא עובד פעם אחת, במשך 10 דקות. לא הגיע? בדקו בתיקיית הספאם, או רעננו את העמוד ובקשו שוב.
      </p>
      {link && (
        // Local runs, tests and previews send no email (src/server/auth-route.ts).
        <p className="rounded-xl border border-dashed border-slate-400 p-3 text-sm">
          באתר הבדיקה לא נשלח אימייל:{' '}
          <a href={link} className={LINK}>
            הקישור
          </a>
        </p>
      )}
    </div>
  );
};

const SignedIn: React.FC<{
  account: Account;
  notice?: string | undefined;
  onSignedOut: () => void;
  onDeleted: () => void;
  onStale: () => void;
}> = ({ account, notice, onSignedOut, onDeleted, onStale }) => {
  const [confirming, setConfirming] = useState(false);
  const question = useRef<HTMLParagraphElement>(null);
  const deleteButton = useRef<HTMLButtonElement>(null);
  // Opened: focus to the question; closed by "ביטול": back to the button that opened it.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (confirming) question.current?.focus();
    else deleteButton.current?.focus();
  }, [confirming]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const leave = async () => {
    setBusy(true);
    try {
      await signOut();
      remember(null);
      onSignedOut();
    } catch {
      setError('ההתנתקות לא הצליחה. נסו שוב.');
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const result = await deleteAccount();
      if (result === 'stale') {
        await signOut().catch(() => undefined);
        remember(null);
        onStale();
        return;
      }
      remember(null);
      onDeleted();
    } catch {
      setError('המחיקה לא הצליחה. נסו שוב.');
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {notice && <p className="font-semibold text-slate-800 dark:text-slate-100">{notice}</p>}
      <p className={TEXT}>
        מחוברים בתור:
        <bdi dir="ltr" className={ADDRESS}>
          {account.email}
        </bdi>
      </p>
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={busy} onClick={() => void leave()} className={SECONDARY}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          התנתקות
        </button>
        <button
          ref={deleteButton}
          aria-expanded={confirming}
          type="button"
          disabled={busy}
          onClick={() => setConfirming(true)}
          className={SECONDARY}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          מחיקת החשבון
        </button>
      </div>
      {confirming && (
        <div
          role="group"
          aria-label="מחיקת החשבון"
          className="space-y-3 rounded-xl border border-red-300 p-4 dark:border-red-800"
        >
          <p ref={question} tabIndex={-1} className={`${TEXT} outline-none`}>
            למחוק את החשבון וכל מה שנשמר בו? אי אפשר לבטל את זה.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void remove()}
              className={`${BUTTON} bg-red-700 text-white hover:bg-red-800`}
            >
              כן, למחוק
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirming(false)}
              className={SECONDARY}
            >
              ביטול
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className={ERROR}>
          {error}
        </p>
      )}
    </div>
  );
};

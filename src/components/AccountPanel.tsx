import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { LogOut, Mail, Trash2 } from 'lucide-react';
import {
  currentAccount,
  deleteAccount,
  googleSignInUrl,
  remember,
  requestLink,
  signInWithToken,
  signOut,
  type Account,
} from '../lib/account';
import { forgetAccountResults, syncResults } from '../lib/quiz-sync';
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
const ADDRESS = 'block text-right font-semibold text-slate-800 dark:text-slate-100';

/** The token of a sign-in link (src/server/auth.ts `signInLink`), taken off the address. */
function takeToken(): string | null {
  const match = /^#signin=(.+)$/.exec(location.hash);
  if (!match?.[1]) return null;
  history.replaceState(null, '', location.pathname + location.search);
  return decodeURIComponent(match[1]);
}

/**
 * Back from Google (src/lib/account.ts `GOOGLE_RETURN`), taken off the address: 'google' if this
 * tab went there (signed in if the session says so; a link to the address alone doesn't count),
 * 'failed' if it failed, 'cancelled' if the learner turned it down there.
 */
function takeGoogleReturn(): 'google' | 'failed' | 'cancelled' | null {
  const params = new URLSearchParams(location.search);
  const error = params.get('error');
  if (!error && !params.has('signin')) return null;
  history.replaceState(null, '', location.pathname + location.hash);
  const went = wentToGoogle(false);
  if (error === 'access_denied') return 'cancelled';
  if (error) return 'failed';
  return went && params.get('signin') === 'google' ? 'google' : null;
}

/**
 * The account page (src/pages/account.astro): signing in with Google, or asking for a sign-in link
 * and signing in with one; once signed in, signing out or deleting the account.
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
    const show = (token: string | null, google: ReturnType<typeof takeGoogleReturn> = null) => {
      // A link already used (opened again while signed in) leaves the session as it was.
      const signedIn = token
        ? signInWithToken(token).then(async (account) =>
            account ? { account, fresh: true } : { account: await currentAccount(), fresh: false },
          )
        : currentAccount().then((account) => ({ account, fresh: google === 'google' }));
      signedIn
        .then(({ account, fresh }) => {
          // Signing in from a link or Google: the result is announced like a change.
          if (token || google) setActed(true);
          remember(account);
          // Signed in from a link: anything left of an earlier account goes first (a sign-out
          // that never reached this browser); then the account's quiz results come here.
          // Signed out: none of an account's stay.
          if (fresh || !account) forgetAccountResults();
          if (account) void syncResults();
          if (account) setView({ kind: 'signed-in', account });
          else if (token)
            setView({
              kind: 'signed-out',
              notice: 'הקישור כבר שימש או שעבר זמנו. אפשר לבקש קישור חדש.',
            });
          else if (google === 'failed' || google === 'google')
            setView({
              kind: 'signed-out',
              notice: 'ההתחברות עם Google לא הצליחה. אפשר לנסות שוב, או להתחבר באימייל.',
            });
          else setView({ kind: 'signed-out' });
        })
        .catch(() => setView({ kind: 'error' }));
    };
    const google = takeGoogleReturn();
    show(takeToken(), google);
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
      <GoogleButton />
      <p className="flex items-center gap-3 text-sm text-slate-600 before:h-px before:w-6 before:flex-none before:bg-slate-300 after:h-px after:flex-1 after:bg-slate-300 dark:text-slate-400 dark:before:bg-slate-600 dark:after:bg-slate-600">
        או
      </p>
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

/**
 * Whether this tab went to Google to sign in: set before leaving, read (and forgotten) on the way
 * back, so the return counts as a new sign-in (src/lib/quiz-sync.ts starts afresh) only then.
 */
function wentToGoogle(going: boolean): boolean {
  const key = 'google-signin';
  try {
    if (going) sessionStorage.setItem(key, '1');
    const went = sessionStorage.getItem(key) !== null;
    if (!going) sessionStorage.removeItem(key);
    return went;
  } catch {
    return false;
  }
}

/** Google's "G", as its sign-in button guidelines draw it. */
const GoogleMark: React.FC = () => (
  <svg viewBox="0 0 48 48" className="h-5 w-5 shrink-0" aria-hidden="true">
    <path
      fill="#EA4335"
      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
    />
    <path
      fill="#4285F4"
      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
    />
    <path
      fill="#FBBC05"
      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
    />
    <path
      fill="#34A853"
      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
    />
  </svg>
);

/**
 * Signing in with Google: the server gives Google's address for this site's app, and Google sends
 * the learner back to this page. Our own button with Google's mark, not Google's script, which
 * would load Google's code (and cookies) on the page for everyone.
 */
const GoogleButton: React.FC = () => {
  const [going, setGoing] = useState(false);
  const [error, setError] = useState('');
  // Back from Google's page, the browser may show this page as it was left: ready again.
  useEffect(() => {
    const ready = (event: PageTransitionEvent) => {
      if (event.persisted) setGoing(false);
    };
    window.addEventListener('pageshow', ready);
    return () => window.removeEventListener('pageshow', ready);
  }, []);
  const go = async () => {
    setGoing(true);
    setError('');
    try {
      const url = await googleSignInUrl();
      wentToGoogle(true);
      location.assign(url);
    } catch {
      setError('לא הצלחנו להגיע ל־Google. נסו שוב, או התחברו באימייל.');
      setGoing(false);
    }
  };
  return (
    <div>
      <button
        type="button"
        disabled={going}
        onClick={() => void go()}
        className={`${BUTTON} border border-slate-500 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-400 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800`}
      >
        <GoogleMark />
        {going ? 'עוברים ל־Google…' : 'התחברות עם Google'}
      </button>
      {error && (
        <p role="alert" className={`mt-1 ${ERROR}`}>
          {error}
        </p>
      )}
    </div>
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
        // Local runs and tests send no email (src/server/auth-route.ts).
        <p className="rounded-xl border border-dashed border-slate-400 p-3 text-sm">
          לא נשלח אימייל:{' '}
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
      forgetAccountResults();
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
        forgetAccountResults();
        onStale();
        return;
      }
      remember(null);
      forgetAccountResults();
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

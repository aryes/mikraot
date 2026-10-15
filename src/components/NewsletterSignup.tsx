import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Mail } from 'lucide-react';
import { PRIVACY_POLICY_URL } from '../lib/urls';
import { Turnstile } from './Turnstile';

type State = 'idle' | 'sending' | 'sent' | 'error' | 'check-failed';

const MESSAGES: Record<State, string> = {
  idle: '',
  sending: '',
  sent: 'כמעט סיימנו: שלחנו אליכם אימייל עם קישור לאישור ההרשמה. ההרשמה תושלם אחרי שתלחצו עליו.',
  error: 'ההרשמה לא נשלחה. נסו שוב בעוד רגע.',
  'check-failed': 'בדיקת ״האם אתם אדם״ לא נטענה. רעננו את העמוד ונסו שוב.',
};

// Field borders at least 3:1 against their background and the field (WCAG 1.4.11).
const FIELD =
  'w-full rounded-xl border px-3.5 py-2 text-base transition-all focus:border-transparent focus:ring-2 focus:ring-brand focus:outline-none aria-invalid:border-red-400 aria-invalid:focus:ring-red-400';

/** The two places it appears: the footer (always dark) and a box on the front page. */
const LOOKS = {
  footer: {
    text: 'text-slate-300',
    label: 'text-slate-300',
    field: `${FIELD} border-slate-400 bg-slate-800 text-white`,
    error: 'text-red-300',
    sent: 'bg-slate-800 text-white',
    link: 'underline hover:text-white',
    cancel: 'text-slate-300 hover:bg-slate-700 hover:text-white',
    theme: 'dark',
  },
  box: {
    text: 'text-slate-600 dark:text-slate-300',
    label: 'text-slate-700 dark:text-slate-200',
    field: `${FIELD} border-slate-500 bg-white text-slate-900 dark:border-slate-400 dark:bg-slate-800 dark:text-white`,
    error: 'text-red-700 dark:text-red-300',
    sent: 'bg-white text-slate-800 dark:bg-slate-900 dark:text-white',
    link: '', // the lesson content's own link style applies (.wp-content-rendered a)
    cancel:
      'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
    theme: 'auto',
  },
} as const;

/**
 * Newsletter sign-up. Posts to src/pages/api/newsletter.ts; Brevo then emails a confirmation
 * link, and the address joins the list once it is clicked.
 *
 * Folded behind one green button until asked for, as the comment form is (Arye and the design
 * review, 2026-10-15): the explanation, the fields and the privacy note open with it.
 *
 * `footer` (the default): in the footer of every page. `box`: the front page's invitation under
 * the latest posts (LatestPosts.astro), a light green box whose short question and line stay
 * visible, the form opening inside it (Arye and the design review, 2026-10-16).
 */
export const NewsletterSignup: React.FC<{
  variant?: 'footer' | 'box';
  headingClass?: string;
}> = ({ variant = 'footer', headingClass = '' }) => {
  const look = LOOKS[variant];
  const box = variant === 'box';
  const id = useId();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [emailError, setEmailError] = useState('');
  const [state, setState] = useState<State>('idle');
  const [open, setOpen] = useState(false);
  // The human check loads when a visitor opens the form, not for every page view.
  const [checkStarted, setCheckStarted] = useState(false);
  const [token, setToken] = useState('');
  const [turnstileKey, setTurnstileKey] = useState(0);
  // Sent before the check finished: sent as soon as it does.
  const [waiting, setWaiting] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  // Closed by its "ביטול" button: focus goes back to the button that opened it.
  const focusOpenButton = useRef(false);
  const statusRef = useRef<HTMLDivElement>(null);

  // A send that waited for the human check goes out as soon as the check is done.
  useEffect(() => {
    if (waiting && token) form.current?.requestSubmit();
  }, [waiting, token]);

  // Opened: the cursor goes to the first field; closed again: back to the button.
  useEffect(() => {
    if (open) nameRef.current?.focus();
    else if (focusOpenButton.current) {
      focusOpenButton.current = false;
      openButtonRef.current?.focus();
    }
  }, [open]);

  // As the comment form's "ביטול": folds the form away, keeping what was typed.
  const close = () => {
    setOpen(false);
    setEmailError('');
    setWaiting(false);
    if (state !== 'sent') setState('idle');
    // A fresh human check when it's opened again (a token expires after a few minutes).
    setToken('');
    setTurnstileKey((key) => key + 1);
    focusOpenButton.current = true;
  };

  // Once sent, the fields go and focus moves to the message that replaces them.
  useEffect(() => {
    if (state === 'sent') statusRef.current?.focus();
  }, [state]);

  const send = async (checkToken: string) => {
    setWaiting(false);
    setState('sending');
    try {
      const res = await fetch('/api/newsletter/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, name, turnstile_token: checkToken }),
      });
      setState(res.ok ? 'sent' : 'error');
    } catch {
      setState('error');
    }
    // A token works once.
    setToken('');
    setTurnstileKey((key) => key + 1);
  };

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('נא לכתוב כתובת אימייל תקינה');
      emailRef.current?.focus();
      return;
    }
    setEmailError('');
    setCheckStarted(true);
    if (token) void send(token);
    else {
      setWaiting(true);
      setState('sending');
    }
  };

  // Stable callback for the widget (a new function would re-render it). Only a visitor waiting
  // to send hears about a failed check; the widget is loaded afresh for a retry.
  const handleCheckError = useCallback(() => {
    setWaiting((wasWaiting) => {
      if (wasWaiting) setState('check-failed');
      return false;
    });
    setTurnstileKey((key) => key + 1);
  }, []);

  const sent = state === 'sent';
  const title = `${id}-title`;
  // The box's question and line, always shown (divs: the content's paragraph rules would
  // override their colours); in the footer the section's heading, visible once it's open.
  const intro = box ? (
    <div>
      <div
        id={title}
        className="text-(length:--content-size) font-bold text-slate-800 dark:text-slate-100"
      >
        רוצים לדעת כשמתווסף משהו חדש?
      </div>
      <div className={`text-base ${look.text}`}>אימייל קצר מדי פעם. אפשר לבטל בכל&nbsp;עת.</div>
    </div>
  ) : (
    <h2 id={title} className={open ? headingClass : 'sr-only'}>
      עדכונים באימייל
    </h2>
  );
  const boxClass =
    'mt-6 mb-8 rounded-2xl border border-brand/50 bg-brand/10 p-5 dark:border-brand/40 dark:bg-brand/15';

  if (!open) {
    return (
      <section
        aria-labelledby={title}
        className={
          box ? `${boxClass} flex flex-wrap items-center justify-between gap-4` : undefined
        }
      >
        {intro}
        <button
          ref={openButtonRef}
          type="button"
          onClick={() => setOpen(true)}
          className={`bg-brand-strong hover:bg-brand-deep inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-base font-bold text-white shadow-xs transition-all ${box ? 'w-full sm:w-auto' : ''}`}
        >
          <Mail className="h-4 w-4" aria-hidden="true" />
          הרשמה לעדכונים באימייל
        </button>
      </section>
    );
  }
  return (
    <form
      ref={form}
      noValidate
      onSubmit={handleSubmit}
      onFocus={() => setCheckStarted(true)}
      className={`space-y-3 ${box ? boxClass : ''}`}
      aria-labelledby={title}
    >
      {intro}
      {!sent && (
        <>
          {!box && (
            <div className={`text-base ${look.text}`}>
              מדי פעם, כשמתווסף משהו חדש באתר, נשלח אליכם אימייל קצר. אפשר לבטל בכל עת.
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`${id}-name`}
                className={`mb-1 block text-sm font-semibold ${look.label}`}
              >
                שם <span className="font-normal">(לא חובה)</span>
              </label>
              <input
                id={`${id}-name`}
                ref={nameRef}
                type="text"
                autoComplete="given-name"
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={look.field}
              />
            </div>
            <div>
              <label
                htmlFor={`${id}-email`}
                className={`mb-1 block text-sm font-semibold ${look.label}`}
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
                aria-invalid={emailError !== ''}
                aria-describedby={emailError ? `${id}-email-error` : undefined}
                className={`${look.field} text-right`}
              />
              {emailError && (
                <div id={`${id}-email-error`} className={`mt-1 text-sm ${look.error}`}>
                  {emailError}
                </div>
              )}
            </div>
          </div>
          {checkStarted && (
            <Turnstile
              key={turnstileKey}
              onToken={setToken}
              onError={handleCheckError}
              theme={look.theme}
              appearance="interaction-only"
            />
          )}
          <div>
            <button
              type="submit"
              disabled={state === 'sending'}
              className="bg-brand-strong hover:bg-brand-deep cursor-pointer rounded-xl px-5 py-2 text-base font-bold text-white shadow-xs transition-all disabled:cursor-wait disabled:opacity-70"
            >
              {state === 'sending' ? 'שליחה...' : 'הרשמה'}
            </button>
            {/* Not once the sign-up is on its way: it would go through anyway. */}
            <button
              type="button"
              onClick={close}
              disabled={state === 'sending' && !waiting}
              className={`mr-2 cursor-pointer rounded-xl px-3 py-2 text-base font-semibold disabled:cursor-wait disabled:opacity-60 ${look.cancel}`}
            >
              ביטול
            </button>
          </div>
        </>
      )}
      {/* Always in the page, so screen readers announce its changes. */}
      <div
        ref={statusRef}
        role="status"
        tabIndex={-1}
        className={
          sent
            ? `rounded-xl p-4 text-base leading-relaxed focus:outline-none ${look.sent}`
            : `text-sm ${look.error}`
        }
      >
        {MESSAGES[state]}
      </div>
      {!sent && (
        <div className={`text-sm ${look.text}`}>
          הכתובת נשמרת אצל Brevo, שירות הדיוור שלנו, רק לצורך העדכונים (
          <a href={PRIVACY_POLICY_URL} target="_blank" rel="noopener" className={look.link}>
            מדיניות הפרטיות
          </a>
          ).
        </div>
      )}
    </form>
  );
};

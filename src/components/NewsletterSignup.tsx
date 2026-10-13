import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
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

// Slate-400 borders: at least 3:1 against the footer and the field (WCAG 1.4.11).
const field =
  'w-full rounded-xl border border-slate-400 bg-slate-800 px-3.5 py-2 text-sm text-white transition-all focus:border-transparent focus:ring-2 focus:ring-brand focus:outline-none aria-invalid:border-red-400 aria-invalid:focus:ring-red-400';

/**
 * Newsletter sign-up in the footer (always dark). Posts to src/pages/api/newsletter.ts; Brevo
 * then emails a confirmation link, and the address joins the list once it is clicked.
 */
export const NewsletterSignup: React.FC<{ headingClass: string }> = ({ headingClass }) => {
  const id = useId();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [emailError, setEmailError] = useState('');
  const [state, setState] = useState<State>('idle');
  // The human check loads when a visitor first uses the form, not for every page view.
  const [checkStarted, setCheckStarted] = useState(false);
  const [token, setToken] = useState('');
  const [turnstileKey, setTurnstileKey] = useState(0);
  // Sent before the check finished: sent as soon as it does.
  const [waiting, setWaiting] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);

  // A send that waited for the human check goes out as soon as the check is done.
  useEffect(() => {
    if (waiting && token) form.current?.requestSubmit();
  }, [waiting, token]);

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
  return (
    <form
      ref={form}
      noValidate
      onSubmit={handleSubmit}
      onFocus={() => setCheckStarted(true)}
      className="space-y-3"
      aria-labelledby={`${id}-title`}
    >
      <h2 id={`${id}-title`} className={headingClass}>
        עדכונים באימייל
      </h2>
      {!sent && (
        <>
          <p className="text-sm text-slate-400">
            מדי פעם, כשמתווסף משהו חדש באתר, נשלח אליכם אימייל קצר. אפשר לבטל בכל עת.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`${id}-name`}
                className="mb-1 block text-xs font-semibold text-slate-300"
              >
                שם <span className="font-normal text-slate-400">(לא חובה)</span>
              </label>
              <input
                id={`${id}-name`}
                type="text"
                autoComplete="given-name"
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={field}
              />
            </div>
            <div>
              <label
                htmlFor={`${id}-email`}
                className="mb-1 block text-xs font-semibold text-slate-300"
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
                className={`${field} text-right`}
              />
              {emailError && (
                <p id={`${id}-email-error`} className="mt-1 text-xs text-red-300">
                  {emailError}
                </p>
              )}
            </div>
          </div>
          {checkStarted && (
            <Turnstile
              key={turnstileKey}
              onToken={setToken}
              onError={handleCheckError}
              theme="dark"
              appearance="interaction-only"
            />
          )}
          <button
            type="submit"
            disabled={state === 'sending'}
            className="bg-brand-strong hover:bg-brand-deep cursor-pointer rounded-xl px-5 py-2 text-sm font-bold text-white shadow-xs transition-all disabled:cursor-wait disabled:opacity-70"
          >
            {state === 'sending' ? 'שליחה...' : 'הרשמה'}
          </button>
        </>
      )}
      {/* Always in the page, so screen readers announce its changes. */}
      <p
        ref={statusRef}
        role="status"
        tabIndex={-1}
        className={
          sent
            ? 'rounded-xl bg-slate-800 p-4 text-sm leading-relaxed text-white focus:outline-none'
            : 'text-xs text-red-300'
        }
      >
        {MESSAGES[state]}
      </p>
      {!sent && (
        <p className="text-xs text-slate-400">
          הכתובת נשמרת אצל Brevo, שירות הדיוור שלנו, רק לצורך העדכונים (
          <a
            href={PRIVACY_POLICY_URL}
            target="_blank"
            rel="noopener"
            className="underline hover:text-white"
          >
            מדיניות הפרטיות
          </a>
          ).
        </p>
      )}
    </form>
  );
};

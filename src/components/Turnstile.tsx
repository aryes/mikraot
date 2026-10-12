import React, { useEffect, useRef } from 'react';
import { PUBLIC_TURNSTILE_SITE_KEY } from 'astro:env/client';

/** Cloudflare's always-pass test key, for `astro dev` (the real widget only works on mikraot.net). */
const TEST_SITE_KEY = '1x00000000000000000000AA';
const SITE_KEY = import.meta.env.DEV ? TEST_SITE_KEY : PUBLIC_TURNSTILE_SITE_KEY;

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/** Loads Cloudflare's widget script once, on first use. */
let scriptLoaded: Promise<void> | undefined;
function loadScript(): Promise<void> {
  scriptLoaded ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () => {
      scriptLoaded = undefined; // let a later render try again
      reject(new Error('Turnstile script failed to load'));
    });
    document.head.append(script);
  });
  return scriptLoaded;
}

interface TurnstileProps {
  /**
   * Called with a fresh token when the check passes, and with '' when it expires or fails.
   * Must be stable (e.g. a state setter): a new function re-renders the widget. So must onError.
   */
  onToken: (token: string) => void;
  /** Called when the check can't run (its script didn't load, or Cloudflare reports an error). */
  onError?: (() => void) | undefined;
  /** 'dark' on a dark background (the footer); by default it follows the visitor's system. */
  theme?: 'auto' | 'dark' | undefined;
  /** 'interaction-only': shown only if Cloudflare needs the visitor to click (it usually doesn't). */
  appearance?: 'always' | 'interaction-only' | undefined;
}

/**
 * Cloudflare Turnstile "are you human?" check. Usually passes without any action from the visitor.
 * A token works once: remount the widget (change its React `key`) after each use.
 */
export const Turnstile: React.FC<TurnstileProps> = ({
  onToken,
  onError,
  theme = 'auto',
  appearance = 'always',
}) => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let widgetId: string | undefined;
    let active = true;
    loadScript()
      .then(() => {
        if (!active || !container.current || !window.turnstile) return;
        widgetId = window.turnstile.render(container.current, {
          sitekey: SITE_KEY,
          theme,
          appearance,
          callback: (token) => onToken(token),
          'expired-callback': () => onToken(''),
          'error-callback': () => {
            onToken('');
            onError?.();
          },
        });
      })
      .catch((error: unknown) => {
        console.error(error);
        if (active) onError?.();
      });
    return () => {
      active = false;
      if (widgetId !== undefined) window.turnstile?.remove(widgetId);
    };
  }, [onToken, onError, theme, appearance]);

  return <div ref={container} className={appearance === 'always' ? 'min-h-[65px]' : ''} />;
};

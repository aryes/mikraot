/** The light/dark switch's choices (src/scripts/theme.ts), in the order a click moves through. */
export const THEME_CHOICES = ['auto', 'light', 'dark'] as const;
export type ThemeChoice = (typeof THEME_CHOICES)[number];

/** Each choice's name, after "תצוגה:" (feminine). */
export const THEME_LABELS: Record<ThemeChoice, string> = {
  auto: 'לפי המכשיר',
  light: 'בהירה',
  dark: 'כהה',
};

/**
 * The device's setting as a media query: what the dark versions of pictures follow by default
 * (ThemedPicture.astro, Screenshot.astro), so the browser can pick one at once, before any script
 * (src/lib/theme-head.mjs).
 */
export const DEVICE_DARK = 'screen and (prefers-color-scheme: dark)';

/** The choice a click moves to. */
export const nextTheme = (choice: ThemeChoice): ThemeChoice =>
  THEME_CHOICES[(THEME_CHOICES.indexOf(choice) + 1) % THEME_CHOICES.length] ?? 'auto';

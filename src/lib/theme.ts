/** The light/dark switch's choices (src/components/layout/ThemeSwitch.astro), in its order. */
export const THEME_CHOICES = ['light', 'auto', 'dark'] as const;
export type ThemeChoice = (typeof THEME_CHOICES)[number];

/** Each choice's name, as an adjective of "תצוגה" (feminine). */
export const THEME_LABELS: Record<ThemeChoice, string> = {
  light: 'בהירה',
  auto: 'לפי המכשיר',
  dark: 'כהה',
};

/**
 * The device's setting as a media query: what the dark versions of pictures follow by default
 * (ThemedPicture.astro, Screenshot.astro), so the browser can pick one at once, before any script
 * (src/lib/theme-head.mjs).
 */
export const DEVICE_DARK = 'screen and (prefers-color-scheme: dark)';

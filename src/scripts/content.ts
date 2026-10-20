/**
 * Browser behaviour for page content (components in src/components/content/): audio buttons,
 * collapsible explanations, and YouTube links (videos, playlists) in lists opening a popup.
 */
import { track } from './analytics';

const YOUTUBE_ID =
  /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/;

const YOUTUBE_PLAYLIST = /youtube\.com\/playlist\?(?:.+&)?list=([\w-]+)/;

/** What follows /embed/ in a YouTube player's address: a video's id, or a whole playlist. */
function youtubeEmbed(url: string): string | null {
  const video = YOUTUBE_ID.exec(url)?.[1];
  if (video) return video;
  const list = YOUTUBE_PLAYLIST.exec(url)?.[1];
  return list ? `videoseries?list=${list}` : null;
}

let audio: HTMLAudioElement | null = null;
let audioButton: HTMLElement | null = null;

/** "השמע: בּ" ↔ "עצירה: בּ"; the unnamed button's "השמע צליל" ↔ "עצירת הצליל". */
const stopName = (label: string) =>
  label === 'השמע צליל' ? 'עצירת הצליל' : label.replace(/^השמע/, 'עצירה');
const playName = (label: string) =>
  label === 'עצירת הצליל' ? 'השמע צליל' : label.replace(/^עצירה/, 'השמע');

/**
 * Shows which button is loading or playing (src/components/content/AudioButton.astro); the others
 * go back to rest. A playing button is named "עצירה: …" instead of "השמע: …".
 */
function showState(button: HTMLElement | null, state: 'loading' | 'playing' | null): void {
  for (const btn of document.querySelectorAll<HTMLElement>('.inline-audio-btn')) {
    const own = btn === button ? state : null;
    if (own) btn.dataset['state'] = own;
    else delete btn.dataset['state'];
    const playing = own === 'playing';
    btn.querySelector('.play-icon')?.classList.toggle('hidden', own !== null);
    btn.querySelector('.pause-icon')?.classList.toggle('hidden', !playing);
    btn.classList.toggle('ring-4', playing);
    btn.classList.toggle('ring-brand/30', playing);
    btn.classList.toggle('scale-110', playing);
    const label = btn.getAttribute('aria-label') ?? '';
    const named = playing ? stopName(label) : playName(label);
    if (named !== label) {
      btn.setAttribute('aria-label', named);
      btn.title = named;
    }
  }
}

function toggleAudio(button: HTMLElement): void {
  const src = button.dataset['audioSrc'];
  if (!src) return;

  if (audio && audioButton === button && !audio.paused) {
    audio.pause();
    return;
  }
  audio?.pause();

  const next = new Audio(src);
  audio = next;
  audioButton = button;
  // The events of a recording replaced by another tap come late: they must not reset the new one.
  const stopped = () => {
    if (audio === next) showState(null, null);
  };
  next.addEventListener('pause', stopped);
  next.addEventListener('ended', stopped);
  showState(button, 'loading'); // at once: the recording may take a moment to arrive
  next
    .play()
    .then(() => {
      // Only if it's still the one asked for (another tap may have replaced it meanwhile).
      if (audio === next) showState(button, 'playing');
      track('audio-play', { file: decodeURIComponent(src.split('/').pop() ?? src) });
    })
    .catch((error: unknown) => {
      // Stopped while loading (a second tap, or another button): not a failure.
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error('Audio playback failed:', error);
      if (audio === next) showState(null, null);
    });
}

function toggleCollapse(button: HTMLElement): void {
  const target = button.dataset['target'] && document.getElementById(button.dataset['target']);
  if (!target) return;
  const open = !target.classList.toggle('hidden');
  if (open) track('answer-open');
  // Its look follows aria-expanded (src/components/content/Collapse.astro).
  button.setAttribute('aria-expanded', String(open));
  const label = button.querySelector<HTMLElement>('.collapse-label');
  if (label) {
    label.textContent = (open ? label.dataset['collapseText'] : label.dataset['expandText']) ?? '';
  }
}

/** At most this many words of the text before an answer button name it for screen readers. */
const NAMING_WORDS = 4;
const BLOCKS = new Set(['P', 'DIV', 'UL', 'OL', 'TABLE', 'BLOCKQUOTE', 'H2', 'H3', 'H4', 'FIGURE']);

/**
 * The text an answer button follows on its line (the exercise word, "יָֽהְצָה׃"): from the line's
 * start, a <br> or the previous answer, at most a few words.
 */
function textBefore(wrapper: Element): string {
  let text = '';
  for (let node = wrapper.previousSibling; node; node = node.previousSibling) {
    if (node instanceof HTMLBRElement) break;
    // A whole paragraph or list before it (a block answer): not its line.
    if (node instanceof Element && BLOCKS.has(node.tagName)) break;
    if (node instanceof Element && node.matches('.collapse-target, .bg-collapse-wrapper')) break;
    text = (node.textContent ?? '') + text;
  }
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  return words.slice(-NAMING_WORDS).join(' ');
}

/** Tells screen readers which word each answer button answers ("פתרון ל־יָֽהְצָה׃"). */
function nameAnswerButtons(): void {
  for (const wrapper of document.querySelectorAll('.bg-collapse-wrapper')) {
    const hidden = wrapper.querySelector('.collapse-for');
    const before = textBefore(wrapper);
    if (hidden && before) hidden.textContent = ` ל־${before}`;
  }
}
nameAnswerButtons();

/** A YouTube player (privacy-enhanced domain) that starts playing: created only on a click. */
function youtubePlayer(embed: string, title: string): HTMLIFrameElement {
  const frame = document.createElement('iframe');
  const separator = embed.includes('?') ? '&' : '?';
  frame.src = `https://www.youtube-nocookie.com/embed/${embed}${separator}autoplay=1`;
  frame.title = title;
  frame.allow =
    'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  frame.allowFullscreen = true;
  return frame;
}

/**
 * An embedded video shows its picture and a play button (src/components/content/YouTube.astro);
 * the player replaces them on click, so pages load no YouTube code until a visitor plays a video.
 */
function playEmbeddedVideo(button: HTMLElement): void {
  const id = button.dataset['videoId'];
  const box = button.parentElement;
  if (!id || !box) return;
  track('video-play', { video: id });
  const frame = youtubePlayer(id, button.dataset['videoTitle'] ?? 'סרטון YouTube');
  frame.className = 'h-full w-full border-0';
  box.replaceChildren(frame);
  frame.focus();
}

function openVideo(embed: string, title: string): void {
  track('video-play', { video: embed });
  const dialog = document.createElement('dialog');
  dialog.className =
    'm-auto w-[calc(100%-2rem)] max-w-3xl overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0 shadow-2xl backdrop:bg-slate-900/70';
  const header = document.createElement('div');
  header.className =
    'flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-4';
  const heading = document.createElement('h3');
  heading.className = 'text-sm font-bold text-slate-800 dark:text-slate-100';
  heading.textContent = title;
  const close = document.createElement('button');
  close.type = 'button';
  close.className =
    'cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200';
  close.setAttribute('aria-label', 'סגירה');
  close.textContent = '✕';
  close.addEventListener('click', () => dialog.close());
  header.append(heading, close);

  const frame = youtubePlayer(embed, title);
  frame.className = 'aspect-video w-full border-0 bg-black';

  dialog.append(header, frame);
  dialog.addEventListener('close', () => dialog.remove());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close(); // click on the backdrop
  });
  document.body.append(dialog);
  dialog.showModal();
}

document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  const content = event.target.closest('.wp-content-rendered');
  if (!content) return;

  const audioBtn = event.target.closest<HTMLElement>('.inline-audio-btn');
  if (audioBtn) {
    event.preventDefault();
    toggleAudio(audioBtn);
    return;
  }

  const playBtn = event.target.closest<HTMLElement>('.video-play-btn');
  if (playBtn) {
    playEmbeddedVideo(playBtn);
    return;
  }

  const collapseBtn = event.target.closest<HTMLElement>('.collapse-toggle-btn');
  if (collapseBtn) {
    event.preventDefault();
    toggleCollapse(collapseBtn);
    return;
  }

  const link = event.target.closest('a');
  // Recordings (videos and playlists): links in lists, and the readings of a list picker
  // (titled with their path).
  const listed = link?.closest('li, .list-picker');
  const embed = listed ? youtubeEmbed(link?.getAttribute('href') ?? '') : null;
  if (link && embed) {
    event.preventDefault();
    const title = link.dataset['videoTitle'] ?? link.textContent?.trim();
    openVideo(embed, title || 'וידאו קריאה מוקלטת');
  }
});

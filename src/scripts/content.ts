/**
 * Browser behaviour for page content (components in src/components/content/): audio buttons,
 * collapsible explanations, and YouTube links in lists opening a popup.
 */

const YOUTUBE_ID =
  /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/;

function getYouTubeId(url: string): string | null {
  return YOUTUBE_ID.exec(url)?.[1] ?? null;
}

let audio: HTMLAudioElement | null = null;
let audioButton: HTMLElement | null = null;

function showPlaying(button: HTMLElement | null): void {
  for (const btn of document.querySelectorAll<HTMLElement>('.inline-audio-btn')) {
    const playing = btn === button;
    btn.querySelector('.play-icon')?.classList.toggle('hidden', playing);
    btn.querySelector('.pause-icon')?.classList.toggle('hidden', !playing);
    btn.classList.toggle('ring-4', playing);
    btn.classList.toggle('ring-brand/30', playing);
    btn.classList.toggle('scale-110', playing);
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
  next.addEventListener('pause', () => showPlaying(null));
  next.addEventListener('ended', () => showPlaying(null));
  next
    .play()
    .then(() => showPlaying(button))
    .catch((error: unknown) => {
      console.error('Audio playback failed:', error);
      showPlaying(null);
    });
}

function toggleCollapse(button: HTMLElement): void {
  const target = button.dataset['target'] && document.getElementById(button.dataset['target']);
  if (!target) return;
  const open = !target.classList.toggle('hidden');
  button.setAttribute('aria-expanded', String(open));
  for (const name of ['bg-brand-strong', 'text-white', 'border-brand']) {
    button.classList.toggle(name, open);
  }
  for (const name of [
    'bg-slate-100',
    'dark:bg-slate-800',
    'text-slate-700',
    'dark:text-slate-200',
    'dark:border-slate-700',
  ]) {
    button.classList.toggle(name, !open);
  }
  const label = button.querySelector<HTMLElement>('.collapse-label');
  if (label) {
    label.textContent = (open ? label.dataset['collapseText'] : label.dataset['expandText']) ?? '';
  }
}

/** A YouTube player (privacy-enhanced domain) that starts playing: created only on a click. */
function youtubePlayer(id: string, title: string): HTMLIFrameElement {
  const frame = document.createElement('iframe');
  frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`;
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
  const frame = youtubePlayer(id, button.dataset['videoTitle'] ?? 'סרטון YouTube');
  frame.className = 'h-full w-full border-0';
  box.replaceChildren(frame);
  frame.focus();
}

function openVideo(id: string, title: string): void {
  const dialog = document.createElement('dialog');
  dialog.className =
    'w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0 shadow-2xl backdrop:bg-slate-900/70';
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

  const frame = youtubePlayer(id, title);
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
  const videoId = link?.closest('li') ? getYouTubeId(link.getAttribute('href') ?? '') : null;
  if (link && videoId) {
    event.preventDefault();
    openVideo(videoId, link.textContent?.trim() || 'וידאו קריאה מוקלטת');
  }
});

/**
 * Browser behaviour for converted WordPress content (see lib/wp-html.ts):
 * inline audio buttons, collapsible explanations, and YouTube links in lists opening a popup.
 */
import { getYouTubeId } from '../lib/wp-html';

let audio: HTMLAudioElement | null = null;
let audioButton: HTMLElement | null = null;

function showPlaying(button: HTMLElement | null): void {
  for (const btn of document.querySelectorAll<HTMLElement>('.inline-audio-btn')) {
    const playing = btn === button;
    btn.querySelector('.play-icon')?.classList.toggle('hidden', playing);
    btn.querySelector('.pause-icon')?.classList.toggle('hidden', !playing);
    btn.classList.toggle('ring-4', playing);
    btn.classList.toggle('ring-[#8CB65F]/30', playing);
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
  button.classList.toggle('bg-[#8CB65F]', open);
  button.classList.toggle('text-white', open);
  button.classList.toggle('border-[#8CB65F]', open);
  button.classList.toggle('bg-slate-100', !open);
  button.classList.toggle('text-slate-700', !open);
  const label = button.querySelector<HTMLElement>('.collapse-label');
  if (label) {
    label.textContent = (open ? label.dataset['collapseText'] : label.dataset['expandText']) ?? '';
  }
}

function openVideo(id: string, title: string): void {
  const dialog = document.createElement('dialog');
  dialog.className =
    'w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-900/70';
  const header = document.createElement('div');
  header.className = 'flex items-center justify-between border-b border-slate-100 p-4';
  const heading = document.createElement('h3');
  heading.className = 'text-sm font-bold text-slate-800';
  heading.textContent = title;
  const close = document.createElement('button');
  close.type = 'button';
  close.className =
    'cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700';
  close.setAttribute('aria-label', 'סגירה');
  close.textContent = '✕';
  close.addEventListener('click', () => dialog.close());
  header.append(heading, close);

  const frame = document.createElement('iframe');
  frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`;
  frame.title = title;
  frame.className = 'aspect-video w-full border-0 bg-black';
  frame.allow =
    'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  frame.allowFullscreen = true;

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

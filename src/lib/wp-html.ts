/**
 * Converts WordPress post HTML (Gutenberg blocks and plugin shortcodes) into the site's markup.
 * Interactive parts (audio buttons, collapsibles) get data attributes that `scripts/content.ts`
 * wires up in the browser.
 */

const YOUTUBE_ID =
  /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/;
const SITE_URL = /href="https?:\/\/(?:www\.)?mikraot\.net(?:\/staging\/4160)?\/([^"]*)"/g;

export function getYouTubeId(url: string): string | null {
  return url.match(YOUTUBE_ID)?.[1] ?? null;
}

function youTubeEmbed(id: string): string {
  return `<div class="my-6 aspect-video w-full max-w-2xl mx-auto rounded-2xl overflow-hidden shadow-md border border-slate-200 bg-black">
    <iframe
      src="https://www.youtube-nocookie.com/embed/${id}"
      title="YouTube video player"
      class="w-full h-full border-0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen
      loading="lazy"
    ></iframe>
  </div>`;
}

function audioButton(url: string): string {
  const src = url.replace('https://mikraot.net/staging/4160/', 'https://mikraot.net/');
  return `<button type="button" class="inline-audio-btn inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#8CB65F] hover:bg-[#7aa252] text-white shadow-xs mx-1 align-middle transition-transform active:scale-95 cursor-pointer" data-audio-src="${src}" title="השמע צליל">
    <svg class="play-icon w-4 h-4 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>
    <svg class="pause-icon w-4 h-4 hidden pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
  </button>`;
}

function collapsible(id: string, label: string, inner: string): string {
  return `<div class="bg-collapse-wrapper my-2 inline-block">
    <button type="button" class="collapse-toggle-btn inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-[#8CB65F] border border-slate-200 rounded-lg text-xs font-semibold transition-all cursor-pointer" data-target="${id}" aria-expanded="false" aria-controls="${id}">
      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
      <span>${label}</span>
    </button>
    <div id="${id}" class="collapse-target hidden mt-2 p-3 bg-emerald-50/60 border-r-3 border-[#8CB65F] rounded-l-lg text-slate-800 text-sm leading-relaxed">
      ${inner}
    </div>
  </div>`;
}

/** Rewrites a link to mikraot.net into a site-relative path; media stays on the absolute URL. */
function siteLink(path: string): string {
  const [pathPart = '', rest = ''] = path.split(/(?=[?#])/, 2);
  const clean = pathPart.replace(/^\/+|\/+$/g, '');
  if (clean.startsWith('wp-content')) return `href="https://mikraot.net/${clean}${rest}"`;
  return `href="/${clean ? `${clean}/` : ''}${rest}"`;
}

export function wpHtmlToSiteHtml(raw: string): string {
  let html = raw;

  // Standalone Gutenberg embed figures and bare YouTube URLs in their own paragraph become players.
  html = html.replace(
    /<figure[^>]*class="[^"]*wp-block-embed[^"]*"[^>]*>[\s\S]*?(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s<"')]+)[\s\S]*?<\/figure>/gi,
    (match, url: string) => {
      const id = getYouTubeId(url);
      return id ? youTubeEmbed(id) : match;
    },
  );
  html = html.replace(
    /<p>\s*(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s<"')]+)\s*<\/p>/gi,
    (match, url: string) => {
      const id = getYouTubeId(url);
      return id ? youTubeEmbed(id) : match;
    },
  );

  html = html.replace(/<!-- \/?wp:[\s\S]*?-->/g, '');

  html = html.replace(/\[sc_embed_player\s+fileurl=["']([^"']+)["'][^\]]*\]/g, (_m, url: string) =>
    audioButton(url),
  );

  let collapseCount = 0;
  html = html.replace(
    /\[bg_collapse([^\]]*)\]([\s\S]*?)\[\/bg_collapse\]/g,
    (_m, attrs: string, inner: string) => {
      collapseCount += 1;
      const label = attrs.match(/text=["']([^"']*)["']/)?.[1] || 'הצג / הסתר ביאור';
      return collapsible(`collapse-${collapseCount}`, label, inner);
    },
  );

  return html.replace(SITE_URL, (_m, path: string) => siteLink(path));
}

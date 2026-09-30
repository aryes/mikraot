import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface ContentParserProps {
  content: string;
  onNavigate?: (slug: string) => void;
}

function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
  );
  return match?.[1] ?? null;
}

export const ContentParser: React.FC<ContentParserProps> = ({ content, onNavigate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentPlayingSrc, setCurrentPlayingSrc] = useState<string | null>(null);
  const [activeVideoModal, setActiveVideoModal] = useState<{ id: string; title: string } | null>(
    null,
  );
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Cleanup audio on unmount or page change
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    };
  }, [content]);

  const processHtml = (raw: string) => {
    if (!raw) return '';
    let processed = raw;

    // 1. Transform ONLY standalone Gutenberg Embed Figures into responsive YouTube iframes
    processed = processed.replace(
      /<figure[^>]*class="[^"]*wp-block-embed[^"]*"[^>]*>[\s\S]*?(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s<"'\)]+)[\s\S]*?<\/figure>/gi,
      (match, ytUrl) => {
        const id = getYouTubeId(ytUrl);
        if (!id) return match;
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
      },
    );

    // 2. Transform standalone YouTube URLs in isolated paragraphs (not inside lists)
    processed = processed.replace(
      /<p>\s*(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s<"'\)]+)\s*<\/p>/gi,
      (match, ytUrl) => {
        const id = getYouTubeId(ytUrl);
        if (!id) return match;
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
      },
    );

    // 3. Remove remaining Gutenberg block comment wrappers
    processed = processed.replace(/<!-- \/?wp:[\s\S]*?-->/g, '');

    // 4. Transform [sc_embed_player fileurl="..."] into interactive audio buttons
    processed = processed.replace(
      /\[sc_embed_player\s+fileurl=["']([^"']+)["'][^\]]*\]/g,
      (_match, url: string) => {
        const cleanUrl = url.replace('https://mikraot.net/staging/4160/', 'https://mikraot.net/');
        return `<button type="button" class="inline-audio-btn inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#8CB65F] hover:bg-[#7aa252] text-white shadow-xs mx-1 align-middle transition-transform active:scale-95 cursor-pointer" data-audio-src="${cleanUrl}" title="השמע צליל">
          <svg class="play-icon w-4 h-4 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>
          <svg class="pause-icon w-4 h-4 hidden pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
        </button>`;
      },
    );

    // 5. Transform [bg_collapse ...]...[/bg_collapse] into interactive expand/collapse
    let collapseCounter = 0;
    processed = processed.replace(
      /\[bg_collapse([^\]]*)\]([\s\S]*?)\[\/bg_collapse\]/g,
      (_match, attrs: string, innerContent: string) => {
        collapseCounter++;
        const id = `collapse-${collapseCounter}`;
        const textMatch = attrs.match(/text=["']([^"']*)["']/);
        const label = textMatch && textMatch[1] ? textMatch[1] : 'הצג / הסתר ביאור';

        return `<div class="bg-collapse-wrapper my-2 inline-block">
          <button type="button" class="collapse-toggle-btn inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-[#8CB65F] border border-slate-200 rounded-lg text-xs font-semibold transition-all cursor-pointer" data-target="${id}">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            <span>${label}</span>
          </button>
          <div id="${id}" class="collapse-target hidden mt-2 p-3 bg-emerald-50/60 border-r-3 border-[#8CB65F] rounded-l-lg text-slate-800 text-sm leading-relaxed">
            ${innerContent}
          </div>
        </div>`;
      },
    );

    // 6. Replace internal links to hash routing
    processed = processed.replace(
      /href="https?:\/\/(?:www\.)?mikraot\.net(?:\/staging\/4160)?\/([^"]*)"/g,
      (_match, slug: string) => {
        const clean = slug.replace(/^\/|\/$/g, '');
        if (clean.startsWith('wp-content')) {
          return `href="https://mikraot.net/${clean}"`;
        }
        return `href="#/${clean}"`;
      },
    );

    return processed;
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    // 1. Handle Audio Button Clicks
    const audioBtn = target.closest('.inline-audio-btn') as HTMLElement | null;
    if (audioBtn) {
      e.preventDefault();
      e.stopPropagation();

      const audioSrc = audioBtn.getAttribute('data-audio-src');
      if (!audioSrc) return;

      if (
        currentAudioRef.current &&
        currentPlayingSrc === audioSrc &&
        !currentAudioRef.current.paused
      ) {
        currentAudioRef.current.pause();
        setCurrentPlayingSrc(null);
        updateButtonIcons(null);
        return;
      }

      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }

      const audio = new Audio(audioSrc);
      currentAudioRef.current = audio;
      setCurrentPlayingSrc(audioSrc);

      audio
        .play()
        .then(() => {
          updateButtonIcons(audioBtn);
        })
        .catch((err) => {
          console.error('Audio playback failed:', err);
          setCurrentPlayingSrc(null);
          updateButtonIcons(null);
        });

      audio.onended = () => {
        setCurrentPlayingSrc(null);
        updateButtonIcons(null);
      };

      audio.onpause = () => {
        updateButtonIcons(null);
      };

      return;
    }

    // 2. Handle Collapse / Expand Toggle Clicks
    const collapseBtn = target.closest('.collapse-toggle-btn') as HTMLElement | null;
    if (collapseBtn) {
      e.preventDefault();
      e.stopPropagation();

      const targetId = collapseBtn.getAttribute('data-target');
      if (!targetId || !containerRef.current) return;

      const targetDiv = containerRef.current.querySelector(`#${targetId}`);
      if (targetDiv) {
        const isHidden = targetDiv.classList.contains('hidden');
        if (isHidden) {
          targetDiv.classList.remove('hidden');
          collapseBtn.classList.add('bg-[#8CB65F]', 'text-white', 'border-[#8CB65F]');
          collapseBtn.classList.remove('bg-slate-100', 'text-slate-700');
        } else {
          targetDiv.classList.add('hidden');
          collapseBtn.classList.remove('bg-[#8CB65F]', 'text-white', 'border-[#8CB65F]');
          collapseBtn.classList.add('bg-slate-100', 'text-slate-700');
        }
      }
      return;
    }

    // 3. Handle Internal Links
    const anchor = target.closest('a');
    if (anchor) {
      const href = anchor.getAttribute('href');
      if (href) {
        // If it's a YouTube link inside a list, check if user wants to play in modal or open
        const ytId = getYouTubeId(href);
        if (ytId && anchor.closest('li')) {
          e.preventDefault();
          setActiveVideoModal({ id: ytId, title: anchor.textContent || 'וידאו קריאה מוקלטת' });
          return;
        }

        if (href.startsWith('#/')) {
          e.preventDefault();
          const route = href.replace('#/', '');
          if (onNavigate) {
            onNavigate(route);
          } else {
            window.location.hash = `#/${route}`;
          }
        }
      }
    }
  };

  const updateButtonIcons = (activeBtn: HTMLElement | null) => {
    if (!containerRef.current) return;
    const allAudioBtns = containerRef.current.querySelectorAll('.inline-audio-btn');
    allAudioBtns.forEach((btn) => {
      const playIcon = btn.querySelector('.play-icon');
      const pauseIcon = btn.querySelector('.pause-icon');
      if (btn === activeBtn) {
        playIcon?.classList.add('hidden');
        pauseIcon?.classList.remove('hidden');
        btn.classList.add('ring-4', 'ring-[#8CB65F]/30', 'scale-110');
      } else {
        playIcon?.classList.remove('hidden');
        pauseIcon?.classList.add('hidden');
        btn.classList.remove('ring-4', 'ring-[#8CB65F]/30', 'scale-110');
      }
    });
  };

  return (
    <>
      <div
        ref={containerRef}
        className="wp-content-rendered prose prose-slate max-w-none text-right font-sans"
        dangerouslySetInnerHTML={{ __html: processHtml(content) }}
        onClick={handleClick}
      />

      {/* Video Lightbox Modal for list video clicks */}
      {activeVideoModal && (
        <div className="animate-fadeIn fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs">
          <div className="animate-scaleUp w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <h3 className="text-sm font-bold text-slate-800">{activeVideoModal.title}</h3>
              <button
                onClick={() => setActiveVideoModal(null)}
                className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${activeVideoModal.id}?autoplay=1`}
                title={activeVideoModal.title}
                className="h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

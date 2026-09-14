import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw, FastForward } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  title?: string;
  autoPlay?: boolean;
  inline?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, title, autoPlay = false, inline = false }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Fix relative URLs
  const resolvedSrc = src.startsWith('http')
    ? src
    : src.startsWith('/')
    ? `https://mikraot.net${src}`
    : `https://mikraot.net/${src}`;

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.log('Playback error:', e));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [0.75, 1, 1.25, 1.5];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (inline) {
    return (
      <span className="inline-flex items-center gap-1.5 align-middle mx-1 bg-slate-100 hover:bg-[#8CB65F15] border border-slate-300 rounded-full px-2 py-0.5 text-xs font-sans transition-all">
        <audio
          ref={audioRef}
          src={resolvedSrc}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          preload="metadata"
        />
        <button
          onClick={togglePlay}
          className="w-5 h-5 rounded-full bg-[#8CB65F] hover:bg-[#7aa252] text-white flex items-center justify-center transition-transform active:scale-95 shadow-xs"
          title={isPlaying ? 'השהה' : 'נגן'}
        >
          {isPlaying ? <Pause size={10} /> : <Play size={10} className="mr-[-1px]" />}
        </button>
        {title && <span className="text-slate-700 font-medium">{title}</span>}
      </span>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs my-3 flex flex-col gap-2 max-w-xl mx-auto">
      <audio
        ref={audioRef}
        src={resolvedSrc}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        preload="metadata"
        autoPlay={autoPlay}
      />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-[#8CB65F] hover:bg-[#7aa252] text-white flex items-center justify-center transition-all active:scale-95 shadow-sm"
            aria-label={isPlaying ? 'השהה' : 'הפעל'}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} className="mr-[-2px]" />}
          </button>

          {title && (
            <span className="font-semibold text-slate-800 text-sm truncate max-w-[200px]" title={title}>
              {title}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span>{formatTime(currentTime)}</span>
          <span>/</span>
          <span>{formatTime(duration)}</span>

          <button
            onClick={cyclePlaybackRate}
            className="ml-2 px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-semibold text-[11px] transition-colors"
            title="מהירות השמעה"
          >
            {playbackRate}x
          </button>
        </div>
      </div>

      <div className="w-full flex items-center">
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#8CB65F]"
        />
      </div>
    </div>
  );
};

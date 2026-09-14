import React, { useState } from 'react';
import { Play, Pause, ChevronDown, ChevronUp, Eye, EyeOff, BookOpen, Volume2 } from 'lucide-react';
import { AudioPlayer } from './AudioPlayer';

export interface TextLineItem {
  id: string | number;
  text: string;
  translation?: string;
  commentary?: string;
  audioUrl?: string;
  notes?: string;
}

interface InteractiveLineReaderProps {
  lines: TextLineItem[];
  title?: string;
}

export const InteractiveLineReader: React.FC<InteractiveLineReaderProps> = ({ lines, title }) => {
  const [expandedIds, setExpandedIds] = useState<Set<string | number>>(new Set());
  const [playingId, setPlayingId] = useState<string | number | null>(null);
  const [showAllNotes, setShowAllNotes] = useState(false);

  const toggleExpand = (id: string | number) => {
    const next = new Set(expandedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedIds(next);
  };

  const toggleExpandAll = () => {
    if (showAllNotes) {
      setExpandedIds(new Set());
      setShowAllNotes(false);
    } else {
      setExpandedIds(new Set(lines.map(l => l.id)));
      setShowAllNotes(true);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs my-6">
      {title && (
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <BookOpen className="text-[#8CB65F]" size={20} />
            {title}
          </h3>
          <button
            onClick={toggleExpandAll}
            className="text-xs font-semibold text-slate-600 hover:text-[#8CB65F] bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-all flex items-center gap-1"
          >
            {showAllNotes ? <EyeOff size={14} /> : <Eye size={14} />}
            {showAllNotes ? 'הסתר כל הביאורים' : 'הצג כל הביאורים'}
          </button>
        </div>
      )}

      <div className="space-y-3 divide-y divide-slate-100">
        {lines.map((line, idx) => {
          const isExpanded = expandedIds.has(line.id) || showAllNotes;
          const isCurrentlyPlaying = playingId === line.id;
          const hasHiddenContent = Boolean(line.commentary || line.translation || line.notes);

          return (
            <div
              key={line.id || idx}
              className={`pt-3 transition-all duration-200 rounded-xl p-2 ${
                isCurrentlyPlaying ? 'bg-[#8CB65F0C] border-r-4 border-[#8CB65F]' : 'hover:bg-slate-50/70'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Main Text */}
                <div className="flex-1 font-hebrew text-xl md:text-2xl text-slate-900 leading-relaxed tracking-wide select-text">
                  <span className="text-xs font-sans text-slate-400 font-bold ml-2 select-none">
                    {idx + 1}.
                  </span>
                  {line.text}
                </div>

                {/* Actions (Audio & Expand) */}
                <div className="flex items-center gap-1.5 shrink-0 pt-1">
                  {line.audioUrl && (
                    <AudioPlayer src={line.audioUrl} inline title="" />
                  )}

                  {hasHiddenContent && (
                    <button
                      onClick={() => toggleExpand(line.id)}
                      className={`p-1.5 rounded-lg border transition-all ${
                        isExpanded
                          ? 'bg-[#8CB65F] text-white border-[#8CB65F]'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
                      }`}
                      title={isExpanded ? 'הסתר ביאור' : 'הצג ביאור'}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  )}
                </div>
              </div>

              {/* Hidden Expandable Content */}
              {hasHiddenContent && isExpanded && (
                <div className="mt-3 mr-6 pr-3 border-r-2 border-[#8CB65F] text-slate-700 bg-emerald-50/40 rounded-l-lg p-3 text-sm leading-relaxed animate-fadeIn">
                  {line.commentary && (
                    <div className="mb-1.5">
                      <strong className="text-[#44505B] block mb-0.5">ביאור / פירוש:</strong>
                      <span>{line.commentary}</span>
                    </div>
                  )}
                  {line.translation && (
                    <div className="mb-1.5">
                      <strong className="text-[#44505B] block mb-0.5">תרגום:</strong>
                      <span>{line.translation}</span>
                    </div>
                  )}
                  {line.notes && (
                    <div>
                      <strong className="text-[#44505B] block mb-0.5">הערות דקדוקיות / טעמים:</strong>
                      <span>{line.notes}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

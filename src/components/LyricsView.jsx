import React, { useEffect, useRef, useMemo } from 'react';
import { parseLrc, getCurrentLyricIndex } from '../utils/lrcParser';
import { FileText, Upload, Sparkles } from 'lucide-react';

export default function LyricsView({
  track,
  currentTime,
  onSeek,
  onUploadLrc
}) {
  const lrcFileInputRef = useRef(null);
  const containerRef = useRef(null);
  const activeLineRef = useRef(null);

  // Parse lyrics memoized by track.lyrics
  const parsedLyrics = useMemo(() => {
    return parseLrc(track?.lyrics || '');
  }, [track?.lyrics]);

  const activeIndex = useMemo(() => {
    return getCurrentLyricIndex(parsedLyrics, currentTime);
  }, [parsedLyrics, currentTime]);

  // Smooth scroll the active lyric into the center
  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [activeIndex]);

  const handleLrcFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file && onUploadLrc) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === 'string') {
          onUploadLrc(track.id, text);
        }
      };
      reader.readAsText(file);
    }
    if (lrcFileInputRef.current) {
      lrcFileInputRef.current.value = '';
    }
  };

  if (!parsedLyrics || parsedLyrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-56 sm:h-64 px-4 text-center">
        <input
          ref={lrcFileInputRef}
          type="file"
          accept=".lrc,text/plain"
          onChange={handleLrcFileInput}
          className="hidden"
        />
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
          <FileText className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-200">No synchronized lyrics</p>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          Upload an LRC file to display real-time scrolling lyrics synchronized with this track.
        </p>
        <button
          onClick={() => lrcFileInputRef.current?.click()}
          className="mt-3.5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-all active:scale-95"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload .LRC file</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-56 sm:h-64">
      {/* Hidden file input to replace LRC */}
      <input
        ref={lrcFileInputRef}
        type="file"
        accept=".lrc,text/plain"
        onChange={handleLrcFileInput}
        className="hidden"
      />

      {/* Floating replace lyrics button */}
      <button
        onClick={() => lrcFileInputRef.current?.click()}
        title="Replace .lrc file"
        className="absolute top-1 right-2 z-10 px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-[10px] text-slate-400 hover:text-slate-200 border border-slate-700/50 backdrop-blur-sm transition-all"
      >
        Change LRC
      </button>

      {/* Scrollable lyrics container with gradient mask */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto px-4 py-10 space-y-4 text-center scroll-smooth mask-linear-gradient"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)'
        }}
      >
        {parsedLyrics.map((line, idx) => {
          const isActive = idx === activeIndex;
          return (
            <div
              key={`${idx}-${line.time}`}
              ref={isActive ? activeLineRef : null}
              onClick={() => onSeek && onSeek(line.time)}
              className={`cursor-pointer transition-all duration-300 py-1 px-3 rounded-lg ${
                isActive
                  ? 'text-base sm:text-lg font-bold text-indigo-300 scale-105 drop-shadow-[0_0_12px_rgba(129,140,248,0.5)]'
                  : 'text-xs sm:text-sm text-slate-400/80 hover:text-slate-200 hover:scale-100 font-medium'
              }`}
            >
              {line.text || '♪'}
            </div>
          );
        })}
      </div>
    </div>
  );
}


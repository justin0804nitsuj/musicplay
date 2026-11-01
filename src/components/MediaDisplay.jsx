import React, { useState } from 'react';
import { Music, FileText, Sparkles, PictureInPicture2, Maximize2 } from 'lucide-react';
import LyricsView from './LyricsView';

export default function MediaDisplay({
  currentTrack,
  isPlaying,
  currentTime,
  videoRef,
  onMediaTimeUpdate,
  onMediaLoadedMetadata,
  onMediaEnded,
  onSeek,
  onUploadLrc,
  onTogglePiP,
  isPiPAvailable
}) {
  const [viewMode, setViewMode] = useState('artwork'); // 'artwork' | 'lyrics'

  return (
    <div className="relative flex flex-col items-center justify-center my-4 w-full max-w-md">
      {/* Persistent Video Element Container (Hidden when track is not a video) */}
      <div
        className={`relative w-full max-w-lg aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl border border-slate-800 group transition-all ${
          currentTrack?.isVideo ? 'block' : 'hidden'
        }`}
      >
        <video
          ref={videoRef}
          onTimeUpdate={onMediaTimeUpdate}
          onLoadedMetadata={onMediaLoadedMetadata}
          onEnded={onMediaEnded}
          playsInline
          webkit-playsinline="true"
          className="w-full h-full object-contain"
        />

        {/* Video Overlay Controls */}
        <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/70 backdrop-blur-md p-1.5 rounded-xl border border-slate-800">
          {isPiPAvailable && (
            <button
              onClick={onTogglePiP}
              title="Picture-in-Picture"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <PictureInPicture2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => {
              if (videoRef.current) {
                if (document.fullscreenElement) {
                  document.exitFullscreen().catch(console.warn);
                } else {
                  videoRef.current.requestFullscreen().catch(console.warn);
                }
              }
            }}
            title="Toggle Fullscreen"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Audio / Vinyl / Lyrics Display (Shown when not video) */}
      {!currentTrack?.isVideo && (
        <>
          {!currentTrack ? (
            <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-3xl border-2 border-dashed border-slate-800 bg-slate-900/30 flex flex-col items-center justify-center text-slate-500">
              <Music className="w-12 h-12 text-slate-600 mb-2" />
              <span className="text-xs font-medium">No Track Selected</span>
            </div>
          ) : (
            <>
              {/* View Toggle: Artwork vs Lyrics */}
              <div className="flex items-center gap-1 p-1 bg-slate-900/70 border border-slate-800 rounded-full mb-3 backdrop-blur-md z-10">
                <button
                  onClick={() => setViewMode('artwork')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    viewMode === 'artwork'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>Cover</span>
                </button>
                <button
                  onClick={() => setViewMode('lyrics')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    viewMode === 'lyrics'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Lyrics</span>
                </button>
              </div>

              {viewMode === 'lyrics' ? (
                <div className="w-full bg-slate-900/40 border border-slate-800/80 rounded-3xl backdrop-blur-md shadow-2xl overflow-hidden">
                  <LyricsView
                    track={currentTrack}
                    currentTime={currentTime}
                    onSeek={onSeek}
                    onUploadLrc={onUploadLrc}
                  />
                </div>
              ) : (
                <div className="relative group flex items-center justify-center">
                  {/* Ambient Glow */}
                  <div
                    className={`absolute w-64 h-64 rounded-full blur-3xl transition-opacity duration-1000 ${
                      isPlaying ? 'bg-indigo-500/25 opacity-100' : 'bg-transparent opacity-0'
                    }`}
                  />

                  {currentTrack.coverArt ? (
                    /* Album Cover Art Card */
                    <div className="relative flex items-center justify-center">
                      <div
                        className={`w-52 h-52 sm:w-60 sm:h-60 rounded-3xl overflow-hidden shadow-2xl border border-slate-700/60 transition-transform duration-300 ${
                          isPlaying ? 'scale-100 ring-2 ring-indigo-500/30' : 'scale-95'
                        }`}
                      >
                        <img
                          src={currentTrack.coverArt}
                          alt={currentTrack.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  ) : (
                    /* Rotating Vinyl Record Artwork */
                    <div
                      className={`relative w-52 h-52 sm:w-60 sm:h-60 rounded-full border-4 border-slate-800/80 bg-gradient-to-br from-slate-900 via-[#101424] to-slate-900 shadow-2xl flex items-center justify-center overflow-hidden transition-transform ${
                        isPlaying ? 'animate-[spin_16s_linear_infinite]' : ''
                      }`}
                    >
                      {/* Vinyl grooves */}
                      <div className="absolute inset-4 rounded-full border border-slate-700/20" />
                      <div className="absolute inset-8 rounded-full border border-slate-700/20" />
                      <div className="absolute inset-12 rounded-full border border-slate-700/20" />
                      <div className="absolute inset-16 rounded-full border border-slate-700/30" />

                      {/* Center Label */}
                      <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-600 to-pink-500 flex flex-col items-center justify-center shadow-inner text-center p-2">
                        <Sparkles className="w-6 h-6 text-white drop-shadow" />
                        <span className="text-[9px] font-bold text-white uppercase tracking-wider mt-1">SonicWave</span>
                      </div>

                      {/* Spindle hole */}
                      <div className="absolute w-4 h-4 rounded-full bg-[#090d16] border-2 border-slate-900" />
                    </div>
                  )}

                  {/* Visualizer bars */}
                  {isPlaying && (
                    <div className="absolute -bottom-3 flex items-end gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-slate-800 shadow-lg">
                      <span className="w-1 bg-indigo-400 rounded-full animate-bar-1" />
                      <span className="w-1 bg-purple-400 rounded-full animate-bar-2" />
                      <span className="w-1 bg-pink-400 rounded-full animate-bar-3" />
                      <span className="w-1 bg-indigo-300 rounded-full animate-bar-4" />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}


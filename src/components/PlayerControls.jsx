import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
  Shuffle,
  Sun,
  PictureInPicture2,
  Gauge
} from 'lucide-react';
import { formatTime } from '../utils/formatters';

const PLAYBACK_SPEEDS = [0.5, 1.0, 1.25, 1.5, 2.0];

export default function PlayerControls({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  repeatMode,
  isShuffle,
  playbackRate,
  brightness,
  isPiPAvailable,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onToggleRepeat,
  onToggleShuffle,
  onChangePlaybackRate,
  onChangeBrightness,
  onTogglePiP
}) {
  const [showBrightnessSlider, setShowBrightnessSlider] = useState(false);

  const cyclePlaybackRate = () => {
    const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackRate);
    const nextIndex = currentIndex === -1 ? 1 : (currentIndex + 1) % PLAYBACK_SPEEDS.length;
    onChangePlaybackRate(PLAYBACK_SPEEDS[nextIndex]);
  };

  return (
    <div className="w-full max-w-md px-2 flex flex-col items-center">
      {/* Seek Scrubber & Timers */}
      <div className="w-full">
        <div className="relative flex items-center group">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step="0.1"
            value={currentTime || 0}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            disabled={!currentTrack}
            aria-label="Progress scrubber"
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none transition-all disabled:opacity-40"
          />
        </div>
        <div className="flex justify-between items-center text-xs font-mono text-slate-400 mt-1.5">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main Playback Buttons Row */}
      <div className="flex items-center justify-center gap-4 sm:gap-6 mt-4">
        {/* Shuffle */}
        <button
          onClick={onToggleShuffle}
          className={`p-2.5 rounded-full transition-all ${
            isShuffle
              ? 'text-indigo-400 bg-indigo-500/15 shadow-sm shadow-indigo-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
          title={isShuffle ? 'Shuffle On' : 'Shuffle Off'}
          aria-label="Toggle Shuffle"
        >
          <Shuffle className="w-5 h-5" />
        </button>

        {/* Previous Track */}
        <button
          onClick={onPrev}
          disabled={!currentTrack}
          className="p-3 rounded-full text-slate-200 hover:text-white hover:bg-slate-800/80 active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Previous Track"
        >
          <SkipBack className="w-6 h-6 fill-current" />
        </button>

        {/* Play / Pause */}
        <button
          onClick={onTogglePlay}
          disabled={!currentTrack}
          className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-7 h-7 fill-current" />
          ) : (
            <Play className="w-7 h-7 fill-current translate-x-0.5" />
          )}
        </button>

        {/* Next Track */}
        <button
          onClick={onNext}
          disabled={!currentTrack}
          className="p-3 rounded-full text-slate-200 hover:text-white hover:bg-slate-800/80 active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Next Track"
        >
          <SkipForward className="w-6 h-6 fill-current" />
        </button>

        {/* Repeat Mode */}
        <button
          onClick={onToggleRepeat}
          className={`p-2.5 rounded-full transition-all ${
            repeatMode !== 'none'
              ? 'text-indigo-400 bg-indigo-500/15 shadow-sm shadow-indigo-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
          title={`Repeat: ${repeatMode === 'one' ? 'Single' : repeatMode === 'all' ? 'All' : 'Off'}`}
          aria-label="Toggle Repeat Mode"
        >
          {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
        </button>
      </div>

      {/* Auxiliary Controls: Speed, PiP, Brightness Slider */}
      <div className="flex items-center justify-between w-full max-w-xs mt-4 px-2 py-1.5 rounded-2xl bg-slate-900/60 border border-slate-800/70 text-xs">
        {/* Playback Speed Cycle Button */}
        <button
          onClick={cyclePlaybackRate}
          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white font-mono font-medium transition-colors"
          title="Change playback speed"
        >
          <Gauge className="w-3.5 h-3.5 text-indigo-400" />
          <span>{playbackRate}x</span>
        </button>

        {/* Picture in Picture Button (Active if video file) */}
        {(currentTrack?.isVideo || /\.(mp4|mov|webm|m4v)$/i.test(currentTrack?.name || '')) && isPiPAvailable && (
          <button
            onClick={onTogglePiP}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white font-medium transition-colors"
            title="Picture in Picture"
          >
            <PictureInPicture2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>PiP</span>
          </button>
        )}

        {/* Software Brightness Quick Toggle/Slider */}
        <div className="relative flex items-center">
          <button
            onClick={() => setShowBrightnessSlider(!showBrightnessSlider)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl transition-colors ${
              showBrightnessSlider || brightness < 100
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white'
            }`}
            title="Software Brightness Control"
          >
            <Sun className="w-3.5 h-3.5" />
            <span className="font-mono">{brightness}%</span>
          </button>

          {/* Brightness Popover Slider */}
          {showBrightnessSlider && (
            <div className="absolute bottom-9 right-0 p-3 bg-slate-900/95 border border-slate-700 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col gap-1.5 w-44 z-30">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Overlay Brightness</span>
                <span className="font-mono text-amber-300 font-semibold">{brightness}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={brightness}
                onChange={(e) => onChangeBrightness(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


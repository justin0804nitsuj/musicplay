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
  Gauge,
  ChevronDown
} from 'lucide-react';
import { formatTime } from '../utils/formatters';

const PLAYBACK_SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

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

      {/* Auxiliary Controls: Speed Selector, PiP, Brightness Slider & Direct Input */}
      <div className="flex items-center justify-between w-full max-w-xs mt-4 px-2 py-1.5 rounded-2xl bg-slate-900/60 border border-slate-800/70 text-xs">
        {/* Playback Speed Dropdown Selector */}
        <div className="relative flex items-center">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 text-slate-300 font-mono text-xs transition-colors focus-within:border-emerald-500">
            <Gauge className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <select
              value={playbackRate}
              onChange={(e) => onChangePlaybackRate(parseFloat(e.target.value))}
              aria-label="Select playback speed"
              className="bg-transparent text-xs font-mono font-semibold text-slate-200 focus:outline-none cursor-pointer appearance-none pr-3"
            >
              <option value="0.5" className="bg-slate-900 text-slate-100">0.5x</option>
              <option value="0.75" className="bg-slate-900 text-slate-100">0.75x</option>
              <option value="1" className="bg-slate-900 text-slate-100">1.0x</option>
              <option value="1.25" className="bg-slate-900 text-slate-100">1.25x</option>
              <option value="1.5" className="bg-slate-900 text-slate-100">1.5x</option>
              <option value="1.75" className="bg-slate-900 text-slate-100">1.75x</option>
              <option value="2" className="bg-slate-900 text-slate-100">2.0x</option>
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 -ml-2 pointer-events-none" />
          </div>
        </div>

        {/* Picture in Picture Button */}
        {Boolean(currentTrack) && (
          <button
            onClick={onTogglePiP}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl font-medium transition-colors ${
              (currentTrack?.isVideo || /\.(mp4|mov|webm|m4v)$/i.test(currentTrack?.name || ''))
                ? 'bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40'
                : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title={(currentTrack?.isVideo || /\.(mp4|mov|webm|m4v)$/i.test(currentTrack?.name || '')) ? '開啟子母畫面 (PiP)' : '子母畫面為影片專用'}
          >
            <PictureInPicture2 className={`w-3.5 h-3.5 ${
              (currentTrack?.isVideo || /\.(mp4|mov|webm|m4v)$/i.test(currentTrack?.name || '')) ? 'text-indigo-400' : 'text-slate-500'
            }`} />
            <span>PiP</span>
          </button>
        )}

        {/* Software Brightness Quick Toggle/Slider & Number Input */}
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

          {/* Brightness Popover with direct typing input, slider & presets */}
          {showBrightnessSlider && (
            <div className="absolute bottom-11 right-0 p-3 bg-slate-900/95 border border-slate-700 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col gap-2.5 w-52 z-30">
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span className="font-medium flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Brightness</span>
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={brightness}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (!isNaN(val)) {
                        onChangeBrightness(Math.max(0, Math.min(100, val)));
                      }
                    }}
                    className="w-12 px-1.5 py-0.5 rounded-lg bg-slate-800 text-amber-300 font-mono text-xs font-semibold text-center border border-amber-500/40 focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-xs text-slate-400">%</span>
                </div>
              </div>

              {/* Range Scrubber */}
              <input
                type="range"
                min="0"
                max="100"
                value={brightness}
                onChange={(e) => onChangeBrightness(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />

              {/* Quick Presets */}
              <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-800">
                {[25, 50, 75, 100].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => onChangeBrightness(preset)}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-mono transition-colors ${
                      brightness === preset
                        ? 'bg-amber-500/30 text-amber-200 border border-amber-500/40 font-bold'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



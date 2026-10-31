import React, { useState, useEffect, useRef, useCallback } from 'react';
import localforage from 'localforage';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Repeat,
  Repeat1,
  Shuffle,
  Volume2,
  VolumeX,
  Upload,
  Trash2,
  Music,
  ListMusic,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

// Configure IndexedDB via localforage
const db = localforage.createInstance({
  name: 'iOSLocalMusicPWA',
  storeName: 'audio_library',
  description: 'Persistent offline storage for local audio tracks on iOS'
});

// Format seconds into MM:SS
const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds === null) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

// Format file size in MB
const formatSize = (bytes) => {
  if (!bytes) return '';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Clean song title from filename
const cleanFileName = (filename) => {
  return filename.replace(/\.[^/.]+$/, '').replace(/^[0-9\s-_.]+/, '').trim() || filename;
};

export default function App() {
  // Audio state
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [loopMode, setLoopMode] = useState('all'); // 'all' | 'one' | 'none'
  const [isShuffle, setIsShuffle] = useState(false);
  const [isLoadingStorage, setIsLoadingStorage] = useState(true);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // DOM Refs
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);

  // Keep a reference to current playlist and index for MediaSession handlers to avoid stale closures
  const playlistRef = useRef(playlist);
  const currentIndexRef = useRef(currentIndex);
  const loopModeRef = useRef(loopMode);
  const isShuffleRef = useRef(isShuffle);

  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    loopModeRef.current = loopMode;
  }, [loopMode]);

  useEffect(() => {
    isShuffleRef.current = isShuffle;
  }, [isShuffle]);

  const showNotification = (msg) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(''), 3000);
  };

  // -------------------------------------------------------------
  // 1. Memory Management & Initial Load from IndexedDB
  // -------------------------------------------------------------
  useEffect(() => {
    let mounted = true;

    async function loadStoredTracks() {
      try {
        setIsLoadingStorage(true);
        const storedTracks = [];

        await db.iterate((value, key) => {
          if (value && value.blob) {
            // Recreate in-memory Object URL from persistent Blob
            const blobUrl = URL.createObjectURL(value.blob);
            storedTracks.push({
              id: key,
              name: value.name,
              title: value.title || cleanFileName(value.name),
              artist: value.artist || 'Local Audio',
              size: value.size,
              type: value.type,
              url: blobUrl,
              blob: value.blob
            });
          }
        });

        if (mounted) {
          setPlaylist(storedTracks);
          if (storedTracks.length > 0) {
            setCurrentIndex(0);
          }
        }
      } catch (err) {
        console.error('Failed to load tracks from IndexedDB:', err);
      } finally {
        if (mounted) {
          setIsLoadingStorage(false);
        }
      }
    }

    loadStoredTracks();

    // Check if running in iOS standalone mode
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS && !isStandalone) {
      setShowInstallPrompt(true);
    }

    // Cleanup: revoke all active object URLs on unmount to prevent iOS Safari memory leaks
    return () => {
      mounted = false;
      playlistRef.current.forEach((track) => {
        if (track.url) {
          URL.revokeObjectURL(track.url);
        }
      });
    };
  }, []);

  // -------------------------------------------------------------
  // 2. Playback Navigation Handlers (Prev / Next / Loop)
  // -------------------------------------------------------------
  const playTrackAtIndex = useCallback((index) => {
    const list = playlistRef.current;
    if (index < 0 || index >= list.length) return;

    setCurrentIndex(index);
    setIsPlaying(true);

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      // On iOS, play() returns a promise and must be triggered by user or unbroken audio chain
      audioRef.current.play().catch((err) => {
        console.warn('Playback initiation error:', err);
      });
    }
  }, []);

  const handleNext = useCallback(() => {
    const list = playlistRef.current;
    if (list.length === 0) return;

    if (isShuffleRef.current && list.length > 1) {
      let randIndex;
      do {
        randIndex = Math.floor(Math.random() * list.length);
      } while (randIndex === currentIndexRef.current);
      playTrackAtIndex(randIndex);
      return;
    }

    const nextIndex = currentIndexRef.current + 1;
    // Seamless infinite looping: if last song ended, loop back to index 0
    if (nextIndex >= list.length) {
      playTrackAtIndex(0);
    } else {
      playTrackAtIndex(nextIndex);
    }
  }, [playTrackAtIndex]);

  const handlePrev = useCallback(() => {
    const list = playlistRef.current;
    if (list.length === 0) return;

    // If more than 3 seconds in, restart track
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    const prevIndex = currentIndexRef.current - 1;
    if (prevIndex < 0) {
      // Loop to end of queue
      playTrackAtIndex(list.length - 1);
    } else {
      playTrackAtIndex(prevIndex);
    }
  }, [playTrackAtIndex]);

  const togglePlay = () => {
    if (!audioRef.current || playlist.length === 0) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Playback error:', err);
      });
    }
  };

  // -------------------------------------------------------------
  // 3. Audio Element Events (onEnded, onTimeUpdate, etc.)
  // -------------------------------------------------------------
  const handleAudioEnded = () => {
    const mode = loopModeRef.current;
    if (mode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(console.warn);
      }
    } else {
      // 'all' or 'none': continue infinite looping through playlist
      handleNext();
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);

      // Update MediaSession Position State for lock screen progress bar
      if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
        if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
          try {
            navigator.mediaSession.setPositionState({
              duration: audioRef.current.duration,
              playbackRate: audioRef.current.playbackRate || 1,
              position: audioRef.current.currentTime
            });
          } catch {
            // Safari occasionally throws if position is slightly higher than duration
          }
        }
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    const seekTime = parseFloat(e.target.value);
    setCurrentTime(seekTime);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
    }
  };

  // -------------------------------------------------------------
  // 4. Media Session API for iOS Lock Screen & Control Center
  // -------------------------------------------------------------
  const currentTrack = playlist[currentIndex];

  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;

    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist || 'Offline PWA Player',
      album: 'Local Library',
      artwork: [
        { src: '/icon.svg', sizes: '96x96', type: 'image/svg+xml' },
        { src: '/icon.svg', sizes: '192x192', type: 'image/svg+xml' },
        { src: '/icon.svg', sizes: '512x512', type: 'image/svg+xml' }
      ]
    });

    navigator.mediaSession.setActionHandler('play', () => {
      if (audioRef.current) {
        audioRef.current.play();
        setIsPlaying(true);
      }
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      handlePrev();
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      handleNext();
    });

    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime && audioRef.current) {
        audioRef.current.currentTime = details.seekTime;
      }
    });

    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      if (audioRef.current) {
        audioRef.current.currentTime = Math.max(audioRef.current.currentTime - (details.seekOffset || 10), 0);
      }
    });

    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      if (audioRef.current) {
        audioRef.current.currentTime = Math.min(
          audioRef.current.currentTime + (details.seekOffset || 10),
          audioRef.current.duration || 0
        );
      }
    });

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [currentTrack, isPlaying, handleNext, handlePrev]);

  // -------------------------------------------------------------
  // 5. File Import & Storage with IndexedDB
  // -------------------------------------------------------------
  const handleFileImport = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newTracks = [];

    for (const file of files) {
      const trackId = `track_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const cleanTitle = cleanFileName(file.name);

      const trackRecord = {
        name: file.name,
        title: cleanTitle,
        artist: 'Local Music',
        size: file.size,
        type: file.type || 'audio/mpeg',
        blob: file // Save Blob directly in IndexedDB via localforage
      };

      try {
        await db.setItem(trackId, trackRecord);
        // Create an Object URL for immediate runtime playback
        const url = URL.createObjectURL(file);
        newTracks.push({
          id: trackId,
          ...trackRecord,
          url
        });
      } catch (err) {
        console.error(`Failed to store ${file.name} to IndexedDB:`, err);
      }
    }

    if (newTracks.length > 0) {
      setPlaylist((prev) => {
        const updated = [...prev, ...newTracks];
        return updated;
      });
      showNotification(`Added ${newTracks.length} song${newTracks.length > 1 ? 's' : ''} to offline library!`);
    }

    // Reset input so importing the same file again triggers onChange
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // -------------------------------------------------------------
  // 6. Delete Track & Clear All (with Object URL Revocation)
  // -------------------------------------------------------------
  const handleDeleteTrack = async (e, trackId, indexToDelete) => {
    e.stopPropagation();

    const trackToDelete = playlist[indexToDelete];
    if (trackToDelete && trackToDelete.url) {
      // Memory cleanup: prevent iOS Safari jetsam crash
      URL.revokeObjectURL(trackToDelete.url);
    }

    try {
      await db.removeItem(trackId);
    } catch (err) {
      console.error('Error removing from IndexedDB:', err);
    }

    const updated = playlist.filter((_, idx) => idx !== indexToDelete);
    setPlaylist(updated);

    if (indexToDelete === currentIndex) {
      if (updated.length === 0) {
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
      } else {
        const nextIdx = indexToDelete >= updated.length ? 0 : indexToDelete;
        setCurrentIndex(nextIdx);
      }
    } else if (indexToDelete < currentIndex) {
      setCurrentIndex((prev) => prev - 1);
    }

    showNotification('Track deleted');
  };

  const handleClearAll = async () => {
    if (playlist.length === 0) return;
    if (!window.confirm('Are you sure you want to delete all saved tracks from offline storage?')) return;

    // Revoke all object URLs
    playlist.forEach((track) => {
      if (track.url) URL.revokeObjectURL(track.url);
    });

    if (audioRef.current) {
      audioRef.current.pause();
    }

    try {
      await db.clear();
      setPlaylist([]);
      setCurrentIndex(0);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      showNotification('All tracks cleared from device');
    } catch (err) {
      console.error('Failed to clear database:', err);
    }
  };

  const toggleLoopMode = () => {
    if (loopMode === 'all') setLoopMode('one');
    else if (loopMode === 'one') setLoopMode('none');
    else setLoopMode('all');
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-between safe-top safe-bottom px-4 sm:px-6 md:px-12 max-w-4xl mx-auto selection:bg-indigo-500 selection:text-white">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={currentTrack ? currentTrack.url : undefined}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
        playsInline
        preload="auto"
      />

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="audio/*"
        onChange={handleFileImport}
        className="hidden"
      />

      {/* Header */}
      <header className="flex items-center justify-between py-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Music className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              SonicWave <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">PWA</span>
            </h1>
            <p className="text-xs text-slate-400">iOS Background Audio Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Add Music button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all duration-200 active:scale-95"
          >
            <Upload className="w-4 h-4" />
            <span>Import Files</span>
          </button>
        </div>
      </header>

      {/* iOS PWA Install Banner Notice */}
      {showInstallPrompt && (
        <div className="my-3 p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-start justify-between gap-3 backdrop-blur-md">
          <div className="flex gap-2.5">
            <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed">
              <span className="font-semibold text-white">For uninterrupted background playback on iOS:</span>
              <br />
              Tap the Safari <span className="font-semibold text-indigo-300">Share icon</span> and select <span className="font-semibold text-indigo-300">"Add to Home Screen"</span>.
            </div>
          </div>
          <button
            onClick={() => setShowInstallPrompt(false)}
            className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Status Toast Notification */}
      {statusMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-indigo-600 text-white text-xs font-medium shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Main Player Display */}
      <main className="flex-1 flex flex-col justify-center items-center py-6">
        {/* Vinyl / Cover Art Area */}
        <div className="relative group flex items-center justify-center my-4">
          {/* Ambient Glow */}
          <div
            className={`absolute w-64 h-64 rounded-full blur-3xl transition-opacity duration-1000 ${
              isPlaying ? 'bg-indigo-500/25 opacity-100' : 'bg-transparent opacity-0'
            }`}
          />

          {/* Rotating Vinyl Record Artwork */}
          <div
            className={`relative w-56 h-56 sm:w-64 sm:h-64 rounded-full border-4 border-slate-800/80 bg-gradient-to-br from-slate-900 via-[#101424] to-slate-900 shadow-2xl flex items-center justify-center overflow-hidden transition-transform ${
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
              <span className="text-[9px] font-bold text-white uppercase tracking-wider mt-1">iOS Audio</span>
            </div>

            {/* Spindle hole */}
            <div className="absolute w-4 h-4 rounded-full bg-[#090d16] border-2 border-slate-900" />
          </div>

          {/* Audio Visualizer Bars (Simulated while playing) */}
          {isPlaying && (
            <div className="absolute bottom-2 flex items-end gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-800">
              <span className="w-1 bg-indigo-400 rounded-full animate-bar-1" />
              <span className="w-1 bg-purple-400 rounded-full animate-bar-2" />
              <span className="w-1 bg-pink-400 rounded-full animate-bar-3" />
              <span className="w-1 bg-indigo-300 rounded-full animate-bar-4" />
            </div>
          )}
        </div>

        {/* Track Title & Artist */}
        <div className="w-full text-center mt-3 mb-4 px-4">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white truncate max-w-md mx-auto">
            {currentTrack ? currentTrack.title : 'No Track Loaded'}
          </h2>
          <p className="text-sm text-slate-400 mt-1 flex items-center justify-center gap-2">
            <span>{currentTrack ? currentTrack.artist : 'Select or import songs to begin'}</span>
            {currentTrack && (
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                {formatSize(currentTrack.size)}
              </span>
            )}
          </p>
        </div>

        {/* Progress Bar & Timers */}
        <div className="w-full max-w-md px-2">
          <div className="relative flex items-center">
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
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

        {/* Primary Playback Controls */}
        <div className="flex items-center justify-center gap-5 sm:gap-7 mt-5">
          {/* Shuffle Button */}
          <button
            onClick={() => setIsShuffle(!isShuffle)}
            className={`p-2.5 rounded-full transition-colors ${
              isShuffle ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400 hover:text-white'
            }`}
            title={isShuffle ? 'Shuffle Enabled' : 'Shuffle Disabled'}
            aria-label="Toggle Shuffle"
          >
            <Shuffle className="w-5 h-5" />
          </button>

          {/* Previous Track */}
          <button
            onClick={handlePrev}
            disabled={playlist.length === 0}
            className="p-3 rounded-full text-slate-200 hover:text-white hover:bg-slate-800 active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none"
            aria-label="Previous Track"
          >
            <SkipBack className="w-6 h-6 fill-current" />
          </button>

          {/* Play / Pause Toggle Button */}
          <button
            onClick={togglePlay}
            disabled={playlist.length === 0}
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
            onClick={handleNext}
            disabled={playlist.length === 0}
            className="p-3 rounded-full text-slate-200 hover:text-white hover:bg-slate-800 active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none"
            aria-label="Next Track"
          >
            <SkipForward className="w-6 h-6 fill-current" />
          </button>

          {/* Loop Mode (All / One / None) */}
          <button
            onClick={toggleLoopMode}
            className={`p-2.5 rounded-full transition-colors relative ${
              loopMode !== 'none' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400 hover:text-white'
            }`}
            title={`Loop Mode: ${loopMode.toUpperCase()}`}
            aria-label="Toggle Loop Mode"
          >
            {loopMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
          </button>
        </div>
      </main>

      {/* Playlist & Library Section */}
      <section className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-4 mb-2 shadow-2xl flex flex-col max-h-72">
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ListMusic className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">
              Queue & IndexedDB Library ({playlist.length})
            </h3>
          </div>

          {playlist.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-xs text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          )}
        </div>

        {/* Scrollable Song List */}
        <div className="overflow-y-auto space-y-1.5 pr-1 flex-1">
          {isLoadingStorage ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Loading audio from iOS IndexedDB storage...
            </div>
          ) : playlist.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="py-8 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors group"
            >
              <Upload className="w-8 h-8 text-slate-500 group-hover:text-indigo-400 transition-colors mb-2" />
              <p className="text-sm font-semibold text-slate-300">Tap to import audio files</p>
              <p className="text-xs text-slate-500 mt-1">Supports MP3, M4A, AAC, WAV, FLAC from iOS Files App</p>
            </div>
          ) : (
            playlist.map((track, idx) => {
              const isCurrent = idx === currentIndex;
              return (
                <div
                  key={track.id}
                  onClick={() => playTrackAtIndex(idx)}
                  className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                    isCurrent
                      ? 'bg-indigo-600/20 border border-indigo-500/40 text-white'
                      : 'hover:bg-slate-800/50 text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                      {isCurrent && isPlaying ? (
                        <div className="flex items-end gap-0.5 h-4">
                          <span className="w-0.5 h-3 bg-indigo-400 animate-pulse" />
                          <span className="w-0.5 h-4 bg-indigo-400 animate-pulse delay-75" />
                          <span className="w-0.5 h-2 bg-indigo-400 animate-pulse delay-150" />
                        </div>
                      ) : (
                        <span className="text-xs font-mono text-slate-400">{idx + 1}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold truncate ${isCurrent ? 'text-indigo-300' : 'text-slate-200'}`}>
                        {track.title}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {track.artist} • {formatSize(track.size)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Delete track */}
                    <button
                      onClick={(e) => handleDeleteTrack(e, track.id, idx)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Remove track"
                      aria-label="Remove track"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Footer Info */}
      <footer className="text-center text-[10px] text-slate-400 py-2">
        iOS Background Audio Ready • Media Session API • Persistent IndexedDB
      </footer>
    </div>
  );
}

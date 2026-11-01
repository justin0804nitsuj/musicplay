import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Header from './components/Header';
import MediaDisplay from './components/MediaDisplay';
import PlayerControls from './components/PlayerControls';
import TrackList from './components/TrackList';
import BrightnessOverlay from './components/BrightnessOverlay';
import { parseID3Tags } from './utils/id3';
import { cleanFileName } from './utils/formatters';
import {
  initializeDatabase,
  getTracksForPlaylist,
  saveTrack,
  updateTrack,
  deleteTrackFromDB,
  saveTracksOrder,
  createPlaylistInDB,
  deletePlaylistFromDB,
  clearPlaylistTracksFromDB,
  getSetting,
  setSetting,
  DEFAULT_PLAYLIST_ID
} from './services/storage';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

// iOS Safari Audio Session Priming:
// Permanently unlocks iOS background audio playback on user gesture
const primeAudioSession = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx && !window._iosAudioUnlocked) {
      const ctx = new AudioCtx();
      ctx.resume().then(() => {
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        window._iosAudioUnlocked = true;
      }).catch(() => {});
    }
  } catch {
    // Ignore
  }
};

export default function App() {
  // Database & Playlist states
  const [playlists, setPlaylists] = useState([{ id: DEFAULT_PLAYLIST_ID, name: 'My Music' }]);
  const [activePlaylistId, setActivePlaylistId] = useState(DEFAULT_PLAYLIST_ID);
  const [tracks, setTracks] = useState([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(true);

  // Playback states
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [repeatMode, setRepeatMode] = useState('all'); // 'none' | 'all' | 'one'
  const [isShuffle, setIsShuffle] = useState(false);
  const [shuffledIndices, setShuffledIndices] = useState([]);
  const [shuffleCursor, setShuffleCursor] = useState(0);

  // Software Brightness state (0 - 100)
  const [brightness, setBrightness] = useState(100);

  // Object URL Memory Management state (LAZY LOADING: ONLY FOR CURRENT TRACK)
  const [activeMediaUrl, setActiveMediaUrl] = useState(null);
  const activeMediaUrlRef = useRef(null);

  // Notifications & UI states
  const [statusMessage, setStatusMessage] = useState('');
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isPiPAvailable, setIsPiPAvailable] = useState(false);

  // DOM Media Elements
  const audioRef = useRef(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  // Synchronized refs to avoid stale closures in event handlers
  const tracksRef = useRef(tracks);
  const currentIndexRef = useRef(currentIndex);
  const repeatModeRef = useRef(repeatMode);
  const isShuffleRef = useRef(isShuffle);
  const shuffledIndicesRef = useRef(shuffledIndices);
  const shuffleCursorRef = useRef(shuffleCursor);
  const playbackRateRef = useRef(playbackRate);

  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);
  useEffect(() => { isShuffleRef.current = isShuffle; }, [isShuffle]);
  useEffect(() => { shuffledIndicesRef.current = shuffledIndices; }, [shuffledIndices]);
  useEffect(() => { shuffleCursorRef.current = shuffleCursor; }, [shuffleCursor]);
  useEffect(() => { playbackRateRef.current = playbackRate; }, [playbackRate]);

  const currentTrack = tracks[currentIndex] || null;

  const showNotification = (msg) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(''), 3000);
  };

  // Helper to determine if track is video (with extension fallback for iOS)
  const isVideoTrack = useCallback((track) => {
    if (!track) return false;
    const fileNameLower = (track.name || '').toLowerCase();
    return Boolean(
      track.isVideo ||
      (track.type && track.type.startsWith('video/')) ||
      fileNameLower.endsWith('.mp4') ||
      fileNameLower.endsWith('.mov') ||
      fileNameLower.endsWith('.webm') ||
      fileNameLower.endsWith('.m4v')
    );
  }, []);

  // Active media DOM element selector (Audio vs Video) with extension fallback
  const getActiveMediaElement = useCallback(() => {
    if (!currentTrack) return audioRef.current;
    return isVideoTrack(currentTrack) ? videoRef.current : audioRef.current;
  }, [currentTrack, isVideoTrack]);

  // -------------------------------------------------------------
  // 1. Critical Memory Management: Lazy Loading Object URLs
  // -------------------------------------------------------------
  const revokeActiveUrl = useCallback(() => {
    if (activeMediaUrlRef.current) {
      URL.revokeObjectURL(activeMediaUrlRef.current);
      activeMediaUrlRef.current = null;
      setActiveMediaUrl(null);
    }
  }, []);

  const loadTrackUrl = useCallback((track) => {
    // Revoke old URL first to free memory immediately
    revokeActiveUrl();

    if (!track || !track.blob) return null;

    const newUrl = URL.createObjectURL(track.blob);
    activeMediaUrlRef.current = newUrl;
    setActiveMediaUrl(newUrl);
    return newUrl;
  }, [revokeActiveUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      }
      revokeActiveUrl();
    };
  }, [revokeActiveUrl]);

  // -------------------------------------------------------------
  // 2. Initial Storage Load & Preferences
  // -------------------------------------------------------------
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const loadedPlaylists = await initializeDatabase();
        const savedPlaylistId = await getSetting('activePlaylistId', DEFAULT_PLAYLIST_ID);
        const savedBrightness = await getSetting('softwareBrightness', 100);

        if (!mounted) return;

        setPlaylists(loadedPlaylists);
        setBrightness(savedBrightness);

        const initialPlId = loadedPlaylists.some((p) => p.id === savedPlaylistId)
          ? savedPlaylistId
          : loadedPlaylists[0]?.id || DEFAULT_PLAYLIST_ID;

        setActivePlaylistId(initialPlId);

        // Load tracks for this initial playlist
        setIsLoadingTracks(true);
        const storedTracks = await getTracksForPlaylist(initialPlId);
        if (mounted) {
          setTracks(storedTracks);
          setIsLoadingTracks(false);
        }
      } catch (err) {
        console.error('Initialization failed:', err);
        if (mounted) setIsLoadingTracks(false);
      }
    }

    init();

    // Check PiP capability (Standard W3C + iOS Safari WebKit Presentation Mode)
    const isIOSDevice = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
    const hasStandardPiP = typeof document !== 'undefined' && Boolean(document.pictureInPictureEnabled);
    const hasWebKitPiP = isIOSDevice || (typeof window !== 'undefined' && (
      (window.HTMLVideoElement && typeof window.HTMLVideoElement.prototype.webkitSetPresentationMode === 'function') ||
      Boolean(videoRef.current?.webkitSetPresentationMode)
    ));
    if (hasStandardPiP || hasWebKitPiP) {
      setIsPiPAvailable(true);
    }

    // Check iOS standalone mode
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS && !isStandalone) {
      setShowInstallPrompt(true);
    }

    return () => {
      mounted = false;
    };
  }, []);

  // -------------------------------------------------------------
  // 3. Shuffle Array Generator
  // -------------------------------------------------------------
  const generateShuffledQueue = useCallback((length, activeIdx = 0) => {
    if (length <= 0) return [];
    const indices = Array.from({ length }, (_, i) => i);
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    // Put current playing index at the front of the shuffle queue
    if (activeIdx >= 0) {
      const currentPos = indices.indexOf(activeIdx);
      if (currentPos > 0) {
        indices.splice(currentPos, 1);
        indices.unshift(activeIdx);
      }
    }
    return indices;
  }, []);

  // When shuffle is toggled on
  const handleToggleShuffle = useCallback(() => {
    setIsShuffle((prev) => {
      const nextShuffle = !prev;
      if (nextShuffle && tracksRef.current.length > 0) {
        const queue = generateShuffledQueue(tracksRef.current.length, currentIndexRef.current);
        setShuffledIndices(queue);
        setShuffleCursor(0);
      }
      return nextShuffle;
    });
  }, [generateShuffledQueue]);

  // -------------------------------------------------------------
  // 4. Track Navigation & Playback Handlers
  // -------------------------------------------------------------
  const playTrackAtIndex = useCallback((index, autoPlay = true) => {
    // Prime iOS background audio session on user gesture
    primeAudioSession();

    const list = tracksRef.current;
    if (index < 0 || index >= list.length) return;

    const targetTrack = list[index];
    const isVideo = isVideoTrack(targetTrack);

    setCurrentIndex(index);
    setCurrentTime(0);
    setDuration(0);

    // Create Lazy Object URL only for this selected track
    const url = loadTrackUrl(targetTrack);

    if (isVideo) {
      // 1. Audio engine: PAUSE, remove source & reload so iOS background audio is not blocked
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      }
      // 2. Video engine: wait tick for conditional DOM mount, then set ObjectURL & play
      setTimeout(() => {
        if (videoRef.current && url) {
          videoRef.current.src = url;
          videoRef.current.playbackRate = playbackRateRef.current;
          videoRef.current.currentTime = 0;
          if (autoPlay) {
            setIsPlaying(true);
            videoRef.current.play().catch((err) => {
              console.warn('Video playback error (iOS interaction required):', err);
            });
          }
        }
      }, 50);
    } else {
      // 1. Video engine: PAUSE, remove source & reload so iOS doesn't aggressively suspend background audio
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      }
      // 2. Audio engine: set ObjectURL & play
      if (audioRef.current && url) {
        audioRef.current.src = url;
        audioRef.current.playbackRate = playbackRateRef.current;
        if (autoPlay) {
          setIsPlaying(true);
          audioRef.current.play().catch((err) => {
            console.warn('Audio playback error (iOS interaction required):', err);
          });
        }
      }
    }
  }, [loadTrackUrl, isVideoTrack]);

  const handleNext = useCallback(() => {
    const list = tracksRef.current;
    if (list.length === 0) return;

    if (isShuffleRef.current && shuffledIndicesRef.current.length > 0) {
      let nextCursor = shuffleCursorRef.current + 1;
      if (nextCursor >= shuffledIndicesRef.current.length) {
        if (repeatModeRef.current === 'none') {
          setIsPlaying(false);
          return;
        }
        // Reshuffle queue for seamless loop
        const newQueue = generateShuffledQueue(list.length, currentIndexRef.current);
        setShuffledIndices(newQueue);
        nextCursor = 0;
      }
      setShuffleCursor(nextCursor);
      const nextIdx = shuffledIndicesRef.current[nextCursor];
      playTrackAtIndex(nextIdx);
      return;
    }

    const nextIndex = currentIndexRef.current + 1;
    if (nextIndex >= list.length) {
      if (repeatModeRef.current === 'none') {
        setIsPlaying(false);
        return;
      }
      playTrackAtIndex(0);
    } else {
      playTrackAtIndex(nextIndex);
    }
  }, [playTrackAtIndex, generateShuffledQueue]);

  const handlePrev = useCallback(() => {
    const list = tracksRef.current;
    if (list.length === 0) return;

    const mediaEl = getActiveMediaElement();
    if (mediaEl && mediaEl.currentTime > 3) {
      mediaEl.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    if (isShuffleRef.current && shuffledIndicesRef.current.length > 0) {
      let prevCursor = shuffleCursorRef.current - 1;
      if (prevCursor < 0) {
        prevCursor = shuffledIndicesRef.current.length - 1;
      }
      setShuffleCursor(prevCursor);
      const prevIdx = shuffledIndicesRef.current[prevCursor];
      playTrackAtIndex(prevIdx);
      return;
    }

    const prevIndex = currentIndexRef.current - 1;
    if (prevIndex < 0) {
      playTrackAtIndex(list.length - 1);
    } else {
      playTrackAtIndex(prevIndex);
    }
  }, [playTrackAtIndex, getActiveMediaElement]);

  const togglePlay = useCallback(() => {
    primeAudioSession();
    const isVideo = isVideoTrack(currentTrack);
    const mediaEl = isVideo ? videoRef.current : audioRef.current;
    if (!mediaEl || !currentTrack) return;

    if (isPlaying) {
      mediaEl.pause();
      setIsPlaying(false);
    } else {
      // Force iOS to drop the inactive context before playing
      if (isVideo) {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.removeAttribute('src');
          audioRef.current.load();
        }
      } else {
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.removeAttribute('src');
          videoRef.current.load();
        }
      }

      mediaEl.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Playback error:', err);
      });
    }
  }, [currentTrack, isPlaying, isVideoTrack]);

  const handleSeek = useCallback((seekTime) => {
    const mediaEl = getActiveMediaElement();
    setCurrentTime(seekTime);
    if (mediaEl) {
      mediaEl.currentTime = seekTime;
    }
  }, [getActiveMediaElement]);

  const handleToggleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      if (prev === 'all') return 'one';
      if (prev === 'one') return 'none';
      return 'all';
    });
  }, []);

  const handleChangePlaybackRate = useCallback((rate) => {
    setPlaybackRate(rate);
    const mediaEl = getActiveMediaElement();
    if (mediaEl) {
      mediaEl.playbackRate = rate;
    }
  }, [getActiveMediaElement]);

  const handleChangeBrightness = useCallback((val) => {
    setBrightness(val);
    setSetting('softwareBrightness', val);
  }, []);

  const handleTogglePiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !currentTrack) return;

    // Ensure PiP only fires for video tracks
    if (!isVideoTrack(currentTrack)) return;

    try {
      // 1. Apple WebKit Presentation Mode (iOS Safari)
      if (typeof video.webkitSetPresentationMode === 'function') {
        const currentMode = video.webkitPresentationMode;
        const targetMode = currentMode === 'picture-in-picture' ? 'inline' : 'picture-in-picture';
        video.webkitSetPresentationMode(targetMode);
      } else if (document.pictureInPictureEnabled && typeof video.requestPictureInPicture === 'function') {
        // 2. Standard W3C API (Desktop / Chrome / Safari 13.1+)
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await video.requestPictureInPicture();
        }
      } else if (typeof video.webkitEnterFullscreen === 'function') {
        video.webkitEnterFullscreen();
      }
    } catch (err) {
      console.warn('Picture-in-Picture error:', err);
    }
  }, [currentTrack, isVideoTrack]);

  // -------------------------------------------------------------
  // 5. Media Events Handlers
  // -------------------------------------------------------------
  const handleMediaTimeUpdate = () => {
    const mediaEl = getActiveMediaElement();
    if (!mediaEl) return;

    setCurrentTime(mediaEl.currentTime);

    // Update MediaSession lock screen scrubber
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      if (mediaEl.duration && !isNaN(mediaEl.duration)) {
        try {
          navigator.mediaSession.setPositionState({
            duration: mediaEl.duration,
            playbackRate: mediaEl.playbackRate || 1,
            position: Math.min(mediaEl.currentTime, mediaEl.duration)
          });
        } catch {
          // Guard against floating point boundary issues
        }
      }
    }
  };

  const handleMediaLoadedMetadata = () => {
    const mediaEl = getActiveMediaElement();
    if (mediaEl && mediaEl.duration) {
      setDuration(mediaEl.duration);
    }
  };

  const handleMediaEnded = () => {
    if (repeatModeRef.current === 'one') {
      const mediaEl = getActiveMediaElement();
      if (mediaEl) {
        mediaEl.currentTime = 0;
        mediaEl.play().catch(console.warn);
      }
    } else {
      handleNext();
    }
  };

  // -------------------------------------------------------------
  // 6. MediaSession API (Lock Screen & Control Center)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;

    const artwork = currentTrack.coverArt
      ? [{ src: currentTrack.coverArt, sizes: '512x512', type: 'image/jpeg' }]
      : [{ src: '/icon.svg', sizes: '512x512', type: 'image/svg+xml' }];

    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: currentTrack.title || 'Unknown Title',
      artist: currentTrack.artist || 'Local Audio',
      album: currentTrack.album || 'SonicWave Library',
      artwork
    });

    navigator.mediaSession.setActionHandler('play', () => {
      const mediaEl = getActiveMediaElement();
      if (mediaEl) {
        mediaEl.play();
        setIsPlaying(true);
      }
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      const mediaEl = getActiveMediaElement();
      if (mediaEl) {
        mediaEl.pause();
        setIsPlaying(false);
      }
    });

    navigator.mediaSession.setActionHandler('previoustrack', handlePrev);
    navigator.mediaSession.setActionHandler('nexttrack', handleNext);

    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) {
        handleSeek(details.seekTime);
      }
    });

    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      const mediaEl = getActiveMediaElement();
      if (mediaEl) {
        handleSeek(Math.max(mediaEl.currentTime - (details.seekOffset || 10), 0));
      }
    });

    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      const mediaEl = getActiveMediaElement();
      if (mediaEl) {
        handleSeek(Math.min(mediaEl.currentTime + (details.seekOffset || 10), mediaEl.duration || 0));
      }
    });

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [currentTrack, isPlaying, handleNext, handlePrev, handleSeek, getActiveMediaElement]);

  // -------------------------------------------------------------
  // 7. Playlist Switching & Creation
  // -------------------------------------------------------------
  const handleSelectPlaylist = async (playlistId) => {
    if (playlistId === activePlaylistId) return;

    // Stop current playback, force drop iOS media contexts, and clean URL
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
    }
    revokeActiveUrl();
    setIsPlaying(false);
    setCurrentIndex(-1);
    setCurrentTime(0);
    setDuration(0);

    setActivePlaylistId(playlistId);
    setSetting('activePlaylistId', playlistId);

    setIsLoadingTracks(true);
    const loaded = await getTracksForPlaylist(playlistId);
    setTracks(loaded);
    setIsLoadingTracks(false);
  };

  const handleCreatePlaylist = async (name) => {
    try {
      const created = await createPlaylistInDB(name);
      setPlaylists((prev) => [...prev, created]);
      handleSelectPlaylist(created.id);
      showNotification(`Created playlist "${created.name}"`);
    } catch (err) {
      console.error('Failed to create playlist:', err);
    }
  };

  const handleDeletePlaylist = async (playlistId) => {
    try {
      await deletePlaylistFromDB(playlistId);
      const updated = playlists.filter((p) => p.id !== playlistId);
      setPlaylists(updated);
      handleSelectPlaylist(DEFAULT_PLAYLIST_ID);
      showNotification('Playlist deleted');
    } catch (err) {
      console.error('Failed to delete playlist:', err);
    }
  };

  // -------------------------------------------------------------
  // 8. Track Import, ID3 Parsing & LRC Association
  // -------------------------------------------------------------
  const handleFileImport = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const audioVideoFiles = [];
    const lrcFiles = [];

    files.forEach((file) => {
      if (file.name.endsWith('.lrc')) {
        lrcFiles.push(file);
      } else {
        audioVideoFiles.push(file);
      }
    });

    const addedTracks = [];
    let currentOrder = tracks.length;

    // Process media files
    for (const file of audioVideoFiles) {
      const fileNameLower = file.name.toLowerCase();

      // iOS Safari empty MIME type fallback: check audio/video by file extension
      const isAudio =
        (file.type && file.type.startsWith('audio/')) ||
        fileNameLower.endsWith('.mp3') ||
        fileNameLower.endsWith('.m4a') ||
        fileNameLower.endsWith('.aac') ||
        fileNameLower.endsWith('.flac') ||
        fileNameLower.endsWith('.wav') ||
        fileNameLower.endsWith('.ogg');

      const isVideo =
        (file.type && file.type.startsWith('video/')) ||
        fileNameLower.endsWith('.mp4') ||
        fileNameLower.endsWith('.mov') ||
        fileNameLower.endsWith('.webm') ||
        fileNameLower.endsWith('.m4v');

      // Skip non-media files
      if (!isAudio && !isVideo) continue;

      const isVideoTrack = isVideo && !isAudio;
      const trackId = `track_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const cleanTitle = cleanFileName(file.name);

      // Extract ID3 metadata if audio file
      let id3 = null;
      if (isAudio && !isVideoTrack) {
        id3 = await parseID3Tags(file);
      }

      const mimeType = file.type || (isVideoTrack ? 'video/mp4' : 'audio/mpeg');

      const trackRecord = {
        id: trackId,
        name: file.name,
        title: id3?.title || cleanTitle,
        artist: id3?.artist || (isVideoTrack ? 'Local Video' : 'Local Audio'),
        album: id3?.album || '',
        size: file.size,
        type: mimeType,
        isVideo: isVideoTrack,
        coverArt: id3?.coverArt || null,
        lyrics: null,
        playlistId: activePlaylistId,
        order: currentOrder++,
        createdAt: Date.now(),
        blob: file // Stored persistently in IndexedDB
      };

      try {
        await saveTrack(trackRecord);
        addedTracks.push(trackRecord);
      } catch (err) {
        console.error(`Failed to store ${file.name}:`, err);
      }
    }

    // Process uploaded LRC files: match by clean file name
    for (const lrcFile of lrcFiles) {
      try {
        const text = await lrcFile.text();
        const baseName = cleanFileName(lrcFile.name).toLowerCase();

        // Check if matching any added or existing track
        const target = [...addedTracks, ...tracks].find(
          (t) => cleanFileName(t.name).toLowerCase() === baseName || t.title.toLowerCase() === baseName
        );

        if (target) {
          target.lyrics = text;
          await updateTrack(target.id, { lyrics: text });
        } else if (currentTrack) {
          // If no name match, attach to current playing track
          currentTrack.lyrics = text;
          await updateTrack(currentTrack.id, { lyrics: text });
        }
      } catch (err) {
        console.warn('Error processing LRC file:', err);
      }
    }

    if (addedTracks.length > 0) {
      setTracks((prev) => [...prev, ...addedTracks]);
      showNotification(`Added ${addedTracks.length} track${addedTracks.length > 1 ? 's' : ''}`);
      if (currentIndex === -1) {
        playTrackAtIndex(0, false);
      }
    } else if (lrcFiles.length > 0) {
      showNotification('Synchronized lyrics updated!');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // -------------------------------------------------------------
  // 9. Reorder, Delete & Attach Lyrics
  // -------------------------------------------------------------
  const handleReorderTracks = async (reordered) => {
    // Preserve current playing track index accurately
    const currentPlayingId = currentTrack?.id;
    setTracks(reordered);

    if (currentPlayingId) {
      const newIdx = reordered.findIndex((t) => t.id === currentPlayingId);
      if (newIdx !== -1) {
        setCurrentIndex(newIdx);
      }
    }

    await saveTracksOrder(reordered);
  };

  const handleDeleteTrack = async (trackId, indexToDelete) => {
    const isDeletingCurrent = indexToDelete === currentIndex;

    if (isDeletingCurrent) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      }
      revokeActiveUrl();
      setIsPlaying(false);
    }

    await deleteTrackFromDB(trackId);

    const updated = tracks.filter((t) => t.id !== trackId);
    setTracks(updated);

    if (isDeletingCurrent) {
      if (updated.length === 0) {
        setCurrentIndex(-1);
        setCurrentTime(0);
        setDuration(0);
      } else {
        const nextIdx = indexToDelete >= updated.length ? 0 : indexToDelete;
        playTrackAtIndex(nextIdx, isPlaying);
      }
    } else if (indexToDelete < currentIndex) {
      setCurrentIndex((prev) => prev - 1);
    }

    showNotification('Track deleted');
  };

  const handleClearAllTracks = async () => {
    if (tracks.length === 0) return;
    if (!window.confirm('Delete all tracks from this playlist?')) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
    }
    revokeActiveUrl();

    await clearPlaylistTracksFromDB(activePlaylistId);
    setTracks([]);
    setCurrentIndex(-1);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    showNotification('Playlist cleared');
  };

  const handleAttachLrc = async (trackId, lrcContent) => {
    try {
      await updateTrack(trackId, { lyrics: lrcContent });
      setTracks((prev) =>
        prev.map((t) => (t.id === trackId ? { ...t, lyrics: lrcContent } : t))
      );
      showNotification('Lyrics attached successfully!');
    } catch (err) {
      console.error('Failed to attach lyrics:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-between safe-top safe-bottom px-4 sm:px-6 md:px-12 max-w-4xl mx-auto selection:bg-indigo-500 selection:text-white relative">
      {/* Software Brightness Overlay (CSS full-screen overlay) */}
      <BrightnessOverlay brightness={brightness} />

      {/* Audio Element for iOS background audio */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleMediaTimeUpdate}
        onLoadedMetadata={handleMediaLoadedMetadata}
        onEnded={handleMediaEnded}
        onPlay={() => setIsPlaying(true)}
        playsInline
        preload="auto"
      />

      {/* Hidden File Import Input (accepts audio, video, lrc with explicit extensions for iOS Files app) */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="audio/*,video/*,.mp3,.m4a,.aac,.flac,.wav,.ogg,.mp4,.mov,.webm,.m4v,.lrc,text/plain"
        onChange={handleFileImport}
        className="hidden"
      />

      {/* Header with Playlist Manager & Import */}
      <Header
        playlists={playlists}
        activePlaylistId={activePlaylistId}
        onSelectPlaylist={handleSelectPlaylist}
        onCreatePlaylist={handleCreatePlaylist}
        onDeletePlaylist={handleDeletePlaylist}
        trackCount={tracks.length}
        onTriggerImport={() => fileInputRef.current?.click()}
      />

      {/* iOS PWA Install Banner Notice */}
      {showInstallPrompt && (
        <div className="my-3 p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-start justify-between gap-3 backdrop-blur-md">
          <div className="flex gap-2.5">
            <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed">
              <span className="font-semibold text-white">For background playback on iOS:</span>
              <br />
              Tap Safari <span className="font-semibold text-indigo-300">Share</span> and select <span className="font-semibold text-indigo-300">"Add to Home Screen"</span>.
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

      {/* Toast Notification */}
      {statusMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-indigo-600 text-white text-xs font-medium shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Center Media & Controls Area */}
      <main className="flex-1 flex flex-col justify-center items-center py-4">
        {/* Vinyl / Cover Art / Video / Lyrics Display */}
        <MediaDisplay
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          currentTime={currentTime}
          videoRef={videoRef}
          onMediaTimeUpdate={handleMediaTimeUpdate}
          onMediaLoadedMetadata={handleMediaLoadedMetadata}
          onMediaEnded={handleMediaEnded}
          onSeek={handleSeek}
          onUploadLrc={(trackId, text) => handleAttachLrc(trackId, text)}
          onTogglePiP={handleTogglePiP}
          isPiPAvailable={isPiPAvailable}
        />

        {/* Track Title, Artist & Album */}
        <div className="w-full text-center mt-2 mb-3 px-4">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white truncate max-w-md mx-auto">
            {currentTrack ? currentTrack.title : 'No Track Selected'}
          </h2>
          <p className="text-sm text-slate-400 mt-1 flex items-center justify-center gap-2">
            <span>{currentTrack ? currentTrack.artist : 'Import songs or videos to begin'}</span>
            {currentTrack?.album && (
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                {currentTrack.album}
              </span>
            )}
          </p>
        </div>

        {/* Playback Controls (Seek Bar, Shuffle, Repeat, Speed, PiP, Brightness) */}
        <PlayerControls
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          repeatMode={repeatMode}
          isShuffle={isShuffle}
          playbackRate={playbackRate}
          brightness={brightness}
          isPiPAvailable={isPiPAvailable}
          onTogglePlay={togglePlay}
          onPrev={handlePrev}
          onNext={handleNext}
          onSeek={handleSeek}
          onToggleRepeat={handleToggleRepeat}
          onToggleShuffle={handleToggleShuffle}
          onChangePlaybackRate={handleChangePlaybackRate}
          onChangeBrightness={handleChangeBrightness}
          onTogglePiP={handleTogglePiP}
        />
      </main>

      {/* Playlist & Library Section with Drag & Drop + Swipe to Delete */}
      <TrackList
        tracks={tracks}
        currentIndex={currentIndex}
        isPlaying={isPlaying}
        isLoading={isLoadingTracks}
        onPlayTrack={(idx) => playTrackAtIndex(idx, true)}
        onDeleteTrack={handleDeleteTrack}
        onClearAll={handleClearAllTracks}
        onReorderTracks={handleReorderTracks}
        onAttachLrc={handleAttachLrc}
        onTriggerImport={() => fileInputRef.current?.click()}
      />

      {/* Footer Info */}
      <footer className="text-center text-[10px] text-slate-400 py-2">
        iOS Background Audio • ID3 Tags • Dynamic LRC • Sortable Queue
      </footer>
    </div>
  );
}

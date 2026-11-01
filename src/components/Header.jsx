import React from 'react';
import { Music, Upload } from 'lucide-react';
import PlaylistSelector from './PlaylistSelector';

export default function Header({
  playlists,
  activePlaylistId,
  onSelectPlaylist,
  onCreatePlaylist,
  onDeletePlaylist,
  trackCount,
  onTriggerImport
}) {
  return (
    <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-4 border-b border-slate-800/80">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
          <Music className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            SonicWave <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">PWA</span>
          </h1>
          <p className="text-xs text-slate-400">iOS Optimized Audio & Video Engine</p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
        {/* Playlist selector dropdown */}
        <PlaylistSelector
          playlists={playlists}
          activePlaylistId={activePlaylistId}
          onSelectPlaylist={onSelectPlaylist}
          onCreatePlaylist={onCreatePlaylist}
          onDeletePlaylist={onDeletePlaylist}
          trackCount={trackCount}
        />

        {/* Import Files Button */}
        <button
          onClick={onTriggerImport}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all duration-200 active:scale-95 shrink-0"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Import</span>
        </button>
      </div>
    </header>
  );
}


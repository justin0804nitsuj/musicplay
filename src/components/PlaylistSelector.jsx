import React, { useState } from 'react';
import { FolderPlus, Trash2, Folder, ChevronDown, Check } from 'lucide-react';
import { DEFAULT_PLAYLIST_ID } from '../services/storage';

export default function PlaylistSelector({
  playlists,
  activePlaylistId,
  onSelectPlaylist,
  onCreatePlaylist,
  onDeletePlaylist,
  trackCount
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const activePlaylist = playlists.find((p) => p.id === activePlaylistId) || playlists[0];

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      onCreatePlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setIsCreating(false);
    }
  };

  return (
    <div className="relative">
      {/* Current Playlist Trigger */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-200 text-xs font-semibold transition-all"
        >
          <Folder className="w-3.5 h-3.5 text-indigo-400" />
          <span className="max-w-[130px] truncate">{activePlaylist?.name || 'Playlist'}</span>
          <span className="text-[10px] text-slate-400 font-mono">({trackCount})</span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Delete current playlist (if not default) */}
        {activePlaylistId !== DEFAULT_PLAYLIST_ID && (
          <button
            onClick={() => {
              if (window.confirm(`Delete playlist "${activePlaylist?.name}" and all its tracks?`)) {
                onDeletePlaylist(activePlaylistId);
              }
            }}
            title="Delete this playlist"
            className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => {
              setIsOpen(false);
              setIsCreating(false);
            }}
          />
          <div className="absolute left-0 mt-2 w-64 p-2 rounded-2xl bg-slate-900/95 border border-slate-700 shadow-2xl backdrop-blur-xl z-40">
            <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Playlists & Folders
            </div>

            {/* List of playlists */}
            <div className="max-h-48 overflow-y-auto space-y-1 my-1">
              {playlists.map((pl) => {
                const isSelected = pl.id === activePlaylistId;
                return (
                  <button
                    key={pl.id}
                    onClick={() => {
                      onSelectPlaylist(pl.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors ${
                      isSelected
                        ? 'bg-indigo-600/30 text-indigo-300 font-medium'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Folder className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                      <span className="truncate">{pl.name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Create new playlist form */}
            <div className="border-t border-slate-800 pt-2 mt-1">
              {isCreating ? (
                <form onSubmit={handleCreateSubmit} className="space-y-2">
                  <input
                    type="text"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    placeholder="Playlist name..."
                    autoFocus
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-800 text-xs text-white border border-indigo-500/50 focus:outline-none"
                  />
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-white text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium"
                    >
                      Save
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-indigo-300 hover:bg-indigo-600/20 transition-colors font-medium"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Create New Playlist</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}


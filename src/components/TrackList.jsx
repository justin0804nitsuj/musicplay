import React, { useRef } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable';
import TrackItem from './TrackItem';
import { Upload, Trash2, ListMusic } from 'lucide-react';

export default function TrackList({
  tracks,
  currentIndex,
  isPlaying,
  isLoading,
  onPlayTrack,
  onDeleteTrack,
  onClearAll,
  onReorderTracks,
  onAttachLrc,
  onTriggerImport
}) {
  const lrcTrackInputRef = useRef(null);
  const targetTrackIdRef = useRef(null);

  // DND Kit Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = tracks.findIndex((t) => t.id === active.id);
      const newIndex = tracks.findIndex((t) => t.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(tracks, oldIndex, newIndex);
        onReorderTracks(reordered);
      }
    }
  };

  const handlePromptAttachLrc = (trackId) => {
    targetTrackIdRef.current = trackId;
    lrcTrackInputRef.current?.click();
  };

  const handleLrcFileInput = (e) => {
    const file = e.target.files?.[0];
    const trackId = targetTrackIdRef.current;
    if (file && trackId) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === 'string') {
          onAttachLrc(trackId, text);
        }
      };
      reader.readAsText(file);
    }
    if (lrcTrackInputRef.current) {
      lrcTrackInputRef.current.value = '';
    }
  };

  return (
    <section className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-4 mb-2 shadow-2xl flex flex-col max-h-80 sm:max-h-96">
      {/* Hidden file input for attaching LRC directly to a selected track */}
      <input
        ref={lrcTrackInputRef}
        type="file"
        accept=".lrc,text/plain"
        onChange={handleLrcFileInput}
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <ListMusic className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-white">
            Queue ({tracks.length})
          </h3>
        </div>

        {tracks.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-xs text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Playlist</span>
          </button>
        )}
      </div>

      {/* Scrollable List */}
      <div className="overflow-y-auto space-y-1 pr-1 flex-1">
        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Loading tracks from offline storage...
          </div>
        ) : tracks.length === 0 ? (
          <div
            onClick={onTriggerImport}
            className="py-10 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors group"
          >
            <Upload className="w-8 h-8 text-slate-500 group-hover:text-indigo-400 transition-colors mb-2" />
            <p className="text-sm font-semibold text-slate-300">Tap to import media files</p>
            <p className="text-xs text-slate-500 mt-1 text-center px-4">
              MP3, M4A, FLAC, WAV, MP4, WebM & LRC lyrics
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={tracks.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {tracks.map((track, idx) => (
                <TrackItem
                  key={track.id}
                  track={track}
                  index={idx}
                  isCurrent={idx === currentIndex}
                  isPlaying={isPlaying}
                  onPlay={() => onPlayTrack(idx)}
                  onDelete={() => onDeleteTrack(track.id, idx)}
                  onAttachLrc={() => handlePromptAttachLrc(track.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </section>
  );
}


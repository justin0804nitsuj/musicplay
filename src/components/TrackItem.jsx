import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { GripVertical, Trash2, Music, Video, FileText } from 'lucide-react';
import { formatSize } from '../utils/formatters';

export default function TrackItem({
  track,
  index,
  isCurrent,
  isPlaying,
  onPlay,
  onDelete,
  onAttachLrc
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: track.id });

  // Framer Motion gesture value: 0 when resting, negative when swiped left
  const x = useMotionValue(0);
  // Red delete layer is COMPLETELY INVISIBLE (opacity: 0) unless actively swiping left
  const deleteOpacity = useTransform(x, [-70, -10, 0], [1, 0.7, 0]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative rounded-2xl overflow-hidden mb-1.5 touch-pan-y ${
        isDragging ? 'opacity-60 shadow-2xl scale-[1.02]' : ''
      }`}
    >
      {/* Background revealed ONLY on swipe-to-delete (Opacity 0 by default, zero red bleed) */}
      <motion.div
        style={{ opacity: deleteOpacity }}
        className="absolute inset-0 bg-rose-600 flex items-center justify-end pr-5 text-white font-medium text-xs rounded-2xl pointer-events-none"
      >
        <div className="flex items-center gap-1.5">
          <Trash2 className="w-4 h-4 text-white animate-pulse" />
          <span>Delete</span>
        </div>
      </motion.div>

      {/* Swipeable Track Item Container (Solid opaque background: No red tint) */}
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.15}
        onDragEnd={(e, info) => {
          // Trigger delete if swiped left far enough or flicked with speed
          if (info.offset.x < -70 || info.velocity.x < -300) {
            onDelete(track.id);
          }
        }}
        className={`relative flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-colors ${
          isCurrent
            ? 'bg-[#062c1d] border-2 border-emerald-500 text-white shadow-xl shadow-emerald-950/60'
            : 'bg-[#0f172a] hover:bg-[#1a2336] text-slate-300 border border-slate-800/80'
        }`}
      >
        {/* Left: Drag Handle + Thumbnail + Info */}
        <div className="flex items-center gap-2.5 min-w-0 pr-2 flex-1" onClick={onPlay}>
          {/* Drag Handle button specifically for dnd-kit */}
          <button
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="p-1 text-slate-500 hover:text-slate-300 active:text-emerald-400 cursor-grab touch-none"
            title="Drag to reorder"
            aria-label="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          {/* Thumbnail / Cover Art */}
          <div className={`relative w-9 h-9 rounded-xl bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center border transition-all ${
            isCurrent ? 'border-emerald-500 ring-2 ring-emerald-500/40' : 'border-slate-700/50'
          }`}>
            {track.coverArt ? (
              <img
                src={track.coverArt}
                alt={track.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : track.isVideo ? (
              <Video className={`w-4 h-4 ${isCurrent ? 'text-emerald-400' : 'text-slate-400'}`} />
            ) : (
              <Music className={`w-4 h-4 ${isCurrent ? 'text-emerald-400' : 'text-slate-400'}`} />
            )}

            {/* Playing equalizer indicator overlay (Green) */}
            {isCurrent && isPlaying && (
              <div className="absolute inset-0 bg-[#062c1d]/90 backdrop-blur-[1px] flex items-end justify-center gap-0.5 pb-1">
                <span className="w-0.5 h-3 bg-emerald-400 animate-pulse" />
                <span className="w-0.5 h-4 bg-emerald-400 animate-pulse delay-75" />
                <span className="w-0.5 h-2 bg-emerald-400 animate-pulse delay-150" />
              </div>
            )}
          </div>

          {/* Title & Metadata */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className={`text-xs font-semibold truncate ${isCurrent ? 'text-emerald-300 font-bold' : 'text-slate-200'}`}>
                {track.title}
              </p>
              {isCurrent && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-medium border border-emerald-500/40 shrink-0">
                  {isPlaying ? 'Playing' : 'Paused'}
                </span>
              )}
              {track.lyrics && (
                <span
                  title="Has synchronized lyrics"
                  className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[9px] font-mono shrink-0"
                >
                  LRC
                </span>
              )}
            </div>
            <p className={`text-[11px] truncate flex items-center gap-1.5 ${isCurrent ? 'text-emerald-300/80' : 'text-slate-400'}`}>
              <span>{track.artist}</span>
              <span>•</span>
              <span className="font-mono">{formatSize(track.size)}</span>
            </p>
          </div>
        </div>

        {/* Right: Actions (Attach LRC, Delete) */}
        <div className="flex items-center gap-1">
          {/* Attach LRC button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAttachLrc(track.id);
            }}
            title={track.lyrics ? 'Update Lyrics (.lrc)' : 'Add Lyrics (.lrc)'}
            className={`p-1.5 rounded-xl transition-colors ${
              track.lyrics
                ? 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
          </button>

          {/* Delete Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(track.id);
            }}
            title="Delete track"
            aria-label="Delete track"
            className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}


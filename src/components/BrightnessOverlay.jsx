import React from 'react';

/**
 * Fullscreen software brightness overlay.
 * Uses pointer-events-none so touches/clicks pass right through.
 * 100 brightness = opacity 0 (full brightness)
 * 0 brightness = opacity 0.8 (dimmest)
 */
export default function BrightnessOverlay({ brightness = 100 }) {
  // Clamped between 0 and 100
  const clampedBrightness = Math.max(0, Math.min(100, brightness));
  const opacity = ((100 - clampedBrightness) / 100) * 0.8;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-[9999] transition-colors duration-150"
      style={{ backgroundColor: `rgba(0, 0, 0, ${opacity})` }}
    />
  );
}


/**
 * Parses an LRC formatted string into an array of timed lyric objects.
 * Format: [mm:ss.xx] Lyric text
 * @param {string} lrcText 
 * @returns {Array<{ time: number, text: string }>}
 */
export function parseLrc(lrcText) {
  if (!lrcText || typeof lrcText !== 'string') return [];

  const lines = lrcText.split(/\r?\n/);
  const result = [];
  const timeRegex = /\[(\d{2,}):(\d{2})(?:\.(\d{2,3}))?\]/g;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Matches timestamp tags like [01:23.45]
    const matches = [...trimmed.matchAll(timeRegex)];
    if (matches.length > 0) {
      // Strip timestamps to get the lyric text
      const text = trimmed.replace(timeRegex, '').trim();
      for (const match of matches) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const fractionStr = match[3] || '0';
        // Normalize fraction: if 2 digits (centiseconds), / 100; if 3 digits (ms), / 1000
        const fraction = fractionStr.length === 3 ? parseInt(fractionStr, 10) / 1000 : parseInt(fractionStr, 10) / 100;
        const time = minutes * 60 + seconds + fraction;
        result.push({ time, text });
      }
    }
  }

  // Sort chronologically
  result.sort((a, b) => a.time - b.time);
  return result;
}

/**
 * Finds the index of the currently active lyric line.
 * @param {Array<{ time: number, text: string }>} lyrics 
 * @param {number} currentTime 
 * @returns {number} Index of current line or -1 if before first lyric
 */
export function getCurrentLyricIndex(lyrics, currentTime) {
  if (!lyrics || lyrics.length === 0) return -1;
  if (currentTime < lyrics[0].time) return -1;

  let low = 0;
  let high = lyrics.length - 1;
  let activeIndex = -1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (lyrics[mid].time <= currentTime) {
      activeIndex = mid;
      low = mid + 1; // Try to find a later line that also qualifies
    } else {
      high = mid - 1;
    }
  }

  return activeIndex;
}


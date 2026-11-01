// Helper formatters

export const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds === null || seconds === undefined) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export const formatSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const cleanFileName = (filename) => {
  if (!filename) return 'Unknown Title';
  return filename
    .replace(/\.[^/.]+$/, '')
    .replace(/^[0-9\s-_.]+/, '')
    .trim() || filename;
};


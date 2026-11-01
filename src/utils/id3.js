import jsmediatags from 'jsmediatags';

/**
 * Extracts ID3 metadata (Title, Artist, Album, Cover Art) from an audio File/Blob.
 * @param {Blob|File} file
 * @returns {Promise<{ title?: string, artist?: string, album?: string, coverArt?: string } | null>}
 */
export function parseID3Tags(file) {
  return new Promise((resolve) => {
    // Only attempt ID3 tags for audio files (primarily MP3)
    if (!file || (file.type && !file.type.includes('audio') && !file.name?.endsWith('.mp3'))) {
      resolve(null);
      return;
    }

    try {
      const readFn = jsmediatags?.read || (jsmediatags?.default && jsmediatags.default.read);
      if (!readFn) {
        console.warn('jsmediatags.read is not available');
        resolve(null);
        return;
      }

      readFn(file, {
        onSuccess: (tag) => {
          try {
            const tags = tag.tags || {};
            let coverArt = null;

            if (tags.picture) {
              const { data, format } = tags.picture;
              let base64String = '';
              const chunkSize = 8192;
              for (let i = 0; i < data.length; i += chunkSize) {
                base64String += String.fromCharCode.apply(null, data.slice(i, i + chunkSize));
              }
              coverArt = `data:${format || 'image/jpeg'};base64,${btoa(base64String)}`;
            }

            resolve({
              title: tags.title ? tags.title.trim() : null,
              artist: tags.artist ? tags.artist.trim() : null,
              album: tags.album ? tags.album.trim() : null,
              coverArt
            });
          } catch (err) {
            console.warn('Error reading extracted ID3 picture/tags:', err);
            resolve(null);
          }
        },
        onError: (error) => {
          // Untagged files will call onError; fallback cleanly
          resolve(null);
        }
      });
    } catch (err) {
      console.warn('jsmediatags exception:', err);
      resolve(null);
    }
  });
}

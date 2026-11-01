import localforage from 'localforage';

// Database instance for tracks
export const tracksDB = localforage.createInstance({
  name: 'iOSLocalMusicPWA',
  storeName: 'audio_library',
  description: 'Persistent offline storage for local audio & video tracks'
});

// Database instance for playlists
export const playlistsDB = localforage.createInstance({
  name: 'iOSLocalMusicPWA',
  storeName: 'playlists',
  description: 'Persistent playlists storage'
});

// Database instance for app settings (e.g., active playlist, brightness)
export const settingsDB = localforage.createInstance({
  name: 'iOSLocalMusicPWA',
  storeName: 'app_settings',
  description: 'App preferences and state'
});

export const DEFAULT_PLAYLIST_ID = 'default';

/**
 * Initializes database and ensures default playlist exists.
 * Migrates legacy tracks without playlistId.
 */
export async function initializeDatabase() {
  try {
    let defaultPlaylist = await playlistsDB.getItem(DEFAULT_PLAYLIST_ID);
    if (!defaultPlaylist) {
      defaultPlaylist = {
        id: DEFAULT_PLAYLIST_ID,
        name: 'My Music',
        createdAt: Date.now()
      };
      await playlistsDB.setItem(DEFAULT_PLAYLIST_ID, defaultPlaylist);
    }

    // Migrate any legacy tracks missing playlistId
    await tracksDB.iterate((value, key) => {
      if (value && (!value.playlistId || value.order === undefined)) {
        const updated = {
          ...value,
          playlistId: value.playlistId || DEFAULT_PLAYLIST_ID,
          order: value.order !== undefined ? value.order : Date.now()
        };
        tracksDB.setItem(key, updated).catch(console.warn);
      }
    });

    const allPlaylists = [];
    await playlistsDB.iterate((value) => {
      if (value && value.id) {
        allPlaylists.push(value);
      }
    });

    // Ensure default playlist is first if present
    allPlaylists.sort((a, b) => {
      if (a.id === DEFAULT_PLAYLIST_ID) return -1;
      if (b.id === DEFAULT_PLAYLIST_ID) return 1;
      return (a.createdAt || 0) - (b.createdAt || 0);
    });

    return allPlaylists.length > 0 ? allPlaylists : [defaultPlaylist];
  } catch (err) {
    console.error('Database initialization error:', err);
    return [{ id: DEFAULT_PLAYLIST_ID, name: 'My Music', createdAt: Date.now() }];
  }
}

/**
 * Fetches all tracks for a specific playlist sorted by order.
 * Note: Blobs are kept in IndexedDB; we return track metadata and the Blob reference
 * without creating any URL.createObjectURL.
 */
export async function getTracksForPlaylist(playlistId) {
  try {
    const tracks = [];
    await tracksDB.iterate((value, key) => {
      if (value && value.playlistId === playlistId) {
        tracks.push({
          id: key,
          name: value.name,
          title: value.title || value.name,
          artist: value.artist || 'Unknown Artist',
          album: value.album || '',
          size: value.size || 0,
          type: value.type || 'audio/mpeg',
          isVideo: Boolean(value.isVideo),
          coverArt: value.coverArt || null,
          lyrics: value.lyrics || null,
          playlistId: value.playlistId,
          order: typeof value.order === 'number' ? value.order : 0,
          createdAt: value.createdAt || 0,
          blob: value.blob
        });
      }
    });

    tracks.sort((a, b) => a.order - b.order);
    return tracks;
  } catch (err) {
    console.error('Failed to get tracks for playlist:', err);
    return [];
  }
}

/**
 * Saves a new track to IndexedDB.
 */
export async function saveTrack(trackRecord) {
  try {
    await tracksDB.setItem(trackRecord.id, trackRecord);
    return true;
  } catch (err) {
    console.error('Error saving track:', err);
    throw err;
  }
}

/**
 * Updates a track's metadata (e.g. lyrics).
 */
export async function updateTrack(trackId, updates) {
  try {
    const existing = await tracksDB.getItem(trackId);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    await tracksDB.setItem(trackId, updated);
    return updated;
  } catch (err) {
    console.error('Error updating track:', err);
    throw err;
  }
}

/**
 * Removes a track from IndexedDB.
 */
export async function deleteTrackFromDB(trackId) {
  try {
    await tracksDB.removeItem(trackId);
  } catch (err) {
    console.error('Error deleting track:', err);
    throw err;
  }
}

/**
 * Updates order indices for an entire reordered list of tracks in a playlist.
 */
export async function saveTracksOrder(tracks) {
  try {
    const updatePromises = tracks.map((track, idx) => {
      return tracksDB.getItem(track.id).then((stored) => {
        if (stored) {
          stored.order = idx;
          return tracksDB.setItem(track.id, stored);
        }
      });
    });
    await Promise.all(updatePromises);
  } catch (err) {
    console.error('Error saving track order:', err);
  }
}

/**
 * Creates a new playlist.
 */
export async function createPlaylistInDB(name) {
  const id = `playlist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const playlist = {
    id,
    name: name.trim() || 'New Playlist',
    createdAt: Date.now()
  };
  await playlistsDB.setItem(id, playlist);
  return playlist;
}

/**
 * Deletes a playlist and all its tracks.
 */
export async function deletePlaylistFromDB(playlistId) {
  if (playlistId === DEFAULT_PLAYLIST_ID) {
    throw new Error('Cannot delete default playlist');
  }

  // Delete all tracks belonging to this playlist
  const keysToDelete = [];
  await tracksDB.iterate((value, key) => {
    if (value && value.playlistId === playlistId) {
      keysToDelete.push(key);
    }
  });

  for (const key of keysToDelete) {
    await tracksDB.removeItem(key);
  }

  await playlistsDB.removeItem(playlistId);
}

/**
 * Clears all tracks for a specific playlist.
 */
export async function clearPlaylistTracksFromDB(playlistId) {
  const keysToDelete = [];
  await tracksDB.iterate((value, key) => {
    if (value && value.playlistId === playlistId) {
      keysToDelete.push(key);
    }
  });

  for (const key of keysToDelete) {
    await tracksDB.removeItem(key);
  }
}

/**
 * Settings helpers
 */
export async function getSetting(key, defaultValue = null) {
  try {
    const val = await settingsDB.getItem(key);
    return val !== null && val !== undefined ? val : defaultValue;
  } catch {
    return defaultValue;
  }
}

export async function setSetting(key, value) {
  try {
    await settingsDB.setItem(key, value);
  } catch (err) {
    console.warn(`Failed to save setting ${key}:`, err);
  }
}


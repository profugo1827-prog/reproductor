import { openDB } from 'idb';

const DB_NAME = 'reproductor-db';
const DB_VERSION = 1;

let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('songs', { keyPath: 'id' });
        db.createObjectStore('playlists', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

function makeId() {
  return crypto.randomUUID();
}

// --- Songs ---

export async function addSong({ title, artist, album, duration, blob, coverBlob }) {
  return putSong({
    id: makeId(),
    title,
    artist,
    album,
    duration,
    blob,
    coverBlob: coverBlob || null,
    addedAt: Date.now(),
  });
}

export async function putSong(song) {
  const db = await getDB();
  await db.put('songs', song);
  return song;
}

export async function deleteSongs(ids) {
  const db = await getDB();
  const tx = db.transaction(['songs', 'playlists'], 'readwrite');
  await Promise.all(ids.map((id) => tx.objectStore('songs').delete(id)));
  const playlists = await tx.objectStore('playlists').getAll();
  await Promise.all(
    playlists.map((playlist) => {
      const filtered = playlist.songIds.filter((id) => !ids.includes(id));
      if (filtered.length === playlist.songIds.length) return null;
      playlist.songIds = filtered;
      return tx.objectStore('playlists').put(playlist);
    })
  );
  await tx.done;
}

export async function getAllSongs() {
  const db = await getDB();
  const songs = await db.getAll('songs');
  return songs.sort((a, b) => b.addedAt - a.addedAt);
}

export async function getSong(id) {
  const db = await getDB();
  return db.get('songs', id);
}

export async function deleteSong(id) {
  const db = await getDB();
  const tx = db.transaction(['songs', 'playlists'], 'readwrite');
  await tx.objectStore('songs').delete(id);
  const playlists = await tx.objectStore('playlists').getAll();
  await Promise.all(
    playlists.map((playlist) => {
      if (!playlist.songIds.includes(id)) return null;
      playlist.songIds = playlist.songIds.filter((songId) => songId !== id);
      return tx.objectStore('playlists').put(playlist);
    })
  );
  await tx.done;
}

// --- Playlists ---

export async function createPlaylist(name) {
  return putPlaylist({
    id: makeId(),
    name,
    songIds: [],
    createdAt: Date.now(),
  });
}

export async function putPlaylist(playlist) {
  const db = await getDB();
  await db.put('playlists', playlist);
  return playlist;
}

export async function getAllPlaylists() {
  const db = await getDB();
  const playlists = await db.getAll('playlists');
  return playlists.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getPlaylist(id) {
  const db = await getDB();
  return db.get('playlists', id);
}

export async function renamePlaylist(id, name) {
  const db = await getDB();
  const playlist = await db.get('playlists', id);
  if (!playlist) return;
  playlist.name = name;
  await db.put('playlists', playlist);
}

export async function deletePlaylist(id) {
  const db = await getDB();
  await db.delete('playlists', id);
}

export async function setPlaylistCover(id, coverBlob) {
  const db = await getDB();
  const playlist = await db.get('playlists', id);
  if (!playlist) return;
  playlist.coverBlob = coverBlob || null;
  await db.put('playlists', playlist);
}

export async function addSongToPlaylist(playlistId, songId) {
  return addSongsToPlaylist(playlistId, [songId]);
}

export async function addSongsToPlaylist(playlistId, songIds) {
  const db = await getDB();
  const playlist = await db.get('playlists', playlistId);
  if (!playlist) return;
  for (const songId of songIds) {
    if (!playlist.songIds.includes(songId)) playlist.songIds.push(songId);
  }
  await db.put('playlists', playlist);
}

export async function reorderPlaylist(playlistId, songIds) {
  const db = await getDB();
  const playlist = await db.get('playlists', playlistId);
  if (!playlist) return;
  playlist.songIds = songIds;
  await db.put('playlists', playlist);
}

export async function removeSongFromPlaylist(playlistId, songId) {
  const db = await getDB();
  const playlist = await db.get('playlists', playlistId);
  if (!playlist) return;
  playlist.songIds = playlist.songIds.filter((id) => id !== songId);
  await db.put('playlists', playlist);
}


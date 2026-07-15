import { buildZip, parseZip } from './zip';
import { getAllSongs, getAllPlaylists, putSong, putPlaylist } from '../db/db';

const MIME_EXT = {
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/flac': 'flac',
  'audio/x-flac': 'flac',
  'audio/aac': 'aac',
  'audio/webm': 'weba',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function extFor(mimeType, fallback) {
  return MIME_EXT[mimeType] || fallback;
}

export async function exportBackup(onProgress) {
  const songs = await getAllSongs();
  const playlists = await getAllPlaylists();

  const manifestSongs = [];
  const entries = [];

  for (const song of songs) {
    const audioMime = song.blob.type || 'application/octet-stream';
    const audioName = `songs/${song.id}.${extFor(audioMime, 'bin')}`;
    entries.push({ name: audioName, blob: song.blob, when: new Date(song.addedAt) });

    let coverName = null;
    let coverMime = null;
    if (song.coverBlob) {
      coverMime = song.coverBlob.type || 'image/jpeg';
      coverName = `covers/${song.id}.${extFor(coverMime, 'jpg')}`;
      entries.push({ name: coverName, blob: song.coverBlob, when: new Date(song.addedAt) });
    }

    manifestSongs.push({
      id: song.id,
      title: song.title,
      artist: song.artist,
      album: song.album,
      duration: song.duration,
      addedAt: song.addedAt,
      audioMime,
      audioFile: audioName,
      coverMime,
      coverFile: coverName,
    });
  }

  const manifest = {
    version: 1,
    exportedAt: Date.now(),
    songs: manifestSongs,
    playlists: playlists.map((p) => ({ id: p.id, name: p.name, songIds: p.songIds, createdAt: p.createdAt })),
  };

  const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
  entries.unshift({ name: 'manifest.json', blob: manifestBlob, when: new Date() });

  return buildZip(entries, onProgress);
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importBackup(file, onProgress) {
  const buffer = await file.arrayBuffer();
  const entries = parseZip(buffer);
  const byName = new Map(entries.map((e) => [e.name, e.data]));

  const manifestBytes = byName.get('manifest.json');
  if (!manifestBytes) throw new Error('El archivo no contiene un manifest.json válido.');
  const manifest = JSON.parse(new TextDecoder().decode(manifestBytes));

  const total = manifest.songs.length + manifest.playlists.length;
  let done = 0;

  for (const s of manifest.songs) {
    const audioBytes = byName.get(s.audioFile);
    if (audioBytes) {
      const blob = new Blob([audioBytes], { type: s.audioMime });
      const coverBytes = s.coverFile && byName.get(s.coverFile);
      const coverBlob = coverBytes ? new Blob([coverBytes], { type: s.coverMime }) : null;

      await putSong({
        id: s.id,
        title: s.title,
        artist: s.artist,
        album: s.album,
        duration: s.duration,
        addedAt: s.addedAt,
        blob,
        coverBlob,
      });
    }
    done++;
    onProgress?.(done, total);
  }

  for (const p of manifest.playlists) {
    await putPlaylist({ id: p.id, name: p.name, songIds: p.songIds, createdAt: p.createdAt });
    done++;
    onProgress?.(done, total);
  }

  return { songCount: manifest.songs.length, playlistCount: manifest.playlists.length };
}

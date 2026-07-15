import { useEffect, useState } from 'react';
import { getPlaylist, getSong, removeSongFromPlaylist, moveSongInPlaylist } from '../../db/db';
import { usePlayer } from '../../hooks/usePlayer';
import { formatDuration } from '../../utils/format';
import { PlaylistCover } from './PlaylistCover';

export function PlaylistDetail({ playlistId, onBack }) {
  const [playlist, setPlaylist] = useState(null);
  const [songs, setSongs] = useState([]);
  const { playQueue, currentSong } = usePlayer();

  async function refresh() {
    const p = await getPlaylist(playlistId);
    if (!p) {
      onBack();
      return;
    }
    setPlaylist(p);
    const resolved = await Promise.all(p.songIds.map((id) => getSong(id)));
    setSongs(resolved.filter(Boolean));
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlistId]);

  async function handleRemove(songId) {
    await removeSongFromPlaylist(playlistId, songId);
    refresh();
  }

  async function handleMove(songId, direction) {
    await moveSongInPlaylist(playlistId, songId, direction);
    refresh();
  }

  if (!playlist) return null;

  return (
    <div className="view">
      <button type="button" className="back-btn" onClick={onBack}>
        ← Volver
      </button>
      <PlaylistCover songIds={playlist.songIds} size="lg" />
      <h1>{playlist.name}</h1>
      {songs.length === 0 && (
        <p className="muted">Esta playlist está vacía. Agregá canciones desde la Biblioteca.</p>
      )}
      <ul className="song-list">
        {songs.map((song, index) => (
          <li
            key={song.id}
            className={`song-row${currentSong?.id === song.id ? ' active' : ''}`}
          >
            <button type="button" className="song-main" onClick={() => playQueue(songs, index)}>
              <span className="song-title">{song.title}</span>
              <span className="song-artist">{song.artist}</span>
            </button>
            <span className="song-duration">{formatDuration(song.duration)}</span>
            <div className="reorder-btns">
              <button type="button" disabled={index === 0} onClick={() => handleMove(song.id, -1)}>
                ↑
              </button>
              <button
                type="button"
                disabled={index === songs.length - 1}
                onClick={() => handleMove(song.id, 1)}
              >
                ↓
              </button>
            </div>
            <button type="button" className="icon-btn danger" onClick={() => handleRemove(song.id)}>
              🗑
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

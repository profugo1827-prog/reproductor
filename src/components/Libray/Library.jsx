import { useEffect, useState } from 'react';
import { getAllSongs, deleteSong } from '../../db/db';
import { usePlayer } from '../../hooks/usePlayer';
import { formatDuration } from '../../utils/format';
import { UploadButton } from './UploadButton';
import { AddToPlaylistMenu } from '../Playlists/AddToPlaylistMenu';

export function Library() {
  const [songs, setSongs] = useState([]);
  const [query, setQuery] = useState('');
  const [menuSongId, setMenuSongId] = useState(null);
  const { playQueue, currentSong } = usePlayer();

  async function refresh() {
    setSongs(await getAllSongs());
  }

  useEffect(() => {
    refresh();
  }, []);

  const filtered = songs.filter((s) => {
    const q = query.toLowerCase();
    return s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q);
  });

  async function handleDelete(id) {
    await deleteSong(id);
    setMenuSongId(null);
    refresh();
  }

  return (
    <div className="view">
      <h1>Biblioteca</h1>
      <UploadButton onUploaded={refresh} />
      <input
        className="search"
        type="search"
        placeholder="Buscar canciones..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {filtered.length === 0 && <p className="muted">Todavía no importaste canciones.</p>}
      <ul className="song-list">
        {filtered.map((song, index) => (
          <li
            key={song.id}
            className={`song-row${currentSong?.id === song.id ? ' active' : ''}`}
          >
            <button
              type="button"
              className="song-main"
              onClick={() => playQueue(filtered, index)}
            >
              <span className="song-title">{song.title}</span>
              <span className="song-artist">{song.artist}</span>
            </button>
            <span className="song-duration">{formatDuration(song.duration)}</span>
            <div className="song-menu-wrapper">
              <button
                type="button"
                className="song-menu-btn"
                onClick={() => setMenuSongId(menuSongId === song.id ? null : song.id)}
              >
                ⋮
              </button>
              {menuSongId === song.id && (
                <div className="popover-anchor">
                  <AddToPlaylistMenu songId={song.id} onClose={() => setMenuSongId(null)} />
                  <button type="button" className="danger" onClick={() => handleDelete(song.id)}>
                    Eliminar canción
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

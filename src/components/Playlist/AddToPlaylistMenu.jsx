import { useState } from 'react';
import { getAllPlaylists, createPlaylist, addSongToPlaylist } from '../../db/db';

export function AddToPlaylistMenu({ songId, onClose }) {
  const [playlists, setPlaylists] = useState(null);
  const [newName, setNewName] = useState('');

  async function load() {
    setPlaylists(await getAllPlaylists());
  }

  if (playlists === null) {
    load();
    return null;
  }

  async function handleAdd(playlistId) {
    await addSongToPlaylist(playlistId, songId);
    onClose();
  }

  async function handleCreateAndAdd() {
    const name = newName.trim();
    if (!name) return;
    const playlist = await createPlaylist(name);
    await addSongToPlaylist(playlist.id, songId);
    onClose();
  }

  return (
    <div className="popover" onClick={(e) => e.stopPropagation()}>
      <p className="popover-title">Agregar a playlist</p>
      {playlists.length === 0 && <p className="muted">No tenés playlists todavía.</p>}
      <ul>
        {playlists.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => handleAdd(p.id)}>
              {p.name}
            </button>
          </li>
        ))}
      </ul>
      <div className="popover-new">
        <input
          type="text"
          placeholder="Nueva playlist"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button type="button" onClick={handleCreateAndAdd}>
          Crear
        </button>
      </div>
      <button type="button" className="popover-close" onClick={onClose}>
        Cerrar
      </button>
    </div>
  );
}

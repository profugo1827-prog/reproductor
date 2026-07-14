import { useEffect, useState } from 'react';
import { getAllPlaylists, createPlaylist, renamePlaylist, deletePlaylist } from '../../db/db';

export function Playlists({ onOpenPlaylist }) {
  const [playlists, setPlaylists] = useState([]);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  async function refresh() {
    setPlaylists(await getAllPlaylists());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    await createPlaylist(name);
    setNewName('');
    refresh();
  }

  async function handleRename(id) {
    const name = editName.trim();
    if (name) {
      await renamePlaylist(id, name);
    }
    setEditingId(null);
    refresh();
  }

  async function handleDelete(id) {
    await deletePlaylist(id);
    refresh();
  }

  return (
    <div className="view">
      <h1>Playlists</h1>
      <div className="new-playlist">
        <input
          type="text"
          placeholder="Nombre de la nueva playlist"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
        <button type="button" onClick={handleCreate}>
          Crear
        </button>
      </div>
      {playlists.length === 0 && <p className="muted">Todavía no creaste ninguna playlist.</p>}
      <ul className="playlist-list">
        {playlists.map((p) => (
          <li key={p.id} className="playlist-row">
            {editingId === p.id ? (
              <input
                type="text"
                value={editName}
                autoFocus
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => handleRename(p.id)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename(p.id)}
              />
            ) : (
              <button type="button" className="playlist-main" onClick={() => onOpenPlaylist(p.id)}>
                <span className="playlist-name">{p.name}</span>
                <span className="playlist-count">{p.songIds.length} canciones</span>
              </button>
            )}
            <button
              type="button"
              className="icon-btn"
              onClick={() => {
                setEditingId(p.id);
                setEditName(p.name);
              }}
            >
              ✎
            </button>
            <button type="button" className="icon-btn danger" onClick={() => handleDelete(p.id)}>
              🗑
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

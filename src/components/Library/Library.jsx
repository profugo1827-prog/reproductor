import { useEffect, useState } from 'react';
import { getAllSongs, deleteSong, deleteSongs } from '../../db/db';
import { usePlayer } from '../../hooks/usePlayer';
import { formatDuration } from '../../utils/format';
import { UploadButton } from './UploadButton';
import { AddToPlaylistMenu } from '../Playlists/AddToPlaylistMenu';

const SORT_OPTIONS = [
  { value: 'recientes', label: 'Recientes' },
  { value: 'titulo', label: 'Título' },
  { value: 'artista', label: 'Artista' },
  { value: 'album', label: 'Álbum' },
];

function sortSongs(songs, sortKey) {
  const sorted = [...songs];
  if (sortKey === 'titulo') {
    sorted.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortKey === 'artista') {
    sorted.sort((a, b) => a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title));
  } else if (sortKey === 'album') {
    sorted.sort((a, b) => (a.album || '').localeCompare(b.album || '') || a.title.localeCompare(b.title));
  } else {
    sorted.sort((a, b) => b.addedAt - a.addedAt);
  }
  return sorted;
}

function groupField(sortKey) {
  if (sortKey === 'artista') return 'artist';
  if (sortKey === 'album') return 'album';
  return null;
}

function buildItems(songs, sortKey) {
  const field = groupField(sortKey);
  if (!field) return songs.map((song, index) => ({ type: 'song', song, index }));
  const items = [];
  let lastGroup = null;
  songs.forEach((song, index) => {
    const value = song[field] || 'Desconocido';
    if (value !== lastGroup) {
      items.push({ type: 'header', label: value, key: `h-${index}` });
      lastGroup = value;
    }
    items.push({ type: 'song', song, index });
  });
  return items;
}

export function Library() {
  const [songs, setSongs] = useState([]);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState('recientes');
  const [menuSongId, setMenuSongId] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const { playQueue, currentSong } = usePlayer();

  async function refresh() {
    setSongs(await getAllSongs());
  }

  useEffect(() => {
    refresh();
  }, []);

  const searched = songs.filter((s) => {
    const q = query.toLowerCase();
    return s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q);
  });
  const sorted = sortSongs(searched, sortKey);
  const items = buildItems(sorted, sortKey);

  async function handleDelete(id) {
    await deleteSong(id);
    setMenuSongId(null);
    refresh();
  }

  function toggleSelectionMode() {
    setSelectionMode((v) => !v);
    setSelectedIds(new Set());
    setBulkMenuOpen(false);
  }

  function toggleSelected(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (!confirm(`¿Eliminar ${selectedIds.size} canciones de la biblioteca?`)) return;
    await deleteSongs([...selectedIds]);
    setSelectedIds(new Set());
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

      <div className="library-toolbar">
        <select className="sort-select" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              Ordenar: {opt.label}
            </option>
          ))}
        </select>
        <button type="button" className="select-toggle" onClick={toggleSelectionMode}>
          {selectionMode ? 'Cancelar' : 'Seleccionar'}
        </button>
      </div>

      {selectionMode && (
        <div className="bulk-bar">
          <span className="muted">{selectedIds.size} seleccionadas</span>
          <div className="bulk-actions">
            <button type="button" onClick={() => setBulkMenuOpen((v) => !v)} disabled={selectedIds.size === 0}>
              Agregar a playlist
            </button>
            <button type="button" className="danger" onClick={handleBulkDelete} disabled={selectedIds.size === 0}>
              Eliminar
            </button>
          </div>
          {bulkMenuOpen && (
            <div className="bulk-popover">
              <AddToPlaylistMenu
                songIds={[...selectedIds]}
                onClose={() => {
                  setBulkMenuOpen(false);
                  setSelectionMode(false);
                  setSelectedIds(new Set());
                }}
              />
            </div>
          )}
        </div>
      )}

      {items.length === 0 && <p className="muted">Todavía no importaste canciones.</p>}
      <ul className="song-list">
        {items.map((item) =>
          item.type === 'header' ? (
            <li key={item.key} className="song-group-header">
              {item.label}
            </li>
          ) : (
            <li
              key={item.song.id}
              className={`song-row${currentSong?.id === item.song.id ? ' active' : ''}`}
            >
              {selectionMode && (
                <input
                  type="checkbox"
                  className="song-checkbox"
                  checked={selectedIds.has(item.song.id)}
                  onChange={() => toggleSelected(item.song.id)}
                />
              )}
              <button
                type="button"
                className="song-main"
                onClick={() => (selectionMode ? toggleSelected(item.song.id) : playQueue(sorted, item.index))}
              >
                <span className="song-title">{item.song.title}</span>
                <span className="song-artist">{item.song.artist}</span>
              </button>
              <span className="song-duration">{formatDuration(item.song.duration)}</span>
              {!selectionMode && (
                <div className="song-menu-wrapper">
                  <button
                    type="button"
                    className="song-menu-btn"
                    onClick={() => setMenuSongId(menuSongId === item.song.id ? null : item.song.id)}
                  >
                    ⋮
                  </button>
                  {menuSongId === item.song.id && (
                    <div className="popover-anchor">
                      <AddToPlaylistMenu songId={item.song.id} onClose={() => setMenuSongId(null)} />
                      <button type="button" className="danger" onClick={() => handleDelete(item.song.id)}>
                        Eliminar canción
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
          )
        )}
      </ul>
    </div>
  );
}

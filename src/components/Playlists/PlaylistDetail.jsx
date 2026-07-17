import { useEffect, useRef, useState } from 'react';
import { getPlaylist, getSong, removeSongFromPlaylist, reorderPlaylist, setPlaylistCover } from '../../db/db';
import { usePlayer } from '../../hooks/usePlayer';
import { formatDuration } from '../../utils/format';
import { PlaylistCover } from './PlaylistCover';

export function PlaylistDetail({ playlistId, onBack }) {
  const [playlist, setPlaylist] = useState(null);
  const [songs, setSongs] = useState([]);
  const [dragId, setDragId] = useState(null);
  const { playQueue, currentSong } = usePlayer();

  const rowRefs = useRef(new Map());
  const dragState = useRef(null);
  const coverInputRef = useRef(null);

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

  async function handleCoverChange(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    await setPlaylistCover(playlistId, file);
    refresh();
  }

  async function handleRemoveCover() {
    await setPlaylistCover(playlistId, null);
    refresh();
  }

  function rowCenter(songId) {
    const el = rowRefs.current.get(songId);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return rect.top + rect.height / 2;
  }

  function handleDragStart(e, songId) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = { order: songs.map((s) => s.id), id: songId };
    setDragId(songId);
  }

  function handleDragMove(e) {
    const state = dragState.current;
    if (!state) return;
    const currentIndex = state.order.indexOf(state.id);
    let targetIndex = currentIndex;
    state.order.forEach((id, i) => {
      if (id === state.id) return;
      const center = rowCenter(id);
      if (center == null) return;
      if (i < currentIndex && e.clientY < center) targetIndex = Math.min(targetIndex, i);
      if (i > currentIndex && e.clientY > center) targetIndex = Math.max(targetIndex, i);
    });
    if (targetIndex !== currentIndex) {
      const next = [...state.order];
      const [moved] = next.splice(currentIndex, 1);
      next.splice(targetIndex, 0, moved);
      state.order = next;
      setSongs((prev) => next.map((id) => prev.find((s) => s.id === id)).filter(Boolean));
    }
  }

  function handleDragEnd() {
    const state = dragState.current;
    dragState.current = null;
    setDragId(null);
    if (state) reorderPlaylist(playlistId, state.order);
  }

  if (!playlist) return null;

  return (
    <div className="view">
      <button type="button" className="back-btn" onClick={onBack}>
        ← Volver
      </button>
      <div className="playlist-cover-edit">
        <button type="button" className="playlist-cover-btn" onClick={() => coverInputRef.current.click()}>
          <PlaylistCover songIds={playlist.songIds} coverBlob={playlist.coverBlob} size="lg" />
          <span className="playlist-cover-overlay">Cambiar portada</span>
        </button>
        <input ref={coverInputRef} type="file" accept="image/*" hidden onChange={handleCoverChange} />
        {playlist.coverBlob && (
          <button type="button" className="playlist-cover-reset" onClick={handleRemoveCover}>
            Quitar portada personalizada
          </button>
        )}
      </div>
      <h1>{playlist.name}</h1>
      {songs.length === 0 && (
        <p className="muted">Esta playlist está vacía. Agregá canciones desde la Biblioteca.</p>
      )}
      <ul className="song-list">
        {songs.map((song, index) => (
          <li
            key={song.id}
            ref={(el) => {
              if (el) rowRefs.current.set(song.id, el);
              else rowRefs.current.delete(song.id);
            }}
            className={`song-row${currentSong?.id === song.id ? ' active' : ''}${
              dragId === song.id ? ' dragging' : ''
            }`}
          >
            <button
              type="button"
              className="drag-handle"
              aria-label="Reordenar"
              onPointerDown={(e) => handleDragStart(e, song.id)}
              onPointerMove={handleDragMove}
              onPointerUp={handleDragEnd}
              onPointerCancel={handleDragEnd}
            >
              ⠿
            </button>
            <button type="button" className="song-main" onClick={() => playQueue(songs, index)}>
              <span className="song-title">{song.title}</span>
              <span className="song-artist">{song.artist}</span>
            </button>
            <span className="song-duration">{formatDuration(song.duration)}</span>
            <button type="button" className="icon-btn danger" onClick={() => handleRemove(song.id)}>
              🗑
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

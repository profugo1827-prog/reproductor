import { useEffect, useState } from 'react';
import { PlayerProvider } from './context/PlayerContext';
import { Library } from './components/Library/Library';
import { Playlists } from './components/Playlists/Playlists';
import { PlaylistDetail } from './components/Playlists/PlaylistDetail';
import { Settings } from './components/Settings/Settings';
import { Player } from './components/Player/Player';
import './App.css';

export default function App() {
  const [tab, setTab] = useState('library'); // 'library' | 'playlists'
  const [openPlaylistId, setOpenPlaylistId] = useState(null);

  useEffect(() => {
    navigator.storage?.persist?.();
  }, []);

  return (
    <PlayerProvider>
      <div className="app">
        <main className="app-content">
          {openPlaylistId ? (
            <PlaylistDetail playlistId={openPlaylistId} onBack={() => setOpenPlaylistId(null)} />
          ) : tab === 'library' ? (
            <Library />
          ) : tab === 'playlists' ? (
            <Playlists onOpenPlaylist={setOpenPlaylistId} />
          ) : (
            <Settings />
          )}
        </main>

        <Player />

        {!openPlaylistId && (
          <nav className="bottom-nav">
            <button
              type="button"
              className={tab === 'library' ? 'active' : ''}
              onClick={() => setTab('library')}
            >
              Biblioteca
            </button>
            <button
              type="button"
              className={tab === 'playlists' ? 'active' : ''}
              onClick={() => setTab('playlists')}
            >
              Playlists
            </button>
            <button
              type="button"
              className={tab === 'ajustes' ? 'active' : ''}
              onClick={() => setTab('ajustes')}
            >
              Ajustes
            </button>
          </nav>
        )}
      </div>
    </PlayerProvider>
  );
}

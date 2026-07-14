import { usePlayer } from '../../hooks/usePlayer';
import { useObjectUrl } from '../../hooks/useObjectUrl';

export function MiniPlayer({ onExpand }) {
  const { currentSong, isPlaying, togglePlay, next, prev } = usePlayer();
  const coverUrl = useObjectUrl(currentSong?.coverBlob);

  return (
    <div className="mini-player" onClick={onExpand}>
      <div className="mini-player-cover">
        {coverUrl ? <img src={coverUrl} alt="" /> : <div className="cover-placeholder" />}
      </div>
      <div className="mini-player-info">
        <span className="song-title">{currentSong.title}</span>
        <span className="song-artist">{currentSong.artist}</span>
      </div>
      <div className="mini-player-controls" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={prev} aria-label="Anterior">
          ⏮
        </button>
        <button type="button" onClick={togglePlay} aria-label={isPlaying ? 'Pausar' : 'Reproducir'}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button type="button" onClick={next} aria-label="Siguiente">
          ⏭
        </button>
      </div>
    </div>
  );
}

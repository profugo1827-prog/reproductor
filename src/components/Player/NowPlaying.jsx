import { usePlayer } from '../../hooks/usePlayer';
import { useObjectUrl } from '../../hooks/useObjectUrl';
import { formatDuration } from '../../utils/format';

const REPEAT_LABEL = { off: '🔁', all: '🔁', one: '🔂' };

export function NowPlaying({ onCollapse }) {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    shuffle,
    repeat,
    togglePlay,
    next,
    prev,
    seek,
    toggleShuffle,
    cycleRepeat,
  } = usePlayer();
  const coverUrl = useObjectUrl(currentSong?.coverBlob);

  return (
    <div className="now-playing">
      <button type="button" className="collapse-btn" onClick={onCollapse}>
        ⌄
      </button>
      <div className="now-playing-cover">
        {coverUrl ? <img src={coverUrl} alt="" /> : <div className="cover-placeholder large" />}
      </div>
      <h2>{currentSong.title}</h2>
      <p className="song-artist">{currentSong.artist}</p>

      <input
        className="seek-bar"
        type="range"
        min={0}
        max={duration || 0}
        step={1}
        value={Math.min(currentTime, duration || 0)}
        onChange={(e) => seek(Number(e.target.value))}
      />
      <div className="time-row">
        <span>{formatDuration(currentTime)}</span>
        <span>{formatDuration(duration)}</span>
      </div>

      <div className="now-playing-controls">
        <button
          type="button"
          className={shuffle ? 'active' : ''}
          onClick={toggleShuffle}
          aria-label="Aleatorio"
        >
          🔀
        </button>
        <button type="button" onClick={prev} aria-label="Anterior">
          ⏮
        </button>
        <button type="button" className="play-btn" onClick={togglePlay} aria-label={isPlaying ? 'Pausar' : 'Reproducir'}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button type="button" onClick={next} aria-label="Siguiente">
          ⏭
        </button>
        <button
          type="button"
          className={repeat !== 'off' ? 'active' : ''}
          onClick={cycleRepeat}
          aria-label="Repetir"
        >
          {REPEAT_LABEL[repeat]}
          {repeat === 'one' && <sub>1</sub>}
        </button>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { shuffleArray } from '../utils/shuffle';
import { PlayerContext } from './PlayerContextObject';

export function PlayerProvider({ children }) {
  const audioRef = useRef(null);
  if (!audioRef.current) {
    audioRef.current = new Audio();
  }
  const objectUrlRef = useRef(null);

  const [queue, setQueue] = useState([]);
  const [order, setOrder] = useState([]);
  const [positionInOrder, setPositionInOrder] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('off'); // 'off' | 'all' | 'one'

  const currentSong = queue.length && order.length ? queue[order[positionInOrder]] : null;

  // Load the current song into the audio element whenever it changes.
  useEffect(() => {
    const audio = audioRef.current;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (!currentSong) {
      audio.removeAttribute('src');
      return;
    }
    const url = URL.createObjectURL(currentSong.blob);
    objectUrlRef.current = url;
    audio.src = url;
    audio.currentTime = 0;
    setCurrentTime(0);
    if (isPlaying) {
      audio.play().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSong?.id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  function goNext() {
    if (positionInOrder + 1 < order.length) {
      setPositionInOrder(positionInOrder + 1);
      setIsPlaying(true);
    } else if (repeat === 'all' && order.length) {
      setPositionInOrder(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  }

  useEffect(() => {
    const audio = audioRef.current;

    function handleTimeUpdate() {
      setCurrentTime(audio.currentTime);
    }
    function handleEnded() {
      // With a single-song queue, looping back to position 0 is a no-op for
      // React state, so the reload effect never fires; restart directly.
      if (repeat === 'one' || (repeat === 'all' && order.length === 1)) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }
      goNext();
    }

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repeat, positionInOrder, order, queue]);

  function playQueue(songs, startIndex = 0) {
    setQueue(songs);
    let seq = songs.map((_, i) => i);
    if (shuffle) {
      const rest = seq.filter((i) => i !== startIndex);
      seq = [startIndex, ...shuffleArray(rest)];
      setOrder(seq);
      setPositionInOrder(0);
    } else {
      setOrder(seq);
      setPositionInOrder(startIndex);
    }
    setIsPlaying(true);
  }

  function togglePlay() {
    if (!currentSong) return;
    setIsPlaying((p) => !p);
  }

  function next() {
    goNext();
  }

  function prev() {
    const audio = audioRef.current;
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    if (positionInOrder > 0) {
      setPositionInOrder(positionInOrder - 1);
      setIsPlaying(true);
    } else if (repeat === 'all' && order.length) {
      setPositionInOrder(order.length - 1);
      setIsPlaying(true);
    }
  }

  function seek(time) {
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  }

  // Register lock-screen / notification media controls once; a ref keeps the
  // handlers calling the latest closures without re-registering every render.
  const latestRef = useRef({});
  latestRef.current = { setIsPlaying, prev, next, seek, goNext };

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', () => latestRef.current.setIsPlaying(true));
    navigator.mediaSession.setActionHandler('pause', () => latestRef.current.setIsPlaying(false));
    navigator.mediaSession.setActionHandler('previoustrack', () => latestRef.current.prev());
    navigator.mediaSession.setActionHandler('nexttrack', () => latestRef.current.goNext());
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime != null) latestRef.current.seek(details.seekTime);
    });
    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('seekto', null);
    };
  }, []);

  // Lock-screen / notification metadata (title, artist, artwork).
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (!currentSong) {
      navigator.mediaSession.metadata = null;
      return;
    }
    let artworkUrl = null;
    const artwork = [];
    if (currentSong.coverBlob) {
      artworkUrl = URL.createObjectURL(currentSong.coverBlob);
      artwork.push({ src: artworkUrl, sizes: '512x512', type: currentSong.coverBlob.type });
    }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title,
      artist: currentSong.artist,
      album: currentSong.album || '',
      artwork,
    });
    return () => {
      if (artworkUrl) URL.revokeObjectURL(artworkUrl);
    };
  }, [currentSong?.id]);

  // Keep the OS-level playback state (and lock-screen play/pause icon) in sync.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  // Report progress so the lock-screen widget can show/scrub a position bar.
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentSong?.duration) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: currentSong.duration,
        playbackRate: 1,
        position: Math.min(currentTime, currentSong.duration),
      });
    } catch {
      // Some browsers throw if called before metadata is set; safe to ignore.
    }
  }, [currentTime, currentSong?.duration]);

  function toggleShuffle() {
    setShuffle((prev) => {
      const nextShuffle = !prev;
      if (!order.length) return nextShuffle;
      if (nextShuffle) {
        const currentQueueIndex = order[positionInOrder];
        const rest = order.filter((_, i) => i !== positionInOrder);
        setOrder([currentQueueIndex, ...shuffleArray(rest)]);
        setPositionInOrder(0);
      } else {
        const currentQueueIndex = order[positionInOrder];
        setOrder(queue.map((_, i) => i));
        setPositionInOrder(currentQueueIndex);
      }
      return nextShuffle;
    });
  }

  function cycleRepeat() {
    setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'));
  }

  const value = useMemo(
    () => ({
      currentSong,
      isPlaying,
      currentTime,
      duration: currentSong?.duration || 0,
      shuffle,
      repeat,
      queue,
      playQueue,
      togglePlay,
      next,
      prev,
      seek,
      toggleShuffle,
      cycleRepeat,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentSong, isPlaying, currentTime, shuffle, repeat, queue, order, positionInOrder]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

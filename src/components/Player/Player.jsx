import { useState } from 'react';
import { usePlayer } from '../../hooks/usePlayer';
import { MiniPlayer } from './MiniPlayer';
import { NowPlaying } from './NowPlaying';

export function Player() {
  const { currentSong } = usePlayer();
  const [expanded, setExpanded] = useState(false);

  if (!currentSong) return null;

  return expanded ? (
    <NowPlaying onCollapse={() => setExpanded(false)} />
  ) : (
    <MiniPlayer onExpand={() => setExpanded(true)} />
  );
}

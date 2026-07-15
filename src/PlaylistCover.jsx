import { useEffect, useState } from 'react';
import { getSong } from '../../db/db';

export function PlaylistCover({ songIds, size = 'sm' }) {
  const [urls, setUrls] = useState([]);
  const key = songIds.slice(0, 4).join(',');

  useEffect(() => {
    let cancelled = false;
    let objectUrls = [];

    async function load() {
      const ids = key ? key.split(',') : [];
      const songs = await Promise.all(ids.map(getSong));
      const covers = songs.filter((s) => s?.coverBlob).map((s) => s.coverBlob);
      if (cancelled) return;
      objectUrls = covers.map((blob) => URL.createObjectURL(blob));
      setUrls(objectUrls);
    }
    load();

    return () => {
      cancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const className = `playlist-cover playlist-cover-${size}`;

  if (urls.length === 0) {
    return (
      <div className={className}>
        <div className="cover-placeholder" />
      </div>
    );
  }

  if (urls.length === 1) {
    return (
      <div className={className}>
        <img src={urls[0]} alt="" />
      </div>
    );
  }

  const tiles = [0, 1, 2, 3].map((i) => urls[i % urls.length]);
  return (
    <div className={`${className} playlist-cover-grid`}>
      {tiles.map((url, i) => (
        <img key={i} src={url} alt="" />
      ))}
    </div>
  );
}

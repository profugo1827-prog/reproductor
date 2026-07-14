import { useRef, useState } from 'react';
import { extractMetadata } from '../../utils/metadata';
import { addSong } from '../../db/db';

export function UploadButton({ onUploaded }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(null); // { done, total }

  async function importFiles(files) {
    const audioFiles = Array.from(files).filter((f) => f.type.startsWith('audio/'));
    if (!audioFiles.length) return;
    setProgress({ done: 0, total: audioFiles.length });
    for (let i = 0; i < audioFiles.length; i++) {
      const file = audioFiles[i];
      const meta = await extractMetadata(file);
      await addSong({ ...meta, blob: file });
      setProgress({ done: i + 1, total: audioFiles.length });
    }
    setProgress(null);
    onUploaded?.();
  }

  return (
    <div
      className={`upload-zone${isDragging ? ' dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        importFiles(e.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        multiple
        hidden
        onChange={(e) => {
          importFiles(e.target.files);
          e.target.value = '';
        }}
      />
      {progress ? (
        <span>Importando {progress.done}/{progress.total}…</span>
      ) : (
        <button type="button" onClick={() => inputRef.current.click()}>
          + Agregar canciones
        </button>
      )}
    </div>
  );
}

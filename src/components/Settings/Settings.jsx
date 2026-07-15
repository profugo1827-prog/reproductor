import { useEffect, useRef, useState } from 'react';
import { getStorageEstimate, formatBytes } from '../../utils/storage';
import { exportBackup, importBackup, downloadBlob } from '../../utils/backup';

export function Settings() {
  const [estimate, setEstimate] = useState(null);
  const [exportProgress, setExportProgress] = useState(null);
  const [importProgress, setImportProgress] = useState(null);
  const [message, setMessage] = useState(null);
  const fileInputRef = useRef(null);

  async function refreshEstimate() {
    setEstimate(await getStorageEstimate());
  }

  useEffect(() => {
    refreshEstimate();
  }, []);

  async function handleExport() {
    setMessage(null);
    setExportProgress({ done: 0, total: 1 });
    try {
      const blob = await exportBackup((done, total) => setExportProgress({ done, total }));
      const date = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `reproductor-backup-${date}.zip`);
      setMessage({ type: 'ok', text: 'Backup descargado correctamente.' });
    } catch (err) {
      setMessage({ type: 'error', text: `Error al exportar: ${err.message}` });
    } finally {
      setExportProgress(null);
    }
  }

  async function handleImportFile(file) {
    if (!file) return;
    setMessage(null);
    setImportProgress({ done: 0, total: 1 });
    try {
      const result = await importBackup(file, (done, total) => setImportProgress({ done, total }));
      setMessage({
        type: 'ok',
        text: `Importación completa: ${result.songCount} canciones, ${result.playlistCount} playlists. Recargá la app para verlas.`,
      });
      refreshEstimate();
    } catch (err) {
      setMessage({ type: 'error', text: `Error al importar: ${err.message}` });
    } finally {
      setImportProgress(null);
    }
  }

  const usedRatio = estimate?.quota ? estimate.usage / estimate.quota : null;

  return (
    <div className="view">
      <h1>Ajustes</h1>

      <section className="settings-section">
        <h2>Almacenamiento</h2>
        {estimate ? (
          <>
            <div className="storage-bar">
              <div className="storage-bar-fill" style={{ width: `${Math.min(100, (usedRatio || 0) * 100)}%` }} />
            </div>
            <p className="muted">
              {formatBytes(estimate.usage)} usados de {formatBytes(estimate.quota)} disponibles
            </p>
          </>
        ) : (
          <p className="muted">No se pudo obtener información de almacenamiento.</p>
        )}
      </section>

      <section className="settings-section">
        <h2>Backup</h2>
        <p className="muted">
          Exportá toda tu biblioteca y playlists a un archivo .zip para guardarlo o pasarlo a otro dispositivo.
        </p>
        <div className="settings-actions">
          <button type="button" onClick={handleExport} disabled={!!exportProgress}>
            {exportProgress ? `Exportando ${exportProgress.done}/${exportProgress.total}…` : 'Exportar backup'}
          </button>
          <button type="button" onClick={() => fileInputRef.current.click()} disabled={!!importProgress}>
            {importProgress ? `Importando ${importProgress.done}/${importProgress.total}…` : 'Importar backup'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            hidden
            onChange={(e) => {
              handleImportFile(e.target.files[0]);
              e.target.value = '';
            }}
          />
        </div>
        {message && <p className={message.type === 'error' ? 'danger' : 'muted'}>{message.text}</p>}
      </section>
    </div>
  );
}

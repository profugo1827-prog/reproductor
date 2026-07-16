const STORAGE_KEY_URL = 'spotdl-backend-url';
const STORAGE_KEY_API_KEY = 'spotdl-api-key';

export function getSpotdlConfig() {
  return {
    backendUrl: localStorage.getItem(STORAGE_KEY_URL) || '',
    apiKey: localStorage.getItem(STORAGE_KEY_API_KEY) || '',
  };
}

export function setSpotdlConfig({ backendUrl, apiKey }) {
  localStorage.setItem(STORAGE_KEY_URL, backendUrl.trim());
  localStorage.setItem(STORAGE_KEY_API_KEY, apiKey.trim());
}

function requireConfig() {
  const { backendUrl, apiKey } = getSpotdlConfig();
  if (!backendUrl || !apiKey) {
    throw new Error('Falta configurar la URL del backend y la API key.');
  }
  return { backendUrl: backendUrl.replace(/\/$/, ''), apiKey };
}

async function safeDetail(res) {
  try {
    const data = await res.json();
    return data.detail;
  } catch {
    return null;
  }
}

function filenameFromResponse(res, fallback) {
  const header = res.headers.get('content-disposition') || '';
  const match = header.match(/filename="?([^";]+)"?/);
  return match ? match[1] : fallback;
}

export async function startDownload(spotifyUrl) {
  const { backendUrl, apiKey } = requireConfig();
  const res = await fetch(`${backendUrl}/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
    body: JSON.stringify({ url: spotifyUrl }),
  });
  if (!res.ok) {
    throw new Error((await safeDetail(res)) || `Error ${res.status} al iniciar la descarga`);
  }
  return res.json();
}

export async function getJobStatus(jobId) {
  const { backendUrl, apiKey } = requireConfig();
  const res = await fetch(`${backendUrl}/jobs/${jobId}`, {
    headers: { 'X-API-Key': apiKey },
  });
  if (!res.ok) {
    throw new Error((await safeDetail(res)) || `Error ${res.status} consultando el estado`);
  }
  return res.json();
}

export async function fetchJobFile(jobId) {
  const { backendUrl, apiKey } = requireConfig();
  const res = await fetch(`${backendUrl}/jobs/${jobId}/file`, {
    headers: { 'X-API-Key': apiKey },
  });
  if (!res.ok) {
    throw new Error((await safeDetail(res)) || `Error ${res.status} descargando el archivo`);
  }
  const name = filenameFromResponse(res, `${jobId}.mp3`);
  const blob = await res.blob();
  return new File([blob], name, { type: blob.type || 'audio/mpeg' });
}

export async function waitForJob(jobId, { intervalMs = 3000, onTick, signal } = {}) {
  for (;;) {
    const status = await getJobStatus(jobId);
    onTick?.(status);
    if (status.status === 'done') return status;
    if (status.status === 'error') throw new Error(status.error || 'La descarga fallo');
    if (signal?.aborted) throw new Error('Cancelado');
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

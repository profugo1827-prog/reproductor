import { parseBlob } from 'music-metadata';

function fallbackTitle(fileName) {
  return fileName.replace(/\.[^/.]+$/, '');
}

export async function extractMetadata(file) {
  try {
    const { common, format } = await parseBlob(file);

    let coverBlob = null;
    const picture = common.picture?.[0];
    if (picture) {
      coverBlob = new Blob([picture.data], { type: picture.format });
    }

    return {
      title: common.title || fallbackTitle(file.name),
      artist: common.artist || 'Desconocido',
      album: common.album || '',
      duration: format.duration || 0,
      coverBlob,
    };
  } catch {
    return {
      title: fallbackTitle(file.name),
      artist: 'Desconocido',
      album: '',
      duration: 0,
      coverBlob: null,
    };
  }
}

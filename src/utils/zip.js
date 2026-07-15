// Minimal ZIP reader/writer (store method only, no compression).
// Audio/image files are already compressed formats, so DEFLATE would add
// CPU cost for negligible size savings — storing raw bytes is the right trade-off here.

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

export function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date) {
  const time =
    ((date.getHours() & 0x1f) << 11) | ((date.getMinutes() & 0x3f) << 5) | ((date.getSeconds() >> 1) & 0x1f);
  const year = Math.max(0, date.getFullYear() - 1980);
  const dosDate = ((year & 0x7f) << 9) | (((date.getMonth() + 1) & 0xf) << 5) | (date.getDate() & 0x1f);
  return { time, date: dosDate };
}

function u16(value) {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, value, true);
  return b;
}

function u32(value) {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, value, true);
  return b;
}

function concatBytes(arrays) {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

/**
 * entries: [{ name, blob, when? }]
 * Reads each blob's bytes once (to compute CRC32), then reuses the original
 * Blob object as the zip data part so large audio files aren't duplicated in
 * JS heap — the browser streams Blob parts from their backing storage.
 */
export async function buildZip(entries, onProgress) {
  const parts = [];
  const centralRecords = [];
  let offset = 0;

  for (let i = 0; i < entries.length; i++) {
    const { name, blob, when } = entries[i];
    const nameBytes = new TextEncoder().encode(name);
    const buf = new Uint8Array(await blob.arrayBuffer());
    const crc = crc32(buf);
    const { time, date } = dosDateTime(when || new Date());

    const localHeader = concatBytes([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(time),
      u16(date),
      u32(crc),
      u32(buf.length),
      u32(buf.length),
      u16(nameBytes.length),
      u16(0),
      nameBytes,
    ]);

    parts.push(localHeader, buf);

    centralRecords.push({
      nameBytes,
      crc,
      size: buf.length,
      time,
      date,
      offset,
    });

    offset += localHeader.length + buf.length;
    onProgress?.(i + 1, entries.length);
  }

  const centralDirStart = offset;
  const centralParts = [];
  for (const rec of centralRecords) {
    centralParts.push(
      concatBytes([
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(0),
        u16(0),
        u16(rec.time),
        u16(rec.date),
        u32(rec.crc),
        u32(rec.size),
        u32(rec.size),
        u16(rec.nameBytes.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(rec.offset),
        rec.nameBytes,
      ])
    );
  }
  const centralDir = concatBytes(centralParts);

  const endRecord = concatBytes([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(centralRecords.length),
    u16(centralRecords.length),
    u32(centralDir.length),
    u32(centralDirStart),
    u16(0),
  ]);

  parts.push(centralDir, endRecord);
  return new Blob(parts, { type: 'application/zip' });
}

/** Parses local file headers sequentially. Only understands the store
 * method — sufficient since this reads back zips produced by buildZip. */
export function parseZip(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  const bytes = new Uint8Array(arrayBuffer);
  const entries = [];
  let offset = 0;

  while (offset < bytes.length - 4) {
    const signature = view.getUint32(offset, true);
    if (signature !== 0x04034b50) break;

    const compressionMethod = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = new TextDecoder().decode(bytes.subarray(nameStart, nameStart + nameLength));

    if (compressionMethod !== 0) {
      throw new Error(`Entrada comprimida no soportada: ${name}`);
    }

    entries.push({ name, data: bytes.subarray(dataStart, dataStart + compressedSize) });
    offset = dataStart + compressedSize;
  }

  return entries;
}

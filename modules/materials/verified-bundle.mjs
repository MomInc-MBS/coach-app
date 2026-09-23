import { sha256Chunk } from './chunk-delivery.mjs';

/** Decode the deterministic M5 bundle only after its enclosing asset passed ChunkDownloader verification. */
export async function unpackVerifiedBundle(value) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  if (bytes.byteLength < 6) throw new Error('truncated verified bundle');
  const headerBytes = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0);
  if (headerBytes < 2 || headerBytes > 1024 * 1024 || headerBytes > bytes.byteLength - 4) throw new Error('invalid verified bundle index size');
  const index = JSON.parse(new TextDecoder().decode(bytes.subarray(4,4+headerBytes)));
  if (!index || typeof index !== 'object' || Array.isArray(index) || Object.keys(index).length > 512) throw new Error('invalid verified bundle index');
  const contentStart=4+headerBytes, values=new Map(); let expectedOffset=0;
  for (const [name,entry] of Object.entries(index)) {
    if (!name || name.length>300 || !entry || !Number.isSafeInteger(entry.offset) || entry.offset!==expectedOffset || !Number.isSafeInteger(entry.bytes) || entry.bytes<1 || !/^[a-f0-9]{64}$/.test(entry.sha256||'')) throw new Error(`invalid bundled entry: ${name}`);
    const end=contentStart+entry.offset+entry.bytes;
    if (end>bytes.byteLength) throw new Error(`truncated bundled entry: ${name}`);
    const data=bytes.slice(contentStart+entry.offset,end);
    if (await sha256Chunk(data)!==entry.sha256) throw new Error(`bundled entry integrity failure: ${name}`);
    values.set(name,data); expectedOffset+=entry.bytes;
  }
  if(contentStart+expectedOffset!==bytes.byteLength)throw new Error('verified bundle has unindexed trailing bytes');
  return values;
}

// Deterministic builder for per-track resumable post-download sections.
// It writes content bundles and unsigned chunk-manifest templates outside core/Sites.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const MAP_ORDER = ['basecolor','normal','roughness','height','metalness','tintMask','ao','opacity','emissive','preview'];
const DEFAULT_BASE = 'https://mominc.online/materials';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function makeBundle(entries) {
  const index = Object.create(null);
  let offset = 0;
  for (const [name, bytes] of entries) { if(!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(name)||name.includes('..')||Object.hasOwn(index,name)||!bytes.byteLength)throw new Error('unsafe or duplicate bundle entry');index[name] = { offset, bytes: bytes.byteLength, sha256: hash(bytes) }; offset += bytes.byteLength; }
  const header = Buffer.from(JSON.stringify(index));
  const prefix = Buffer.alloc(4); prefix.writeUInt32BE(header.byteLength);
  return Buffer.concat([prefix, header, ...entries.map(([, bytes]) => bytes)]);
}

async function chunkRecord(bytes, { path, url, chunkBytes }) {
  const chunks = [];
  for (let offset = 0, index = 0; offset < bytes.byteLength; offset += chunkBytes, index++) {
    const data = bytes.subarray(offset, Math.min(offset + chunkBytes, bytes.byteLength));
    chunks.push({ index, offset, bytes: data.byteLength, sha256: hash(data), url });
  }
  return { path, bytes: bytes.byteLength, sha256: hash(bytes), chunks };
}

export async function buildPostDownloadSections({ root = process.cwd(), outputDir = join(root, 'plan/assets-inbox/post-download-sections'), baseUrl = DEFAULT_BASE, chunkBytes = 1024 * 1024, materialize = true } = {}) {
  if (!Number.isInteger(chunkBytes) || chunkBytes < 1 || chunkBytes > 1024 * 1024) throw new Error('chunk size must obey the 1 MiB chunk-delivery policy');
  const origin = new URL(baseUrl);
  if (origin.protocol !== 'https:' || origin.pathname !== '/materials' || origin.username || origin.password || origin.search || origin.hash) throw new Error('base URL must be an HTTPS origin ending in /materials');
  const output = resolve(outputDir), generated = [];
  const sections = [];
  const sourcePackets = await Promise.all(['forged-realms','celestial-rift'].map(async packet => ({
    packet,
    root: join(root, `plan/assets-inbox/creature-skins/${packet}`),
    items: JSON.parse(await readFile(join(root, `plan/assets-inbox/creature-skins/${packet}/source-manifest.json`), 'utf8')).items,
  })));
  const trackNames = [...new Set(sourcePackets.flatMap(packet => packet.items.map(item => item.track)))].sort();
  const expectedTracks=['arms','cardio','chest','glutes','martial-arts','meditation','quads','yoga'];
  if(JSON.stringify(trackNames)!==JSON.stringify(expectedTracks))throw new Error('expected exactly eight known track packets');
  const ids=new Set();for(const source of sourcePackets)for(const item of source.items){if(!/^creature-[a-z0-9-]+$/.test(item.id)||ids.has(item.id)||![1,2,3].includes(item.collectionSlot))throw new Error('invalid source skin identity');ids.add(item.id);}
  if(ids.size!==48)throw new Error('expected exactly 48 source skins');
  for (const track of trackNames) {
    const packId = `track-${track}`, packDir = join(output, packId), entries = [];
    for (const source of sourcePackets) {
      for (const item of source.items.filter(row => row.track === track).sort((a,b) => a.collectionSlot - b.collectionSlot)) {
        for (const map of MAP_ORDER) {
          const meta = item.maps[map];
          if (!meta) continue;
          if(!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(meta.file||'')||meta.file.includes('..'))throw new Error('unsafe source texture path');
          const bytes = await readFile(join(source.root, meta.file));
          if (bytes.byteLength !== meta.bytes || hash(bytes) !== meta.sha256) throw new Error(`source packet checksum mismatch: ${item.id}/${map}`);
          entries.push([`${item.id}/${map}`, bytes]);
        }
      }
    }
    const bundle = makeBundle(entries), rel = `assets/${track}.m5bundle`;
    if(materialize){await mkdir(dirname(join(packDir, rel)), { recursive: true });await writeFile(join(packDir, rel), bundle);}
    const url = `${baseUrl}/${packId}/1.0.0/${track}.m5bundle`;
    const assets = [await chunkRecord(bundle, { path: rel, url, chunkBytes })];
    sections.push(unsignedSection({ packId, assets }));
    generated.push({ id: packId, assets: assets.length, bytes: bundle.byteLength, directory: packDir });
  }

  // Stage the six scene ships and fold all 24 tiny biome plates into one indexed asset.
  const shipRoot = join(root, 'plan/assets-inbox/ships'), shipPackDir = join(output, 'coach-ships-biomes');
  const shipAssets = [];
  for (const ship of ['supportive','direct','analytical','playful','calm','mom']) {
    const bytes = await readFile(join(shipRoot, `${ship}.glb`));
    const rel = `assets/ships/${ship}.glb`;
    if(materialize){await mkdir(dirname(join(shipPackDir, rel)), { recursive: true });await writeFile(join(shipPackDir, rel), bytes);}
    shipAssets.push(await chunkRecord(bytes, { path: rel, url: `${baseUrl}/coach-ships-biomes/1.0.0/${ship}.glb`, chunkBytes }));
  }
  const biomeRoot = join(root, 'plan/assets-inbox/biomes'), biomeFiles = ['original','patch','fold','lattice','wax','fungi','glass','bristle','cork','coral','metal','feather','moss','stormcloud','frost','ember','shadow','dragon','spring','vine','chitin','puff','rock','shag'].map(name => `${name}.webp`);
  const biomeEntries = [];
  for (const filename of biomeFiles) biomeEntries.push([filename, await readFile(join(biomeRoot, filename))]);
  const biomeBundle = makeBundle(biomeEntries), biomePath = 'assets/biomes.m5bundle';
  if(materialize){await mkdir(dirname(join(shipPackDir, biomePath)), { recursive: true });await writeFile(join(shipPackDir, biomePath), biomeBundle);}
  shipAssets.push(await chunkRecord(biomeBundle, { path: biomePath, url: `${baseUrl}/coach-ships-biomes/1.0.0/biomes.m5bundle`, chunkBytes }));
  sections.push(unsignedSection({ packId: 'coach-ships-biomes', assets: shipAssets }));
  generated.push({ id: 'coach-ships-biomes', assets: shipAssets.length, bytes: shipAssets.reduce((n,a)=>n+a.bytes,0), directory: shipPackDir });

  for (const section of sections) {
    const dir = join(output, section.packId);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'chunk-manifest.unsigned.json'), JSON.stringify(section, null, 2) + '\n');
    await writeFile(join(dir, 'section.json'), JSON.stringify({ id: section.packId, delivery: 'resumable-verified-chunks', signed: false, activation: 'blocked-until-signed-and-hosted', bytes: section.assets.reduce((n,a)=>n+a.bytes,0), assets: section.assets.map(a=>a.path) }, null, 2) + '\n');
  }
  return { signed: false, activation: 'blocked-until-signed-and-hosted', sections: generated };
}

function unsignedSection({ packId, assets }) {
  return { schema: 'mom-material-chunks-v1', packId, version: '1.0.0', keyId: 'mom-material-production-v1', assets, signature: '' };
}

export function unpackBundle(value) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  if (bytes.byteLength < 4) throw new Error('truncated bundle header');
  const length = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0);
  if (length < 2 || length > bytes.byteLength - 4) throw new Error('invalid bundle index length');
  const index = JSON.parse(new TextDecoder().decode(bytes.subarray(4, 4 + length)));
  const contentStart = 4 + length, output = new Map();
  for (const [name, entry] of Object.entries(index)) {
    if (!Number.isSafeInteger(entry.offset) || !Number.isSafeInteger(entry.bytes) || entry.offset < 0 || entry.bytes < 0 || contentStart + entry.offset + entry.bytes > bytes.byteLength) throw new Error(`invalid bundle range: ${name}`);
    const item = bytes.slice(contentStart + entry.offset, contentStart + entry.offset + entry.bytes);
    if (hash(item) !== entry.sha256) throw new Error(`bundle entry digest mismatch: ${name}`);
    output.set(name, item);
  }
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = name => process.argv.find(x => x.startsWith(`--${name}=`))?.slice(name.length + 3);
  console.log(JSON.stringify(await buildPostDownloadSections({ outputDir: arg('out') || undefined, baseUrl: arg('base-url') || undefined, materialize: !process.argv.includes('--metadata-only') }), null, 2));
}

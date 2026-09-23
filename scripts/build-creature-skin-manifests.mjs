// Builds the additive creature-skin runtime catalog and optional-pack asset manifest
// from the two immutable handoff manifests. Texture bytes remain in plan/assets-inbox.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const PACKETS = [
  { dir: 'forged-realms', packetId: 'coach-creature-forged-realms-v1' },
  { dir: 'celestial-rift', packetId: 'coach-creature-celestial-rift-v1' },
];
const TRACKS = new Set(['chest','quads','glutes','arms','yoga','martial-arts','cardio','meditation']);
const HEX = /^[a-f0-9]{64}$/;

export async function buildCreatureSkinManifests({ root = process.cwd(), outputDir = root, catalogPath = join(outputDir, 'creature-skins.json') } = {}) {
  const base = join(root, 'plan/assets-inbox/creature-skins');
  const collections = [], ids = new Set();
  for (const packet of PACKETS) {
    const sourcePath = join(base, packet.dir, 'source-manifest.json');
    const source = JSON.parse(await readFile(sourcePath, 'utf8'));
    if (source.packetId !== packet.packetId || !Array.isArray(source.items)) throw new Error(`Invalid packet manifest: ${packet.packetId}`);
    collections.push({ id: source.items[0]?.collection, packetId: source.packetId, displayName: source.displayName, description: source.description, runtimeNotes: source.runtimeNotes });
    for (const item of source.items) {
      if (!item.id?.startsWith('creature-') || ids.has(item.id)) throw new Error(`Duplicate or non-namespaced creature skin id: ${item.id}`);
      if (!TRACKS.has(item.track) || item.collection !== collections.at(-1).id) throw new Error(`Invalid track/collection for ${item.id}`);
      ids.add(item.id);
      for (const [map, info] of Object.entries(item.maps)) {
        if (!info.file || !Number.isSafeInteger(info.bytes) || !HEX.test(info.sha256)) throw new Error(`Invalid ${map} metadata for ${item.id}`);
      }
    }
  }
  if (ids.size !== 48) throw new Error(`Expected 48 unique creature skins; found ${ids.size}`);
  const catalog = { schemaVersion: 1, additive: true, colorSpace: { basecolor: 'srgb', tintMask: 'srgb', normal: 'linear', roughness: 'linear', height: 'linear', ao: 'linear', metalness: 'linear', opacity: 'linear', emissive: 'srgb' }, normalConvention: 'OpenGL +Y', tinting: 'tint-mask multiplied by selected creature palette', collections };
  // Preserve complete source metadata, including source URLs, CC0 attribution, and original checksums.
  catalog.skins = [];
  for (const packet of PACKETS) {
    const source = JSON.parse(await readFile(join(base, packet.dir, 'source-manifest.json'), 'utf8'));
    catalog.skins.push(...source.items.map(item => ({ ...item, runtime: { unlock: { level: [1, 3, 5][item.collectionSlot - 1], track: item.track }, pack: item.collection, bundle: `assets/${item.track}.m5bundle`, maps: Object.fromEntries(Object.entries(item.maps).map(([name, map]) => [name, { entry: `${item.id}/${name}`, bytes: map.bytes, sha256: map.sha256 }])) } })));
  }
  await mkdir(outputDir, { recursive: true });
  await mkdir(dirname(catalogPath), { recursive: true });
  await writeFile(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
  return { skins: ids.size, outputDir: resolve(outputDir) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const outArg = process.argv.find(x => x.startsWith('--out='));
  console.log(JSON.stringify(await buildCreatureSkinManifests({ outputDir: outArg ? resolve(outArg.slice(6)) : process.cwd() }), null, 2));
}

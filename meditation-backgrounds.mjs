// D28: meditation backgrounds are the "wonders" pack entries in plan/asset-manifest.json
// (pack "wonders", files backgrounds/clean/<id>.webp). The full 48 ship through the signed pack host,
// never core. Six starters are bundled in the site (pod/worlds/starter/) so meditation and the ship
// view never start blank: todaysBackground() asks a caller-supplied lookup for today's pack copy and
// falls back to today's starter. This module fetches nothing itself.
// ponytail: no default pack-store lookup yet (no live pack host); wire one when packs ship.
export const WONDERS_PACK = 'wonders';
// Stems of every pack:"wonders" entry in plan/asset-manifest.json (48, checked 2026-09-22).
export const WONDER_BACKGROUNDS = Object.freeze(`angkor-wat-a angkor-wat-b big-ben-a big-ben-b bora-bora chichen-itza-a chichen-itza-b
christ-the-redeemer-a christ-the-redeemer-b colosseum-a colosseum-b colossus-of-rhodes dead-sea eiffel-tower-a eiffel-tower-b
galapagos-islands grand-canyon great-pyramid-of-giza-a great-pyramid-of-giza-b great-wall-of-china-a great-wall-of-china-b
hanging-gardens-of-babylon kyoto lighthouse-of-alexandria machu-picchu-a machu-picchu-b maldives mausoleum-at-halicarnassus
mount-fuji-a mount-fuji-b new-york-a new-york-b niagara-falls-a niagara-falls-b northern-lights petra santorini-a santorini-b
statue-of-zeus-at-olympia sydney-opera-house-a sydney-opera-house-b taj-mahal-a taj-mahal-b temple-of-artemis-at-ephesus tokyo
tropical-island venice-a venice-b`.split(/\s+/));
export const wonderAssetPath = id => `backgrounds/clean/${id}.webp`;
export const STARTER_WONDERS = Object.freeze(['great-wall-of-china-a', 'great-pyramid-of-giza-a', 'machu-picchu-a', 'taj-mahal-a', 'colosseum-a', 'mount-fuji-a']);
export const starterWonderUrl = id => `/pod/worlds/starter/${id}.webp`;

export function backgroundForDay(ids = WONDER_BACKGROUNDS, day = Math.floor(Date.now() / 86400000)) {
 return ids?.length ? ids[((Math.floor(day) % ids.length) + ids.length) % ids.length] : null;
}

// lookup: optional async ({pack, path, id}) => local URL string | null.
export async function resolveBackground(id, lookup) {
 if (!id || !lookup) return null;
 try {
  const url = await lookup({pack: WONDERS_PACK, path: wonderAssetPath(id), id});
  return typeof url === 'string' && url ? url : null;
 } catch {
  return null;
 }
}

// Today's wonder: the downloaded pack copy (any of the 48) when the lookup has it, else today's starter.
export async function todaysBackground(lookup, day = Math.floor(Date.now() / 86400000)) {
 const id = backgroundForDay(WONDER_BACKGROUNDS, day), url = await resolveBackground(id, lookup);
 if (url) return {id, url};
 const starter = backgroundForDay(STARTER_WONDERS, day);
 return {id: starter, url: starterWonderUrl(starter)};
}

// Mean colour of the image's bottom pixel row, so the page below the landmark continues it.
export function averageRgb(data) {
 const sum = [0, 0, 0];
 for (let i = 0; i < data.length; i += 4) for (let c = 0; c < 3; c++) sum[c] += data[i + c];
 const n = Math.max(1, data.length / 4);
 return `rgb(${sum.map(v => Math.round(v / n)).join(',')})`;
}

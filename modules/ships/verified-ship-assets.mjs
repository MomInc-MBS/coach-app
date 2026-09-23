import { unpackVerifiedBundle } from '../materials/verified-bundle.mjs';
import { SHIP_STYLES, BIOMES } from './ship-scene-domain.mjs';
import { ownedShipIds } from './ship-access.mjs';

const SHIP_PATHS=Object.freeze(Object.fromEntries(SHIP_STYLES.map(id=>[id,`assets/ships/${id}.glb`])));
const BIOME_BUNDLE='assets/biomes.m5bundle';

/** Make scene URLs only from individually reconstructed, signed, owner-checked assets. */
export async function createVerifiedShipAssetBridge({ downloader, manifest, isOwned, canUseShip=ownedShipIds, urlApi=globalThis.URL, events=globalThis.window }={}) {
  if(!downloader?.readVerifiedAsset||!manifest?.assets||typeof isOwned!=='function')throw new Error('verified ship downloader and ownership check are required');
  const created=new Set(),ships=new Map(),backgrounds=new Map();let disposed=false;
  const dispose=()=>{if(disposed)return;disposed=true;for(const value of created)urlApi.revokeObjectURL(value);created.clear();ships.clear();backgrounds.clear();events?.removeEventListener('myr5:account-cleared',dispose);events?.removeEventListener('myr5:account-ready',onAccount);};
  const assertOwned=()=>{if(disposed||!isOwned(manifest.packId)){dispose();throw new Error('ship section ownership was revoked');}};
  const onAccount=()=>{if(!isOwned(manifest.packId))dispose();};
  events?.addEventListener('myr5:account-cleared',dispose);events?.addEventListener('myr5:account-ready',onAccount);
  const objectUrl=blob=>{const value=urlApi.createObjectURL(blob);created.add(value);return value;};
  try {
    for(const id of SHIP_STYLES.filter(id=>canUseShip().includes(id))){
      assertOwned();const asset=await downloader.readVerifiedAsset(manifest,SHIP_PATHS[id]);assertOwned();
      ships.set(id,objectUrl(new Blob([asset.bytes],{type:'model/gltf-binary'})));
    }
    assertOwned();const bundle=await downloader.readVerifiedAsset(manifest,BIOME_BUNDLE);assertOwned();
    const plates=await unpackVerifiedBundle(bundle.bytes);
    assertOwned();for(const name of BIOMES){const bytes=plates.get(`${name}.webp`);if(!bytes)throw new Error(`verified biome plate is missing: ${name}`);backgrounds.set(name,objectUrl(new Blob([bytes],{type:'image/webp'})));}assertOwned();
  } catch(error){dispose();throw error;}
  const api={
    getShipUrl(id){assertOwned();if(!SHIP_STYLES.includes(id)||!canUseShip().includes(id))throw new Error('ship is not owned');const url=ships.get(id);if(!url)throw new Error('ship model is unavailable');return url;},
    getBackgroundUrl(id){assertOwned();const url=backgrounds.get(id);if(!url)throw new Error('biome plate is unavailable');return url;},
    ownedShipIds(){assertOwned();return [...canUseShip()].filter(id=>ships.has(id));},
    dispose,
  };
  return Object.freeze(api);
}

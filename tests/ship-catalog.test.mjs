import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SHIP_CATALOG,shipDetails} from '../modules/ships/ship-catalog.mjs';
import {SHIP_STYLES,initialScene} from '../modules/ships/ship-scene-domain.mjs';

test('each described hull maps to its existing 3D model and recipe ID',async()=>{
 assert.deepEqual(SHIP_CATALOG.map(s=>s.id),SHIP_STYLES);
 const manifest=JSON.parse(await readFile('release-trust/materials/coach-ships-biomes/chunk-manifest.json','utf8'));
 for(const ship of SHIP_CATALOG){
  assert.ok(manifest.assets.some(a=>a.path===ship.assetPath));
  assert.equal(initialScene({shipId:ship.id}).ship,ship.id);
  assert.ok(ship.description.length>45);
  assert.notEqual(ship.name,ship.id);
  const bytes=await readFile(`plan/assets-inbox/ships/${ship.id}.glb`);
  assert.equal(bytes.toString('ascii',0,4),'glTF');
 }
 assert.equal(shipDetails('unknown').id,'supportive');
});

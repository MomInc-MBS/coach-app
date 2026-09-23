// W2-2H: the site is nearly full (256 MiB Sites limit), so the bundled starter assets stay on a byte budget.
import test from 'node:test';
import assert from 'node:assert/strict';
import {stat,readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {STARTER_WONDERS,WONDER_BACKGROUNDS,starterWonderUrl} from '../meditation-backgrounds.mjs';

const size=async path=>(await stat(path)).size;
test('starter ship, six starter wonders and the still-room WebP fit their budgets; the old PNG is gone',async()=>{
 assert.ok(await size('pod/worlds/starter/supportive.glb')<=450*1024,'starter ship GLB <= 450 KB');
 assert.equal(STARTER_WONDERS.length,6);
 for(const id of STARTER_WONDERS)assert.ok(WONDER_BACKGROUNDS.includes(id),id+' is a wonders pack id');
 let total=0;for(const id of STARTER_WONDERS)total+=await size('.'+starterWonderUrl(id));
 assert.ok(total<=550*1024,`starter wonders ${total} B <= 550 KB`);
 assert.ok(await size('pod/worlds/great-wall.webp')<=250*1024,'still room WebP <= 250 KB');
 assert.equal(existsSync('pod/worlds/great-wall.png'),false);
 assert.match(await readFile('pod/retro-rooms.css','utf8'),/--room-world:url\('\/pod\/worlds\/great-wall\.webp'\)/);
});
test('starter ship GLB uses only core glTF plus WebP textures, so the plain GLTFLoader reads it',async()=>{
 const raw=await readFile('pod/worlds/starter/supportive.glb'),json=JSON.parse(raw.subarray(20,20+raw.readUInt32LE(12)));
 assert.deepEqual(json.extensionsRequired||[],['EXT_texture_webp']);
 assert.equal(json.meshes.length,1);assert.match(json.nodes[0].name,/^tripo_node_/);
});

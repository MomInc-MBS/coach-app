// W2-2H: the site is nearly full (256 MiB Sites limit), so the bundled starter assets stay on a byte budget.
import test from 'node:test';
import assert from 'node:assert/strict';
import {stat,readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {STARTER_WONDERS,WONDER_BACKGROUNDS,starterWonderUrl} from '../meditation-backgrounds.mjs';
import {offlineInventory,CORE_OFFLINE_BUDGET} from '../scripts/offline-assets.mjs';

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
// W2-2O (#136) undoes W2-FIX risk 2: the portal experience's art is one optional Starter download, never core.
const SCENE_ART=['/pod/worlds/quilt.webp','/food/pyramid-scanner.glb','/pod/worlds/starter/supportive.glb',...STARTER_WONDERS.map(starterWonderUrl),'/pod/worlds/great-wall.webp','/pod/worlds/achievements.jpg','/pod/worlds/meditation-waterfall.png']; // R18 lane A2: the meditation waterfall backdrop
test('W2-2O: the core list has no heavy scene assets; the Starter group holds every one of them',async t=>{
 const {core,optional}=await offlineInventory('.');
 const heavy=core.filter(a=>/\.(?:glb|gltf|bin)$/i.test(a.url)||a.url.startsWith('/pod/worlds/')||a.url==='/food/pyramid-scanner.glb');
 assert.deepEqual(heavy.map(a=>a.url),[],'no scene model or world art in core');
 const starter=optional.filter(a=>a.group==='starter'),tracker=a=>a.url.startsWith('/vendor/mediapipe/');
 // R9-OFFLINE: the pose tracker (fetched by the build, so absent from a bare checkout) is Starter too, never core.
 assert.deepEqual(core.filter(tracker).map(a=>a.url),[],'the pose tracker is not core');
 assert.deepEqual(starter.filter(a=>!tracker(a)).map(a=>a.url).sort(),[...SCENE_ART].sort(),'Starter is the portal scenes’ art plus the tracker');
 for(const url of ['/modules/portal/portal-board.mjs','/modules/ships/ship-view.mjs','/food/pyramid-scanner.mjs','/vendor/three/GLTFLoader.js','/achievements-board.mjs','/meditation.mjs'])assert(core.some(a=>a.url===url),`${url}: the scene code stays core, so it opens offline and shows its placeholder`);
 const bytes=core.reduce((sum,a)=>sum+a.bytes,0),starterBytes=starter.reduce((sum,a)=>sum+a.bytes,0);
 assert.ok(bytes<=CORE_OFFLINE_BUDGET,`core ${(bytes/1048576).toFixed(2)} MiB stays under the 8 MiB budget`);
 assert.ok(starterBytes>2*1048576,'the Starter download is the large one'); // release 5's meshopt pyramid (3C) is 1.06 MB, not 3.1
 t.diagnostic(`source tree: core ${core.length} files ${bytes} B, Starter ${starter.length} files ${starterBytes} B`);
});
test('starter ship GLB uses only core glTF plus WebP textures, so the plain GLTFLoader reads it',async()=>{
 const raw=await readFile('pod/worlds/starter/supportive.glb'),json=JSON.parse(raw.subarray(20,20+raw.readUInt32LE(12)));
 assert.deepEqual(json.extensionsRequired||[],['EXT_texture_webp']);
 assert.equal(json.meshes.length,1);assert.match(json.nodes[0].name,/^tripo_node_/);
});
test('page music: six AAC loops are an optional Music group, never core, and stay small',async()=>{
 const {core,optional}=await offlineInventory('.');
 assert.deepEqual(core.filter(a=>a.url.startsWith('/audio/music/')).map(a=>a.url),[],'no music in core');
 const music=optional.filter(a=>a.group==='music');
 assert.equal(music.filter(a=>a.url.endsWith('.m4a')).length,6);
 assert.ok(music.some(a=>a.url==='/audio/music/manifest.json'));
 assert.ok(music.reduce((s,a)=>s+a.bytes,0)<2*1048576,'music group under 2 MiB');
});

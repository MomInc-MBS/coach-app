// W4-4E (#116, D47): the customizer cage ships as one optional download packet, never core.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {offlineInventory,groupOf,CAGE_ROOM} from '../scripts/offline-assets.mjs';

const CAGE=['/pod/rooms/cage/cage.glb','/pod/rooms/cage/draco_wasm_wrapper.js','/pod/rooms/cage/draco_decoder.wasm'];

test('the cage packet is its own optional group, the wasm decoder included, and nothing of it is core',async()=>{
 const root=await mkdtemp(join(tmpdir(),'myr5-cage-'));
 for(const dir of ['pod/rooms/cage','creature/assets'])await mkdir(join(root,dir),{recursive:true});
 // Even if a core page named the packet, it stays out of core.
 await writeFile(join(root,'pose.html'),'<script src="/pod/rooms/cage/draco_wasm_wrapper.js"></script>');
 await writeFile(join(root,'sw.js'),'/* OFFLINE_ASSETS */ []');
 await writeFile(join(root,'creature/assets/editor.js'),`const base='/pod/rooms/cage/'`);
 for(const url of CAGE)await writeFile(join(root,url),'x'+url);
 const {core,optional}=await offlineInventory(root);
 assert.deepEqual(core.filter(a=>CAGE_ROOM.test(a.url)),[]);
 assert.deepEqual(optional.filter(a=>a.group==='room-cage').map(a=>a.url).sort(),[...CAGE].sort());
 assert.equal(groupOf('/creature/assets/editor.js',new Map()),'coach','the cage code rides with the customizer, not the packet');
});

test('the shipped cage is the supplied Draco model plus exactly the decoder this three.js expects',async()=>{
 const bytes=await readFile(new URL('../pod/rooms/cage/cage.glb',import.meta.url));
 assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(8),bytes.length);
 assert.equal(bytes.length,747916,'the 148k-triangle proof asset (cage_148k_draco8.glb), unchanged');
 const json=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
 assert.deepEqual(json.extensionsRequired,['KHR_draco_mesh_compression']);
 assert.ok(json.buffers.every(b=>!b.uri)&&json.images.every(i=>!i.uri),'self-contained for offline use');
 const three=createRequire(import.meta.url).resolve('three/examples/jsm/libs/draco/gltf/draco_decoder.wasm').replace(/draco_decoder\.wasm$/,'');
 // A Windows checkout (core.autocrlf) may give the wrapper CRLF line ends; the wasm is binary and untouched.
 const lf=bytes=>Buffer.from(bytes.toString('latin1').replace(/\r\n/g,'\n'),'latin1');
 for(const file of ['draco_wasm_wrapper.js','draco_decoder.wasm'])assert.ok(lf(await readFile(new URL('../pod/rooms/cage/'+file,import.meta.url))).equals(lf(await readFile(three+file))),file+' matches node_modules three');
 let total=0;for(const url of CAGE)total+=(await stat(new URL('..'+url,import.meta.url))).size;
 assert.ok(total<1_010_000,'packet stays about 1 MB: '+total);
});

test('the Downloads menu offers the cage, and the customizer only loads it from the downloaded package',async()=>{
 const [menu,cage,workbench]=await Promise.all(['../post-download.mjs','../creature/source/cage.ts','../creature/source/editor-workbench.ts'].map(p=>readFile(new URL(p,import.meta.url),'utf8')));
 assert.match(menu,/\['room-cage','3D customizer cage',/);
 assert.match(cage,/name\.startsWith\('myr5-package-'\)/);
 assert.doesNotMatch(cage.replace(/^\s*\/\/.*$/gm,''),/saveRecipe|localStorage|\/api\/war-room|commit\(/,'the cage never saves a look or a loadout');
 assert.match(workbench,/if\(!have\)\{cageStyle\(\);cageOffer\.hidden=false/);
 assert.match(workbench,/function cageOpen\(menu:'body'\|'materials'\)\{const tab=tabs\.find\(b=>b\.dataset\.menu===menu\);if\(!tab\|\|tab\.hidden/);
});

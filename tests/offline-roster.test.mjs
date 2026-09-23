import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {offlineAssets,offlineInventory,identifyVoice,bodySections,groupOf} from '../scripts/offline-assets.mjs';

test('roster models remain available on demand without blocking mobile install',async()=>{
 const root=await mkdtemp(join(tmpdir(),'myr5-offline-'));
 try{
  for(const folder of ['pod','creature/models/roster','models','icons','handborne','arcade'])await mkdir(join(root,folder),{recursive:true});
  await writeFile(join(root,'pose.html'),'coach');
  await writeFile(join(root,'creature/models/core.glb'),'core');
  await writeFile(join(root,'creature/models/roster/manifest.json'),'{}');
  await writeFile(join(root,'creature/models/roster/new-coach.glb'),'roster');
  const urls=(await offlineAssets(root)).map(asset=>asset.url);
  assert(!urls.includes('/creature/models/core.glb'));
  const optional=(await offlineInventory(root)).optional.map(a=>a.url);
  assert(optional.includes('/creature/models/core.glb'));
  assert(optional.includes('/creature/models/roster/new-coach.glb'));
  assert(optional.includes('/creature/models/roster/manifest.json'));
  assert(!urls.includes('/creature/models/roster/new-coach.glb'));
 }finally{await rm(root,{recursive:true,force:true});}
});

test('D34: core is only what first-run pages name; bundled sources, deferred features and voice go to the package',async()=>{
 const root=await mkdtemp(join(tmpdir(),'myr5-core-'));
 try{
  for(const folder of ['pod/fonts','pod/worlds','icons','voice'])await mkdir(join(root,folder),{recursive:true});
  await writeFile(join(root,'pose.html'),'<link rel="stylesheet" href="/pod/whiteboard.css"><script type="module" src="/app-runtime.mjs?v=1"></script><link rel="icon" href="/icons/used.png">');
  await writeFile(join(root,'app-runtime.mjs'),"import('./nutrition-data.mjs');img.src='/pod/mom-inc-mark.png';img.src='/pod/worlds/quilt.webp';new URL('./creature/assets/phone.js',import.meta.url);");
  await writeFile(join(root,'pod/whiteboard.css'),"@font-face{src:url('/pod/fonts/hand-0.woff2')}.room{background:url(worlds/wall.png)}");
  for(const file of ['nutrition-data.mjs','meditation.mjs','pod/mom-inc-mark.png','pod/fonts/hand-0.woff2','pod/worlds/wall.png','pod/worlds/quilt.webp','icons/used.png','icons/unused.png','voice/a.mp3'])await writeFile(join(root,file),'x'+file);
  await writeFile(join(root,'voice/manifest.json'),JSON.stringify({phrases:{hi:'/voice/a.mp3'}}));
  await identifyVoice(root);
  const {core,optional}=await offlineInventory(root);
  assert.deepEqual(core.map(a=>a.url),['/app-runtime.mjs','/icons/used.png','/pod/mom-inc-mark.png','/pod/whiteboard.css','/pod/worlds/quilt.webp','/pose.html']);
  assert.deepEqual(optional.map(a=>a.url),['/icons/unused.png','/meditation.mjs','/nutrition-data.mjs','/pod/fonts/hand-0.woff2','/pod/worlds/wall.png','/voice/manifest.json']);
  const voice=optional.find(a=>a.url==='/voice/manifest.json'),{files}=JSON.parse(await readFile(join(root,'voice/manifest.json'),'utf8'));
  assert.deepEqual(files.map(f=>[f.url,f.bytes]),[['/voice/a.mp3',12]]);assert.match(files[0].integrity,/^sha256-/);assert.equal(voice.contains,12);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('the starter portal renderer is available before the optional food model download',async()=>{
 const root=await mkdtemp(join(tmpdir(),'myr5-portal-core-'));
 try{
  for(const folder of ['modules/portal','vendor/three','pod/worlds'])await mkdir(join(root,folder),{recursive:true});
  await writeFile(join(root,'pose.html'),'<script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/loaders/GLTFLoader.js":"/vendor/three/GLTFLoader.js"}}</script><script src="/app-runtime.mjs"></script>');
  await writeFile(join(root,'app-runtime.mjs'),"import('./modules/portal/portal-entry.mjs')");
  await writeFile(join(root,'modules/portal/portal-entry.mjs'),"import './portal.mjs'");
  await writeFile(join(root,'modules/portal/portal.mjs'),"import 'three';const texture='/pod/worlds/quilt.webp'");
  for(const name of ['vendor/three/three.module.js','vendor/three/GLTFLoader.js','pod/worlds/quilt.webp'])await writeFile(join(root,name),'fixture');
  const {core,optional}=await offlineInventory(root);
  for(const url of ['/modules/portal/portal-entry.mjs','/modules/portal/portal.mjs','/vendor/three/three.module.js','/pod/worlds/quilt.webp'])assert(core.some(a=>a.url===url),url);
  assert(optional.some(a=>a.url==='/vendor/three/GLTFLoader.js'),'food-only loader remains deferred');
 }finally{await rm(root,{recursive:true,force:true});}
});

test('W2-2I: the package is grouped for the Downloads menu; the regular coach never holds a roster body',async()=>{
 const root=await mkdtemp(join(tmpdir(),'myr5-groups-'));
 const chest='roster/06-ridge-triad--geometric_robot_3d_model1',meditation='roster/18-quad-all--robotic_dog_3d_model',unplaced='roster/21-flyer--winged_humanoid_3d_model';
 try{
  for(const folder of ['creature/models/roster','creature/assets','models','voice','handborne/models','food','arcade/tub-flight','war-room','pod/worlds'])await mkdir(join(root,folder),{recursive:true});
  await writeFile(join(root,'pose.html'),'coach');
  for(const file of ['creature/models/myr5.glb','creature/models/anatomy.glb','creature/assets/phone.js','creature/models/roster/manifest.json',`creature/models/${chest}.glb`,`creature/models/${meditation}.glb`,`creature/models/${unplaced}.glb`,'models/squat.glb','handborne/models/hand.glb','food/pyramid-scanner.glb','nutrition-data.mjs','meditation.mjs','pod/worlds/great-wall.png','arcade/tub-flight/game.mjs','war-room/index.html','voice/a.mp3'])await writeFile(join(root,file),'x'+file);
  await writeFile(join(root,'voice/manifest.json'),JSON.stringify({phrases:{hi:'/voice/a.mp3'}}));
  await identifyVoice(root);
  const groups=Object.fromEntries(Object.entries(Object.groupBy((await offlineInventory(root)).optional,a=>a.group)).map(([id,list])=>[id,list.map(a=>a.url).sort()]));
  assert.deepEqual(groups,{
   coach:['/creature/assets/phone.js','/creature/models/anatomy.glb','/creature/models/myr5.glb','/creature/models/roster/manifest.json','/models/squat.glb'],
   'bodies-chest':[`/creature/models/${chest}.glb`],'bodies-meditation':[`/creature/models/${meditation}.glb`],'bodies-starter':[`/creature/models/${unplaced}.glb`],
   hand:['/handborne/models/hand.glb'],food:['/food/pyramid-scanner.glb','/nutrition-data.mjs'],meditation:['/meditation.mjs','/pod/worlds/great-wall.png'],
   games:['/arcade/tub-flight/game.mjs','/war-room/index.html'],voices:['/voice/manifest.json'],
  });
 }finally{await rm(root,{recursive:true,force:true});}
});

test('W2-2I: every placed body goes to its first workout section; the rest are Starter',async()=>{
 const sections=await bodySections();
 assert.equal(sections.size,50);
 assert.equal(groupOf('/creature/models/roster/16-spade-arch--pyramid_head_figure_3d_model.glb',sections),'bodies-chest','the Chest/Martial Arts dual lives with Chest');
 assert.equal(new Set([...sections.values()]).size,8,'all eight sections have bodies');
 assert.equal(groupOf('/creature/models/myr5.glb',sections),'coach');
 assert.equal(groupOf('/creature/models/roster/unknown.glb',sections),'bodies-starter');
});

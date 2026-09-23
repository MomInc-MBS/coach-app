import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {offlineAssets,offlineInventory,identifyVoice} from '../scripts/offline-assets.mjs';

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

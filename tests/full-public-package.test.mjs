import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {offlineInventory,writeOfflineWorker} from '../scripts/offline-assets.mjs';

test('packaged reward assets are included in the public drop-pods group',async()=>{
 const {core,optional}=await offlineInventory('.');
 assert.ok(core.every(asset=>asset.url!=='/reward-assets/canister.glb'));
 assert.ok(optional.some(asset=>asset.url==='/reward-assets/canister.glb'&&asset.group==='drop-pods'));
});

test('worker build accepts a core over 8 MiB and includes public Vault assets in the optional package',async()=>{
 const root=await mkdtemp(join(tmpdir(),'myr5-full-package-'));
 try{
  const refs=['/pose.html','/app-runtime.mjs','/launch-bootstrap.mjs','/launch-runtime.mjs','/local-coach-runtime.mjs','/onboarding.html','/onboarding.mjs','/workout-tracks.js','/pod/gala-weapons.js','/pod/gala-avatar.js','/pod/gala-performer.js','/pod/dj-identity.js','/large-core.mjs'];
  for(const ref of refs){
   const path=join(root,ref.slice(1));await mkdir(join(path,'..'),{recursive:true});
   await writeFile(path,ref==='/pose.html'?refs.slice(1).map(url=>`<script src="${url}"></script>`).join('\n'):ref==='/large-core.mjs'?Buffer.alloc(9*1024*1024,32):'export {};');
  }
  await mkdir(join(root,'modules/vault'),{recursive:true});
  await writeFile(join(root,'modules/vault/vault-hall.mjs'),'export {};');
  await mkdir(join(root,'pod/worlds/vault'),{recursive:true});
  await writeFile(join(root,'pod/worlds/vault/secret-board.glb'),Buffer.from([1,2,3]));
  await mkdir(join(root,'vendor/mediapipe/version/wasm'),{recursive:true});
  await writeFile(join(root,'vendor/mediapipe/version/wasm/vision_wasm_nosimd_internal.wasm'),Buffer.from([4,5,6]));
  const template=join(root,'sw-template.js');
  await writeFile(template,"const SHELL='old';const ASSETS=/* OFFLINE_ASSETS */ [];const OPTIONAL_ASSETS=/* OPTIONAL_ASSETS */ [];");
  const core=await writeOfflineWorker(root,'test-build',template);
  assert.ok(core.some(asset=>asset.url==='/large-core.mjs'&&asset.bytes>8*1024*1024));
  const {optional}=await offlineInventory(root,template);
  const vault=optional.filter(asset=>asset.url.includes('/modules/vault/')||asset.url.includes('/pod/worlds/vault/'));
  assert.deepEqual(vault.map(asset=>asset.group),['vault','vault']);
  assert.equal(optional.find(asset=>asset.url.includes('vision_wasm_nosimd_internal.wasm'))?.group,'starter');
  const worker=await readFile(join(root,'sw.js'),'utf8');
  assert.match(worker,/OPTIONAL_ASSETS=.*vault-hall\.mjs/s);
 }finally{await rm(root,{recursive:true,force:true});}
});

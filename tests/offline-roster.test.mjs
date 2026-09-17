import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {offlineAssets} from '../scripts/offline-assets.mjs';

test('roster models remain available on demand without blocking mobile install',async()=>{
 const root=await mkdtemp(join(tmpdir(),'myr5-offline-'));
 try{
  for(const folder of ['pod','creature/models/roster','models','icons','handborne','arcade'])await mkdir(join(root,folder),{recursive:true});
  await writeFile(join(root,'pose.html'),'coach');
  await writeFile(join(root,'creature/models/core.glb'),'core');
  await writeFile(join(root,'creature/models/roster/manifest.json'),'{}');
  await writeFile(join(root,'creature/models/roster/new-coach.glb'),'roster');
  const urls=(await offlineAssets(root)).map(asset=>asset.url);
  assert(urls.includes('/creature/models/core.glb'));
  assert(urls.includes('/creature/models/roster/manifest.json'));
  assert(!urls.includes('/creature/models/roster/new-coach.glb'));
 }finally{await rm(root,{recursive:true,force:true});}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {sourceOffer} from '../scripts/source-offer.mjs';

const root=new URL('../',import.meta.url);
test('the physical sound pack has verified local CC0 recordings for every cue',async()=>{
 const manifest=JSON.parse(await readFile(new URL('audio/sfx/manifest.json',root),'utf8'));
 const required=['mechanical','switch','ice','jelly','water','water-slosh','grass','grass-tinkle','quilt','wood','wood-scrape','cogs','crt','transit','dialup','pod-hum','breeze'];
 const sources=new Map(manifest.sources.map(source=>[source.id,source]));
 const assets=new Map(manifest.assets.map(asset=>[asset.url,asset]));
 for(const cue of required){
  assert.ok(manifest.cues[cue]?.length>0,cue);
  assert.ok(manifest.cues[cue].length<=2,'restrained variation for '+cue);
  for(const path of manifest.cues[cue]){
   assert.match(path,/^\/audio\/sfx\/[a-z0-9-]+\.mp3$/);
   const asset=assets.get(path);assert.ok(asset,path);
   const data=await readFile(new URL(path.slice(1),root));
   assert.ok(data.length>500,path+' is a nonempty clip');
   assert.equal(data.length,asset.bytes);
   assert.equal(createHash('sha256').update(data).digest('hex'),asset.sha256,path);
   assert.equal(sources.get(asset.source)?.license,'CC0-1.0');
  }
 }
 assert.ok(manifest.assets.reduce((total,asset)=>total+asset.bytes,0)<512*1024,'small core sound pack');
});

test('published source retains sound provenance and the reproducible generation script',async()=>{
 const offer=await sourceOffer();
 assert.ok(offer['scripts/prepare-sound-assets.py']);
 assert.ok(offer['audio/sfx/manifest.json']);
 assert.ok(offer['audio/sfx/credits.html']);
 assert.doesNotMatch(Object.keys(offer).join('\n'),/plan\/assets-inbox/);
});

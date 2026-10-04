import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {groupOf} from '../scripts/offline-assets.mjs';

const root=new URL('../pod/worlds/boards/',import.meta.url);
const glb=async path=>{
 const bytes=await readFile(new URL(path,root));
 assert.equal(bytes.toString('ascii',0,4),'glTF',path);
 return {bytes,json:JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)))};
};

test('each grimoire device bundles its art and tunnel; quilt art stays Starter',async()=>{
 const paths={ice:['ice.glb'],grass:['grass.glb','flower.glb'],cogs:['cogs/door.glb','cogs/parts-kit.glb','cogs/door-layout.json'],jelly:['jelly.glb'],wood:['wood.glb'],pond:['pond-poster.webp']}; // pond: procedural, no GLB
 for(const [id,files] of Object.entries(paths)){
  for(const path of files)assert.equal(groupOf(`/pod/worlds/boards/${path}`,new Map()),`grimoire-${id}`);
  assert.equal(groupOf(`/modules/portal/portal-tunnel-${id}.mjs`,new Map()),`grimoire-${id}`);
 }
 assert.equal(groupOf('/pod/worlds/quilt.webp',new Map()),'starter');
});

test('compressed kit keeps every named part required by the cogs layout',async()=>{
 const {bytes,json}=await glb('cogs/parts-kit.glb');
 assert.ok(bytes.length<900_000,`kit is ${bytes.length} bytes`);
 assert.ok(json.extensionsUsed.includes('EXT_meshopt_compression'));
 const names=new Set(json.nodes.map(node=>node.name));
 const layout=JSON.parse(await readFile(new URL('cogs/door-layout.json',root),'utf8'));
 for(const part of layout.parts)assert.ok(names.has(part.node),`missing ${part.node}`);
 assert.equal(json.meshes.length,113);
});

test('each runtime GLB is Meshopt decoded, with no obsolete cogs models',async()=>{
 for(const path of ['ice.glb','grass.glb','jelly.glb','wood.glb','cogs/door.glb']){
  const {json}=await glb(path);assert.ok(json.extensionsUsed.includes('EXT_meshopt_compression'),path);
 }
 const files=await readdir(new URL('cogs/',root));
 assert.ok(!files.includes('cogs.glb')&&!files.includes('cog-kit.glb'));
});

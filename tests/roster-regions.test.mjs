import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

// Regression guard for #141 (W4-4G): every roster GLB must expose its head/collar/body/arms/feet
// meshes under nodes named exactly those five region names (assemble.ts `getObjectByName(region)`,
// which only meshes under those wrappers ever get `userData.region` and the material pass), and
// every mesh must have a single (non-array) material — a split/multi-material mesh keeps its raw
// import look instead of being reskinned (material-language.ts `sculptMaterial()`'s early return).
// Investigation for W4-4G found neither actually reproduces on the current roster assets (all five
// bodies named in #141 render cleanly under Magma/Crystal, front and back); this test locks that in.

const repoRoot=join(dirname(fileURLToPath(import.meta.url)),'..');
const creatorDir=join(repoRoot,'creature','source','creator');
const REGIONS=['head','collar','body','arms','feet'];

async function loadModule(){
 const result=await build({
  stdin:{contents:`export * from './track-placements';`,resolveDir:creatorDir,loader:'ts'},
  bundle:true,format:'esm',platform:'neutral',write:false,target:'es2022',
 });
 return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const {TRACK_PLACEMENTS}=await loadModule();

// #141's own five suspects (Ian's D45 call): Seed · Pearo 5, Monolith · Tanka 5, Shellcap · Manyarm 1/2/3.
const SUSPECT_ASSETS=[
 'creature/models/roster/01-seed-pearo--blank_toy_figure_3d_model.glb',
 'creature/models/roster/09-monolith-tanka--robot_3d_model3.glb',
 'creature/models/roster/17-shellcap-manyarm--3d_character_figurine.glb',
 'creature/models/roster/17-shellcap-manyarm--mushroom_creature_3d_model.glb',
 'creature/models/roster/17-shellcap-manyarm--mushroom_robot_3d_model.glb',
];
const assets=[...new Set([...TRACK_PLACEMENTS.map(p=>p.sourceAsset),...SUSPECT_ASSETS])];

/** Minimal GLB reader: just enough of the container format to reach the JSON chunk (no rendering,
 * no dependency on three/GLTFLoader — the node tree and mesh/material counts live in that JSON). */
function readGLBJson(buffer){
 if(buffer.readUInt32LE(0)!==0x46546c67)throw Error('Not a GLB file');
 const totalLength=buffer.readUInt32LE(8);
 let offset=12;
 while(offset<totalLength){
  const chunkLength=buffer.readUInt32LE(offset),chunkType=buffer.readUInt32LE(offset+4);
  if(chunkType===0x4e4f534a)return JSON.parse(buffer.subarray(offset+8,offset+8+chunkLength).toString('utf8'));
  offset+=8+chunkLength;
 }
 throw Error('No JSON chunk found');
}

for(const asset of assets){
 test(`region split and single-material meshes: ${asset}`,async()=>{
  const buffer=await readFile(join(repoRoot,asset));
  const doc=readGLBJson(buffer);
  const nodes=doc.nodes||[],meshes=doc.meshes||[];

  // Every mesh definition must be a single primitive (one material), never a split/array material.
  for(const [index,mesh] of meshes.entries())
   assert.equal(mesh.primitives.length,1,`${asset}: mesh ${index} (${mesh.name||'unnamed'}) has ${mesh.primitives.length} primitives, expected 1`);

  // Region wrappers: nodes named exactly one of the five regions.
  const regionNodeIndices=new Map(REGIONS.map(r=>[r,[]]));
  nodes.forEach((node,index)=>{if(regionNodeIndices.has(node.name))regionNodeIndices.get(node.name).push(index);});
  for(const region of REGIONS)
   assert.equal(regionNodeIndices.get(region).length,1,`${asset}: expected exactly one node named "${region}", found ${regionNodeIndices.get(region).length}`);

  const descendants=rootIndex=>{const seen=new Set(),stack=[rootIndex];while(stack.length){const i=stack.pop();if(seen.has(i))continue;seen.add(i);for(const c of nodes[i].children||[])stack.push(c);}return seen;};
  const covered=new Set();
  for(const region of REGIONS)for(const i of descendants(regionNodeIndices.get(region)[0]))covered.add(i);

  const sceneRoots=(doc.scenes?.[doc.scene??0]?.nodes)||[];
  const reachable=new Set();
  {const stack=[...sceneRoots];while(stack.length){const i=stack.pop();if(reachable.has(i))continue;reachable.add(i);for(const c of nodes[i].children||[])stack.push(c);}}

  const orphans=[...reachable].filter(i=>nodes[i].mesh!==undefined&&!covered.has(i)).map(i=>({index:i,name:nodes[i].name}));
  assert.deepEqual(orphans,[],`${asset}: mesh-bearing node(s) not under any of the five region wrappers: ${JSON.stringify(orphans)}`);
 });
}

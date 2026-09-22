import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {compactGLB} from '../scripts/compact-models.mjs';
const parse=b=>{const n=b.readUInt32LE(12);return {doc:JSON.parse(b.subarray(20,20+n)),bin:b.subarray(28+n)};};
test('lossless compaction preserves every shipped model view and all scene data',async()=>{
 let saved=0;async function walk(dir){for(const f of await readdir(dir,{withFileTypes:true})){const path=join(dir,f.name);if(f.isDirectory()){await walk(path);continue;}if(!f.name.endsWith('.glb'))continue;
 const input=await readFile(path),output=compactGLB(input),a=parse(input),b=parse(output);saved+=input.length-output.length;
 for(let i=0;i<a.doc.bufferViews.length;i++){const x=a.doc.bufferViews[i],y=b.doc.bufferViews[i];assert.deepEqual(a.bin.subarray(x.byteOffset||0,(x.byteOffset||0)+x.byteLength),b.bin.subarray(y.byteOffset||0,(y.byteOffset||0)+y.byteLength),path);delete x.byteOffset;delete y.byteOffset;}
 delete a.doc.buffers[0].byteLength;delete b.doc.buffers[0].byteLength;assert.deepEqual(a.doc,b.doc,path);
 }}await walk('creature/models');await walk('handborne/models');assert(saved>4000000);
});

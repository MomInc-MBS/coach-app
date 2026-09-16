import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,stat} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('creature/models/roster/manifest.json',root),'utf8'));
const rosterSource=await readFile(new URL('creature/source/creator/roster.ts',root),'utf8');
const editorBundle=await readFile(new URL('creature/assets/editor.js',root),'utf8');
const phoneBundle=await readFile(new URL('creature/assets/phone.js',root),'utf8');
const worker=await readFile(new URL('sw.js',root),'utf8');

function glbJson(bytes){
 assert.equal(bytes.subarray(0,4).toString('ascii'),'glTF');
 assert.equal(bytes.readUInt32LE(4),2);
 assert.equal(bytes.readUInt32LE(8),bytes.length);
 const length=bytes.readUInt32LE(12),type=bytes.readUInt32LE(16);
 assert.equal(type,0x4e4f534a);
 return JSON.parse(bytes.subarray(20,20+length).toString('utf8').trimEnd());
}

test('all 70 roster models are intact and registered in both Coach builders',async()=>{
 assert.equal(manifest.length,70);
 assert.equal(new Set(manifest.map(item=>item.id)).size,70);
 for(const item of manifest){
  assert.match(item.id,/^roster\/[a-z0-9_-]+$/);
  const file=new URL(`creature/models/${item.id}.glb`,root);
  const bytes=await readFile(file);
  assert.equal((await stat(file)).size,item.bytes,item.id);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256,item.id);
  const json=glbJson(bytes);
  assert.equal(String(json.asset?.version).startsWith('2'),true,item.id);
  assert.ok(json.scenes?.length&&json.nodes?.length&&json.meshes?.length,item.id);
  assert.ok(rosterSource.includes(JSON.stringify(item.id)),item.id);
  assert.ok(editorBundle.includes(item.id),`editor: ${item.id}`);
  assert.ok(phoneBundle.includes(item.id),`phone: ${item.id}`);
 }
});

test('roster models stay on demand and do not inflate app installation',()=>{
 assert.doesNotMatch(worker,/creature\/models\/roster/);
 assert.doesNotMatch(worker,/MODELS\.map/);
});

test('every mandatory install file exists and the payload stays phone-sized',async()=>{
 const installSource=worker.slice(0,worker.indexOf("self.addEventListener('install'"));
 const paths=[...new Set([...installSource.matchAll(/['"](\/[^'"]+)['"]/g)].map(match=>match[1]))];
 let bytes=0;
 for(const pathname of paths)bytes+=(await stat(new URL(pathname.slice(1),root))).size;
 assert.ok(paths.length>50);
 assert.ok(bytes<32*1024*1024,`mandatory install is ${(bytes/1024/1024).toFixed(1)} MiB`);
});

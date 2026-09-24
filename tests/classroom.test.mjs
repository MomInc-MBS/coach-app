import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

for(const file of ['classroom-wall.glb','classroom-desks.glb'])test(`${file} is a self-contained glTF scene`,async()=>{
 const bytes=await readFile(new URL(`../pod/rooms/${file}`,import.meta.url));
 assert.equal(bytes.toString('ascii',0,4),'glTF');
 assert.equal(bytes.readUInt32LE(4),2);
 assert.equal(bytes.readUInt32LE(8),bytes.length);
 const json=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
 assert.ok(json.meshes?.length>0,'scene has rendered geometry');
 assert.ok(json.scenes?.[json.scene??0]?.nodes?.length>0,'scene has a root node');
 assert.ok(json.buffers?.every(buffer=>!buffer.uri),'geometry is embedded for offline use');
 assert.ok(json.images?.every(image=>!image.uri),'textures are embedded for offline use');
});

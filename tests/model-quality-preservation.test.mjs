import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
async function glb(path){
 const bytes=await readFile(new URL(path,root));
 assert.equal(bytes.readUInt32LE(0),0x46546c67,`${path}: GLB magic`);
 assert.equal(bytes.readUInt32LE(4),2,`${path}: GLB version`);
 const jsonLength=bytes.readUInt32LE(12);
 return JSON.parse(bytes.subarray(20,20+jsonLength).toString('utf8').trim());
}
function positionCount(doc){
 return (doc.meshes??[]).flatMap(mesh=>mesh.primitives??[]).reduce((sum,primitive)=>sum+doc.accessors[primitive.attributes.POSITION].count,0);
}

for(const [name,path,count] of [
 ['Ice','pod/worlds/boards/ice.glb',12712],
 ['Jelly','pod/worlds/boards/jelly.glb',10516],
 ['Wood','pod/worlds/boards/wood.glb',15325],
])test(`${name} board retains authored geometry and unquantized source textures`,async()=>{
 const doc=await glb(path);
 assert.equal(positionCount(doc),count);
 assert.deepEqual(doc.extensionsUsed??[],[]);
 assert.deepEqual(doc.extensionsRequired??[],[]);
 assert.equal(doc.images.length,3);
 assert(doc.images.every(image=>image.mimeType==='image/jpeg'));
});

test('restored board files are byte-identical to the retained authored masters',async()=>{
 for(const [name,digest] of [
  ['ice','F8C8ED42F044FAB52437FD07E6F64566FF53136F4C7704C5D80E6134E2893C95'],
  ['jelly','721CD43AB081636280ED812E7663041A98E692B1FA750BB4555F323EC0ED089E'],
  ['wood','AD801EF0C3BA7CCF845C9617D4D0AF3EB5B97ACF4A20D8AF9C4283F27582079F'],
 ]){
  const [source,runtime]=await Promise.all([
   readFile(new URL(`plan/prototypes/portal-boards/pod/worlds/boards/${name}.glb`,root)),
   readFile(new URL(`pod/worlds/boards/${name}.glb`,root)),
  ]);
  assert.deepEqual(runtime,source,`${name}: restored runtime bytes must exactly match source`);
  assert.equal(createHash('sha256').update(runtime).digest('hex').toUpperCase(),digest,`${name}: source hash`);
 }
});

test('food scanner keeps full-resolution body and named display/control geometry',async()=>{
 const doc=await glb('food/pyramid-scanner.glb');
 assert.equal(positionCount(doc),185151);
 assert(!doc.extensionsUsed?.includes('KHR_mesh_quantization'));
 const names=new Set(doc.nodes.map(node=>node.name));
 for(const name of ['body','screen_name','screen_calories','screen_protein','screen_fat','screen_carbs','screen_vitamins','lens','knob_0','knob_1','knob_2'])assert(names.has(name),`missing scanner part ${name}`);
});

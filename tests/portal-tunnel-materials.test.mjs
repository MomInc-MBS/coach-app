import test from 'node:test';
import assert from 'node:assert/strict';

const ids=['ice','grass','cogs','jelly','wood'];
const load=id=>import(`../modules/portal/portal-tunnel-${id}.mjs`);
const count=(s,c)=>[...s].filter(x=>x===c).length;

test('tunnel materials keep the shader contract: same signature, no new uniforms, balanced, flow with v',async()=>{
 for(const id of ids){
  const {material}=await load(id);
  assert(material.includes('vec3 material(float a,float v,float z,float r,float aa,vec3 base)'),id);
  assert(!/\buniform\b/.test(material),`${id} declares a uniform`);
  assert.equal(count(material,'{'),count(material,'}'),id);
  assert.equal(count(material,'('),count(material,')'),id);
  assert(/\bv\s*\*/.test(material),`${id} is not driven by the flowing v`);
 }
});

test('grass is green, not dirt: green core plus blade and flower cells',async()=>{
 const {material,core}=await load('grass');
 const [r,g,b]=[1,3,5].map(i=>parseInt(core.slice(i,i+2),16));
 assert(g>r&&g>b,core);
 assert(/blade/.test(material)&&/bloom/.test(material));
 assert(!/dirt/.test(material));
});

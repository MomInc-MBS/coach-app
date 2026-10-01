import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

async function fixture(){
 const source=await readFile(new URL('../modules/portal/portal.mjs',import.meta.url),'utf8');
 const start=source.indexOf('// One WebGL2 context'),end=source.indexOf('const rgb=',start);
 const stats={canvases:0,programs:0,deletedShaders:0,deletedPrograms:0,lost:0,used:[],current:null,viewport:[0,0,300,150]},canvases=[];
 const gl=new Proxy({
  createProgram(){return {id:++stats.programs,shaders:[]};},
  createShader(type){return {type};},shaderSource(shader,source){shader.source=source;},
  getShaderParameter(shader){return !shader.source.includes('BAD');},
  getShaderInfoLog(){return 'invalid test shader';},
  attachShader(program,shader){program.shaders.push(shader);},
  getProgramParameter(){return true;},getProgramInfoLog(){return '';},
  getParameter(name){return name==='CURRENT_PROGRAM'?stats.current:name==='VIEWPORT'?stats.viewport:null;},
  viewport(x,y,width,height){stats.viewport=[x,y,width,height];},
  useProgram(program){stats.current=program;stats.used.push(program?.id??null);},getUniformLocation(program,name){return {program:program.id,name};},
  deleteShader(){stats.deletedShaders++;},deleteProgram(){stats.deletedPrograms++;},
  getExtension(){return {loseContext(){stats.lost++;}};}
 },{get(target,key){return key in target?target[key]:/^[A-Z_]+$/.test(key)?key:()=>{};}});
 const document={createElement(){stats.canvases++;const listeners={};const canvas={width:0,height:0,getContext:()=>gl,addEventListener(type,fn){listeners[type]=fn;},remove(){},listeners};canvases.push(canvas);return canvas;}};
 const context=vm.createContext({document,console:{warn(){}},TUNNEL_VS:'vertex',tunnelFragment:material=>'fragment '+material,Uint8Array});
 const select=vm.runInContext(source.slice(start,end)+'\ntunnelGL',context);
 return {select,stats,canvases};
}
test('material programs share one context and restore their own cached uniforms',async()=>{
 const {select,stats}=await fixture(),first=select('ice'),iceUniforms=first.u;
 assert.ok(first,'first material initializes without dereferencing null state');assert.equal(stats.current.id,1);
 const jelly=select('jelly');assert.equal(first.canvas,jelly.canvas);assert.equal(first.gl,jelly.gl);assert.equal(stats.current.id,2);
 const ice=select('ice');assert.equal(ice.u,iceUniforms);assert.equal(stats.current.id,1);assert.equal(stats.canvases,1);assert.equal(stats.programs,2);
});
test('compile-only idle warmup preserves the currently active material program',async()=>{
 const {select,stats}=await fixture();select('ice');const jelly=select('jelly'),program=stats.current,active=jelly.active,uniforms=jelly.u,viewport=[...stats.viewport];
 const quilt=select('',{activate:false});
 assert.equal(quilt.canvas,jelly.canvas);assert.equal(quilt.gl,jelly.gl);assert.equal(stats.programs,3);
 assert.equal(stats.current,program,'the idle cache fill restores Jelly as CURRENT_PROGRAM');
 assert.deepEqual(stats.viewport,viewport,'the idle cache fill restores the active phase viewport');
 assert.equal(quilt.active,active);assert.equal(quilt.u,uniforms,'the active uniform map is untouched');
});
test('a failed material compile cleans its resources without losing a usable context',async()=>{
 const {select,stats}=await fixture();select('ice');const before=stats.deletedShaders;
 assert.equal(select('BAD'),null);assert.ok(stats.deletedShaders>before);assert.equal(stats.deletedPrograms,1);
 assert.equal(stats.lost,0);assert.ok(select('ice'));assert.equal(stats.canvases,1);
});
test('context loss invalidates the cache without dereferencing cleared state',async()=>{
 const {select,stats,canvases}=await fixture();select('ice');
 assert.doesNotThrow(()=>canvases[0].listeners.webglcontextlost({preventDefault(){}}));
 assert.ok(select('ice'));assert.equal(stats.canvases,2);assert.equal(stats.programs,2);
});

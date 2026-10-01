import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {chromium} from 'playwright';

test('every material compiles and links against the production tunnel shader',async()=>{
 const source=await readFile(new URL('../modules/portal/portal.mjs',import.meta.url),'utf8');
 const start=source.indexOf('const tunnelFragment='),end=source.indexOf('// One WebGL2 context',start);
 assert.ok(start>=0&&end>start,'production shader has an extractable boundary');
 const fragment=vm.runInNewContext(source.slice(start,end)+'\ntunnelFragment');
 const variants=[{id:'quilt',material:''}];
 for(const id of ['ice','jelly','cogs','wood','grass']){
  const {material}=await import('../modules/portal/portal-tunnel-'+id+'.mjs');
  variants.push({id,material});
 }
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage();
  for(const {id,material} of variants){
   const shader=fragment(material);
   if(material)assert.ok(shader.includes(material),id+' material is actually included');
   const result=await page.evaluate(fragment=>{
    const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl2');
    if(!gl)return{error:'WebGL2 unavailable'};
    const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader;};
    try{
     const vertex=compile(gl.VERTEX_SHADER,'#version 300 es\nvoid main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0.,1.);}');
     const pixel=compile(gl.FRAGMENT_SHADER,fragment),program=gl.createProgram();
     gl.attachShader(program,vertex);gl.attachShader(program,pixel);gl.linkProgram(program);
     const error=gl.getProgramParameter(program,gl.LINK_STATUS)?null:gl.getProgramInfoLog(program);
     gl.deleteProgram(program);gl.deleteShader(vertex);gl.deleteShader(pixel);return{error};
    }catch(error){return{error:String(error)};}
    finally{gl.getExtension('WEBGL_lose_context')?.loseContext();}
   },shader);
   assert.equal(result.error,null,id+' production GLSL: '+result.error);
  }
 }finally{await browser.close();}
});

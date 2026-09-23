import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';

test('opening Food loads the deployed pyramid module and model assets',async()=>{
 const root=resolve('dist/client'),seen=[];
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;seen.push(path);
  if(path==='/__test__'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><title>Scanner test</title>');return;}
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const file=resolve(root,'.'+(path==='/'?'/pose.html':path));if(!file.startsWith(root+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.glb':'model/gltf-binary'})[extname(file)]||'application/octet-stream'});res.end(body);}
  catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});
  const page=await browser.newPage(),responses=new Map(),failures=[],warnings=[];page.on('response',res=>{const path=new URL(res.url()).pathname;if(path.startsWith('/food/')||path.startsWith('/vendor/three/'))responses.set(path,res.status());});page.on('console',msg=>{if(msg.type()==='error')failures.push(msg.text());if(msg.type()==='warning')warnings.push(msg.text());});page.on('requestfailed',req=>failures.push(`${req.url()} ${req.failure()?.errorText||''}`));
  await page.goto(base+'/__test__');await page.goto(base+'/pose.html?panel=meals');
  await page.waitForFunction(()=>document.querySelector('#mealsPanel')?.open);
  await page.waitForFunction(()=>performance.getEntriesByType('resource').some(e=>new URL(e.name).pathname==='/food/pyramid-scanner.mjs'),null,{timeout:15000});
  await page.waitForFunction(()=>document.querySelector('#pyramidScanner')||performance.getEntriesByType('resource').some(e=>new URL(e.name).pathname==='/food/pyramid-scanner.glb'),null,{timeout:15000});
  assert.equal(responses.get('/food/pyramid-scanner.mjs'),200,JSON.stringify({seen,responses:[...responses]}));
  assert(seen.includes('/food/pyramid-scanner.mjs'));
  assert(responses.get('/food/pyramid-scanner.glb')===200||warnings.some(x=>x.includes('Pyramid scanner unavailable')),JSON.stringify({seen,responses:[...responses],warnings}));
  assert(!failures.some(x=>x.includes('pyramid-scanner.mjs')||x.includes('pyramid-scanner.glb')),failures.join('\n'));
  await browser.close();browser=null;
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});

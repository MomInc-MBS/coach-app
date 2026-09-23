import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';

test('Quilt portal lazily opens, closes, and re-enters without requesting non-quilt models',async()=>{
 const root=resolve('dist/client'),requests=[];
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;requests.push(path);
  if(path==='/__test__'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js"}}</script>');return;}
  try{const file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp'})[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext();
  await context.addInitScript(()=>{const original=matchMedia.bind(window);window.matchMedia=q=>q==='(prefers-reduced-motion: reduce)'?{matches:true,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},dispatchEvent(){return false}}:original(q);});
  const page=await context.newPage();page.on('console',message=>{if(message.type()==='error')console.error(message.text());});page.on('requestfailed',request=>console.error('request failed',request.url(),request.failure()?.errorText));await page.goto(`http://127.0.0.1:${server.address().port}/__test__`);
  const first=await page.evaluate(async()=>{const {openQuiltPortal}=await import('/modules/portal/portal-entry.mjs');const portal=await openQuiltPortal();return {portal:!!portal,visible:!document.getElementById('portalHome').hidden,board:portal.current()?.canvas?.isConnected??false};});
  assert(first.portal&&first.visible);assert(first.board||await page.locator('#portalHome.no-board').count(),'WebGL must either mount Quilt or degrade gracefully');
  await page.locator('#portalExitButton').click();await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===true);
  const second=await page.evaluate(async()=>{const {openQuiltPortal}=await import('/modules/portal/portal-entry.mjs');const p=await openQuiltPortal();return {visible:!document.getElementById('portalHome').hidden,count:document.querySelectorAll('#portalHome').length,canvas:document.querySelectorAll('#portalBoardHost canvas').length};});
  assert.deepEqual(second,{visible:true,count:1,canvas:first.board?1:0});
  assert(!requests.some(path=>/\/(?:ice|grass|jelly|wood|cogs|cog-kit|parts-kit)\.glb$/i.test(path)),`non-quilt model requested: ${requests.join(', ')}`);
  await context.close();
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});

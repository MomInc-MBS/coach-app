import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';

// R25 (built dist/client, 375x812): removed textures are gone from the picker, the Face tab offers the four
// new eye styles, and the Ship tab shows its viewer above the colours, pinned while they scroll.
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.glb':'model/gltf-binary'};
test('customizer R25: texture removals, new eye styles, ship viewer above its colours',{timeout:240000},async()=>{
 const root=resolve('dist/client');
 const server=createServer(async(req,res)=>{const path=new URL(req.url,'http://local').pathname;try{const body=await readFile(resolve(root,'.'+path));res.setHeader('Content-Type',TYPES[extname(path)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:375,height:812}});
  await page.addInitScript(()=>sessionStorage.setItem('myr5-ship-gate','ship-admission-v2'));
  await page.goto('http://127.0.0.1:'+server.address().port+'/creature/index.html');
  await page.waitForFunction(()=>window.myr5Companion?.ready===true,null,{timeout:90000});
  const textures=await page.evaluate(()=>[...document.querySelectorAll('#textureId option')].map(o=>[o.value,o.textContent]));
  for(const gone of ['legacy-0','legacy-21','bubble-glass'])assert.ok(!textures.some(([id])=>id===gone),gone+' is not offered');
  for(const name of ['Original MYR5','Jelly','Bubble Glass'])assert.ok(!textures.some(([,label])=>label===name),name+' is not offered');
  assert.ok(textures.some(([id])=>id==='opal-jelly')&&textures.some(([id])=>id==='glitter-resin'),'the kept twins remain');
  // Face: every eye style is a free choice that commits straight into the saved look.
  await page.click('#tab-face');
  assert.deepEqual(await page.evaluate(()=>[...document.querySelectorAll('#eye option')].map(o=>o.value)),['open','sleepy','wide','anime','squinty','bloodshot','blind']);
  for(const style of ['anime','squinty','bloodshot','blind']){
   await page.selectOption('#eye',style);
   await page.waitForFunction(s=>window.myr5Companion?.recipe?.eye===s&&window.myr5Companion.ready===true,style,{timeout:90000});
  }
  assert.equal(JSON.parse(await page.evaluate(()=>localStorage.getItem('myr5-recipe-v1'))).eye,'blind','saved without a lock');
  // Ship: the viewer comes before the colour row and stays pinned at the top while the colours scroll.
  await page.click('#tab-ship');
  const order=await page.evaluate(()=>{const p=document.getElementById('shipPreview'),c=document.getElementById('shipColourRow');return !!(p.compareDocumentPosition(c)&Node.DOCUMENT_POSITION_FOLLOWING);});
  assert.ok(order,'ship viewer precedes the colours');
  const pinned=await page.evaluate(async()=>{const scroll=document.querySelector('.console-scroll'),p=document.getElementById('shipPreview');scroll.scrollTop=scroll.scrollHeight;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const a=p.getBoundingClientRect(),s=scroll.getBoundingClientRect();return {top:a.top-s.top,height:a.height,scrolled:scroll.scrollTop>0};});
  assert.ok(pinned.scrolled,'the ship panel scrolls at phone size');
  assert.ok(pinned.top>=-1&&pinned.top<4&&pinned.height>=100,`viewer stays visible at the top: ${JSON.stringify(pinned)}`);
 }finally{await browser?.close();server.close();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';

// R19 L1-L3 (built dist/client, 375x812): unlocked items first, no body-part chips, zoom = full body -> head+eyes, always centred.
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp'};
test('customizer: unlocked first, no region chips, zoom frames the bounding box centred for two species',{timeout:180000},async()=>{
 const root=resolve('dist/client');
 const server=createServer(async(req,res)=>{const path=new URL(req.url,'http://local').pathname;try{const body=await readFile(resolve(root,'.'+path));res.setHeader('Content-Type',TYPES[extname(path)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:375,height:812}});
  await page.addInitScript(()=>sessionStorage.setItem('myr5-ship-gate','ship-admission-v2'));
  await page.goto('http://127.0.0.1:'+server.address().port+'/creature/index.html');
  await page.waitForFunction(()=>window.myr5Companion?.ready===true,null,{timeout:60000});
  // L2: no chips on the Colour tab.
  await page.click('#tab-materials');
  assert.equal(await page.locator('#parts,[data-region]').count(),0,'no body-part chips');
  // L1: in every list no locked entry precedes an unlocked one.
  const order=await page.evaluate(()=>{const lockedFirst=a=>{let seen=false;for(const l of a){if(l)seen=true;else if(seen)return true;}return false;};
   return {grids:[...document.querySelectorAll('#colorSwatches .material-grid')].map(g=>lockedFirst([...g.children].map(b=>b.hasAttribute('data-locked')))),
    textures:lockedFirst([...document.querySelectorAll('#textureId option')].map(o=>o.textContent.startsWith('🔒'))),
    bodies:[...document.querySelectorAll('#body optgroup')].map(g=>lockedFirst([...g.children].map(o=>o.textContent.startsWith('🔒')))),
    anyLocked:document.querySelectorAll('#colorSwatches [data-locked]').length>0};});
  assert.ok(order.anyLocked,'fixture has locked swatches');
  assert.ok(!order.grids.some(Boolean),'swatch rows');assert.ok(!order.textures,'textures');assert.ok(!order.bodies.some(Boolean),'bodies');
  // L3: zoom extremes, two species.
  const frame=z=>page.evaluate(async z=>{const v=window.myr5Companion.viewer,el=document.getElementById('zoom');el.value=String(z);el.dispatchEvent(new Event('input'));v.camera.updateMatrixWorld(true);
   const ndc=box=>{const xs=[],ys=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const zz of [box.min.z,box.max.z]){const p=box.min.clone().set(x,y,zz).project(v.camera);xs.push(p.x);ys.push(p.y);}return {x0:Math.min(...xs),x1:Math.max(...xs),y0:Math.min(...ys),y1:Math.max(...ys)};};
   const head=v.regionBoxes.get('head').clone();const eye=v.regionBoxes.get('eye');if(!eye.isEmpty())head.union(eye);return {body:ndc(v.bodyBounds),head:ndc(head),tx:v.orbit.target.y,min:v.bodyBounds.min.y,max:v.bodyBounds.max.y};},z);
  const bodies=await page.evaluate(()=>[...document.querySelectorAll('#body option')].filter(o=>!o.textContent.startsWith('🔒')).slice(0,2).map(o=>o.value));
  assert.equal(bodies.length,2);
  for(const id of bodies){
   await page.click('#tab-body');await page.selectOption('#body',id);await page.waitForFunction(()=>window.myr5Companion.ready===true);
   const lo=await frame(0);
   assert.ok(lo.body.y0>-1&&lo.body.y1<1&&lo.body.x0>-1&&lo.body.x1<1,id+': full body inside the frame with a margin '+JSON.stringify(lo.body));
   assert.ok(Math.abs((lo.body.y0+lo.body.y1)/2)<.15&&Math.abs((lo.body.x0+lo.body.x1)/2)<.15,id+': full body centred');
   const hi=await frame(1);
   assert.ok(hi.head.y0>-1&&hi.head.y1<1&&hi.head.x0>-1&&hi.head.x1<1,id+': head+eyes fully visible '+JSON.stringify(hi.head));
   assert.ok(Math.abs((hi.head.y0+hi.head.y1)/2)<.15&&Math.abs((hi.head.x0+hi.head.x1)/2)<.15,id+': head centred');
   assert.ok(hi.head.y1-hi.head.y0>lo.head.y1-lo.head.y0,id+': max zoom is closer');
   const mid=await frame(.5);assert.ok(mid.tx>lo.tx&&mid.tx<hi.tx||mid.tx<lo.tx&&mid.tx>hi.tx||Math.abs(hi.tx-lo.tx)<1e-6,id+': target interpolates');
  }
  assert.equal(await page.locator('#zoom').inputValue(),'0.5');
 }finally{await browser?.close();server.close();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {createDJPreviewServer} from '../scripts/actual-dj-preview.mjs';

// Native decoder, shipped Butterchurn and actual WebGL2 state. A screenshot alone
// at DPR1 hid the output-viewport mismatch on phones with a denser display.
for(const dpr of [1,2,3])test(`Butterchurn covers backing pixels at DPR${dpr} through panel and fullscreen rotations`,{timeout:90000},async t=>{
 const server=createDJPreviewServer();await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 t.after(async()=>{await browser.close();server.closeAllConnections();await new Promise(done=>server.close(done));});
 const context=await browser.newContext({viewport:{width:375,height:812},deviceScaleFactor:dpr,reducedMotion:'reduce'});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/actual-dj-preview`);await page.locator('.dj-more').click();await page.locator('.dj-tabs [data-view=mix]').click();
 await page.waitForFunction(()=>!document.querySelector('.dj-auto')?.disabled);
 await page.locator('[data-deck=a] .dj-play').click();await page.locator('[data-deck=a] .dj-loop').selectOption('4');
 await page.locator('.dj-tabs [data-view=visuals]').click();await page.waitForFunction(()=>document.querySelector('.dj-visual-status')?.textContent.includes('Butterchurn'));
 await mkdir('.actual-dj',{recursive:true});
 async function verify(label,fullscreen=false){
  await page.waitForFunction(()=>{
   const c=document.querySelector('.dj-visual-canvas'),g=c?.getContext('webgl2');if(!g)return false;
   const b=c.getBoundingClientRect(),r=Math.min(devicePixelRatio||1,1.5),v=g.getParameter(g.VIEWPORT);
   return c.width===Math.max(1,Math.round(b.width*r))&&c.height===Math.max(1,Math.round(b.height*r))&&v[0]===0&&v[1]===0&&v[2]===g.drawingBufferWidth&&v[3]===g.drawingBufferHeight;
  },null,{timeout:10000});
  const state=await page.locator('.dj-visual-canvas').evaluate(c=>{const g=c.getContext('webgl2'),b=c.getBoundingClientRect();return {dpr:devicePixelRatio,css:[b.width,b.height],backing:[c.width,c.height],drawingBuffer:[g.drawingBufferWidth,g.drawingBufferHeight],viewport:Array.from(g.getParameter(g.VIEWPORT)),error:g.getError(),fullscreen:document.fullscreenElement===c.parentElement};});
  assert.equal(state.dpr,dpr);assert.equal(state.error,0);assert.equal(state.fullscreen,fullscreen);assert.deepEqual(state.viewport,[0,0,...state.backing]);
  await page.screenshot({path:`.actual-dj/resize-dpr${dpr}-${label}.png`});t.diagnostic(`${label}: ${JSON.stringify(state)}`);
 }
 await verify('panel-portrait');
 await page.setViewportSize({width:812,height:375});await verify('panel-landscape');
 await page.locator('.dj-fullscreen').click();await page.waitForFunction(()=>!!document.fullscreenElement);await verify('fullscreen-landscape',true);
 await page.setViewportSize({width:375,height:812});await verify('fullscreen-portrait',true);
 await page.evaluate(()=>document.exitFullscreen());await page.waitForFunction(()=>!document.fullscreenElement);await verify('panel-return');
 await page.locator('.dj-scene').selectOption('tunnel');await page.waitForFunction(()=>document.querySelector('.dj-visual-status')?.textContent.includes('glass corridor'));await verify('preset-change');
 await page.locator('.dj-tabs [data-view=mix]').click();await page.locator('.dj-tabs [data-view=visuals]').click();await verify('tab-return');
 assert.deepEqual(errors,[]);
});

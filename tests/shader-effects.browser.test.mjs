import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {previewServer} from '../scripts/shader-preview.mjs';
const server=previewServer('.');let browser,base;
test.before(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`;browser=await chromium.launch({channel:'msedge',headless:true});});
test.after(async()=>{await browser?.close();server.close();});
async function fixture({reducedMotion='no-preference',gpu=true,late=false}={}){
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion});
 const page=await context.newPage();
 await page.route('**/__shaders__',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/shader-effects.css"><body><dialog id="room"><section id="target" style="position:relative;width:280px;height:200px"><button id="control">Tap</button></section></dialog></body>'}));
 await page.addInitScript(({gpu,late})=>{
  Object.defineProperty(navigator,'gpu',{configurable:true,value:gpu?{}:undefined});
  window.metrics={mounted:0,destroyed:0,resized:0,taps:0}; window.late=late;
 },{gpu,late});
 await page.goto(base+'/__shaders__');
 await page.evaluate(async()=>{
  const {startShaderEffects}=await import('/shader-effects.mjs');
  const make=()=>{metrics.mounted++;return{destroy(){metrics.destroyed++;},resize(){metrics.resized++;},getFailureReason:()=>null};};
  const loadRuntime=async()=>({createShader:()=>late?new Promise(resolve=>{window.finishGPU=()=>resolve(make());}):Promise.resolve(make())});
  document.getElementById('control').onclick=()=>metrics.taps++;
  window.manager=startShaderEffects({loadRuntime,targets:[{name:'test',selector:'#target',priority:10,components:()=>[{type:'Aurora'}]}]});
  document.getElementById('room').showModal();
 });
 return {context,page};
}
test('one decorative canvas; controls work; close/reopen and camera tracking release GPU',async()=>{
 const {context,page}=await fixture();try{
  await page.waitForFunction(()=>metrics.mounted===1);assert.equal(await page.locator('.shaders-layer').count(),1);
  await page.locator('#control').click();assert.equal(await page.evaluate(()=>metrics.taps),1);
  await page.evaluate(()=>document.getElementById('room').close());await page.waitForFunction(()=>metrics.destroyed===1);
  assert.equal(await page.locator('.shaders-layer').count(),0);
  await page.evaluate(()=>document.getElementById('room').showModal());await page.waitForFunction(()=>metrics.mounted===2);
  await page.evaluate(()=>document.body.dataset.cameraWorkout='true');await page.waitForFunction(()=>metrics.destroyed===2);
  assert.equal(await page.locator('.shaders-layer').count(),0);
  await page.evaluate(()=>{delete document.body.dataset.cameraWorkout;});await page.waitForFunction(()=>metrics.mounted===3);
  await page.evaluate(()=>manager.dispose());assert.equal(await page.evaluate(()=>metrics.destroyed),3);
 }finally{await context.close();}
});
test('reduced motion and unsupported GPU preserve fallback without loading runtime',async()=>{
 for(const config of [{reducedMotion:'reduce'},{gpu:false}]){
  const {context,page}=await fixture(config);try{await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>metrics.mounted),0);assert.equal(await page.locator('.shaders-layer').count(),0);await page.locator('#control').click();assert.equal(await page.evaluate(()=>metrics.taps),1);}finally{await context.close();}
 }
});
test('late async GPU cannot resurrect a closed panel',async()=>{
 const {context,page}=await fixture({late:true});try{
  await page.waitForFunction(()=>!!window.finishGPU);await page.evaluate(()=>document.getElementById('room').close());
  await page.waitForFunction(()=>!document.querySelector('.shaders-layer'));await page.evaluate(()=>finishGPU());
  await page.waitForFunction(()=>metrics.destroyed===1);assert.equal(await page.locator('.shaders-layer').count(),0);
 }finally{await context.close();}
});

test('TV power and game download overlay hold GPU until the scene is ready',async()=>{
 const {context,page}=await fixture();try{
  await page.waitForFunction(()=>metrics.mounted===1);
  await page.evaluate(()=>{const tv=document.createElement('div');tv.id='tv';tv.dataset.state='off';document.getElementById('target').before(tv);tv.append(document.getElementById('target'));});
  await page.waitForFunction(()=>metrics.destroyed===1);
  assert.equal(await page.locator('.shaders-layer').count(),0);
  await page.evaluate(()=>document.getElementById('tv').dataset.state='on');
  await page.waitForFunction(()=>metrics.mounted===2);
  await page.evaluate(()=>{const loading=document.createElement('div');loading.id='mbs-game-loading';document.body.append(loading);});
  await page.waitForFunction(()=>metrics.destroyed===2);
  await page.evaluate(()=>document.getElementById('mbs-game-loading').remove());
  await page.waitForFunction(()=>metrics.mounted===3);
  await page.locator('#control').click();assert.equal(await page.evaluate(()=>metrics.taps),1);
 }finally{await context.close();}
});
test('brief reveal expires once and rearms after the next reveal',async()=>{
 const {context,page}=await fixture();try{
  await page.waitForFunction(()=>metrics.mounted===1);
  await page.evaluate(async()=>{
   manager.dispose();const {startShaderEffects}=await import('/shader-effects.mjs');
   const host=document.getElementById('target');host.dataset.phase='reveal';
   manager=startShaderEffects({targets:[{selector:'#target[data-phase="reveal"]',name:'sparkle',durationMs:120,components:()=>[]}],loadRuntime:async()=>({createShader:async()=>{metrics.mounted++;return{destroy(){metrics.destroyed++;},resize(){},getFailureReason:()=>null};}})});
  });
  await page.waitForFunction(()=>metrics.mounted===2&&metrics.destroyed===2);
  await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>metrics.mounted),2);
  await page.evaluate(()=>{const host=document.getElementById('target');host.dataset.phase='waiting';host.dataset.phase='reveal';});
  await page.waitForFunction(()=>metrics.mounted===3&&metrics.destroyed===3);
  await page.evaluate(()=>window.dispatchEvent(new Event('myr5:account-cleared')));
  await page.waitForFunction(()=>metrics.mounted===4);
 }finally{await context.close();}
});

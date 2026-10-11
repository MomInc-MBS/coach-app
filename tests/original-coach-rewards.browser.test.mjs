import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname,resolve,sep} from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright';

const root=resolve('.');
const otherCoach='roster/23-blob-texture-bodies--blob_creature_3d_model';
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.glb':'model/gltf-binary','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};

test('earned cosmetics inherit to original MYR5 and reveal on its real model without saving the equipped look', {timeout:90000}, async()=>{
 const bootstrap=await build({
  stdin:{resolveDir:root,sourcefile:'original-coach-rewards-browser-harness.ts',contents:`
   import {mountCosmeticRewardReveal} from './cosmetic-reward-reveal.mjs';
   import * as unlocks from './creature/source/creator/unlock-store.ts';
   import * as materials from './creature/source/creator/materials-registry.ts';
   window.qa={...unlocks,...materials,mount:mountCosmeticRewardReveal};
  `},bundle:true,write:false,format:'esm',target:'es2022',external:['three']
 });
 const preview=await build({entryPoints:['creature/source/reward-preview.ts'],bundle:true,write:false,format:'esm',target:'es2022'});
 const html=`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js"}}</script><script>window.myr5AuthenticatedAccount={user:{id:'qa-owner-a'},dataEpoch:1};</script><main id="test"></main><script type="module" src="/qa-bootstrap.js"></script>`;
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://qa').pathname;
  if(path==='/'){res.writeHead(302,{Location:'/test.html'});res.end();return;}
  if(path==='/test.html'){res.writeHead(200,{'Content-Type':'text/html'});res.end(html);return;}
  if(path==='/qa-bootstrap.js'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(bootstrap.outputFiles[0].contents);return;}
  if(path==='/creature/assets/reward-preview.js'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(preview.outputFiles[0].contents);return;}
  try{const file=resolve(root,'.'+decodeURIComponent(path));if(file!==root&&!file.startsWith(root+sep))throw Error('outside root');const bytes=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});res.end(bytes);}
  catch{if(!res.headersSent){res.writeHead(404);res.end('not found');}else res.destroy();}
 });
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const page=await browser.newPage({viewport:{width:430,height:932},deviceScaleFactor:1});
  const errors=[],failed=[];page.on('pageerror',error=>errors.push(String(error)));page.on('console',message=>{if(message.type()==='error')failed.push({console:message.text()});});page.on('requestfailed',request=>failed.push({url:request.url(),error:request.failure()?.errorText}));page.on('response',response=>{if(response.status()>=400)failed.push({url:response.url(),status:response.status()});});
  await page.goto(`http://127.0.0.1:${server.address().port}/test.html`,{waitUntil:'domcontentloaded'});
  const recipe=JSON.stringify({version:1,styles:{head:0,eye:0,collar:0,body:0,arms:0,feet:0},eye:'open',fur:1,iris:1,pupil:'round',pupilSize:1,detail:1,coach:'supportive',shipId:'supportive',shipColor:null,fingers:4,toes:3,eyeLayout:'single',body:otherCoach,headFrom:otherCoach,armsFrom:otherCoach,feetFrom:otherCoach});
  await page.evaluate(value=>localStorage.setItem('myr5-recipe-v1',value),recipe);
  const seeded=await page.evaluate(coach=>{
   const {grantUnlock,isGranted,grantedIds}=window.qa;
   grantUnlock('color','legacy-color-3',coach);
   return {inherited:isGranted('color','legacy-color-3','myr5'),otherCoach:isGranted('color','legacy-color-3','another-coach'),ids:grantedIds('color','myr5')};
  },otherCoach);
  assert.equal(seeded.inherited,true,'a previously earned coach color is available to original MYR5');
  assert.equal(seeded.otherCoach,false,'inheritance does not unlock a different non-original coach');
  assert(seeded.ids.includes('legacy-color-3'),'the original coach lists inherited colors');
  await page.evaluate(()=>window.qa.dispose=window.qa.mount());

  await page.evaluate(coach=>window.qa.grantUnlock('texture','chest-plate-steel',coach),otherCoach);
  const card=page.locator('.cosmetic-reward-reveal');await card.waitFor();
  try{await page.waitForFunction(()=>document.querySelector('.original-coach-reward-stage')?.dataset.ready==='true',{timeout:12000});}catch(error){const state=await page.evaluate(()=>({stage:document.querySelector('.original-coach-reward-stage')?.outerHTML,status:document.querySelector('.cosmetic-reward-reveal [role=status]')?.textContent,granted:window.qa.isGranted('texture','chest-plate-steel','myr5')}));throw Error(`${error.message}; preview=${JSON.stringify(state)}; errors=${JSON.stringify(errors)}; failed=${JSON.stringify(failed)}`);}
  const texture=await page.evaluate(()=>{
   const stage=document.querySelector('.original-coach-reward-stage'),canvas=stage.querySelector('canvas'),card=document.querySelector('.cosmetic-reward-reveal');
   return {stage:{...stage.dataset},canvas:{width:canvas.width,height:canvas.height,webgl:!!(canvas.getContext('webgl2')||canvas.getContext('webgl'))},color:getComputedStyle(card).getPropertyValue('--reward-color').trim(),name:document.querySelector('.reward-name').textContent,recipe:localStorage.getItem('myr5-recipe-v1')};
  });
  assert.deepEqual(texture.stage,{ready:'true',body:'myr5',kind:'texture',rewardId:'chest-plate-steel'});
  assert(texture.canvas.width>0&&texture.canvas.height>0&&texture.canvas.webgl,'the preview is a live WebGL-rendered 3D model');
  assert.equal(texture.color,'#ff9c36','textures use orange');
  assert.equal(texture.recipe,recipe,'showing a reward does not save over the equipped recipe');

  await page.evaluate(coach=>window.qa.grantUnlock('palette','pal-01',coach),otherCoach);
  await page.locator('.cosmetic-reward-reveal [data-next]').click();
  await page.waitForFunction(()=>{const stage=document.querySelector('.original-coach-reward-stage');return stage?.dataset.ready==='true'&&stage.dataset.kind==='palette';},{timeout:45000});
  const palette=await page.evaluate(()=>({stage:{...document.querySelector('.original-coach-reward-stage').dataset},color:getComputedStyle(document.querySelector('.cosmetic-reward-reveal')).getPropertyValue('--reward-color').trim(),recipe:localStorage.getItem('myr5-recipe-v1')}));
  assert.equal(palette.stage.body,'myr5');assert.equal(palette.stage.rewardId,'pal-01');
  assert.equal(palette.color,'#4bafff','multi-color palettes use blue');
  assert.equal(palette.recipe,recipe,'the queued preview also preserves the equipped recipe');

  await page.evaluate(coach=>window.qa.grantUnlock('color','default-ruby',coach),otherCoach);
  await page.locator('.cosmetic-reward-reveal [data-next]').click();
  await page.waitForFunction(()=>{const stage=document.querySelector('.original-coach-reward-stage');return stage?.dataset.ready==='true'&&stage.dataset.kind==='color';},{timeout:45000});
  const singleColor=await page.evaluate(()=>({stage:{...document.querySelector('.original-coach-reward-stage').dataset},color:getComputedStyle(document.querySelector('.cosmetic-reward-reveal')).getPropertyValue('--reward-color').trim(),recipe:localStorage.getItem('myr5-recipe-v1')}));
  assert.equal(singleColor.stage.rewardId,'default-ruby');
  assert.equal(singleColor.color,'#76e356','a single color uses green');
  assert.equal(singleColor.recipe,recipe,'a single-color preview also preserves the equipped recipe');

  await page.evaluate(()=>{window.myr5AuthenticatedAccount={user:{id:'qa-owner-b'},dataEpoch:1};window.dispatchEvent(new CustomEvent('myr5:account-ready',{detail:window.myr5AuthenticatedAccount}));});
  await page.waitForFunction(()=>!document.querySelector('.cosmetic-reward-reveal'));
  assert.equal(await page.evaluate(()=>window.qa.isGranted('texture','chest-plate-steel','myr5')),false,'owner changes cannot see the prior owner’s grant');
  assert.deepEqual(errors,[],'the reveal and model load without uncaught page errors');
 }finally{
  await browser?.close();server.closeAllConnections();await new Promise(done=>server.close(done));
 }
});

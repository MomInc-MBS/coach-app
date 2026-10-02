import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';

// R18 lane F (built dist/client, 375x812): close-up coach + zoom slider, no Sparkle/Metallic, no Motion/Coach tabs, icon-only Files buttons.
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp'};
test('customizer: coach fills ~80% of the preview, zoom slider clamps, trimmed tabs, icon file buttons, finish forced to 0',{timeout:120000},async()=>{
 const root=resolve('dist/client');
 const server=createServer(async(req,res)=>{const path=new URL(req.url,'http://local').pathname;try{const body=await readFile(resolve(root,'.'+path));res.setHeader('Content-Type',TYPES[extname(path)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:375,height:812}});
  // An old save with non-zero finish and a motion record still loads.
  await page.addInitScript(()=>{sessionStorage.setItem('myr5-ship-gate','ship-admission-v2');localStorage.setItem('myr5-motion-v1','{"amount":.5,"ambient":false,"reduced":false}');localStorage.setItem('myr5-recipe-v1',JSON.stringify({version:1,styles:{head:0,eye:0,collar:0,body:0,arms:0,feet:0},eye:'open',fur:1,iris:1,pupil:'round',pupilSize:1,detail:1,coach:'calm',fingers:4,toes:3,eyeLayout:'single',body:'myr5',headFrom:'myr5',armsFrom:'myr5',feetFrom:'myr5',materials:{body:{textureId:'flat',colorId:'#ff3b30',sparkle:.8,metallic:.6}}}));});
  await page.goto('http://127.0.0.1:'+server.address().port+'/creature/index.html');
  await page.waitForFunction(()=>window.myr5Companion?.ready===true,null,{timeout:60000});
  assert.deepEqual(await page.locator('.menu-tabs [role=tab]:not([hidden])').allTextContents(),['Species','Colour','Face','Files']);
  for(const id of ['#sparkle','#metallic','#tab-motion','#tab-coach','#panel-coach','#coach','.cage-bays','.cage-offer'])assert.equal(await page.locator(id).count(),0,id);
  const finish=await page.evaluate(()=>window.myr5Companion.recipe.materials.body);
  assert.equal(finish.sparkle,0);assert.equal(finish.metallic,0);assert.equal(await page.evaluate(()=>window.myr5Companion.recipe.coach),'calm','the personality choice is kept');
  // Silhouette height (floor hidden, paused) ~80% of the canvas, then zoom limits.
  const measure=()=>page.evaluate(async()=>{const v=window.myr5Companion.viewer;v.floorObjects.forEach(o=>o.visible=false);v.setPaused(true);
   v.renderer.render(v.scene,v.camera);await new Promise(r=>setTimeout(r,80));v.renderer.render(v.scene,v.camera);
   const cv=v.renderer.domElement,t=document.createElement('canvas');t.width=cv.width;t.height=cv.height;const x=t.getContext('2d');x.drawImage(cv,0,0);const d=x.getImageData(0,0,t.width,t.height).data;let top=1e9,bot=-1;
   for(let y=0;y<t.height;y++)for(let i=0;i<t.width;i++)if(d[(y*t.width+i)*4+3]>40){top=Math.min(top,y);bot=Math.max(bot,y);}
   return {fill:(bot-top+1)/t.height,dist:v.camera.position.distanceTo(v.orbit.target)};});
  const home=await measure();assert.ok(home.fill>=.5&&home.fill<=.88,'R19: full body (zoom 0) fills most of the preview height with a margin: '+home.fill);
  const set=v=>page.evaluate(v=>{const z=document.getElementById('zoom');z.value=String(v);z.dispatchEvent(new Event('input'));return z.value;},v);
  assert.equal(await set(99),'1','slider is clamped by its range');assert.ok((await measure()).dist<home.dist*.85,'zoom in moves the camera closer');
  assert.equal(await page.evaluate(()=>window.myr5Companion.viewer.setZoom(99)),1);assert.equal(await page.evaluate(()=>window.myr5Companion.viewer.setZoom(-5)),0,'viewer clamps too');
  await set(0);assert.ok(Math.abs((await measure()).dist-home.dist)<.01,'R19: zoom 0 is the full-body home framing');
  await page.click('#zoomIn');assert.equal(await page.locator('#zoom').inputValue(),'0.1');
  // Files tab: four small icon-only buttons with label + title, same ids.
  await page.click('#tab-files');
  for(const id of ['exportRecipe','exportGLB','original']){const b=page.locator('#'+id);assert.ok(await b.getAttribute('aria-label'),id);assert.ok(await b.getAttribute('title'),id);assert.equal(await b.innerText(),'',id+' has no big text');const r=await b.boundingBox();assert.ok(r.width<=56&&r.height<=56,id+' is small');}
  assert.ok(await page.locator('label[for=importFile]').getAttribute('aria-label'));assert.equal(await page.locator('#importFile').count(),1);
 }finally{await browser?.close();server.close();}
});

test('the personality chooser lives in Reminders on the same recipe key; the customizer no longer reads it',async()=>{
 const hub=await readFile('coach-hub.mjs','utf8'),wb=await readFile('creature/source/editor-workbench.ts','utf8');
 assert.match(hub,/name="personality"/);assert.match(hub,/myr5-recipe-v1/);assert.match(hub,/coaching\.ts/);
 assert.doesNotMatch(wb,/\$\('coach(Tone|Line|Situation)?'\)/);
});

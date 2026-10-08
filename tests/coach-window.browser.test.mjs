import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';

const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.glb':'model/gltf-binary'};
const geometry=()=>{
 const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};};
 const bay=document.querySelector('.preview-bay'),stage=document.querySelector('.preview-stage'),canvas=stage.querySelector('canvas'),scroll=document.querySelector('.console-scroll'),grid=document.querySelector('#panel-textures .texture-grid'),header=document.querySelector('.texture-menu-header'),s=scroll.getBoundingClientRect();
 const visible=[...grid.querySelectorAll('button')].filter(el=>{const r=el.getBoundingClientRect();return r.top>=s.top-1&&r.bottom<=s.bottom+1;}).length;
 return {bay:rect(bay),stage:rect(stage),canvas:rect(canvas),scroll:rect(scroll),header:rect(header),dropdown:rect(document.querySelector('#textureId')),outsideScroll:!scroll.contains(header),gridOverflow:getComputedStyle(grid).overflowY,gridScrollHeight:grid.scrollHeight,gridClientHeight:grid.clientHeight,visible,scrollTop:scroll.scrollTop,documentWidth:document.documentElement.scrollWidth,zoom:Number(document.querySelector('#zoom').value),viewerZoom:window.myr5Companion.viewer.zoom,space:!!window.myr5Companion.viewer.scene.getObjectByName('coach-preview-space')};
};

test('coach window fills the mobile pane, reveals on touch, and keeps adaptations visible',{timeout:240000},async()=>{
 const root=resolve('dist/client'),artifacts=resolve('.coach-window');await mkdir(artifacts,{recursive:true});
 const server=createServer(async(req,res)=>{const path=new URL(req.url,'http://local').pathname;try{const body=await readFile(resolve(root,'.'+path));res.setHeader('Content-Type',TYPES[extname(path)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const results=[];
 try{
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});
  const page=await browser.newPage({viewport:{width:375,height:812},hasTouch:true});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>sessionStorage.setItem('myr5-ship-gate','ship-admission-v2'));
  await page.goto(`http://127.0.0.1:${server.address().port}/creature/index.html`);
  await page.waitForFunction(()=>window.myr5Companion?.ready===true,null,{timeout:30000}).catch(async error=>{console.log('Editor startup',await page.evaluate(()=>({url:location.href,status:document.querySelector('#creatureStatus')?.textContent,companion:!!window.myr5Companion})),errors);throw error;});
  assert.equal(await page.evaluate(()=>window.myr5Companion.viewer.zoom),.94);
  // SwiftShader shares this machine with other release checks; keep real touch checks responsive.
  await page.evaluate(()=>window.myr5Companion.viewer.setMaxFps(12));
  await page.click('#tab-textures');
  await page.waitForFunction(()=>document.querySelector('.preview-bay').dataset.idle==='true');await page.waitForTimeout(300);
  await page.screenshot({path:resolve(artifacts,'375x812-idle.png')});
  assert.equal(await page.locator('.preview-toolbar').evaluate(el=>getComputedStyle(el).opacity),'0');
  // Tapping the sleeping window wakes its glass without triggering a hidden control.
  const pausedBefore=await page.evaluate(()=>window.myr5Companion.viewer.paused);
  await page.locator('.preview-bay').tap({position:{x:25,y:25}});
  assert.equal(await page.locator('.preview-toolbar').evaluate(el=>getComputedStyle(el).opacity),'1');
  assert.equal(await page.evaluate(()=>window.myr5Companion.viewer.paused),pausedBefore);
  await page.screenshot({path:resolve(artifacts,'375x812-touched.png')});
  for(const viewport of [{width:375,height:812},{width:390,height:844},{width:375,height:667},{width:812,height:375}]){
   await page.setViewportSize(viewport);
   for(const skins of [false,true]){
    await page.evaluate(show=>document.querySelector('#tab-skin').hidden=!show,skins);
    await page.evaluate(()=>document.querySelector('.console-scroll').scrollTop=0);await page.waitForTimeout(120);
    const first=await page.evaluate(geometry);
    await page.evaluate(()=>{const buttons=[...document.querySelectorAll('#panel-textures .texture-grid button')],top=buttons[0].getBoundingClientRect().top,next=buttons.find(button=>button.getBoundingClientRect().top>top+1);document.querySelector('.console-scroll').scrollTop=next.getBoundingClientRect().top-top;});await page.waitForTimeout(120);
    const scrolled=await page.evaluate(geometry);results.push({viewport,skins,first,scrolled});
    await writeFile(resolve(artifacts,'geometry.json'),JSON.stringify(results,null,2));
    assert.ok(scrolled.outsideScroll,'adaptations header is outside scrolling tiles');
    assert.ok(Math.abs(first.dropdown.y-scrolled.dropdown.y)<1,'dropdown remains fixed while scrolling');
    assert.ok(first.visible>=2&&scrolled.visible>=2,`at least two complete tiles before and after scrolling: ${JSON.stringify({viewport,skins,first,scrolled})}`);
    assert.equal(scrolled.gridOverflow,'visible');assert.ok(scrolled.gridClientHeight>=scrolled.gridScrollHeight-1,'tiles have no nested vertical scrollbar');
    assert.ok(first.documentWidth<=viewport.width,'no document overflow');
    for(const key of ['width','height'])assert.ok(Math.abs(first.stage[key]-(first.bay[key]-6))<=1,`stage fills bay ${key}`);
    assert.ok(Math.abs(first.stage.height-first.canvas.height)<1,'renderer fills stage height');
    assert.ok(first.space,'space landscape belongs to preview');
   }
  }
  await page.setViewportSize({width:375,height:812});await page.evaluate(()=>document.querySelector('#tab-skin').hidden=true);
  await page.waitForTimeout(300);
  const touchControl=async selector=>{await page.locator('.preview-bay').tap({position:{x:25,y:25}});const box=await page.locator(selector).boundingBox();await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);};
  await touchControl('#back');assert.equal(await page.evaluate(()=>window.myr5Companion.viewer.side),-1);
  await touchControl('#front');assert.equal(await page.evaluate(()=>window.myr5Companion.viewer.side),1);
  await touchControl('#pauseMotion');assert.equal(await page.evaluate(()=>window.myr5Companion.viewer.paused),true);
  await touchControl('#pauseMotion');assert.equal(await page.evaluate(()=>window.myr5Companion.viewer.paused),false);
  await touchControl('#zoomOut');assert.ok(Math.abs(await page.evaluate(()=>window.myr5Companion.viewer.zoom)-.84)<.001);
  await touchControl('#zoomIn');assert.ok(Math.abs(await page.evaluate(()=>window.myr5Companion.viewer.zoom)-.94)<.001);
  // The first texture without a lock uses the normal commit/save path.
  await page.locator('#panel-textures .texture-grid button:not(:has(.texture-tile-lock))').first().click();
  await page.waitForFunction(()=>window.myr5Companion.ready);
  const saved=await page.evaluate(()=>localStorage.getItem('myr5-recipe-v1'));assert.ok(saved,'free adaptation saves');
  await page.reload();await page.waitForFunction(()=>window.myr5Companion?.ready,null,{timeout:90000});
  assert.deepEqual(await page.evaluate(()=>JSON.parse(JSON.stringify(window.myr5Companion.recipe))),JSON.parse(saved),'saved look returns on reload');
  await page.evaluate(()=>window.myr5Companion.viewer.setMaxFps(12));
  await page.click('#tab-textures');await page.waitForFunction(()=>document.querySelector('.preview-bay').dataset.idle==='true');await page.waitForTimeout(300);await page.screenshot({path:resolve(artifacts,'375x812-saved-idle.png')});
  // Locked Arnoid is previewed through the existing selector, without granting it ownership.
  await page.click('#tab-body');
  const arnoid=page.locator('#panel-body button[data-body="roster/02-taper-tallstalk--humanoid_robot_3d_model1"]');
  await arnoid.evaluate(button=>button.scrollIntoView({block:'center',behavior:'instant'}));await page.waitForTimeout(150);
  const arnoidBox=await arnoid.boundingBox();await page.touchscreen.tap(arnoidBox.x+arnoidBox.width/2,arnoidBox.y+arnoidBox.height/2);
  await page.waitForFunction(()=>window.myr5Companion.ready&&document.querySelector('#coachDisplayName').textContent.includes('Arnoid'),null,{timeout:90000});
  await page.click('#tab-textures');await page.waitForFunction(()=>document.querySelector('.preview-bay').dataset.idle==='true');await page.waitForTimeout(300);
  await page.screenshot({path:resolve(artifacts,'375x812-arnoid-idle.png')});
  await page.locator('.preview-bay').tap({position:{x:25,y:25}});await page.screenshot({path:resolve(artifacts,'375x812-arnoid-touched.png')});
  assert.equal(await page.evaluate(()=>localStorage.getItem('myr5-recipe-v1')),saved,'Arnoid preview does not overwrite owned saved look');
  assert.deepEqual(errors,[]);await writeFile(resolve(artifacts,'geometry.json'),JSON.stringify(results,null,2));
 }finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
});

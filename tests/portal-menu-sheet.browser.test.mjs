import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';

async function withPortal(run){
 const source=resolve('.'),built=resolve('dist/client');
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/__portal__'){
   res.setHeader('Content-Type','text/html');
   res.end('<!doctype html><style>body{margin:0}</style><button id="background">Coach</button>'+
    '<button class="meditation-entry" onclick="document.querySelector(\'.meditation-panel\').showModal()">Meditate</button>'+
    '<dialog class="meditation-panel">Breathe<button id="meditationClose" onclick="this.closest(\'dialog\').close()">Close</button></dialog>'+
    '<script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/loaders/GLTFLoader.js":"/vendor/three/GLTFLoader.js","three/addons/libs/meshopt_decoder.module.js":"/vendor/three/meshopt_decoder.module.js"}}</script>');
   return;
  }
  try{const root=path.startsWith('/modules/portal/')?source:built,file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{browser=await chromium.launch({channel:'msedge',headless:true});await run(browser,'http://127.0.0.1:'+server.address().port+'/__portal__');}
 finally{await browser?.close();await new Promise(r=>server.close(r));}
}

test('Grimoire settings are reachable, Escape closes the sheet, and destinations return to the quilt',async()=>withPortal(async(browser,url)=>{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 // The board's own WebGL rendering is irrelevant here; fail it so the test doesn't need swiftshader.
 await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return /webgl/i.test(kind)?null:get.call(this,kind,...args);};});
 await page.goto(url);
 await page.evaluate(()=>{localStorage.setItem('myr5.portalBoard','ice');localStorage.setItem('myr5.portalMetal','#123456');localStorage.setItem('myr5.portalFrameMetal','#654321');localStorage.setItem('myr5.portalStrip','#13aaff');localStorage.setItem('myr5.grimoireColor.ice','#aa44cc');localStorage.setItem('myr5.grimoireColor.grass','#00bb66');});
 await page.evaluate(async()=>{const {openQuiltPortal}=await import('/modules/portal/portal-entry.mjs');window.portal=await openQuiltPortal();});
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);

 // The independently visible settings control opens the same sheet without changing portal routing.
 assert.equal(await page.locator('#portalSettingsButton').isVisible(),true);
 await page.locator('#portalSettingsButton').click();
 await page.waitForFunction(()=>document.getElementById('portalMenu')?.open===true);
 assert.equal(await page.locator('#portalMenu [data-menu-close]').innerText(),'Back to portal');
 const rows=await page.evaluate(()=>{
  const menu=document.getElementById('portalMenu'),color=menu.querySelector('.portal-color'),boards=menu.querySelector('.portal-board-chips'),palette=menu.querySelector('[data-palette-row]'),rect=el=>{const r=el.getBoundingClientRect();return{top:r.top,bottom:r.bottom};};
  return{order:[color?.className,boards?.className,palette?.firstElementChild?.className],boardTint:menu.querySelector('[data-board-tint]')?.value,visible:[color,boards,palette?.firstElementChild].map(el=>!!el&&el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})),adjacent:color?.nextElementSibling===boards,above:rect(color).bottom<=rect(boards).top&&rect(boards).bottom<=rect(palette.firstElementChild).top,options:palette?.querySelectorAll('option').length};
 });
 assert.deepEqual(rows.order,['portal-color','portal-board-chips','portal-palette'],'Grimoire color is directly above board choices, with material palette beside them');
 assert.equal(rows.boardTint,'#aa44cc','the active board keeps its own saved dye');
 assert.deepEqual(rows.visible,[true,true,true],'all three color and board controls are visible in the settings sheet');
 assert.equal(rows.adjacent,true,'board choices are the immediate row after Grimoire colour');
 assert.equal(rows.above,true,'the visible controls follow the same vertical order');
 assert.ok(rows.options>=3,'the selected board material exposes its palette choices');
 const look=await page.evaluate(()=>({values:Object.fromEntries([...document.querySelectorAll('#portalMenu [data-look]')].map(el=>[el.dataset.look,el.value])),closed:!document.querySelector('#portalMenu details').open,hiddenNavigation:!document.querySelector('#portalMenu [data-menu="line-lr"]').checkVisibility(),touchTargets:[...document.querySelectorAll('#portalMenu [data-menu-close],#portalMenu [data-look],#portalMenu [data-look-reset],#portalMenu [data-board],#portalMenu [data-palette],#portalMenu details>summary')].map(el=>Math.round(el.getBoundingClientRect().height))}));
 assert.deepEqual(look.values,{portal:'#123456',strip:'#13aaff'},'one shared Metal control and the independent Strip preserve saved choices');
 assert.equal(await page.locator('#portalMenu [data-board="ice"]').innerText(),'Crystal','the visible name changes while the stored ice board identifier remains stable');
 assert.equal(look.closed,true,'the full navigation list starts collapsed');assert.equal(look.hiddenNavigation,true,'collapsed destinations are not visible or tappable');
 assert.ok(look.touchTargets.every(height=>height>=44),`all customization controls and board choices meet the 44px touch target: ${look.touchTargets}`);
 await page.locator('#portalMenu details>summary').focus();await page.keyboard.press('Enter');
 await page.waitForFunction(()=>document.querySelector('#portalMenu details').open);
 assert.equal(await page.locator('#portalMenu [data-menu="line-lr"]').isVisible(),true,'keyboard expands the complete navigation menu');
 const routes=await page.locator('#portalMenu [data-menu]').evaluateAll(buttons=>buttons.map(button=>button.dataset.menu));
 assert.ok(routes.includes('rect')&&routes.includes('up')&&routes.includes('line-lr')&&routes.includes('line-down'),'Full menu retains destination entries across the full gesture map');
 await page.locator('#portalMenu [data-look="portal"]').evaluate(el=>{el.value='#0c3456';el.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.deepEqual(await page.evaluate(()=>({strip:localStorage.getItem('myr5.portalStrip'),frame:localStorage.getItem('myr5.portalFrameMetal'),css:[getComputedStyle(document.documentElement).getPropertyValue('--portal-metal').trim(),getComputedStyle(document.documentElement).getPropertyValue('--frame-metal').trim()]})),{strip:'#13aaff',frame:null,css:['#0c3456','#0c3456']},'Metal updates both housing surfaces and leaves Strip unchanged');
 await page.locator('#portalMenu [data-look="strip"]').evaluate(el=>{el.value='#19b478';el.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.deepEqual(await page.evaluate(()=>({portal:localStorage.getItem('myr5.portalMetal'),frame:localStorage.getItem('myr5.portalFrameMetal'),strip:localStorage.getItem('myr5.portalStrip'),css:[getComputedStyle(document.documentElement).getPropertyValue('--portal-metal').trim(),getComputedStyle(document.documentElement).getPropertyValue('--frame-metal').trim()],energy:document.querySelector('.portal-energy').style.getPropertyValue('--energy')})),{portal:'#0c3456',frame:null,strip:'#19b478',css:['#0c3456','#0c3456'],energy:'#19b478 0px 90px,#0a4830 90px 180px,#19b478 180px 270px,#98ddc2 270px 360px'},'Strip updates independently while both metal surfaces retain the shared color');
 await page.locator('#portalMenu [data-look-reset]').click();
 assert.deepEqual(await page.evaluate(()=>[localStorage.getItem('myr5.portalMetal'),localStorage.getItem('myr5.portalFrameMetal'),localStorage.getItem('myr5.portalStrip')]),[null,null,null],'Reset removes saved overrides so defaults return');
 await page.locator('#portalMenu [data-board-tint]').evaluate(el=>{el.value='#3478a9';el.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.deepEqual(await page.evaluate(()=>[localStorage.getItem('myr5.grimoireColor.ice'),localStorage.getItem('myr5.portalMetal')]),['#3478a9',null],'Grimoire board dye stays separate from Metal styling');
 await page.locator('#portalMenu [data-board="grass"]').click();
 await page.waitForFunction(()=>document.getElementById('portalHome').dataset.board==='grass');
 await page.locator('#portalSettingsButton').click();await page.waitForFunction(()=>document.getElementById('portalMenu')?.open===true);
 assert.deepEqual(await page.evaluate(()=>({dye:document.querySelector('#portalMenu [data-board-tint]').value,metal:document.querySelector('#portalMenu [data-look="portal"]').value,selected:document.querySelector('#portalMenu [data-board="grass"]').getAttribute('aria-pressed')})),{dye:'#00bb66',metal:'#4d3d4f',selected:'true'},'switching boards refreshes only the board dye and preserves shared reset defaults');
 await page.locator('#portalMenu [data-menu-close]').click();
 await page.waitForFunction(()=>!document.getElementById('portalMenu').open&&!document.getElementById('portalHome').hidden);
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false&&!document.getElementById('portalMenu')?.open);

 // #25: the exit button now leads to the pod.
 assert.equal(await page.locator('#portalExitButton').innerText(),'Pod');
 // The optional Boards packet adds five boards beside Quilt in the Menu sheet.
 assert.equal(await page.locator('.portal-board-chips').count(),1);
 assert.equal(await page.locator('.portal-board-chips [data-board]').count(),6);

  // Exercise the show/hide lifecycle directly; this bare-page fixture has no physical coach dock.
  await page.evaluate(()=>window.portal.hide());
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===true);
 await page.evaluate(()=>window.portal.show());
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);
  // Grimoire settings opens the existing sheet; Escape remains its keyboard close path.
  await page.locator('#portalSettingsButton').click();
 await page.waitForFunction(()=>document.getElementById('portalMenu')?.open===true);
 assert.equal(await page.locator('#portalMenu [data-close]').count(),0);
  // Keyboard dismissal returns to the portal without altering its board or route mapping.
  await page.keyboard.press('Escape');
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);
 // A dialog destination opened from the sheet must still return through the portal on close.
  await page.locator('#portalSettingsButton').click();
 await page.waitForFunction(()=>document.getElementById('portalMenu')?.open===true);
 if(!await page.locator('#portalMenu details').evaluate(el=>el.open))await page.locator('#portalMenu details>summary').click();
 await page.locator('#portalMenu [data-menu="line-lr"]').click();
 await page.waitForFunction(()=>document.querySelector('.meditation-panel')?.open===true);
 await page.locator('#meditationClose').click();
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);
}));

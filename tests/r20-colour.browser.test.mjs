import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';

// R20 lane COLOUR (built dist/client, 375x812): a Body/Head/Eyes radiogroup over one wrapped colour grid, then
// a palette grid. A swatch colours only the toggled part; a palette blends all colors on only the selected part; unlocked entries come first.
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp'};
test('customizer colour tab: part toggle + grouped colour grid; Head swatch changes only the head',{timeout:180000},async()=>{
 const root=resolve('dist/client');
 const server=createServer(async(req,res)=>{const path=new URL(req.url,'http://local').pathname;try{const body=await readFile(resolve(root,'.'+path));res.setHeader('Content-Type',TYPES[extname(path)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:375,height:812}});
  await page.addInitScript(()=>{
   sessionStorage.setItem('myr5-ship-gate','ship-admission-v2');
   localStorage.setItem('myr5-local-guest-owner-v1','palette-browser');
   localStorage.setItem('myr5-unlocks-v2/'+encodeURIComponent('guest:palette-browser'),JSON.stringify({texture:[],color:[],palette:['coach:myr5:pal-04']}));
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/creature/index.html');
  await page.waitForFunction(()=>window.myr5Companion?.ready===true,null,{timeout:60000});
  await page.click('#tab-materials');
  await mkdir('.frames',{recursive:true});
  const shot=name=>page.screenshot({path:'.frames/r20-colour-'+name+'.png'});
  // Layout: radiogroup (Body checked), one colour grid, one palette grid, no per-part columns.
  const layout=await page.evaluate(()=>({
   toggle:[...document.querySelectorAll('#colorSwatches [role=radiogroup] [role=radio]')].map(b=>[b.textContent,b.getAttribute('aria-checked')]),
   grids:[...document.querySelectorAll('#colorSwatches .material-grid')].map(g=>g.id),
   rows:document.querySelectorAll('.colour-row,[data-channel]').length,
   lockedText:[...document.querySelectorAll('#colorSwatches [data-locked]')].map(b=>b.textContent).filter(t=>t!=='🔒').length,
   names:[...document.querySelectorAll('#colourGrid [data-color]')].map(b=>b.getAttribute('aria-label')),
   perRow:(()=>{const b=[...document.querySelectorAll('#colourGrid button')];const top=Math.round(b[0].getBoundingClientRect().top);return b.filter(x=>Math.round(x.getBoundingClientRect().top)===top).length;})(),
   size:(()=>{const r=document.querySelector('#colourGrid button').getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)];})(),
   lockedFirst:[...document.querySelectorAll('#colorSwatches .material-grid')].every(g=>{let seen=false;for(const b of g.children){if(b.hasAttribute('data-locked'))seen=true;else if(seen)return false;}return true;}),
  }));
  assert.deepEqual(layout.toggle,[['Body','true'],['Head','false'],['Eyes','false']]);
  assert.deepEqual(layout.grids,['colourGrid','paletteGrid']);
  assert.equal(layout.rows,0,'old per-part columns are gone');
  assert.equal(layout.lockedText,0,'locked swatches carry only the lock icon');
  assert.ok(layout.names.includes('Red')&&layout.names.includes('Mint'),'swatches are named from FREE_COLOUR_NAMES: '+layout.names.slice(0,4));
  assert.ok(layout.perRow>=5,'wraps as a grid, got '+layout.perRow+' per row');
  assert.deepEqual(layout.size,[44,44]);
  assert.ok(layout.lockedFirst,'unlocked first in both grids');
  await shot('body');
  // Head + swatch: only the head colour changes; the grid marks it on Head, not on Body.
  const before=await page.evaluate(()=>window.myr5Companion.recipe.materials);
  await page.click('#colorSwatches [data-part="head"]');
  assert.deepEqual(await page.evaluate(()=>[...document.querySelectorAll('#colorSwatches [role=radio]')].map(b=>b.getAttribute('aria-checked'))),['false','true','false']);
  await page.click('#colourGrid [data-color="#ff3b30"]');
  await page.waitForFunction(()=>window.myr5Companion?.recipe?.materials?.head?.colorId==='#ff3b30'&&window.myr5Companion?.ready===true,null,{timeout:60000});
  const after=await page.evaluate(()=>window.myr5Companion.recipe.materials);
  for(const r of ['body','arms','feet','collar','eye'])assert.equal(after?.[r]?.colorId,before?.[r]?.colorId,r+' untouched');
  assert.equal(await page.getAttribute('#colourGrid [data-color="#ff3b30"]','aria-pressed'),'true');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('#colorSwatches [data-part="head"] i')).backgroundColor),'rgb(255, 59, 48)','head dot shows the head colour');
  await shot('head');
  await page.click('#colorSwatches [data-part="body"]');
  assert.equal(await page.getAttribute('#colourGrid [data-color="#ff3b30"]','aria-pressed'),'false','Body does not show the head colour as pressed');
  // Eyes + swatch, then Reset clears only the toggled part. (Palette ownership is covered in r18-unlocks.test.mjs.)
  await page.click('#colorSwatches [data-part="eyes"]');
  await page.click('#colourGrid [data-color="#2bd97c"]');
  await page.waitForFunction(()=>window.myr5Companion?.recipe?.materials?.eye?.colorId==='#2bd97c'&&window.myr5Companion?.ready===true,null,{timeout:60000});
  assert.equal(await page.evaluate(()=>window.myr5Companion.recipe.materials.head.colorId),'#ff3b30','head kept');
  await shot('eyes');
  await page.evaluate(()=>document.querySelector('#paletteGrid').scrollIntoView());
  assert.ok(await page.locator('#paletteGrid [data-color]').count()>0,'palettes grid is populated');
  await shot('palettes');
  const paletteBefore=await page.evaluate(()=>window.myr5Companion.recipe.materials);
  await page.click('#paletteGrid [data-color="pal-04"]');
  await page.waitForFunction(()=>window.myr5Companion?.recipe?.materials?.eye?.colorId==='pal-04'&&window.myr5Companion.ready,null,{timeout:60000});
  const paletteAfter=await page.evaluate(()=>window.myr5Companion.recipe.materials);
  for(const part of ['head','body','arms','feet','collar'])assert.deepEqual(paletteAfter?.[part],paletteBefore?.[part],part+' stays unchanged by an eye palette');
  assert.equal(await page.getAttribute('#paletteGrid [data-color="pal-04"]','aria-pressed'),'true');
  await page.click('#materialClear');
  await page.waitForFunction(()=>!window.myr5Companion?.recipe?.materials?.eye&&window.myr5Companion?.ready===true,null,{timeout:60000});
  assert.equal(await page.evaluate(()=>window.myr5Companion.recipe.materials.head.colorId),'#ff3b30','reset touched eyes only');
 }finally{await browser?.close();server.close();}
});

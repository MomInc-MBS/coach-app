// #1 data-loss bug (found by lane 4G): previewing a LOCKED roster body ("Preview · unlocks when you
// complete …") and then picking any default-unlocked adaptation/texture used to silently drop the
// body preview, re-render the owned body, and re-save the look -- overwriting the saved coach.
// Root cause: pick()/pickTexture() cleared the whole preview whenever the JUST-picked item was itself
// unlocked, even while a different, locked item (the body) was already only being previewed; commit()
// never checked preview state at all, so slider/select edits saved straight through too. Fixed by
// guarding once in commit() (creature/source/editor-workbench.ts), the one function every mutating
// caller routes through.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';

// Spade · Arch 2: a real, non-rejected roster body that locks to "Chest" with no battle-pass progress
// (see tests/customizer-locks.test.mjs CHEST_BODY -- same fixture, same lock rule).
const LOCKED_BODY='roster/16-spade-arch--stylized_humanoid_3d_model';
const root=resolve('dist/client');
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css'};

test('locked body preview: picking an unlocked texture keeps previewing the locked body and never saves',{timeout:180000},async()=>{
 const server=createServer(async(req,res)=>{const path=new URL(req.url,'http://local').pathname;
  try{const body=await readFile(resolve(root,'.'+path));res.setHeader('Content-Type',TYPES[extname(path)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage();await page.setViewportSize({width:375,height:812});
  await page.addInitScript(()=>sessionStorage.setItem('myr5-ship-gate','ship-admission-v2')); // W2-2Q #148: opened through the arrival's ship
  const base='http://127.0.0.1:'+server.address().port;
  await page.goto(base+'/creature/index.html');
  await page.waitForFunction(()=>window.myr5Companion?.ready===true,null,{timeout:60000});

  // Seed a known, already-saved coach (owned Clay texture on body) so the repro has a real baseline
  // to compare against -- a fresh, never-saved page has nothing in storage yet.
  await page.evaluate(()=>{
   const seed={...window.myr5Companion.recipe,materials:{body:{textureId:'clay',colorId:'#7f7d78',sparkle:0,metallic:0}}};
   localStorage.setItem('myr5-recipe-v1',JSON.stringify(seed));
  });
  await page.reload();
  await page.waitForFunction(()=>window.myr5Companion?.ready===true,null,{timeout:60000});
  const before=await page.evaluate(()=>localStorage.getItem('myr5-recipe-v1'));
  assert.equal(JSON.parse(before).materials.body.textureId,'clay','fixture: the saved coach owns Clay');

  // Preview a locked body -- must not save by itself either.
  await page.click('#tab-body');
  await page.click(`#panel-body button[data-body="${LOCKED_BODY}"]`);
  await page.waitForFunction(id=>window.myr5Companion?.ready===true&&document.getElementById('body').value===id,LOCKED_BODY,{timeout:60000});
  assert.match(await page.locator('.preview-strip').textContent(),/Preview/,'body select shows the preview-only strip');
  assert.equal(await page.evaluate(()=>localStorage.getItem('myr5-recipe-v1')),before,'previewing a locked body alone must not save');

  // Now pick a default-unlocked texture, as if just experimenting while the locked body previews.
  await page.click('#tab-textures');
  await page.selectOption('#textureId','clay');
  await page.waitForFunction(()=>window.myr5Companion?.ready===true,null,{timeout:60000});

  // The bug: this used to clear the body preview, snap the viewer back to the owned body, and persist.
  assert.equal(await page.locator('#body').inputValue(),LOCKED_BODY,'the locked body preview must still be showing, not the owned body');
  assert.match(await page.locator('.preview-strip').textContent(),/Preview/,'still marked preview-only after the texture pick');
  assert.equal(await page.evaluate(()=>localStorage.getItem('myr5-recipe-v1')),before,'nothing was saved while a locked body was in the look');

  // Leaving the preview (picking an owned body) returns to the last saved look, not the preview-time texture.
  await page.click('#tab-body');
  await page.click('#panel-body button[data-body="myr5"]');
  await page.waitForFunction(()=>window.myr5Companion?.ready===true&&window.myr5Companion?.recipe?.body==='myr5',null,{timeout:60000});
  const afterLeaving=JSON.parse(await page.evaluate(()=>localStorage.getItem('myr5-recipe-v1')));
  assert.equal(afterLeaving.materials?.body?.textureId,'clay','the preview-only texture tweak was discarded, not saved');
 } finally {await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';

// Rank 5 (plan/PLAN.md "Rank 5 — Customizer redesign"): body-first tab, no head/arms/legs mixing
// UI, mom-only (myr5, D2) gating, and old mixed recipes (pre-Rank-3/4/5 schema, from HEAD
// 358a96c) still loading. See plan/reports/customizer.md.
const ROSTER_BODY='roster/01-seed-pearo--3d_character_model'; // "Seed · Pearo 1", a non-myr5 body

// Shaped exactly like the Design type at 358a96c (verified via
// `git show 358a96c:creature/source/creator/design.ts`) — headFrom differs from body, i.e. mixed.
const OLD_MIXED_RECIPE={version:1,styles:{head:0,eye:0,collar:0,body:0,arms:0,feet:0},eye:'open',fur:1,iris:1,pupil:'round',pupilSize:1,detail:1,coach:'supportive',fingers:4,toes:3,eyeLayout:'single',body:'myr5',headFrom:ROSTER_BODY,armsFrom:'myr5',feetFrom:'myr5'};

test('customizer editor: body-first tab, no limb-mixing UI, mom-only gating, save/reload, old mixed recipes still load',async()=>{
 const root=resolve('dist/client');
 const server=createServer(async(req,res)=>{const path=new URL(req.url,'http://local').pathname;
  try{const body=await readFile(resolve(root,'.'+path));res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.mjs':'text/javascript'})[extname(path)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();
  const base='http://127.0.0.1:'+server.address().port;
  await page.goto(base+'/creature/index.html');
  await page.waitForFunction(()=>window.myr5Companion?.ready===true,null,{timeout:60000});

  // Body is the first tab and opens by default.
  assert.equal(await page.locator('#tab-body').getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('#panel-body').isHidden(),false);
  assert.equal(await page.locator('#panel-materials').isHidden(),true);

  // The head/arms/legs mixing selects are gone entirely (not just hidden).
  for(const id of ['headFrom','armsFrom','feetFrom'])assert.equal(await page.locator('#'+id).count(),0);

  // Mom-only controls (fingers/toes/collar fluff) show for the default myr5 body...
  assert.equal(await page.locator('#fingersField').isVisible(),true);
  assert.equal(await page.locator('#toesField').isVisible(),true);
  assert.equal(await page.locator('#furField').isVisible(),true);

  // ...and disappear when a non-myr5 body is chosen.
  await page.selectOption('#body',ROSTER_BODY);
  await page.waitForFunction(id=>window.myr5Companion?.recipe?.body===id&&window.myr5Companion?.ready===true,ROSTER_BODY,{timeout:60000});
  assert.equal(await page.locator('#fingersField').isVisible(),false);
  assert.equal(await page.locator('#toesField').isVisible(),false);
  assert.equal(await page.locator('#furField').isVisible(),false);

  // Switching body forces headFrom/armsFrom/feetFrom to match it (no more independent mixing).
  let recipe=await page.evaluate(()=>window.myr5Companion.recipe);
  assert.equal(recipe.headFrom,ROSTER_BODY);assert.equal(recipe.armsFrom,ROSTER_BODY);assert.equal(recipe.feetFrom,ROSTER_BODY);

  // Pick a texture+colour on the body part, then switch bodies again: the choice survives.
  await page.click('#tab-materials');
  await page.click('[data-region="body"]');
  await page.selectOption('#textureId','clay');
  await page.click('#colorSwatches [data-color="default-ruby"]');
  await page.waitForFunction(()=>window.myr5Companion?.recipe?.materials?.body?.textureId==='clay'&&window.myr5Companion?.ready===true,null,{timeout:60000});
  await page.click('#tab-body');
  await page.selectOption('#body','myr5');
  await page.waitForFunction(()=>window.myr5Companion?.recipe?.body==='myr5'&&window.myr5Companion?.ready===true,null,{timeout:60000});
  recipe=await page.evaluate(()=>window.myr5Companion.recipe);
  assert.equal(recipe.materials.body.textureId,'clay');assert.equal(recipe.materials.body.colorId,'default-ruby');
  assert.equal(recipe.headFrom,'myr5'); // body switch re-normalized the mixing fields too
  assert.equal(await page.locator('#fingersField').isVisible(),true); // mom-only controls are back

  // Save/reload: the saved recipe (including the new-system material choice) survives a reload.
  await page.reload();
  await page.waitForFunction(()=>window.myr5Companion?.ready===true,null,{timeout:60000});
  recipe=await page.evaluate(()=>window.myr5Companion.recipe);
  assert.equal(recipe.materials.body.textureId,'clay');assert.equal(recipe.body,'myr5');

  // An old (pre-Rank-3/4/5) mixed recipe from HEAD 358a96c still loads and renders.
  await page.evaluate(old=>localStorage.setItem('myr5-recipe-v1',JSON.stringify(old)),OLD_MIXED_RECIPE);
  await page.reload();
  await page.waitForFunction(()=>window.myr5Companion?.ready===true,null,{timeout:60000});
  recipe=await page.evaluate(()=>window.myr5Companion.recipe);
  assert.equal(recipe.body,'myr5');assert.equal(recipe.headFrom,ROSTER_BODY);
  assert.equal(await page.locator('#creatureStatus').textContent(),'Your coach is ready');
 } finally {await browser?.close();await new Promise(r=>server.close(r));}
});

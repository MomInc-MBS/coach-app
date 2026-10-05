import test from 'node:test';
import assert from 'node:assert/strict';
import {openAchievementFixture} from './achievements-browser-fixture.mjs';
import {COACHES,STARTER_COACH_IDS} from '../performance-catalog.mjs';
test('mobile achievements lists all actual coaches and makes locked performance requirements inspectable',async()=>{
 const fixture=await openAchievementFixture();try{
  const {page}=fixture,result=await page.evaluate(()=>({ids:[...document.querySelectorAll('.ach-card')].map(c=>c.dataset.id),owned:document.querySelectorAll('.ach-card[data-state=done]').length,locked:[...document.querySelectorAll('.ach-card[data-state=locked]')].map(c=>({text:c.textContent,disabled:c.hasAttribute('disabled')})),count:document.querySelector('.ach-count').textContent,overflow:document.querySelector('.ach-board').scrollWidth>innerWidth}));
  assert.deepEqual(result.ids,COACHES.map(c=>c.id));assert.equal(result.owned,STARTER_COACH_IDS.length);assert.match(result.count,/67 coaches/);assert.equal(result.overflow,false);
  assert(result.locked.length>0);for(const c of result.locked){assert(c.text.includes('Unlock'));assert.equal(c.disabled,false);assert(!c.text.includes('Boss beaten'));}
  assert(result.locked.some(c=>c.text.includes('5 uninterrupted minutes')));assert(result.locked.some(c=>c.text.includes('15 reps')));
 }finally{await fixture.close();}
});
test('visible coach ownership and golden status update from actual completed hold performance',async()=>{
 const fixture=await openAchievementFixture();try{
  const {page}=fixture,state=await page.evaluate(()=>window.performanceProgress.recordPerformanceSession({id:'browser-gold',mode:'knee-plank',kind:'hold',difficulty:'easy',value:600,activeSeconds:600,maxContinuousSeconds:600,xpBase:0,day:window.performanceProgress.localDay()}));
  assert(state.goldenCoaches.length>0);for(const id of state.goldenCoaches){const row=page.locator(`.ach-card[data-id="${id}"]`);assert.equal(await row.getAttribute('data-state'),'done');assert.equal(await row.getAttribute('data-golden'),'true');assert.match(await row.textContent(),/Unlocked · Golden/);}
  assert.equal(await page.locator('.ach-card[data-state=done]').count(),state.coaches.length);
 }finally{await fixture.close();}
});
test('category tabs work by keyboard and the roster stays readable without animation',async()=>{
 const fixture=await openAchievementFixture();try{
  const {page}=fixture;await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-ach-tab=coaches]').focus();await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('[data-ach-tab=weapons]').getAttribute('aria-selected'),'true');assert.match(await page.locator('.ach-catalog').textContent(),/Easy 1–5/);
  await page.keyboard.press('Home');assert.equal(await page.locator('.ach-card').count(),COACHES.length);
  assert.equal(await page.locator('[data-ach-tab=coaches]').getAttribute('tabindex'),'0');assert.equal(await page.locator('[data-ach-tab=weapons]').getAttribute('tabindex'),'-1');
  await page.locator('.ach-close').click();assert.equal(await page.locator('dialog').evaluate(d=>d.open),false);
 }finally{await fixture.close();}
});

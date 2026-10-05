import test from 'node:test';
import assert from 'node:assert/strict';
import {openAchievementFixture} from './achievements-browser-fixture.mjs';
import {WEAPON_GROUPS,SHIP_REQUIREMENTS} from '../performance-catalog.mjs';
test('achievement weapon and ship guidance uses difficulty blocks and performance thresholds',async()=>{
 const fixture=await openAchievementFixture();try{
  const {page}=fixture;await page.locator('[data-ach-tab=weapons]').click();assert.equal(await page.locator('.ach-card').count(),Object.keys(WEAPON_GROUPS).length);
  const weapons=await page.locator('.ach-catalog').textContent();for(const phrase of ['Easy 1–5','Medium 6–10','Hard 11–15','Expert 16–20','1 uninterrupted minute','3 minutes','5 minutes','10 minutes','8 reps','12 reps','15 reps'])assert(weapons.includes(phrase),phrase);
  await page.locator('[data-ach-tab=ships]').click();assert.equal(await page.locator('.ach-card').count(),SHIP_REQUIREMENTS.length);
  for(const row of await page.locator('.ach-card').allTextContents())assert.match(row,/Expert.+(5 uninterrupted minutes|15 reps)/);
 }finally{await fixture.close();}
});
test('XP rewards tab shows new cosmetic rules and updates daily rest victories without unlocking coaches',async()=>{
 const fixture=await openAchievementFixture();try{
  const {page}=fixture,initial=await page.evaluate(()=>window.performanceProgress.readPerformanceProgress().coaches);
  await page.locator('[data-ach-tab=rewards]').click();let text=await page.locator('.ach-catalog').textContent();
  for(const phrase of ['250','double today’s workout XP','separate 500 XP','one uncommon pack','five bosses','one legendary pack','once per day','0 / 5 daily boss defeats'])assert(text.includes(phrase),phrase);
  await page.evaluate(()=>window.restRewards.recordRestBossDefeat('browser-defeat-1'));assert.match(await page.locator('.ach-catalog').textContent(),/1 \/ 5 daily boss defeats/);
  const progress=await page.evaluate(()=>{for(let i=2;i<=5;i++)window.restRewards.recordRestBossDefeat(`browser-defeat-${i}`);window.restRewards.recordRestBossDefeat('browser-defeat-5');return window.restRewards.readRestBossRewards();});
  assert.equal(progress.count,5);assert(progress.packs.every(p=>p.earned&&p.granted));assert.match(await page.locator('.ach-catalog').textContent(),/5 \/ 5 daily boss defeats/);
  assert.deepEqual(await page.evaluate(()=>window.performanceProgress.readPerformanceProgress().coaches),initial);
 }finally{await fixture.close();}
});

test('movement library weapon widget refreshes earned family tiers from performance events',async()=>{
 const fixture=await openAchievementFixture();try{
  const {page}=fixture;
  const before=await page.evaluate(async()=>{const {mountWeaponRewards}=await import('/weapon-rewards.mjs');const host=document.createElement('div');document.querySelector('.ach-board').append(host);window.testWeaponRewards=mountWeaponRewards(host,()=> 'legs',()=> 'reps');return window.testWeaponRewards.element.textContent;});
  assert.match(before,/Legs \u00b7 Earned weapon tiers/);assert.match(before,/Starter/);assert.doesNotMatch(before,/100 XP|10 per set|Next: Level/);
  const state=await page.evaluate(()=>window.performanceProgress.recordPerformanceSession({id:'browser-leg-reps',mode:'shallow-squat',kind:'reps',difficulty:'easy',value:15,xpBase:1,day:window.performanceProgress.localDay()}));
  for(const type of ['greatsword','hammer'])assert.equal(await page.locator(`.training-rewards [data-weapon="${type}"]`).getAttribute('data-tier'),String(state.weapons[type]));
  const after=await page.locator('.training-rewards').textContent();assert.match(after,/Tier 2 \/ 20/);assert.match(after,/8.+12.+15/);
 }finally{await fixture.close();}
});

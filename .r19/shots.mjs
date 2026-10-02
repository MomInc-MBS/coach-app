import {chromium} from 'playwright';import {completeCoach} from '../tests/onboarding-fixture.mjs';
const base='https://myr5-coach-staging.mominc-coach.workers.dev',out='D:/myr5-work/release-19/.r19/';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--enable-unsafe-swiftshader']});
const log=(...a)=>console.log(...a);
async function fresh(){
 const context=await browser.newContext({viewport:{width:375,height:812},permissions:['camera'],serviceWorkers:'block'});
 await context.addInitScript(()=>{const get=Storage.prototype.getItem,d=new Date(),day=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;Storage.prototype.getItem=function(key){return String(key).startsWith('myr5-how-to-play-day-v1/')?day:get.call(this,key);};});
 const page=await context.newPage();page.on('pageerror',e=>log('pageerror',e.message));
 await page.goto(base+'/privacy.html');
 await page.evaluate(async intake=>{const {openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();localStorage.setItem('myr5-downloads-seen','1');},completeCoach());
 await page.goto(base+'/pose.html');
 await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&window.myr5Portal&&!document.querySelector('#portalHome')?.hidden,null,{timeout:60000});
 await page.waitForTimeout(3000);
 const later=page.locator('.app-update-banner [data-later]');if(await later.isVisible().catch(()=>false)){await later.click();await page.waitForTimeout(400);}
 return {context,page};
}
const shot=(page,n)=>page.screenshot({path:out+`staging-${n}.png`});
const shots={
 home:async()=>{},
 meditation:async page=>{await page.route('**/api/account**',r=>r.fulfill({json:{user:{id:'A',email:'a@b.c'},dataEpoch:1,progress:{level:1,completedSets:0},push:{},reminders:[]}}));await page.route('**/api/breathing/start',r=>r.fulfill({json:{id:'t1',startedAt:Date.now(),durationMs:180000,targetAccountId:'A',dataEpoch:1}}));await page.evaluate(()=>window.dispatchEvent(new Event('myr5:login-ready')));await page.waitForTimeout(1500);await page.evaluate(()=>{document.querySelector('.meditation-entry')?.click();});await page.waitForTimeout(3500);
  log('med open',await page.evaluate(()=>[document.querySelector('.meditation-panel')?.open,[...document.querySelectorAll('.meditation-panel button')].map(b=>(b.className+'|'+b.textContent).slice(0,30))]));
  await page.getByText('One guided breathing round').first().dispatchEvent('click');await page.waitForTimeout(1500);await page.getByRole('button',{name:'Accept'}).dispatchEvent('click');await page.waitForTimeout(12000);log('overlap',JSON.stringify(await page.evaluate(()=>{const r=e=>e&&e.getBoundingClientRect(),vis=e=>{const b=r(e);return b?[Math.round(b.left),Math.round(b.top),Math.round(b.right),Math.round(b.bottom)]:null};const chip=document.querySelector('.portal-tilt-chip');const c=[...document.querySelectorAll('.breath-hud .breath-count,.breath-hud [data-session-clock]')];return {tilt:vis(chip),tiltShown:chip&&getComputedStyle(chip).display,counters:c.map(vis),hud:vis(document.querySelector('.breath-hud'))};})));},
 war:async page=>{await page.goto(base+'/war-room/index.html');await page.waitForTimeout(8000);},
 achievements:async page=>{await page.evaluate(()=>window.myr5Portal.open('down'));await page.waitForTimeout(4000);log('boss',await page.locator('.ach-boss').count());await page.locator('.ach-boss').nth(2).dispatchEvent('click');await page.waitForTimeout(3500);},
 grimoire:async page=>{await page.locator('#portalSettingsButton').click({force:true});await page.waitForTimeout(2500);},
 classroom:async page=>{await page.evaluate(()=>window.myr5Portal.open('up').catch?.(()=>{}));await page.waitForTimeout(500);await page.evaluate(()=>{document.querySelector('.coach-dock [data-panel="account"]')?.click();});await page.waitForTimeout(6000);},
 customizer:async page=>{await page.evaluate(async()=>{const {openCustomizer}=await import('/modules/ships/ship-scene-domain.mjs');openCustomizer();});await page.waitForURL(/creature/,{timeout:20000});await page.waitForTimeout(1500);await page.getByRole('button',{name:'Accept'}).dispatchEvent('click');await page.waitForTimeout(12000);},
 custzoom:async page=>{await page.evaluate(async()=>{const {openCustomizer}=await import('/modules/ships/ship-scene-domain.mjs');openCustomizer();});await page.waitForURL(/creature/,{timeout:20000});await page.waitForTimeout(1500);const ac=page.getByRole('button',{name:'Accept'});if(await ac.count())await ac.first().dispatchEvent('click',null,{timeout:3000}).catch(()=>{});await page.waitForTimeout(12000);
  const z=v=>page.evaluate(v=>{const el=document.getElementById('zoom');el.value=String(v);el.dispatchEvent(new Event('input'));},v);
  await z(0);await page.waitForTimeout(2000);await shot(page,'customizer-zoommin');await z(1);await page.waitForTimeout(2000);await shot(page,'customizer-zoommax');await z(.5);await page.click('#tab-materials');await page.waitForTimeout(1500);await shot(page,'colour-tab');},
 food:async page=>{await page.evaluate(()=>{window.foodRun=window.myr5Portal.open('up');});await page.waitForTimeout(7000);},
 camera:async page=>{await page.locator('#coachDock [data-route="portal"]').click();await page.waitForTimeout(3000);await page.locator('#start').click({timeout:10000});await page.waitForFunction(()=>document.getElementById('library').open,null,{timeout:30000});await page.locator('#useHologram').click({timeout:10000});await page.waitForFunction(()=>document.body.dataset.cameraWorkout==='true',null,{timeout:30000});await page.waitForTimeout(2500);},
};
const only=process.argv[2]?.split(',');
for(const [name,fn] of Object.entries(shots)){if(only&&!only.includes(name))continue;
 const {context,page}=await fresh();try{await fn(page);await shot(page,name);log('ok',name);}catch(e){log('FAIL',name,e.message.split('\n')[0]);await shot(page,name+'-FAIL').catch(()=>{});}await context.close();}
await browser.close();

import {chromium} from 'playwright';import {completeCoach} from '../tests/onboarding-fixture.mjs';
const base='https://myr5-coach-staging.mominc-coach.workers.dev',out='D:/myr5-work/release-25/.r25/';
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
const medOpen=async page=>{await page.route('**/api/account**',r=>r.fulfill({json:{user:{id:'A',email:'a@b.c'},dataEpoch:1,progress:{level:1,completedSets:0},push:{},reminders:[]}}));await page.route('**/api/breathing/start',r=>r.fulfill({json:{id:'t1',startedAt:Date.now(),durationMs:210000,targetAccountId:'A',dataEpoch:1}}));await page.evaluate(()=>window.dispatchEvent(new Event('myr5:login-ready')));await page.waitForTimeout(1500);await page.evaluate(()=>{document.querySelector('.meditation-entry')?.click();});await page.waitForTimeout(3500);};
const custom=async page=>{await page.evaluate(async()=>{const {openCustomizer}=await import('/modules/ships/ship-scene-domain.mjs');openCustomizer();});await page.waitForURL(/creature/,{timeout:20000});await page.waitForTimeout(1500);const ac=page.getByRole('button',{name:'Accept'});if(await ac.count())await ac.first().dispatchEvent('click');await page.waitForTimeout(12000);};
const shots={
 colour:async page=>{await custom(page);await page.click('#tab-materials');await page.waitForTimeout(2000);log('parts',await page.evaluate(()=>[...document.querySelectorAll('#colorSwatches [role=radio]')].map(b=>b.textContent.trim())));},
 eyes:async page=>{await custom(page);await page.click('#tab-face');await page.waitForTimeout(800);log('eyes',await page.evaluate(()=>[...document.querySelectorAll('#eye option')].map(o=>o.value)));await page.selectOption('#eye','anime');await page.waitForTimeout(5000);await page.evaluate(()=>document.querySelector('#eye').scrollIntoView({block:'center'}));await page.waitForTimeout(500);},
 grimoire:async page=>{await page.locator('#portalSettingsButton').click({force:true});await page.waitForTimeout(2500);},
};
const only=process.argv[2]?.split(',');
for(const [name,fn] of Object.entries(shots)){if(only&&!only.includes(name))continue;
 const {context,page}=await fresh();try{await fn(page);await shot(page,name);log('ok',name);}catch(e){log('FAIL',name,e.message.split('\n')[0]);await shot(page,name+'-FAIL').catch(()=>{});}await context.close();}
await browser.close();

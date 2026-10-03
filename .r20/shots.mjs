import {chromium} from 'playwright';import {completeCoach} from '../tests/onboarding-fixture.mjs';
const base='https://myr5-coach-staging.mominc-coach.workers.dev',out='D:/myr5-work/release-20/.r20/';
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
const shots={
 home:async()=>{},
 settings:async page=>{await page.locator('#portalSettingsButton').click({force:true});await page.waitForTimeout(2500);await page.evaluate(()=>{for(const e of document.querySelectorAll('*')){if(e.scrollHeight>e.clientHeight+20&&/auto|scroll/.test(getComputedStyle(e).overflowY))e.scrollTop=e.scrollHeight;}window.scrollTo(0,document.body.scrollHeight);});await page.waitForTimeout(800);},
 grimoire:async page=>{await page.locator('#portalSettingsButton').click({force:true});await page.waitForTimeout(2500);},
 achievements:async page=>{await page.evaluate(()=>window.myr5Portal.open('down'));await page.waitForTimeout(4000);const n=await page.locator('.ach-boss').count();log('boss',n);await page.locator('.ach-boss').first().dispatchEvent('click');await page.waitForTimeout(3500);log('detail',await page.evaluate(()=>[...document.querySelectorAll('.ach-detail li')].map(l=>l.textContent)));},
 food:async page=>{await page.evaluate(()=>{window.foodRun=window.myr5Portal.open('up');});await page.waitForTimeout(7000);},
 colour:async page=>{await page.evaluate(async()=>{const {openCustomizer}=await import('/modules/ships/ship-scene-domain.mjs');openCustomizer();});await page.waitForURL(/creature/,{timeout:20000});await page.waitForTimeout(1500);const ac=page.getByRole('button',{name:'Accept'});if(await ac.count())await ac.first().dispatchEvent('click');await page.waitForTimeout(12000);await page.click('#tab-materials');await page.waitForTimeout(2000);},
 'meditation-begin':async page=>{await medOpen(page);},
 'meditation-settle':async page=>{await medOpen(page);await page.locator('[data-mode="wim-hof"]').dispatchEvent('click');await page.waitForTimeout(1000);await page.locator('[data-seated-accept]').dispatchEvent('click');await page.waitForTimeout(5000);},
 'meditation-exhale':async page=>{await medOpen(page);await page.locator('[data-mode="wim-hof"]').dispatchEvent('click');await page.waitForTimeout(1000);await page.locator('[data-seated-accept]').dispatchEvent('click');await page.waitForFunction(()=>document.querySelector('[data-settle-countdown]')?.hidden||document.querySelector('[data-breath-cue]')&&!document.querySelector('[data-breath-cue]').hidden,null,{timeout:40000});for(let i=0;i<40;i++){const t=(await page.locator('[data-breath-cue]').textContent().catch(()=>''))||'';if(/out/i.test(t))break;await page.waitForTimeout(250);}log('cue',await page.locator('[data-breath-cue]').textContent().catch(()=>'?'));},
 war:async page=>{await page.goto(base+'/war-room/index.html');await page.waitForTimeout(8000);},
};
const only=process.argv[2]?.split(',');
for(const [name,fn] of Object.entries(shots)){if(only&&!only.includes(name))continue;
 const {context,page}=await fresh();try{await fn(page);await shot(page,name);log('ok',name);}catch(e){log('FAIL',name,e.message.split('\n')[0]);await shot(page,name+'-FAIL').catch(()=>{});}await context.close();}
await browser.close();

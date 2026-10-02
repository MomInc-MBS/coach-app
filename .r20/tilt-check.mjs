import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {build} from 'esbuild';
import {completeCoach} from '../tests/onboarding-fixture.mjs';

const FRAMES_DIR=resolve('.frames');
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp'};

function serve(appSource){
 const built=resolve('dist/client'),source=resolve('.');
 const account={user:{id:'housing-review',email:'housing@test.local',provider:'chatgpt'},dataEpoch:1,revision:0,profile:{},entitlements:{},progress:{completedSets:0,xp:0,level:1,unlocks:{},exerciseRoute:{groups:{}}},push:{environment:'preview',configured:false,schedulerActive:false},onboarding:{data:completeCoach(),revision:1,startDay:'2026-09-21',completedAt:1,targets:{day:3,date:'2026-09-23',reps:3,holdSeconds:9,proteinGrams:100,waterOz:100,goals:{}}}};
 return createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(appSource&&path==='/app-runtime.mjs'){res.setHeader('Content-Type','text/javascript');res.end(appSource);return;}
  if(path==='/api/account'||path==='/api/breathing/start'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/account'?account:{id:'housing-ticket',startedAt:Date.now(),durationMs:180000,targetAccountId:account.user.id,dataEpoch:1}));return;}
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const root=path.startsWith('/modules/portal/')||path==='/meditation.css'?source:built,file=resolve(root,'.'+(path==='/'?'/pose.html':path));if(!file.startsWith(root+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':TYPES[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}
 });
}
async function openApp(browser,base,reducedMotion,viewport,initialRoute=''){
 const context=await browser.newContext({viewport,serviceWorkers:'block',reducedMotion});
 await context.addInitScript(()=>Object.defineProperty(navigator,'standalone',{configurable:true,value:true}));
 // This guest has read today's field manual; its automatic modal has separate coverage.
 await context.addInitScript(()=>{const get=Storage.prototype.getItem,d=new Date(),day=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;Storage.prototype.getItem=function(key){return String(key).startsWith('myr5-how-to-play-day-v1/')?day:get.call(this,key);};});
 const seed=await context.newPage();
 await seed.goto(base+'/onboarding.html');
 await seed.evaluate(async intake=>{const {openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();},completeCoach());
 await seed.evaluate(async()=>{const cache=await caches.open('myr5-package-housing-review');for(const url of ['/pod/rooms/console.glb','/modules/rooms/reminders-computer.css']){const response=await fetch(url);if(!response.ok)throw Error('Missing test asset '+url);await cache.put(url,response);}});
 await seed.close();
 const page=await context.newPage();
 await page.addLocatorHandler(page.locator('.reward-pack-dialog[open]'),()=>page.locator('.reward-pack-dialog[open] [data-close]').click());
 await page.goto(base+'/pose.html'+(initialRoute?'#'+initialRoute:''));
 await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&window.myr5WorkoutOwner&&!window.myr5WorkoutOwner.snapshot().transitioning);
 await page.waitForFunction(()=>!!document.querySelector('.coach-dock'));
 if(!initialRoute){await page.evaluate(()=>window.myr5Menus.portal());await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);}
 await page.waitForTimeout(300);
 await page.evaluate(()=>document.querySelector('.reward-pack-dialog[open] [data-close]')?.click());
 return {context,page};
}
const server=serve(null);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});
for(const vp of [{width:375,height:812},{width:375,height:667},{width:812,height:375}]){const tag=vp.width+'x'+vp.height;
const {context,page}=await openApp(browser,base,'no-preference',vp);
const rects=()=>page.evaluate(()=>{const v=e=>{if(!e)return null;const b=e.getBoundingClientRect(),s=getComputedStyle(e);return s.display==='none'||s.visibility==='hidden'||!b.width?null:[Math.round(b.left),Math.round(b.top),Math.round(b.right),Math.round(b.bottom)];};
 const chip=document.querySelector('.portal-tilt-chip'),hud=[...document.querySelectorAll('.breath-hud>*')].map(v).filter(Boolean),extra=['[data-breath-cue]','[data-settle-countdown]','[data-begin]'].map(s=>v(document.querySelector(s)));
 const t=v(chip),hit=b=>t&&b&&t[0]<b[2]&&t[2]>b[0]&&t[1]<b[3]&&t[3]>b[1];return {tilt:t,hud,extra,overlap:[...hud,...extra].some(hit)};});
await page.evaluate(()=>{window.__m=window.myr5Portal.open('line-lr');});await page.waitForFunction(()=>document.querySelector('.meditation-panel')?.open&&!document.querySelector('.portal-arriving'),null,{timeout:30000});await page.waitForTimeout(2500);
console.log(await page.evaluate(()=>{const c=document.querySelector('.portal-tilt-chip');return [c?.parentElement?.className,c?.parentElement?.parentElement?.tagName,c?.parentElement?.parentElement?.className].join(' / ');}));console.log(tag,'start',JSON.stringify(await rects()));await page.screenshot({path:'.frames/r20-med-tilt-start-'+tag+'.png'});
await page.locator('[data-begin]').click();await page.locator('[data-seated] button').click();await page.waitForTimeout(3000);
console.log(tag,'settle',JSON.stringify(await rects()));
await page.waitForTimeout(19000);console.log(tag,'breathe',JSON.stringify(await rects()));await page.screenshot({path:'.frames/r20-med-tilt-breathe-'+tag+'.png'});
await context.close();}
await browser.close();server.close();

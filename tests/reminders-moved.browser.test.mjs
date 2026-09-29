// R8: a phone that turned reminders on before the Cloudflare move holds a push subscription under the
// old VAPID key. Signed in, it gets a one-time notice whose tap runs the normal enable flow (built app, 375x812).
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {completeCoach} from './onboarding-fixture.mjs';
import {progress} from '../server/domain.mjs';

const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp'};
const OLD_KEY='B'.repeat(84),NEW_KEY='C'+'B'.repeat(83);

test('a stale-key phone sees "Reminders moved" once, and the tap resubscribes under the new key',{timeout:120000},async()=>{
 const root=resolve('dist/client');let plan=null;const subscribed=[];
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/api/account'&&plan){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({user:{id:'owner-a',provider:'chatgpt',email:'owner@example.com'},dataEpoch:1,revision:0,profile:{},onboarding:plan,progress:progress(0),entitlements:{},push:{configured:true,publicKey:NEW_KEY,schedulerActive:true,status:'ready'}}));return;}
  if(path==='/api/push/subscribe'){let body='';for await(const chunk of req)body+=chunk;subscribed.push(JSON.parse(body).endpoint);res.writeHead(200,{'Content-Type':'application/json'});res.end('{"subscribed":true}');return;}
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const file=resolve(root,'.'+(path==='/'?'/pose.html':path));if(!file.startsWith(root+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':TYPES[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});
  const context=await browser.newContext({viewport:{width:375,height:812},serviceWorkers:'block',reducedMotion:'reduce'});
  await context.grantPermissions(['notifications'],{origin:base});
  await context.addInitScript(()=>Object.defineProperty(navigator,'standalone',{configurable:true,value:true}));
  // The phone's existing subscription was made under OLD_KEY; subscribe() records what the enable flow asks for.
  const stalePhone=oldKey=>{
   const bytes=text=>Uint8Array.from(atob(text.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
   const sub=(endpoint,key)=>({endpoint,options:{applicationServerKey:key.buffer},unsubscribe:async()=>{window.__push.push('unsubscribe');current=null;return true;},toJSON:()=>({endpoint,keys:{p256dh:'p',auth:'a'}})});
   let current=sub('https://fcm.googleapis.com/fcm/send/old',bytes(oldKey));window.__push=[];
   const reg={pushManager:{getSubscription:async()=>current,subscribe:async options=>{window.__push.push('subscribe');return current=sub('https://fcm.googleapis.com/fcm/send/new',new Uint8Array(options.applicationServerKey));}}};
   ServiceWorkerContainer.prototype.getRegistration=async()=>reg;Object.defineProperty(ServiceWorkerContainer.prototype,'ready',{configurable:true,get:()=>Promise.resolve(reg)});
  };
  const seed=await context.newPage();await seed.goto(base+'/onboarding.html');
  await seed.evaluate(async intake=>{const {openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();},completeCoach());
  await seed.goto(base+'/pose.html#pod');await seed.waitForFunction(()=>!!window.coachPlan);plan=await seed.evaluate(()=>JSON.parse(JSON.stringify(window.coachPlan)));await seed.close();
  const page=await context.newPage();await page.addInitScript(stalePhone,OLD_KEY);const notice='.reminders-moved',tap='.reminders-moved [data-on]';
  const signedIn=()=>page.waitForFunction(()=>window.myr5AuthenticatedAccount?.user?.id==='owner-a'&&!!document.querySelector('.reminders-moved'));
  await page.goto(base+'/pose.html#pod');await signedIn();await page.waitForSelector(notice,{state:'visible'});
  assert.match(await page.locator(tap).textContent(),/Reminders moved to a new server\. Tap to turn them back on\./);
  assert.equal(await page.locator('#notificationSwitch').getAttribute('aria-checked'),'false','a stale-key subscription is not shown as on');
  const box=await page.locator(notice).boundingBox();assert.ok(box.y<120,'the notice sits at the top, clear of the bottom update banner');
  assert.equal(await page.locator(tap).evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===el;}),true,'nothing covers the notice');
  await page.locator(tap).click();
  await page.waitForFunction(()=>document.getElementById('notificationSwitch').getAttribute('aria-checked')==='true');
  assert.deepEqual(await page.evaluate(()=>window.__push.slice(0,2)),['unsubscribe','subscribe']);
  assert.equal(subscribed[0],'https://fcm.googleapis.com/fcm/send/new');
  assert.equal(await page.locator('#remindersPanel').evaluate(el=>el.open),true);
  assert.equal(await page.locator(notice).isHidden(),true);
  await page.reload();await signedIn();await page.waitForTimeout(1500);
  assert.equal(await page.locator(notice).isHidden(),true,'one time: it does not come back after a reload');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});

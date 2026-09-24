// Hotfix (23 Sept): on the pod the update notice would not clear for a signed-in, set-up user. Runs the
// real build (npm run build) at 375x812, installed, signed in; the notice is the one launch.mjs shows.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {completeCoach} from './onboarding-fixture.mjs';

const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp'};

test('the update notice is tappable on the pod for a signed-in user and "Got it" clears it for this release',{timeout:90000},async()=>{
 const root=resolve('dist/client');let plan=null;
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/api/account'&&plan){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({user:{id:'owner-a',provider:'chatgpt',email:'owner@example.com'},dataEpoch:1,revision:0,profile:{},onboarding:plan,progress:null,entitlements:{}}));return;}
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const file=resolve(root,'.'+(path==='/'?'/pose.html':path));if(!file.startsWith(root+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':TYPES[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});
  const context=await browser.newContext({viewport:{width:375,height:812},serviceWorkers:'block',reducedMotion:'reduce'});
  await context.addInitScript(()=>Object.defineProperty(navigator,'standalone',{configurable:true,value:true}));
  const seed=await context.newPage();await seed.goto(base+'/onboarding.html');
  await seed.evaluate(async intake=>{const {openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();},completeCoach());
  // The account's plan is the one this setup produces.
  await seed.goto(base+'/pose.html#pod');await seed.waitForFunction(()=>!!window.coachPlan);plan=await seed.evaluate(()=>JSON.parse(JSON.stringify(window.coachPlan)));await seed.close();
  const page=await context.newPage(),banner='.app-update-banner',gotIt='.app-update-banner [data-later]';
  const open=async()=>{await page.waitForFunction(()=>window.myr5AuthenticatedAccount?.user?.id==='owner-a'&&!!window.coachPlan&&!!document.querySelector('.app-update-banner')&&!document.querySelector('dialog[open]'));await page.waitForTimeout(1200);};
  await page.goto(base+'/pose.html#pod');await open();
  assert.equal(await page.locator(banner).isVisible(),true);
  assert.equal(await page.locator(gotIt).evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===el;}),true,'nothing covers the notice on the pod');
  await page.locator(gotIt).click();
  await page.waitForTimeout(2200);assert.equal(await page.locator(banner).isHidden(),true,'stays cleared through the repaint');
  await page.reload();await open();assert.equal(await page.locator(banner).isHidden(),true,'stays cleared for this release');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});

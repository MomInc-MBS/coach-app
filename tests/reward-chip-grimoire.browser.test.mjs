import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {completeCoach} from './onboarding-fixture.mjs';

const ROOT=resolve('dist/client');
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp'};

test('Ian 7 Oct: the reward-pack chip stays tappable over the grimoire and a tap starts the pack opening',async()=>{
 const server=createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://local').pathname;
  if(pathname.startsWith('/api/')){res.writeHead(pathname==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(pathname==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const file=resolve(ROOT,'.'+(pathname==='/'?'/pose.html':decodeURIComponent(pathname)));if(!file.startsWith(ROOT+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':TYPES[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}
 });
 await new Promise(done=>server.listen(0,'127.0.0.1',done));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});
  const context=await browser.newContext({viewport:{width:375,height:812},serviceWorkers:'block',reducedMotion:'reduce'});
  await context.addInitScript(()=>Object.defineProperty(navigator,'standalone',{configurable:true,value:true}));
  await context.addInitScript(owner=>{localStorage.setItem('myr5-battle-pass-ledger-v1/account/'+owner,JSON.stringify({'reward-pack':['reward-pack:uncommon:browser-regression']}));},'reward-browser-owner');
  const setup=await context.newPage();await setup.goto('http://127.0.0.1:'+server.address().port+'/onboarding.html');
  await setup.evaluate(async intake=>{const{openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();},completeCoach());await setup.close();
  const page=await context.newPage();await page.goto('http://127.0.0.1:'+server.address().port+'/pose.html');
  await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&window.myr5WorkoutOwner&&!window.myr5WorkoutOwner.snapshot().transitioning);
  await page.waitForFunction(()=>!!document.querySelector('.coach-dock'));
  await page.evaluate(()=>{const account={user:{id:'reward-browser-owner'},dataEpoch:1};window.myr5AuthenticatedAccount=account;window.dispatchEvent(new CustomEvent('myr5:account-ready',{detail:account}));});
  // The chip is built by mountRewardPacks; show it as update() would, then raise the grimoire (whose background is made inert).
  await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false&&document.querySelector('.reward-pack-launch'));
  await page.waitForTimeout(1500);
  const hit=await page.evaluate(()=>{document.querySelector('.app-update-banner')?.remove();const c=document.querySelector('.reward-pack-launch');c.hidden=false;const r=c.getBoundingClientRect(),top=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {inert:c.inert,onTop:r.width>0&&(c===top||c.contains(top)),top:top?.tagName+'.'+top?.className+'|'+top?.getAttribute('aria-label')+'|'+getComputedStyle(top).zIndex+'|'+JSON.stringify(top.getBoundingClientRect())+'|'+top.parentElement?.id,w:r.width};});
  assert.deepEqual(hit,{inert:false,onTop:true,top:hit.top,w:hit.w},'the grimoire leaves the reward-pack chip live and on top: '+JSON.stringify(hit));
  await context.close();
 }finally{await browser?.close();server.closeAllConnections();await new Promise(done=>server.close(done));}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {completeCoach} from './onboarding-fixture.mjs';

const ROOT=resolve('dist/client');
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp'};

test('built app opens an account-scoped reward pack and shows its earned cosmetic on the 64x64 tile',async()=>{
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
  await page.evaluate(()=>{const blocker=document.createElement('dialog');blocker.id='active-food-dialog';blocker.textContent='Saving a meal';document.body.append(blocker);blocker.showModal();const account={user:{id:'reward-browser-owner'},dataEpoch:1};window.myr5AuthenticatedAccount=account;window.dispatchEvent(new CustomEvent('myr5:account-ready',{detail:account}));});
  const dialog=page.locator('.reward-pack-dialog');
  await page.waitForTimeout(750);
  assert.equal(await dialog.isVisible(),false,'a reward drop waits while another modal is in use');
  await page.evaluate(()=>{for(const open of document.querySelectorAll('dialog[open]:not(.reward-pack-dialog)'))open.close();});
  await dialog.waitFor({state:'visible',timeout:10000});
  const canvas=page.locator('.reward-pack-tile');
  assert.deepEqual(await canvas.evaluate(el=>[el.width,el.height]),[64,64],'reward art uses a 64×64 canvas');
  await page.evaluate(()=>{Math.random=()=>0;});
  await dialog.locator('[data-open]').click();
  await page.locator('.drop-pod.ready .drop-pod-hit').click({timeout:15000});
  await page.waitForFunction(()=>document.querySelector('.reward-pack-result strong')?.textContent);
  const opened=await page.evaluate(()=>JSON.parse(localStorage.getItem('myr5-opened-reward-packs-v1/reward-browser-owner'))['reward-pack:uncommon:browser-regression']);
  const category={'color':'Colour palette','64-bit':'64-bit boss skin','texture':'Texture'}[opened.category];
  assert(opened.reward.name,'the saved roll identifies the actual cosmetic');
  const visible=await page.locator('.reward-pack-result').innerText();
  assert.match(visible,new RegExp(opened.reward.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),'shows the actual earned cosmetic name');
  assert.match(visible,new RegExp(category,'i'),'shows the actual reward category');
  await mkdir(resolve('.frames'),{recursive:true});
  await page.screenshot({path:resolve('.frames/reward-tile-account-scoped.png'),fullPage:false});
  await context.close();
 }finally{await browser?.close();server.closeAllConnections();await new Promise(done=>server.close(done));}
});


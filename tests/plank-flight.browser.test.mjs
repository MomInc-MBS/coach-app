import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {completeCoach} from './onboarding-fixture.mjs';
import {guideSeen} from './guide-seen.mjs';

// Synthetic tracker only: this verifies the actual app route, not physical camera accuracy.
const trackerModule=`export const FilesetResolver={forVisionTasks:async()=>({})};
export const PoseLandmarker={POSE_CONNECTIONS:[],createFromOptions:async()=>({detectForVideo(video){
 if(window.__flightMissing)return {landmarks:[],worldLandmarks:[]};
 const stage=window.myr5TestState?.motion?.flightPose?.stage||'high';
 const y={high:.38,low:.60,left:.38,right:.38,mid:.49,'mixed-left':.49,'mixed-right':.49,ready:.49}[stage]??.49;
 const lean={left:.065,right:-.065,'mixed-left':.055,'mixed-right':-.055}[stage]??0;
 const p=Array.from({length:33},()=>({x:.5,y:.5,visibility:.99})),w=Array.from({length:33},()=>({x:0,y:0,z:0}));
 for(const[s,e,h,hip,k,sign]of[[11,13,15,23,25,1],[12,14,16,24,26,-1]]){
 p[s]={x:.5+sign*.12+lean,y,visibility:.99};p[e]={x:.5+sign*.17+lean*.4,y:(y+.78)/2,visibility:.99};p[h]={x:.5+sign*.18,y:.78,visibility:.99};p[hip]={x:.5+sign*.07+lean*.3,y:y-.10,visibility:.99};p[k]={x:.5+sign*.035,y:y-.18,visibility:.99};
 w[s]={x:sign*.2,y:-.3,z:-.5};w[e]={x:sign*.24,y:-.15,z:-.52};w[h]={x:sign*.27,y:0,z:-.55};w[hip]={x:sign*.16,y:-.3,z:0};w[k]={x:sign*.13,y:-.3,z:.45};
 }return {landmarks:[p],worldLandmarks:[w]};},close(){}})};export class DrawingUtils{drawConnectors(){} drawLandmarks(){}};`;

test('Plank Flight actual app path calibrates, credits only active pose, pauses, saves and cleans up',{timeout:120000},async()=>{
 const root=resolve('dist/client'),errors=[];
 const server=createServer(async(req,res)=>{const path=new URL(req.url,'http://local').pathname;
  if(path==='/__test__'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><title>Flight setup</title>');return;}
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const file=resolve(root,'.'+(path==='/pose'?'/pose.html':path));if(!file.startsWith(root+sep))throw Error();const data=await readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.wasm':'application/wasm','.webmanifest':'application/manifest+json'})[extname(file)]??'application/octet-stream'});res.end(data);}catch{res.writeHead(404);res.end();}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser,page;
 try{browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
  const context=await browser.newContext({viewport:{width:375,height:812},permissions:['camera'],serviceWorkers:'block'});await context.addInitScript(()=>Object.defineProperty(navigator,'standalone',{configurable:true,value:true}));page=await context.newPage();page.on('pageerror',e=>errors.push(e.stack??e.message));await context.addInitScript(guideSeen);
  await page.route('**/vendor/mediapipe/0.10.14/vision_bundle.mjs',route=>route.fulfill({contentType:'text/javascript',body:trackerModule}));
  const external=process.env.PLANK_LIVE_URL;
  const base=external||'http://127.0.0.1:'+server.address().port;await page.goto(base+(external?'/privacy.html':'/__test__'));
  await page.evaluate(async intake=>{const{openLocalCoach}=await import('/local-coach-runtime.mjs');const repo=await openLocalCoach();await repo.forOwner(repo.guestOwnerId).saveSetup(intake,{startDay:'2026-09-21'});repo.close();const{chooseWorkoutPaths}=await import('/chosen-styles.mjs');chooseWorkoutPaths(['yoga','chest']);},completeCoach());
  await page.goto(base+'/pose#pod');await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&window.myr5WorkoutOwner&&!window.myr5WorkoutOwner.snapshot().transitioning);
  await page.evaluate(async()=>{const{chooseWorkoutPaths}=await import('/chosen-styles.mjs');chooseWorkoutPaths(['yoga','chest'],{reset:true});});
  await page.locator('#plankFlight').click();
  await page.waitForFunction(()=>!!window.myr5PlankFlight?.active);
  await page.getByRole('button',{name:'Begin flight',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.pf-panel')?.hidden===true);
  await page.waitForFunction(()=>window.myr5PlankFlight?.active?.run?.phase==='flying',null,{timeout:45000});
  await page.waitForFunction(()=>window.myr5TestState.motion.totalHold>.5,null,{timeout:10000});
  assert.equal(await page.locator('.plank-flight').count(),1);assert.equal(await page.locator('.plank-flight canvas.pf-canvas').count(),1);
  const before=await page.evaluate(()=>window.myr5TestState.motion.totalHold);await page.evaluate(()=>window.__flightMissing=true);
  await page.waitForFunction(()=>window.myr5PlankFlight.active.run.phase==='paused');
  const frozen=await page.evaluate(()=>window.myr5TestState.motion.totalHold);assert.ok(frozen-before<.4);
  await page.evaluate(()=>{window.__flightMissing=false;});await page.waitForFunction(()=>window.myr5PlankFlight.active.run.phase==='flying',null,{timeout:12000});
  await mkdir('D:/outputs/plank-joyride-20261016/shots',{recursive:true});await page.screenshot({path:'D:/outputs/plank-joyride-20261016/shots/actual-app-flight-375.png'});
  // Use the real wallet while paused; a test grant is a fixture, never claimed game earnings.
  await page.getByRole('button',{name:'Pause flight',exact:true}).click();
  await page.evaluate(async()=>{const{performanceOwner}=await import('/performance-progress.mjs');const{openFlightWallet}=await import('/arcade/plank-flight/economy.mjs');const w=await openFlightWallet({owner:performanceOwner()});await w.record('browser-fixture-funds',[{id:'fixture',type:'coin',amount:500}]);w.close();});
  await page.getByRole('button',{name:/shop/i}).first().click();assert.ok(await page.locator('[data-view="shop"]').isVisible());
  const upgrade=page.locator('[data-act="buy"][data-id="magnet-tuning"]');
  await upgrade.click();await page.waitForFunction(()=>document.querySelector('[data-act="buy"][data-id="magnet-tuning"]')?.textContent.includes('160'));
  await upgrade.click();await page.waitForFunction(()=>document.querySelector('[data-act="buy"][data-id="magnet-tuning"]')?.textContent.includes('240'));
  await upgrade.click();await page.waitForFunction(()=>document.querySelector('[data-act="buy"][data-id="magnet-tuning"]')?.disabled===true);
  await page.screenshot({path:'D:/outputs/plank-joyride-20261016/shots/actual-app-shop-375.png'});
  await page.getByRole('button',{name:'Back',exact:true}).click();
  await page.getByRole('button',{name:'Finish this flight',exact:true}).click();
  await page.getByRole('button',{name:'Finish workout',exact:true}).click();
  await page.waitForFunction(()=>window.myr5TestState.phase==='idle',null,{timeout:15000});assert.equal(await page.locator('.plank-flight').count(),0);
  assert.equal(await page.evaluate(()=>document.querySelector('#v').srcObject),null);
  await page.goto(base+'/pose?flight-reentry=1#pod');
  await page.waitForFunction(()=>window.myr5TestState?.phase==='idle'&&window.myr5WorkoutOwner&&!window.myr5WorkoutOwner.snapshot().transitioning);
  const saved=page.locator('.continue-workout:not([hidden])');await saved.waitFor({state:'visible',timeout:2000}).catch(()=>{});
  if(await saved.isVisible())await saved.getByRole('button',{name:'Continue',exact:true}).click();else await page.locator('#plankFlight').click();
  await page.waitForFunction(()=>!!window.myr5PlankFlight?.active);
  assert.equal(await page.evaluate(()=>window.myr5TestState.motion.flightPose?.calibrated??false),false,'re-entry starts a new calibration');
  await page.setViewportSize({width:812,height:375});
  assert.ok(await page.locator('.plank-flight').evaluate(el=>el.getBoundingClientRect().width<=innerWidth+1));
  await page.screenshot({path:'D:/outputs/plank-joyride-20261016/shots/actual-app-calibration-landscape.png'});
  await page.getByRole('button',{name:'End workout and turn camera off',exact:true}).click();
  await page.waitForFunction(()=>window.myr5TestState.phase==='idle');assert.equal(await page.locator('.plank-flight').count(),0);
  assert.equal(await page.evaluate(()=>document.querySelector('#v').srcObject),null);
  const flightErrors=errors.filter(e=>/plank|flight|undefined.*(?:run|pose)/i.test(e));assert.deepEqual(flightErrors,[],errors.join('\n'));
 }catch(error){if(page){await mkdir('D:/outputs/plank-joyride-20261016/shots',{recursive:true});await page.screenshot({path:'D:/outputs/plank-joyride-20261016/shots/browser-failure.png'}).catch(()=>{});const diagnostic=await page.evaluate(()=>({state:window.myr5TestState,run:window.myr5PlankFlight?.active?.run?.phase,status:document.querySelector('#status')?.textContent,mode:document.querySelector('#movement')?.value,text:document.body.innerText.slice(-1800)})).catch(()=>({}));await writeFile('D:/outputs/plank-joyride-20261016/browser-diagnostic.json',JSON.stringify({diagnostic,errors},null,2));console.error(JSON.stringify(diagnostic));}throw error;}
 finally{await browser?.close();await new Promise(r=>server.close(r));}
});

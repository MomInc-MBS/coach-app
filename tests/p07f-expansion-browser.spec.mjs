import {test,expect} from 'playwright/test';
import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {generateKeyPairSync,sign,createHash} from 'node:crypto';

const root=resolve(import.meta.dirname,'..'), evidence=resolve(root,'../../outputs/P07F');
const asset=Buffer.from('MOM signed paper fixture asset');
const pair=generateKeyPairSync('ed25519'), trust={purpose:'test-only-signed-expansion',publicKey:pair.publicKey.export({format:'jwk'})};
const hash=createHash('sha256').update(asset).digest('hex');
const canonical=m=>JSON.stringify({packId:m.packId,version:m.version,minAppVersion:m.minAppVersion,sha256:m.sha256,alg:m.alg,keyId:m.keyId,assets:m.assets.map(({path,bytes,sha256})=>({path,bytes,sha256}))});
const makeManifest=()=>{const m={packId:'mom-paper-tear',version:'1.0.0',minAppVersion:'1.0.0',sha256:hash,alg:'Ed25519',keyId:'mom-paper-production-v1',assets:[{path:'assets/paper.bin',bytes:asset.length,sha256:hash}]};m.signature=sign(null,Buffer.from(canonical(m)),pair.privateKey).toString('base64');return m;};
let server,base,requests;
test.use({channel:'msedge'});
test.beforeAll(async()=>{await mkdir(evidence,{recursive:true});server=http.createServer(async(req,res)=>{requests.push(new URL(req.url,'http://local').pathname);const path=new URL(req.url,'http://local').pathname;if(path==='/modules/new/manifest.json')return res.end(JSON.stringify(makeManifest()));if(path==='/modules/new/assets/paper.bin')return res.end(asset);if(path==='/blank.html')return res.end('<!doctype html><main id="app"></main>');if(path==='/modules/new/expansion-entry.mjs'||path==='/modules/new/expansion-config.mjs'||path==='/modules/new/expansion.css'||path==='/packs/isolated-pack-control.mjs'||path==='/packs/pack-lifecycle.mjs'||path==='/packs/browser-asset-store.mjs'||path==='/packs/workout-idle-adapter.mjs'||path==='/public-access.mjs'){const body=await readFile(resolve(root,'.'+path));res.writeHead(200,{'Content-Type':path.endsWith('.css')?'text/css':'text/javascript'});return res.end(body);}res.writeHead(404);res.end();});await new Promise(done=>server.listen(0,'127.0.0.1',done));base=`http://127.0.0.1:${server.address().port}`;});
test.afterAll(()=>new Promise(done=>server.close(done)));

for(const [name,viewport] of Object.entries({phone:{width:393,height:873},desktop:{width:1440,height:900}}))test(`signed fixture, downward gesture, cancel, keyboard and reduced motion at ${name}`,async({page})=>{
 requests=[];await page.setViewportSize(viewport);await page.emulateMedia({reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/blank.html');
 const result=await page.evaluate(async trust=>{const mod=await import('/modules/new/expansion-entry.mjs'),{PackLifecycle,fixtureAssetStore,memoryStore}=await import('/packs/pack-lifecycle.mjs');const resolved=await mod.resolveExpansionManifest({url:'/modules/new/manifest.json',testTrust:trust}),asset=await resolved.source.get(resolved.manifest.assets[0]);let saves=0;const lifecycle=new PackLifecycle({account:{getEntitlements:()=>['mom-paper-tear']},storage:memoryStore(),assetStore:fixtureAssetStore(),workout:{saveAndConfirmIdle:async()=>{saves++;return {saved:true,idle:true};}},runtimeFactory:async()=>({dispose(){}})});lifecycle.manifest(resolved.manifest,resolved.source);await lifecycle.download('mom-paper-tear');await lifecycle.verify('mom-paper-tear');await lifecycle.equipPending('mom-paper-tear');const pending=lifecycle.status('mom-paper-tear').state;await lifecycle.restart();const active=lifecycle.status('mom-paper-tear').state;const shell=mod.createPaperTearShell();document.querySelector('#app').append(shell);shell.hidden=false;const logo=shell.querySelector('.paper-logo'),dimension=shell.querySelector('.dimension-shell');const fire=(type,x,y)=>logo.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:7,clientX:x,clientY:y}));fire('pointerdown',70,20);fire('pointermove',70,120);const downward=logo.style.getPropertyValue('--tear-progress');fire('pointercancel',70,120);const canceled=dimension.hidden;fire('pointerdown',70,20);fire('pointerup',70,150);const opened=!dimension.hidden;dimension.hidden=true;logo.hidden=false;logo.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));return {verified:asset.length,pending,active,saves,downward,canceled,opened,keyboard:!dimension.hidden,aria:logo.getAttribute('aria-label'),motion:getComputedStyle(logo).transitionDuration};},trust);
 expect(result.verified).toBe(asset.length);expect(result).toMatchObject({pending:'pending-equip',active:'active',saves:1});expect(Number(result.downward)).toBeGreaterThan(0);expect(result.canceled).toBe(true);expect(result.opened).toBe(true);expect(result.keyboard).toBe(true);expect(result.aria).toMatch(/down/i);expect(result.motion).toBe('0s');expect(requests).toContain('/modules/new/manifest.json');expect(requests).toContain('/modules/new/assets/paper.bin');expect(errors).toEqual([]);await page.screenshot({path:resolve(evidence,`expansion-${name}.png`),fullPage:true});
});

test('bad signature, failed fetch/retry, and locked entitlement make zero optional asset requests',async({page})=>{
 requests=[];await page.goto(base+'/blank.html');const result=await page.evaluate(async trust=>{const {resolveExpansionManifest,mountExpansion}=await import('/modules/new/expansion-entry.mjs');const bad=await fetch('/modules/new/manifest.json').then(r=>r.json());bad.signature=bad.signature.slice(0,-2)+'xx';let corrupt=false;try{await resolveExpansionManifest({fixture:{manifest:bad,source:{}},testTrust:trust});}catch{corrupt=true;}let failed=false;try{await resolveExpansionManifest({fetchImpl:async()=>({ok:false,status:503}),url:'/modules/new/manifest.json',testTrust:trust});}catch{failed=true;}let fetches=0;const locked=mountExpansion({account:{entitlements:{coachArmy:{status:'locked'}}},host:document.querySelector('#app'),fetchImpl:async()=>{fetches++;throw Error('must not fetch');}});return {corrupt,failed,locked:locked===null,fetches};},trust);expect(result).toEqual({corrupt:true,failed:true,locked:true,fetches:0});expect(requests.filter(p=>p==='/modules/new/assets/paper.bin')).toHaveLength(0);
});

test('unlocked mount fetches no asset until download and restores pending pack only after a genuine page reload',async({page})=>{
 requests=[];await page.goto(base+'/blank.html');
 const first=await page.evaluate(async trust=>{
  const {mountExpansion}=await import('/modules/new/expansion-entry.mjs');
  const account={entitlements:{coachArmy:{status:'completed',completedAt:1}}};
  const mounted=mountExpansion({account,host:document.querySelector('#app'),testTrust:trust,workout:{saveAndConfirmIdle:async()=>({saved:true,idle:true})}});
  await new Promise(resolve=>setTimeout(resolve,40));
  const before=mounted.lifecycle.status('mom-paper-tear').state;
  mounted.panel.querySelector('[data-expansion-download]').click();
  await new Promise(resolve=>setTimeout(resolve,80));
  return {before,pending:mounted.lifecycle.status('mom-paper-tear').state,active:!!mounted.panel.querySelector('.mom-paper-expansion')};
 },trust);
 expect(first).toEqual({before:'absent',pending:'pending-equip',active:false});
 expect(requests.filter(path=>path==='/modules/new/assets/paper.bin')).toHaveLength(1);
 await page.reload();
 const restored=await page.evaluate(async trust=>{
  const {mountExpansion}=await import('/modules/new/expansion-entry.mjs');
  const mounted=mountExpansion({account:{entitlements:{coachArmy:{status:'completed',completedAt:1}}},host:document.querySelector('#app'),testTrust:trust,workout:{saveAndConfirmIdle:async()=>({saved:true,idle:true})}});
  await new Promise(resolve=>setTimeout(resolve,80));
  return {state:mounted.lifecycle.status('mom-paper-tear').state,shell:!!mounted.panel.querySelector('.mom-paper-expansion'),pending:mounted.lifecycle.status('mom-paper-tear').pending};
 },trust);
 expect(restored).toEqual({state:'active',shell:true,pending:false});
 await page.screenshot({path:resolve(evidence,'expansion-reload-active.png'),fullPage:true});
});

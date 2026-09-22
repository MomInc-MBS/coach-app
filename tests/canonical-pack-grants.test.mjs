import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {accountPackGrants,hasPackGrant,packAccountIdentity} from '../packs/pack-entitlements.mjs';
import {authenticatedPackAccount} from '../packs/isolated-pack-control.mjs';
import {verifiedMaterialAccount} from '../modules/materials/material-pack-entry.mjs';
import {PackLifecycle,memoryStore,fixtureAssetStore,sha256} from '../packs/pack-lifecycle.mjs';
import {readEntitlements} from '../server/entitlements.mjs';
const grant=packId=>({packId,status:'owned',grantedAt:1});
const account=(id='owner-a',grants=[grant('mom-paper-tear'),grant('liquid-amethyst')])=>({user:{id},dataEpoch:1,entitlements:{ownedPacks:grants}});

test('the server entitlement payload flows through both adapters at one canonical path',async()=>{
 const owners=[];const db={prepare(sql){return {bind(owner){owners.push(owner);return this;},async first(){return null;},async all(){assert.match(sql,/account_pack_entitlements/);return {results:[{packId:'mom-paper-tear',grantedAt:1},{packId:'liquid-amethyst',grantedAt:1}]};}};}};
 const a={user:{id:'owner-a'},entitlements:await readEntitlements(db,'owner-a')};
 assert.equal(a.entitlements.coachArmy,null);assert.deepEqual(authenticatedPackAccount(a).getEntitlements(),a.entitlements.ownedPacks);assert.deepEqual(verifiedMaterialAccount(a).getEntitlements(),[grant('liquid-amethyst')]);assert.equal(hasPackGrant(a,'mom-paper-tear'),true);assert.deepEqual(owners,['owner-a','owner-a']);
});
test('canonical grants authorize downloaded bytes without a Coach Army achievement',async()=>{
 const a=account(),data=new Uint8Array([1,2,3]),hash=await sha256(data);let requests=0;
 const life=new PackLifecycle({account:authenticatedPackAccount(a),storage:memoryStore(),assetStore:fixtureAssetStore(),workout:{saveAndConfirmIdle:async()=>({saved:true,idle:true,release(){}})}});
 life.manifest({packId:'mom-paper-tear',version:'1.0.0',minAppVersion:'1.0.0',sha256:hash,assets:[{path:'asset.bin',bytes:data.length,sha256:hash}]},{get:async()=>{requests++;return data;}});
 await life.download('mom-paper-tear');await life.verify('mom-paper-tear');assert.equal(life.status('mom-paper-tear').state,'verified');assert.equal(requests,1);assert.equal(a.entitlements.coachArmy,undefined);
});
test('achievement alone and legacy top-level grants authorize neither pack adapter',()=>{
 for(const a of [{user:{id:'owner-a'},entitlements:{coachArmy:{status:'completed',completedAt:1}}},{user:{id:'owner-a'},ownedPacks:[grant('mom-paper-tear'),grant('liquid-amethyst')]},{user:{id:'owner-a'},ownedPacks:[grant('liquid-amethyst')],entitlements:{ownedPacks:[]}}]){
  assert.deepEqual(authenticatedPackAccount(a).getEntitlements(),[]);assert.deepEqual(verifiedMaterialAccount(a).getEntitlements(),[]);assert.equal(hasPackGrant(a,'mom-paper-tear'),false);
 }
});
test('another global owner cannot supply identity or grants to the passed account',()=>{
 const names=['coachAccount','coachEntitlements','myr5AuthenticatedAccount'],prior=names.map(name=>Object.getOwnPropertyDescriptor(globalThis,name));
 try{globalThis.coachAccount=account('owner-a');globalThis.coachEntitlements=globalThis.coachAccount.entitlements;globalThis.myr5AuthenticatedAccount=globalThis.coachAccount;
  for(const a of [undefined,null,{user:{id:'owner-b'}},{entitlements:{ownedPacks:[grant('mom-paper-tear'),grant('liquid-amethyst')]}}]){
   assert.deepEqual(authenticatedPackAccount(a).getEntitlements(),[]);assert.deepEqual(verifiedMaterialAccount(a).getEntitlements(),[]);assert.equal(hasPackGrant(a,'mom-paper-tear'),false);
  }
  assert.equal(packAccountIdentity({id:'owner-b'}),null);assert.deepEqual(authenticatedPackAccount().getEntitlements(),[]);
 }finally{names.forEach((name,i)=>{if(prior[i])Object.defineProperty(globalThis,name,prior[i]);else delete globalThis[name];});}
});
test('an existing adapter is bound to its original owner and exposes data epoch changes',()=>{
 const a=account(),generic=authenticatedPackAccount(a),material=verifiedMaterialAccount(a);assert.equal(generic.getIdentity(),'owner-a');a.dataEpoch=2;assert.equal(generic.getGeneration(),2);a.user.id='owner-b';assert.equal(generic.getIdentity(),'owner-b');assert.deepEqual(generic.getEntitlements(),[]);assert.deepEqual(material.getEntitlements(),[]);
});
test('invalid or non-owned records are rejected and material policy is an own-property allowlist',()=>{
 const a=account('owner-a',[grant('liquid-amethyst'),grant('toString'),{...grant('revoked'),status:'revoked'},{...grant('malformed'),grantedAt:'1'},grant(''),grant(' whitespace ')]);
 assert.deepEqual(accountPackGrants(a),[grant('liquid-amethyst'),grant('toString')]);assert.deepEqual(verifiedMaterialAccount(a).getEntitlements(),[grant('liquid-amethyst')]);assert.equal(hasPackGrant(a,'revoked'),false);assert.deepEqual(accountPackGrants(a,'owner-b'),[]);
});
test('reading grants is side-effect free when verification is unavailable',()=>{
 const a=account(),before=JSON.stringify(a);assert.deepEqual(accountPackGrants(a),a.entitlements.ownedPacks);assert.equal(JSON.stringify(a),before);assert.deepEqual(accountPackGrants(null),[]);assert.equal(JSON.stringify(a),before,'an unavailable active owner does not revoke or mutate the prior snapshot');
});
test('browser expansion denies achievement-only accounts and permits canonical grant-only accounts',async()=>{
 const root=resolve(import.meta.dirname,'..');const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://test').pathname;if(pathname==='/blank')return res.end('<!doctype html><main id="app"></main>');if(!/^\/(packs\/[^/]+\.mjs|modules\/new\/[^/]+\.mjs)$/.test(pathname)){res.writeHead(404);return res.end();}res.setHeader('content-type','text/javascript');res.end(await readFile(resolve(root,'.'+pathname)));}catch{res.writeHead(404);res.end();}});await new Promise(done=>server.listen(0,'127.0.0.1',done));let browser;
 try{browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/blank`);
  const result=await page.evaluate(async()=>{
   const {mountExpansion}=await import('/modules/new/expansion-entry.mjs'),{memoryStore,fixtureAssetStore}=await import('/packs/pack-lifecycle.mjs');let metadata=0;
   const testTrust={purpose:'test-only-signed-expansion',publicKey:{kty:'OKP',crv:'Ed25519',x:'11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo'}};
   const options={host:document.querySelector('#app'),storage:memoryStore(),assetStore:fixtureAssetStore(),workout:{saveAndConfirmIdle:async()=>({saved:true,idle:true,release(){}})},testTrust,fetchImpl:async()=>{metadata++;return Response.json({});}};
   const denied=mountExpansion({...options,account:{user:{id:'owner-a'},entitlements:{coachArmy:{status:'completed',completedAt:1}}}}),deniedCalls=metadata;
   const permitted=mountExpansion({...options,account:{user:{id:'owner-a'},entitlements:{ownedPacks:[{packId:'mom-paper-tear',status:'owned',grantedAt:1}]}}});await permitted.ready;
   const allowed={mounted:!!permitted,entitled:permitted.lifecycle.status('mom-paper-tear').entitlement,metadata};
   window.dispatchEvent(new CustomEvent('myr5:account-ready',{detail:{user:{id:'owner-a'},entitlements:{coachArmy:{status:'completed',completedAt:1},ownedPacks:[]}}}));const revoked={hidden:permitted.panel.hidden,control:permitted.lifecycle};permitted.dispose();
   return {denied:denied===null,deniedCalls,allowed,revoked};
  });assert.deepEqual(result,{denied:true,deniedCalls:0,allowed:{mounted:true,entitled:true,metadata:1},revoked:{hidden:true,control:null}});
 }finally{await browser?.close();await new Promise(done=>server.close(done));}
});

test('the launch gate reaches expansion with a grant and no achievement',async()=>{
 const source=await readFile(new URL('../launch.mjs',import.meta.url),'utf8');
 const start=source.indexOf('async function mountVerifiedExpansion(value){'),end=source.indexOf("window.addEventListener('myr5:account-ready'",start);
 const functionSource=source.slice(start,end).replace("await import('./modules/new/expansion-entry.mjs')",'await loadExpansion()');
 let loads=0,mounted;
 const mount=new Function('hasPackGrant','window','loadExpansion',`let expansionMounted=false;${functionSource};return mountVerifiedExpansion;`)(hasPackGrant,{myr5WorkoutOwner:{}},async()=>{loads++;return {mountExpansion(options){mounted=options.account;return {};}}});
 await mount({user:{id:'owner-a'},entitlements:{coachArmy:{status:'completed',completedAt:1}}});assert.equal(loads,0);
 const granted=account();await mount(granted);assert.equal(loads,1);assert.equal(mounted,granted);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
import {build} from 'esbuild';
import {signedSkinFixture} from './skin-fixture.mjs';

test('standalone creature page hydrates a stable same-origin account before revealing account-owned tabs',async()=>{
 const root=resolve('dist/client'),fixture=await signedSkinFixture(),requests=[];
 const server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://local'),path=url.pathname;
  if(path==='/api/account'){
   requests.push(url.pathname+url.search);const response=accountResponses.shift()??{status:401};
   res.writeHead(response.status??200,{'Content-Type':response.contentType??'application/json','Cache-Control':'no-store',...(response.location?{Location:response.location}:{})});
   if(response.redirectTo){res.end();return;}
   res.end(response.body??JSON.stringify(response.account??{user:{id:'owner-a'},dataEpoch:4}));return;
  }
  try{
   const body=path==='/creature/index.html'?await readFile(resolve('creature/index.html')):
    path==='/creature/assets/account-bridge.js'?await readFile(resolve('creature/assets/account-bridge.js')):
    path==='/creature/assets/editor.js'?editor.outputFiles[0].text:await readFile(resolve(root,'.'+path));
   res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.glb':'model/gltf-binary'})[extname(path)]||'application/octet-stream'});res.end(body);
  }catch{res.writeHead(404);res.end();}
 });
 let accountResponses=[];
 const materialTrustPlugin={name:'fixture-material-trust',setup(build){build.onLoad({filter:/material-config\.mjs$/},async args=>({contents:(await readFile(args.path,'utf8')).replace(/BUILT_PUBLIC_MATERIAL_SIGNING_JWK = [^;]+;/,'BUILT_PUBLIC_MATERIAL_SIGNING_JWK = '+JSON.stringify(fixture.trust)+';'),loader:'js'}));}};
 const editor=await build({entryPoints:['creature/source/editor.ts'],bundle:true,write:false,format:'esm',target:'es2022',plugins:[materialTrustPlugin]});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});
  const base='http://127.0.0.1:'+server.address().port;
  const open=async(responses,query='')=>{
   accountResponses=[...responses];const page=await browser.newPage();
   await page.addInitScript(()=>{
    localStorage.setItem('myr5-battle-pass-ledger-v1/account/owner-a',JSON.stringify({ship:['ship-supportive','ship-direct']}));
    localStorage.setItem('myr5-battle-pass-ledger-v1/account/owner-b',JSON.stringify({ship:['ship-calm']}));
    localStorage.setItem('myr5-ship-reveal-seen-v1',JSON.stringify({'owner-a':['supportive','direct'],'owner-b':['calm']}));
    localStorage.setItem('myr5-account-id','spoofed-owner');
   });
   await page.goto(base+'/creature/index.html'+query);await page.waitForFunction(()=>window.myr5Companion?.ready===true,null,{timeout:60000});
   return page;
  };

  const anonymous=await open([{status:401}]);
  assert.equal(await anonymous.evaluate(()=>window.myr5AuthenticatedAccount??null),null);
  assert.equal(await anonymous.locator('#tab-ship').isHidden(),true);
  assert.equal(await anonymous.locator('#tab-skin').isHidden(),true);
  assert.deepEqual(requests.slice(0,1),['/api/account?core=1'],'the bridge uses only the authenticated same-origin account endpoint');
  await anonymous.close();

  const ownerA=await open([{account:{user:{id:'owner-a'},dataEpoch:4}},{account:{user:{id:'owner-a'},dataEpoch:4}}],'?account=owner-b');
  await ownerA.waitForFunction(()=>!document.querySelector('#tab-ship')?.hidden);
  assert.equal(await ownerA.evaluate(()=>window.myr5AuthenticatedAccount.user.id),'owner-a','URL and localStorage account IDs do not select identity');
  assert.deepEqual(await ownerA.locator('#shipChoice option').evaluateAll(nodes=>nodes.map(n=>n.value)),['supportive','direct']);
  assert.equal(await ownerA.locator('#tab-skin').isHidden(),true,'a ship unlock cannot reveal the skin tab');
  await ownerA.close();

  const ownerB=await open([{account:{user:{id:'owner-b'},dataEpoch:9}},{account:{user:{id:'owner-b'},dataEpoch:9}}]);
  await ownerB.waitForFunction(()=>!document.querySelector('#tab-ship')?.hidden);
  assert.equal(await ownerB.evaluate(()=>window.myr5AuthenticatedAccount.user.id),'owner-b');
  assert.deepEqual(await ownerB.locator('#shipChoice option').evaluateAll(nodes=>nodes.map(n=>n.value)),['calm'],'only this account’s unlocked and revealed ship is shown');
  await ownerB.close();

  for(const responses of [
   [{status:302,location:'/signin.html'}],
   [{status:200,contentType:'text/html',body:'<h1>sign in</h1>'}],
   [{account:{user:{id:'../owner-a'},dataEpoch:4}}],
   [{account:{user:{id:'owner-a'},dataEpoch:0}}],
   [{account:{user:{id:'owner-a'},dataEpoch:4}},{account:{user:{id:'owner-b'},dataEpoch:4}}],
   [{account:{user:{id:'owner-a'},dataEpoch:4}},{account:{user:{id:'owner-a'},dataEpoch:5}}],
  ]){
   const page=await open(responses);await page.waitForTimeout(100);
   assert.equal(await page.evaluate(()=>window.myr5AuthenticatedAccount??null),null);
   assert.equal(await page.locator('#tab-ship').isHidden(),true);
   assert.equal(await page.locator('#tab-skin').isHidden(),true);
   await page.close();
  }
  const disposed=await open([{account:{user:{id:'owner-a'},dataEpoch:4}},{account:{user:{id:'owner-a'},dataEpoch:4}}]);
  await disposed.waitForFunction(()=>window.myr5AuthenticatedAccount?.user?.id==='owner-a');
  await disposed.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide')));
  assert.equal(await disposed.evaluate(()=>window.myr5AuthenticatedAccount??null),null,'page disposal clears the hydrated identity');
  assert.deepEqual(requests.filter(path=>path.startsWith('/api/account')),requests.filter(path=>path.startsWith('/api/account')).map(()=>'/api/account?core=1'));
 }finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
});

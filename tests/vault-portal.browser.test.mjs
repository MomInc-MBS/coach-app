// Achievement Vault L0: claims(id) precedence in portal.mjs endPointer, the myr5:portal-secret door poster, ?vault=1.
// Drives the test-only stub board (window.__portalTestStubBoard): no WebGL needed. Serves the source tree.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {transform} from 'esbuild';

async function withPortal(run){
 const root=resolve('.');
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/__portal__'){
   res.setHeader('Content-Type','text/html');
   res.end('<!doctype html><style>body{margin:0}</style><button id="background">Coach</button>'+
    '<nav class="coach-dock"><button data-panel="meals" onclick="document.querySelector(\'#mealsPanel\').showModal()">Food</button></nav>'+
    '<dialog id="mealsPanel">Nutrition<button onclick="this.closest(\'dialog\').close()">Close</button></dialog>'+
    '<script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/loaders/GLTFLoader.js":"/vendor/three/GLTFLoader.js","three/addons/libs/meshopt_decoder.module.js":"/vendor/three/meshopt_decoder.module.js"}}</script>');
   return;
  }
  try{const file=resolve(root,'.'+decodeURIComponent(path));if(!file.startsWith(root+sep))throw Error();const ext=extname(file);res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.ts':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png'})[ext]||'application/octet-stream');res.end(ext==='.ts'?(await transform(await readFile(file,'utf8'),{loader:'ts'})).code:await readFile(file));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  const args=['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader'];
  try{browser=await chromium.launch({headless:true,args});}catch{browser=await chromium.launch({channel:'msedge',headless:true,args});}
  await run(browser,'http://127.0.0.1:'+server.address().port+'/__portal__');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
}
async function boot(browser,url,{claims='()=>false'}={}){
 const page=await browser.newPage({viewport:{width:375,height:812},hasTouch:true});
 page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));if(process.env.VAULT_DEBUG)page.on('console',m=>console.log('console:',m.text()));
 await page.addInitScript(c=>{window.__portalTestStubBoard=true;window.__labels=[];window.__went=[];window.myr5Routes={go:id=>window.__went.push(id)};window.__portalTestClaims=eval(c);const o=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(t,...r){window.__labels.push(t);return o.call(this,t,...r);};},claims);
 await page.goto(url+'?board=__stub__');
 await page.evaluate(async()=>{const {openQuiltPortal}=await import('/modules/portal/portal-entry.mjs');window.portal=await openQuiltPortal();await window.portal.board('__stub__');window.portal.show();});
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);
 return page;
}
const tap=async(page,x,y)=>{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.up();};
const outline=async page=>{const r=await page.evaluate(()=>window.portal.current().patternRect());return [r.left+r.width*.25,r.top+r.height*.355,r];};
// The stub's myr5Routes.go records the route a shape opens (Food = the 'up' outline).
const opened=page=>page.evaluate(()=>window.__went.includes('food'));
const isOpen=page=>page.waitForFunction(()=>window.__went.includes('food'),null,{timeout:15000});

test('claims(id) false: an outline double-tap opens as before',async()=>withPortal(async(browser,url)=>{
 const page=await boot(browser,url);const [x,y]=await outline(page);
 await tap(page,x,y);await page.waitForTimeout(100);await tap(page,x,y);
 await isOpen(page);
}));
test('claims(id) true on both taps: no double-tap, nothing opens',async()=>withPortal(async(browser,url)=>{
 const page=await boot(browser,url,{claims:'()=>true'});const [x,y]=await outline(page);
 await tap(page,x,y);await page.waitForTimeout(100);await tap(page,x,y);await page.waitForTimeout(1200);
 assert.equal(await opened(page),false);
}));
test('outline double-tap wins over a claim: tap 1 unclaimed, tap 2 claimed still opens',async()=>withPortal(async(browser,url)=>{
 const page=await boot(browser,url,{claims:'(()=>{let n=0;return()=>++n>1;})()'});const [x,y]=await outline(page);
 await tap(page,x,y);await page.waitForTimeout(100);await tap(page,x,y);
 await isOpen(page);
}));
test('a claimed trace never reaches shape recognition or the "Almost" flash; an unclaimed one does',async()=>withPortal(async(browser,url)=>{
 for(const [claims,expectAlmost] of [['()=>false',true],['()=>true',false]]){
  const page=await boot(browser,url,{claims});const [,,r]=await outline(page);
  const inset=.06,x0=r.left+r.width*inset,y0=r.top+r.height*inset,x1=r.left+r.width*(1-inset),y1=r.top+r.height*(1-inset),xm=(x0+x1)/2;
  await page.mouse.move(x0,y0);await page.mouse.down();await page.mouse.move(x1,y0,{steps:3});await page.mouse.move(x1,y1,{steps:3});await page.mouse.move(xm,y1,{steps:3});await page.mouse.up();
  await page.waitForTimeout(700);
  assert.equal((await page.evaluate(()=>window.__labels)).includes('Almost: Workout'),expectAlmost,'claims='+claims);
  await page.close();
 }
}));
test('myr5:portal-secret marks the board, shows the door poster; tap goes to vault; Escape dismisses and heals',async()=>withPortal(async(browser,url)=>{
 await mkdir('.vault/shots',{recursive:true});
 const page=await boot(browser,url);
 await page.evaluate(()=>window.portal.secret('pond'));
 await page.waitForSelector('#portalVaultDoor');
 if(process.env.VAULT_DEBUG)console.log(await page.evaluate(()=>import('/modules/vault/vault-store.mjs').then(()=>'ok',e=>String(e))));
 await page.waitForFunction(()=>Object.keys(localStorage).some(k=>k.startsWith('myr5-vault-v1/')&&JSON.parse(localStorage.getItem(k)).secrets.pond),null,{timeout:15000});
 await page.screenshot({path:'.vault/shots/l0-door-poster.png'});
 await page.keyboard.press('Escape');
 assert.equal(await page.locator('#portalVaultDoor').count(),0);
 assert.equal(await page.evaluate(()=>document.getElementById('portalHome').hidden),false,'Escape dismisses the door, not the portal');
 await page.evaluate(()=>window.portal.secret('pond'));await page.waitForSelector('#portalVaultDoor');
 await page.click('#portalVaultDoor');
 await page.waitForFunction(()=>window.__went.length===1);
 assert.deepEqual(await page.evaluate(()=>window.__went),['vault']);
 assert.equal(await page.locator('#portalVaultDoor').count(),0);
 assert.deepEqual(page.errors,[]);
}));
test('?vault=1 opens the vault route on boot',async()=>withPortal(async(browser,url)=>{
 const page=await browser.newPage({viewport:{width:375,height:812}});
 await page.addInitScript(()=>{window.__portalTestStubBoard=true;window.__went=[];window.myr5Routes={go:id=>window.__went.push(id)};});
 await page.goto(url+'?board=__stub__&vault=1');
 await page.evaluate(async()=>{const {ensurePortalMounted}=await import('/modules/portal/portal-entry.mjs');await ensurePortalMounted();});
 assert.deepEqual(await page.evaluate(()=>window.__went),['vault']);
}));

test('createGlbBoard forwards claims(id): asked before effect.release, answer survives release and is consumed once',async()=>withPortal(async(browser,url)=>{
 const page=await browser.newPage({viewport:{width:375,height:812}});page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
 await page.goto(url);
 const out=await page.evaluate(async()=>{
  const {createGlbBoard}=await import('/modules/portal/portal-board-glb.mjs'),{wood}=await import('/modules/portal/portal-board-wood.mjs');
  const host=document.createElement('div');host.style.cssText='position:fixed;inset:0';document.body.append(host);
  let held=new Set(),log=[];
  const effect=Object.create(wood,{claims:{value:id=>{log.push('claims:'+held.has(id));return held.has(id);}},press:{value:(id,...a)=>{held.add(id);return wood.press?.(id,...a);}},release:{value:(id,...a)=>{log.push('release');held.delete(id);return wood.release?.(id,...a);}}});
  const board=await createGlbBoard(host,{effect}),f=board.faceRect(),x=f.left+f.width/2,y=f.top+f.height/2;
  board.press(7,x,y);const during=board.claims(7);board.release(7);
  const after=[board.claims(7),board.claims(7)];board.dispose();
  return {during,after,log};
 });
 assert.equal(out.during,true);assert.deepEqual(out.after,[true,false]);
 assert.deepEqual(out.log,['claims:true','claims:true','release','claims:false'],'claims is asked before effect.release forgets the pointer');
 assert.deepEqual(page.errors,[]);
}));

test('route stub: openVault shows the earned count and clues; routes.mjs has the vault route',async()=>withPortal(async(browser,url)=>{
 const page=await browser.newPage({viewport:{width:375,height:812}});page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
 await page.goto(url);
 const out=await page.evaluate(async()=>{
  const {ROUTES}=await import('/modules/routes.mjs');
  const m=await import('/modules/vault/vault-store.mjs');m.markSecret('pond');
  const {openVault}=await import('/modules/vault/vault-door.mjs'),d=await openVault();
  return {route:ROUTES.vault.dialog,open:d.open,id:d.id,heading:d.querySelector('h2').textContent,items:d.querySelectorAll('li').length,first:d.querySelector('li').textContent};
 });
 await page.screenshot({path:'.vault/shots/l0-vault-stub.png'});
 assert.deepEqual([out.route,out.open,out.id],['#vaultPanel',true,'vaultPanel']);
 assert.match(out.heading,/^Vault 1 \/ \d+$/);assert.ok(out.items>=30);assert.match(out.first,/^clue:/);
 assert.deepEqual(page.errors,[]);
}));

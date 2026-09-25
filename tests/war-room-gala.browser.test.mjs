// The War Room's 3D bay at 375×812: the Gala character in the cage room, its bays opening the Gala menus.
// Serves the built dist/client (npm run build first). "Downloaded" is the cage packet in a myr5-package-* cache.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';

const root=resolve('dist/client'),frames=resolve('.frames/war-room-gala');
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.glb':'model/gltf-binary','.wasm':'application/wasm','.png':'image/png','.webp':'image/webp'};
const CAGE=['/pod/rooms/cage/cage.glb','/pod/rooms/cage/draco_wasm_wrapper.js','/pod/rooms/cage/draco_decoder.wasm'];
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};

async function harness(t){
 const seen=[];
 const server=createServer(async(req,res)=>{const path=new URL(req.url,'http://local').pathname;seen.push(path);
  if(path==='/api/account')return json(res,401,{});
  if(path==='/api/gala/leaderboard')return json(res,200,{items:[]});
  if(path.startsWith('/api/'))return json(res,404,{error:'not in this test'});
  try{const body=await readFile(resolve(root,'.'+(path.endsWith('/')?path+'index.html':path)));res.setHeader('Content-Type',TYPES[extname(path)]||'text/html');res.end(body);}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 t.after(async()=>{await browser.close();server.close();});
 const context=await browser.newContext({viewport:{width:375,height:812},deviceScaleFactor:1});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base='http://127.0.0.1:'+server.address().port;
 await page.goto(base+'/privacy.html');
 await page.evaluate(async files=>{const cache=await caches.open('myr5-package-test');for(const url of files)await cache.put(url,await fetch(url));},CAGE);
 return {page,seen,errors,base};
}
const look=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('mominc-avatar-v1')));
const tap=async(page,section)=>{await page.click('[data-cage-section="overview"]');await page.waitForTimeout(800);const p=await page.evaluate(s=>window.warRoomGala.cage.project(s),section);assert.ok(p,section+' projects on screen');await page.mouse.click(p.x,p.y);};

test('a guest dresses their Gala character from the War Room bays at 375×812, with no coach and no account write',async t=>{
 const {page,seen,errors,base}=await harness(t);
 await page.goto(base+'/war-room/');
 await page.waitForFunction(()=>window.warRoomGala?.cage&&window.warRoomGala.stage.renderer.info.render.triangles>0,null,{timeout:60000});
 await page.waitForFunction(()=>document.querySelector('.cage-bays')&&!document.querySelector('.cage-bays').hidden,null,{timeout:60000});
 await page.locator('#warRoomGalaHost').scrollIntoViewIfNeeded();await page.waitForTimeout(900);
 assert.ok(await page.evaluate(()=>window.warRoomGala.stage.renderer.info.render.triangles)>140000,'the cage room is drawn');
 assert.ok(await page.evaluate(()=>!!window.warRoomGala.stage.scene.getObjectByName('gala-character')),'the Gala character stands in the room');
 const labels=await page.locator('.cage-bays button').allTextContents();
 assert.deepEqual(labels,['Room','Gala','Pets','Weapons','Mirror','Clothes']);
 const stage=await page.locator('.gala-bay-stage').boundingBox();
 for(const b of await page.locator('.cage-bays button').all()){const r=await b.boundingBox();assert.ok(r.x>=stage.x-.5&&r.x+r.width<=stage.x+stage.width+.5&&r.height>=36,'bay button fits the phone stage');}
 await mkdir(frames,{recursive:true});await page.screenshot({path:resolve(frames,'room-375x812.png')});

 // Weapon rack → weapon choice. Unearned upgrades stay locked for a guest.
 await tap(page,'weapons');
 await page.waitForSelector('.gala-bay-panel[data-gala-bay="weapons"]:not([hidden])');
 assert.ok(await page.locator('[data-gala-weapon="tier"] option:not([value="0"])').evaluateAll(o=>o.every(x=>x.disabled)));
 await page.selectOption('[data-gala-weapon="type"]','bow');
 assert.deepEqual((await look(page)).weapon,{type:'bow',tier:0});
 await page.screenshot({path:resolve(frames,'weapons-375x812.png')});

 // Animal cages → pet menu (tapped in the scene).
 await tap(page,'pets');
 await page.waitForSelector('.gala-bay-panel[data-gala-bay="pets"]:not([hidden])');
 const pet=await page.locator('[data-gala-part="pet"] option').nth(3).getAttribute('value');
 await page.selectOption('[data-gala-part="pet"]',pet);
 assert.equal((await look(page)).parts.pet,Number(pet));

 // Mirror → alien physical changes.
 await tap(page,'mirror');
 await page.waitForSelector('.gala-bay-panel[data-gala-bay="mirror"]:not([hidden])');
 assert.deepEqual(await page.locator('.gala-bay-panel [data-gala-part]').evaluateAll(s=>s.map(x=>x.dataset.galaPart)),['body','skin','face','hair','facial']);
 const skin=await page.locator('[data-gala-part="skin"] option').nth(2).getAttribute('value');
 await page.selectOption('[data-gala-part="skin"]',skin);
 assert.equal((await look(page)).parts.skin,Number(skin));
 // Centre station → clothes.
 await tap(page,'clothing');
 await page.waitForSelector('.gala-bay-panel[data-gala-bay="clothing"]:not([hidden])');
 const torso=await page.locator('[data-gala-part="torso"] option').nth(1).getAttribute('value');
 await page.selectOption('[data-gala-part="torso"]',torso);
 assert.equal((await look(page)).parts.torso,Number(torso));
 const panel=await page.locator('.gala-bay-panel').boundingBox();assert.ok(panel.width<=375,'the menu fits the phone width');
 await page.screenshot({path:resolve(frames,'clothes-375x812.png')});

 // Tap the character: the face zoom; then ten idle seconds send it walking away.
 await tap(page,'pedestal');
 assert.equal(await page.evaluate(()=>window.warRoomGala.mode),'face');
 assert.equal(await page.locator('.gala-bay-panel').isHidden(),true);
 await page.waitForTimeout(10800);
 assert.equal(await page.evaluate(()=>window.warRoomGala.mode),'walk');

 assert.deepEqual(seen.filter(p=>p.startsWith('/creature/')),[],'no coach editor, bundle or model is loaded');
 assert.deepEqual(seen.filter(p=>p.startsWith('/api/war-room')||p==='/api/profile'),[],'a guest never reaches account saves');
 assert.deepEqual(errors,[]);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';

const root=resolve('.');
const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json'};
const json=(response,status,value)=>{response.writeHead(status,{'Content-Type':'application/json'});response.end(JSON.stringify(value));};

test('War Room keeps its account and leaderboard controls without portal appearance editing',{timeout:30000},async t=>{
 const requested=[],pageErrors=[];
 const server=createServer(async(request,response)=>{
  const pathname=new URL(request.url,'http://local').pathname;requested.push(pathname);
  if(pathname==='/favicon.ico'){response.writeHead(204);response.end();return;}
  if(pathname==='/api/auth/config')return json(response,200,{enabled:false});
  if(pathname==='/api/account')return json(response,401,{});
  if(pathname==='/api/gala/leaderboard')return json(response,200,{items:[{rank:1,djName:'Guest DJ',durationMs:61000}]});
  if(pathname.startsWith('/api/'))return json(response,404,{error:'Not used by this guest fixture'});
  if(pathname==='/war-room/gala-bay.js'){
   response.writeHead(200,{'Content-Type':'text/javascript'});
   response.end('export function mountGalaBay(host,{tell}){host.dataset.fixture="mounted";tell("Fixture bay mounted");return {dispose(){}};}');
   return;
  }
  try{
   const file=resolve(root,'.'+(pathname==='/war-room/'?'/war-room/index.html':pathname));
   if(!file.startsWith(root+sep))throw Error('outside fixture root');
   const body=await readFile(file);response.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});response.end(body);
  }catch{response.writeHead(404);response.end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 t.after(async()=>{await browser.close();await new Promise(resolve=>server.close(resolve));});
 const page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(7000);page.on('pageerror',error=>pageErrors.push(error.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/war-room/`);
 await page.waitForFunction(()=>document.querySelector('#access')?.textContent==='Public War Room'&&document.querySelector('#warRoomGalaHost')?.dataset.fixture==='mounted').catch(async error=>{const body=await page.locator('body').innerText();throw new Error(JSON.stringify({pageErrors,body}),{cause:error});});

 assert.equal(await page.locator('#lookTitle, #lookPreview, #lookPortal, #lookFrame, #lookStrip, #lookBoards, #lookReset').count(),0,'the War Room has no Metal, Frame, Strip, board-choice, or reset editor');
 assert.equal(await page.locator('input[type="color"]').count(),0,'no portal look color editor remains');
 assert.equal(await page.locator('.controls-drawer summary').textContent(),'Controls');
 await page.locator('.controls-drawer').evaluate(drawer=>{drawer.open=true;});
 for(const heading of ['Clearance','Identity','Rankings','Arsenal'])assert.equal(await page.getByRole('heading',{name:heading}).count(),1,`${heading} remains available`);
 assert.equal(await page.locator('#leaderRows tr').count(),1,'the public leaderboard still renders');
 assert.equal(await page.locator('#saveLoadout').isDisabled(),true,'guest loadout editing keeps its existing account gate');
 assert.ok(requested.includes('/api/gala/leaderboard'));
 assert.ok(requested.includes('/war-room/gala-bay.js'));
 // R20 (Ian 2 Oct): the War Room wears the shared housing and dock, which reads the saved metal/strip look (never edits it).
 assert.ok(requested.includes('/modules/portal/standalone-housing.mjs'),'War Room mounts the shared metal housing');
 assert.equal(await page.locator('#coachDock [data-route="portal"]').count(),1,'War Room has the app dock');
 await page.waitForFunction(()=>document.getElementById('coachDock')?.classList.contains('ship-control-deck'));
 const physical=await page.locator('#coachDock').evaluate(dock=>{const key=dock.querySelector('a.dock-control'),dial=dock.querySelector('a.dock-portal');return{metal:getComputedStyle(dock).backgroundImage,button:getComputedStyle(key).overflow,dial:getComputedStyle(dial).borderTopWidth};});
 assert.match(physical.metal,/linear-gradient/);assert.equal(physical.button,'visible');assert.equal(physical.dial,'3px','standalone anchor receives the shared physical dial');
 await page.mouse.move(10,150);await page.waitForTimeout(180);const left=await page.locator('.war-room').evaluate(el=>el.style.getPropertyValue('--editor-peer-x'));
 await page.mouse.move(380,150);await page.waitForTimeout(180);const right=await page.locator('.war-room').evaluate(el=>el.style.getPropertyValue('--editor-peer-x'));
 assert.ok(parseFloat(left)<0&&parseFloat(right)>0,`the standalone housing still follows pointer/phone tilt: ${JSON.stringify({left,right})}`);
 assert.deepEqual(pageErrors,[],'the source page mounts with no null-node or runtime errors');
});

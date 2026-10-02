import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';

const root=resolve('.');
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css'};
const fixture=`<!doctype html><meta charset="utf-8"><title>Ship route handoff</title>
<div id="coachMount"><div class="myr5-companion-card">Coach</div></div>
<nav id="coachDock"><span class="dock-live" aria-live="polite"></span></nav>
<script type="module">
 import {openShipView} from '/modules/ships/ship-view.mjs';
 import {mountRoutes} from '/modules/routes.mjs';
 window.myr5Menus={ship:options=>openShipView({...options,loadCoachViewer:async()=>{},getBridge:()=>new Promise(()=>{})})};
 mountRoutes();
 window.__closeTrace=[];
 document.addEventListener('close',event=>window.__closeTrace.push({open:event.target.open,route:window.myr5Routes.current(),hash:location.hash}),true);
</script>`;

function serve(){
 return createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://local').pathname;
  if(pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
  if(pathname==='/'){res.writeHead(200,{'Content-Type':TYPES['.html']});res.end(fixture);return;}
  // R16/R17: housing routes (ship...) wait for the portal to mount before opening; this test is about the route handoff only.
  if(pathname==='/modules/portal/portal-entry.mjs'){res.writeHead(200,{'Content-Type':TYPES['.js']});res.end('export const ensurePortalMounted=async()=>({frameDirectDestination(){}});');return;}
  try{const file=resolve(root,'.'+pathname);if(!file.startsWith(root+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':TYPES[extname(file)]||'application/octet-stream'});res.end(body);}
  catch{res.writeHead(404);res.end();}
 });
}

test('same-task close/reopen keeps the shared ship dialog adopted until its next real close',{timeout:30000},async t=>{
 const server=serve();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 t.after(async()=>{await browser.close();await new Promise(resolve=>server.close(resolve));});
 const page=await browser.newPage({reducedMotion:'reduce'});
 page.setDefaultTimeout(6000);
 const pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/`);
 await page.waitForFunction(()=>!!window.myr5Routes);
 await page.evaluate(()=>{void window.myr5Routes.go('ship');});
 await page.waitForFunction(()=>window.myr5Routes.current()==='ship'&&document.querySelector('dialog.ship-view')?.open&&location.hash==='#ship');

 const stale=await page.evaluate(()=>{
  const dialog=document.querySelector('dialog.ship-view');
  window.__oldClose=new Promise(resolve=>dialog.addEventListener('close',()=>resolve({open:dialog.open,route:window.myr5Routes.current(),hash:location.hash}),{once:true,capture:true}));
  dialog.close();
  window.myr5Routes.go('select');
  return true;
 });
 assert.equal(stale,true);
 const oldEvent=await page.evaluate(()=>window.__oldClose);
 assert.deepEqual(oldEvent,{open:true,route:'select',hash:'#select'},'the queued close belongs to the prior session and cannot tear down the reopened arrival');
 await page.waitForFunction(()=>window.myr5Routes.current()==='select'&&document.querySelector('dialog.ship-view')?.open&&location.hash==='#select');
 assert.deepEqual(await page.evaluate(()=>window.__closeTrace),[{open:true,route:'select',hash:'#select'}]);
 assert.equal(await page.locator('dialog.ship-view').getAttribute('data-route'),'select','duplicate open records preserve the requested alias');

 await page.evaluate(()=>{
  const dialog=document.querySelector('dialog.ship-view');
  window.__newClose=new Promise(resolve=>dialog.addEventListener('close',()=>resolve({open:dialog.open,route:window.myr5Routes.current(),hash:location.hash}),{once:true,capture:true}));
  dialog.close();
 });
 const newEvent=await page.evaluate(()=>window.__newClose);
 assert.equal(newEvent.open,false,'the still-armed route listener observes the next genuine close');
 await page.waitForFunction(()=>window.myr5Routes.current()===''&&!document.querySelector('dialog.ship-view')?.open&&location.hash!=='#select');
 assert.deepEqual(pageErrors,[],'the close/reopen handoff emits no page errors');
 await page.close();
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {chromium} from 'playwright';

test('workout route adopts the scrolling fallback when the portal is not mounted',async()=>{
 const root=resolve('.');
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/fixture'){
   res.setHeader('Content-Type','text/html');
   res.end('<!doctype html><main id="homeScreen"><div id="view"></div><button id="start">BEGIN</button></main><nav id="coachDock" class="coach-dock"><button data-route="workout">Workout</button></nav>');
   return;
  }
  try{
   const file=resolve(root,'.'+path);
   if(!file.startsWith(root+sep))throw Error();
   res.setHeader('Content-Type',path.endsWith('.mjs')?'text/javascript':'application/octet-stream');
   res.end(await readFile(file));
  }catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage({viewport:{width:375,height:812}});
  await page.goto(`http://127.0.0.1:${server.address().port}/fixture`);
  await page.evaluate(async()=>{
   const {mountRoutes}=await import('/modules/routes.mjs');
   mountRoutes();
   window.myr5Routes.go('workout');
  });
  await page.waitForFunction(()=>window.myr5Routes.current()==='workout'&&location.hash==='#workout');
  assert.equal(await page.locator('#homeScreen').count(),1);
  assert.equal(await page.locator('#portalWorkoutHome').count(),0);
  await page.goBack();
  await page.waitForFunction(()=>window.myr5Routes.current()===''&&location.hash==='');
  assert.equal(await page.locator('#homeScreen').count(),1);
  assert.equal(await page.locator('#coachDock [data-route="workout"]').getAttribute('aria-current'),null);

  // The same route also adopts the portal's modal host when it is mounted. Back must close it,
  // put the existing homeScreen back in its source position, and return the moved dock to body.
  await page.evaluate(()=>{
   const dialog=document.createElement('dialog');dialog.id='portalWorkoutHome';document.body.append(dialog);
   const home=document.getElementById('homeScreen'),parent=home.parentNode,next=home.nextSibling;
   window.myr5Portal={openWorkoutHome(){dialog.append(home);dialog.addEventListener('close',()=>parent.insertBefore(home,next?.parentNode===parent?next:null),{once:true});dialog.showModal();return dialog;}};
  });
  await page.evaluate(()=>window.myr5Routes.go('workout'));
  await page.waitForFunction(()=>window.myr5Routes.current()==='workout'&&document.getElementById('portalWorkoutHome')?.open);
  assert.equal(await page.locator('#portalWorkoutHome #homeScreen').count(),1);
  await page.goBack();
  await page.waitForFunction(()=>window.myr5Routes.current()===''&&location.hash===''&&!document.getElementById('portalWorkoutHome').open&&document.getElementById('homeScreen').parentElement===document.body&&document.getElementById('coachDock').parentElement===document.body);
  await page.close();
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});

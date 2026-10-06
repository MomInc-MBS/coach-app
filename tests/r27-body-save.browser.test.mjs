import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';

// R27 (built dist/client, 375x812, signed in): the portal oval reads myr5-recipe-v1 as stored, but the customizer
// filtered it by ownership before the account was known (the bridge blanks it on load and on every re-check), so
// an earned body opened as MYR5, and a pick made during a re-check stayed an unsaved preview lost on close.
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.glb':'model/gltf-binary'};
const EARNED='roster/06-ridge-triad--geometric_robot_3d_model1'; // the Chest path introduction
const look=body=>JSON.stringify({version:1,styles:{head:0,eye:0,collar:0,body:0,arms:0,feet:0},eye:'open',fur:1,iris:1,pupil:'round',pupilSize:1,detail:1,coach:'supportive',fingers:4,toes:3,eyeLayout:'single',body,headFrom:body,armsFrom:body,feetFrom:body});
test('customizer R27: a saved earned body opens as saved, and a pick during the account re-check survives closing',{timeout:300000},async()=>{
 const root=resolve('dist/client');let delay=0;
 const server=createServer(async(req,res)=>{const path=new URL(req.url,'http://local').pathname;
  if(path==='/api/auth/config'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({enabled:false}));return;}
  if(path==='/api/account'){setTimeout(()=>{res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({user:{id:'owner-a'},dataEpoch:4}));},delay);return;}
  try{const body=await readFile(resolve(root,'.'+path));res.setHeader('Content-Type',TYPES[extname(path)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 const url='http://127.0.0.1:'+server.address().port+'/creature/index.html';
 const stored=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('myr5-recipe-v1')).body);
 const open=async context=>{const page=await context.newPage();await page.goto(url);
  await page.waitForFunction(()=>window.myr5Companion?.ready===true&&window.myr5AuthenticatedAccount?.user?.id==='owner-a',null,{timeout:90000});return page;};
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({viewport:{width:375,height:812}});
  await context.addInitScript(saved=>{sessionStorage.setItem('myr5-ship-gate','ship-admission-v2');
   if(!localStorage.getItem('myr5-recipe-v1'))localStorage.setItem('myr5-recipe-v1',saved);
   localStorage.setItem('myr5-performance-progress-v2/account:owner-a:4',JSON.stringify({version:2,paths:['chest','yoga'],sessions:{},days:{},coaches:['myr5'],goldenCoaches:[],weapons:{},ships:[],completions:{},totalXp:0}));},look(EARNED));
  // 1. Cold open with an earned body saved: the editor shows what the portal shows.
  let page=await open(context);
  assert.equal(await page.evaluate(()=>window.myr5Companion.recipe.body),EARNED,'the customizer opens the saved earned body');
  await page.click('#tab-face');await page.selectOption('#eye','wide');
  await page.waitForFunction(()=>window.myr5Companion?.recipe?.eye==='wide'&&window.myr5Companion.ready,null,{timeout:90000});
  assert.equal(await stored(page),EARNED,'an edit after opening keeps the earned body');
  // 2. Back to MYR5, reopen, then pick the earned body while the account is re-checked on return to the app.
  await page.evaluate(m=>localStorage.setItem('myr5-recipe-v1',m),look('myr5'));await page.close();
  page=await open(context);delay=2500;
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange'))); // visible again: the bridge re-checks
  await page.click('#tab-body');await page.locator(`[data-body="${EARNED}"]`).first().click();
  await page.waitForFunction(b=>window.myr5Companion?.recipe?.body===b,EARNED,{timeout:5000}).catch(()=>{});
  await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true});Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
  await page.close({runBeforeUnload:true});delay=0;
  page=await open(context);
  assert.equal(await stored(page),EARNED,'the pick was saved before the app closed');
  assert.equal(await page.evaluate(()=>window.myr5Companion.recipe.body),EARNED,'and reopens in the customizer');
 }finally{await browser?.close();server.close();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';

// R26 (built dist/client, 375x812, signed in): the customizer's account bridge clears the account before every
// re-check (focus, visibilitychange). That blink must not swap an earned body for the original MYR5 coach.
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.glb':'model/gltf-binary'};
const EARNED='roster/06-ridge-triad--geometric_robot_3d_model1'; // the Chest path introduction
test('customizer R26: an earned body survives the account re-check on focus and the next save',{timeout:240000},async()=>{
 const root=resolve('dist/client');
 const server=createServer(async(req,res)=>{const path=new URL(req.url,'http://local').pathname;
  if(path==='/api/auth/config'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({enabled:false}));return;}
  if(path==='/api/account'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({user:{id:'owner-a'},dataEpoch:4}));return;}
  try{const body=await readFile(resolve(root,'.'+path));res.setHeader('Content-Type',TYPES[extname(path)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:375,height:812}});
  await page.addInitScript(()=>{sessionStorage.setItem('myr5-ship-gate','ship-admission-v2');
   localStorage.setItem('myr5-performance-progress-v2/account:owner-a:4',JSON.stringify({version:2,paths:['chest','yoga'],sessions:{},days:{},coaches:['myr5'],goldenCoaches:[],weapons:{},ships:[],completions:{},totalXp:0}));});
  await page.goto('http://127.0.0.1:'+server.address().port+'/creature/index.html');
  await page.waitForFunction(()=>window.myr5Companion?.ready===true&&window.myr5AuthenticatedAccount?.user?.id==='owner-a',null,{timeout:90000});
  await page.click('#tab-body');await page.locator(`[data-body="${EARNED}"]`).first().click();
  await page.waitForFunction(b=>window.myr5Companion?.recipe?.body===b&&window.myr5Companion.ready,EARNED,{timeout:90000});
  await page.evaluate(()=>window.dispatchEvent(new Event('focus'))); // the bridge clears, then re-verifies
  await page.waitForFunction(()=>window.myr5AuthenticatedAccount?.user?.id==='owner-a'&&window.myr5Companion.ready,null,{timeout:90000});
  assert.equal(await page.evaluate(()=>window.myr5Companion.recipe.body),EARNED,'the shown coach keeps its body');
  await page.click('#tab-face');await page.selectOption('#eye','wide');
  await page.waitForFunction(()=>window.myr5Companion?.recipe?.eye==='wide'&&window.myr5Companion.ready,null,{timeout:90000});
  assert.equal(JSON.parse(await page.evaluate(()=>localStorage.getItem('myr5-recipe-v1'))).body,EARNED,'the next save keeps the earned body');
 }finally{await browser?.close();server.close();}
});

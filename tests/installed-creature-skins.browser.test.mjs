import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';

test('skin editor stays hidden for anonymous, unowned, and unsigned packs while old fitness materials still render',async()=>{
 const root=resolve('dist/client'),requests=[];
 const server=createServer(async(req,res)=>{const path=new URL(req.url,'http://local').pathname;requests.push(path);
  if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
  try{const body=await readFile(resolve(root,'.'+path));res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.mjs':'text/javascript'})[extname(path)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();
  await page.addInitScript(()=>{const recipe=JSON.parse(localStorage.getItem('myr5-recipe-v1')||'{}');recipe.materials={...(recipe.materials||{}),body:{...(recipe.materials?.body||{}),textureId:'creature-starforged-plate'}};localStorage.setItem('myr5-recipe-v1',JSON.stringify(recipe));});
  await page.goto('http://127.0.0.1:'+server.address().port+'/creature/index.html');await page.waitForFunction(()=>window.myr5Companion?.ready===true,null,{timeout:60000});
  assert.equal(await page.locator('#tab-skin').count(),1,'the editor should build its initially hidden skin tab');assert.equal(await page.locator('#tab-skin').isHidden(),true);assert.equal(await page.locator('#tab-skin').evaluate(el=>el.tabIndex),-1);
  await page.evaluate(()=>{window.myr5AuthenticatedAccount={user:{id:'fixture-owner'}};window.dispatchEvent(new CustomEvent('myr5:account-ready',{detail:window.myr5AuthenticatedAccount}));});
  await page.waitForTimeout(100);assert.equal(await page.locator('#tab-skin').isHidden(),true);assert.equal(await page.locator('#skinChoice option').count(),0);
  assert(requests.includes('/creature/models/myr5.glb'));
  assert.equal(requests.some(path=>path.includes('/materials/track-')),false,'unconfigured production trust must fail closed before pack requests');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});

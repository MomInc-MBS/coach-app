import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
test('published viewer can assemble the default coach using shipped models',async()=>{
 const seen=[];const root=resolve('dist/client');
 const server=createServer(async(req,res)=>{const path=new URL(req.url,'http://local').pathname;seen.push(path);
 if(path==='/fixture'){res.setHeader('Content-Type','text/html');res.end('<div id="view" style="width:400px;height:500px"></div><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js"}}</script><script type="module" src="/creature/assets/phone.js"></script>');return;}
 if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
 try{const body=await readFile(resolve(root,'.'+path));res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.mjs':'text/javascript'})[extname(path)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port+'/fixture');
 await page.waitForFunction(()=>document.querySelector('.myr5-companion-card')?.dataset.ready==='true',null,{timeout:60000});
 assert(seen.includes('/creature/models/anatomy.glb'));assert(seen.includes('/creature/models/myr5.glb'));assert.equal(await page.locator('.myr5-companion-stage canvas').count(),1);
 await page.goto('http://127.0.0.1:'+server.address().port+'/pose.html');
 // W2-2M #117: no "Show my coach" on the pod; the coach arrives with the oval's ship view and is parked in #coachMount after.
 await page.waitForFunction(()=>typeof window.myr5Menus?.ship==='function');
 assert.equal(await page.locator('#coachMount button').count(),0);
 assert.equal(await page.locator('#coachLoading').textContent(),'Call your coach with the oval on the portal.');
 await page.evaluate(()=>{void window.myr5Menus.ship();});
 await page.waitForFunction(()=>document.querySelector('dialog.ship-view .myr5-companion-card')?.dataset.ready==='true',null,{timeout:60000});
 await page.evaluate(()=>document.querySelector('.ship-view-close').click());
 await page.waitForFunction(()=>document.querySelector('#coachMount .myr5-companion-card')?.dataset.ready==='true',null,{timeout:20000});
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});

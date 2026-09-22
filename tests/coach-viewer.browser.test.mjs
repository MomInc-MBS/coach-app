import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
test('published viewer can assemble the default coach using shipped models',async()=>{
 const seen=[];const root=resolve('dist/client');
 const server=createServer(async(req,res)=>{const path=new URL(req.url,'http://local').pathname;seen.push(path);
 if(path==='/fixture'){res.setHeader('Content-Type','text/html');res.end('<div id="view" style="width:400px;height:500px"></div><script type="module" src="/creature/assets/phone.js"></script>');return;}
 if(path.startsWith('/api/')){res.writeHead(path==='/api/auth/config'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(path==='/api/auth/config'?{enabled:false}:{error:'Sign in'}));return;}
 try{const body=await readFile(resolve(root,'.'+path));res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.mjs':'text/javascript'})[extname(path)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port+'/fixture');
 await page.waitForFunction(()=>document.querySelector('.myr5-companion-card')?.dataset.ready==='true',null,{timeout:60000});
 assert(seen.includes('/creature/models/anatomy.glb'));assert(seen.includes('/creature/models/myr5.glb'));assert.equal(await page.locator('.myr5-companion-stage canvas').count(),1);
 await page.goto('http://127.0.0.1:'+server.address().port+'/pose.html');
 await page.waitForFunction(()=>document.querySelector('#coachMount button')?.textContent==='Show my coach');
 assert.equal(await page.locator('#coachLoading').textContent(),'Open your coach when you are ready.');
 await page.evaluate(()=>document.querySelector('#coachMount button').click());
 await page.waitForFunction(()=>document.querySelector('#coachMount .myr5-companion-card')?.dataset.ready==='true',null,{timeout:60000});
 assert.equal(await page.locator('#coachLoading').isHidden(),true);
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});

// usage: node .r18/shot.mjs <name> [js-to-eval-after-load]   -> .frames/r18-f-<name>.png ; env TAB=<menu>
import {createServer} from 'node:http';import {readFile} from 'node:fs/promises';import {resolve,extname} from 'node:path';import {chromium} from 'playwright';
const [name,pre,url='/creature/index.html']=process.argv.slice(2);const root=resolve('dist/client');
const server=createServer(async(req,res)=>{const path=new URL(req.url,'http://local').pathname;try{const body=await readFile(resolve(root,'.'+path));res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.mjs':'text/javascript','.json':'application/json'})[extname(path)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:375,height:812}});
page.on('pageerror',e=>console.log('PAGEERROR',e.message));
await page.addInitScript(()=>sessionStorage.setItem('myr5-ship-gate','ship-admission-v2'));
await page.goto('http://127.0.0.1:'+server.address().port+url);
await page.waitForFunction(()=>window.myr5Companion?.ready===true,null,{timeout:60000});
if(pre)await page.evaluate(pre);
await page.waitForTimeout(1500);
await page.screenshot({path:`.frames/r18-f-${name}.png`});
console.log(await page.evaluate(()=>JSON.stringify({d:window.myr5Companion.viewer.camera.position.distanceTo(window.myr5Companion.viewer.orbit.target)})));
await browser.close();server.close();

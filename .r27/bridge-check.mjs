import {createServer} from 'node:http';import {readFile} from 'node:fs/promises';import {resolve,extname} from 'node:path';import {chromium} from 'playwright';
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.glb':'model/gltf-binary'};
const root=resolve('dist/client');let mode='a';
const server=createServer(async(req,res)=>{const path=new URL(req.url,'http://local').pathname;
 if(path==='/api/auth/config'){res.writeHead(200,{'Content-Type':'application/json'});res.end('{"enabled":false}');return;}
 if(path==='/api/account'){if(mode==='401'){res.writeHead(401);res.end();return;}res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({user:{id:mode==='b'?'owner-b':'owner-a'},dataEpoch:4}));return;}
 try{const body=await readFile(resolve(root,'.'+path));res.setHeader('Content-Type',TYPES[extname(path)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'msedge',headless:true});const ctx=await browser.newContext();
await ctx.addInitScript(()=>sessionStorage.setItem('myr5-ship-gate','ship-admission-v2'));
const page=await ctx.newPage();await page.goto(base+'/creature/index.html');
const id=()=>page.evaluate(()=>window.myr5AuthenticatedAccount?.user?.id??null);
await page.waitForFunction(()=>window.myr5Companion?.ready&&window.myr5AuthenticatedAccount?.user?.id==='owner-a');
const other=await ctx.newPage();await other.goto(base+'/signin.html');
await other.evaluate(async()=>{const {authTransitions}=await import('/auth-transition.mjs');authTransitions().invalidate();});
await page.waitForTimeout(300);console.log('after cross-tab logout:',await id());
await page.evaluate(()=>dispatchEvent(new Event('focus')));await page.waitForTimeout(1000);console.log('after focus re-check:',await id());
mode='401';await page.evaluate(()=>dispatchEvent(new Event('focus')));await page.waitForTimeout(1000);console.log('after failed re-check:',await id());
mode='b';await page.evaluate(()=>dispatchEvent(new Event('focus')));await page.waitForTimeout(1000);console.log('after focus as owner-b:',await id());
await browser.close();server.close();

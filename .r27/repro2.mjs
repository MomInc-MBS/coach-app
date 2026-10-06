import {createServer} from 'node:http';import {readFile} from 'node:fs/promises';import {resolve,extname} from 'node:path';import {chromium} from 'playwright';
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.glb':'model/gltf-binary'};
const EARNED='roster/06-ridge-triad--geometric_robot_3d_model1';
const root=resolve('dist/client');let delay=0;
const server=createServer(async(req,res)=>{const path=new URL(req.url,'http://local').pathname;
 if(path==='/api/auth/config'){res.writeHead(200,{'Content-Type':'application/json'});res.end('{"enabled":false}');return;}
 if(path==='/api/account'){setTimeout(()=>{res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({user:{id:'owner-a'},dataEpoch:4}));},delay);return;}
 try{const body=await readFile(resolve(root,'.'+path));res.setHeader('Content-Type',TYPES[extname(path)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port+'/creature/index.html';
const browser=await chromium.launch({channel:'msedge',headless:true});
const ctx=await browser.newContext({viewport:{width:375,height:812}});
await ctx.addInitScript(()=>{sessionStorage.setItem('myr5-ship-gate','ship-admission-v2');
 localStorage.setItem('myr5-performance-progress-v2/account:owner-a:4',JSON.stringify({version:2,paths:['chest','yoga'],sessions:{},days:{},coaches:['myr5'],goldenCoaches:[],weapons:{},ships:[],completions:{},totalXp:0}));});
const ready=p=>p.waitForFunction(()=>window.myr5Companion?.ready===true&&window.myr5AuthenticatedAccount?.user?.id==='owner-a',null,{timeout:90000});
// A: pick with account ready, close at once
let page=await ctx.newPage();await page.goto(url);await ready(page);
await page.click('#tab-body');await page.locator(`[data-body="${EARNED}"]`).first().click();
console.log('A stored right after pick:',await page.evaluate(()=>JSON.parse(localStorage.getItem('myr5-recipe-v1')).body));
await page.close({runBeforeUnload:true});
page=await ctx.newPage();await page.goto(url);await ready(page);
console.log('A reopen: shown',await page.evaluate(()=>myr5Companion.recipe.body),'stored',await page.evaluate(()=>JSON.parse(localStorage.getItem('myr5-recipe-v1')).body));
// B: reset to myr5, then pick during the focus re-check blink, then hide+close before it returns
await page.evaluate(()=>{const r=JSON.parse(localStorage.getItem('myr5-recipe-v1'));for(const k of ['body','headFrom','armsFrom','feetFrom'])r[k]='myr5';localStorage.setItem('myr5-recipe-v1',JSON.stringify(r));});
await page.close();page=await ctx.newPage();await page.goto(url);await ready(page);
delay=3000;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
await page.click('#tab-body');await page.locator(`[data-body="${EARNED}"]`).first().click();
console.log('B during blink: account',await page.evaluate(()=>window.myr5AuthenticatedAccount?.user?.id??null),'stored',await page.evaluate(()=>JSON.parse(localStorage.getItem('myr5-recipe-v1')).body),'status',await page.textContent('#creatureStatus'));
await page.close({runBeforeUnload:true});delay=0;
page=await ctx.newPage();await page.goto(url);await ready(page);
console.log('B reopen stored',await page.evaluate(()=>JSON.parse(localStorage.getItem('myr5-recipe-v1')).body));
await browser.close();server.close();

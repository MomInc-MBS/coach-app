import {createServer} from 'node:http';import {readFile} from 'node:fs/promises';import {resolve,extname} from 'node:path';import {chromium} from 'playwright';
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.glb':'model/gltf-binary'};
const EARNED='roster/06-ridge-triad--geometric_robot_3d_model1';
const root=resolve('dist/client');
const server=createServer(async(req,res)=>{const path=new URL(req.url,'http://local').pathname;
 if(path==='/api/auth/config'){res.writeHead(200,{'Content-Type':'application/json'});res.end('{"enabled":false}');return;}
 if(path==='/api/account'){setTimeout(()=>{res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({user:{id:'owner-a'},dataEpoch:4}));},+process.env.DELAY||0);return;}
 try{const body=await readFile(resolve(root,'.'+path));res.setHeader('Content-Type',TYPES[extname(path)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:375,height:812}});
const recipe={version:1,styles:{head:0,eye:0,collar:0,body:0,arms:0,feet:0},eye:'open',fur:1,iris:1,pupil:'round',pupilSize:1,detail:1,coach:'supportive',fingers:4,toes:3,eyeLayout:'single',body:EARNED,headFrom:EARNED,armsFrom:EARNED,feetFrom:EARNED};
await page.addInitScript(r=>{sessionStorage.setItem('myr5-ship-gate','ship-admission-v2');if(!localStorage.getItem('myr5-recipe-v1'))localStorage.setItem('myr5-recipe-v1',r);
 localStorage.setItem('myr5-performance-progress-v2/account:owner-a:4',JSON.stringify({version:2,paths:['chest','yoga'],sessions:{},days:{},coaches:['myr5'],goldenCoaches:[],weapons:{},ships:[],completions:{},totalXp:0}));
 window.__log=[];for(const n of ['myr5:account-ready','myr5:account-cleared'])addEventListener(n,()=>__log.push(n+' '+performance.now().toFixed(0)));},JSON.stringify(recipe));
await page.goto('http://127.0.0.1:'+server.address().port+'/creature/index.html');
await page.waitForFunction(()=>window.myr5Companion?.ready===true&&window.myr5AuthenticatedAccount?.user?.id==='owner-a',null,{timeout:90000});
console.log(await page.evaluate(()=>({shown:myr5Companion.recipe.body,stored:JSON.parse(localStorage.getItem('myr5-recipe-v1')).body,log:__log})));
await browser.close();server.close();

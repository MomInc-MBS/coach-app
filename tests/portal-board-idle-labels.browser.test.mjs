import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';

test('grass and cogs keep idle route labels legible at phone size',async()=>{
 const source=resolve('.'),built=resolve('dist/client');
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/__portal__'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><style>body{margin:0}</style><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/loaders/GLTFLoader.js":"/vendor/three/GLTFLoader.js","three/addons/libs/meshopt_decoder.module.js":"/vendor/three/meshopt_decoder.module.js"}}</script>');return;}
  try{const root=path.startsWith('/modules/portal/')||path.startsWith('/pod/worlds/boards/')?source:built,file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});
  const page=await browser.newPage({viewport:{width:375,height:812}});await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(()=>{window.__idleRouteText=[];const orig=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,...args){if(['Workout','Choose Workout','Food','Achievements','Leaderboard','War Room','Meditation','Reminders','Settings','Menu'].includes(text))window.__idleRouteText.push({text,alpha:this.globalAlpha});return orig.call(this,text,...args);};});
  await page.goto('http://127.0.0.1:'+server.address().port+'/__portal__');
  await page.evaluate(async()=>{try{localStorage.setItem('myr5.portalHintShown','1');}catch{}const {openQuiltPortal}=await import('/modules/portal/portal-entry.mjs');window.portal=await openQuiltPortal();});
  await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false);
  await mkdir('.frames',{recursive:true});
  for(const id of ['grass','cogs']){
   await page.evaluate(async id=>{window.__idleRouteText.length=0;await portal.board(id);portal.show();},id);
   await page.waitForFunction(()=>window.__idleRouteText.some(x=>x.alpha>=.89),{},{timeout:15000});
   const labels=await page.evaluate(()=>window.__idleRouteText.filter(x=>x.alpha>=.89).map(x=>x.text));
   assert(labels.includes('Workout'),`${id} idle Workout label should render at high opacity`);
   await page.screenshot({path:resolve('.frames',`${id}-idle-labels-375x812.png`)});
  }
  await page.close();
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
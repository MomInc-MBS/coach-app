// Android can refuse or drop WebGL contexts. Without WebGL the picked board shows its flat poster (visible art, working
// routes) instead of the blank .no-board sheet, never opens Downloads on its own, goes back to 3D once WebGL works again,
// and falls back to the poster (not a blank canvas) when a live context is dropped.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';

async function withPortal(run){
 const source=resolve('.'),built=resolve('dist/client');
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/__portal__'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><style>body{margin:0}</style><div class="coach-dock"><button data-panel="meals" onclick="document.getElementById(&quot;mealsPanel&quot;).showModal()">Food</button></div><dialog id="mealsPanel">Nutrition<button onclick="this.closest(\'dialog\').close()">Close</button></dialog><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/loaders/GLTFLoader.js":"/vendor/three/GLTFLoader.js","three/addons/libs/meshopt_decoder.module.js":"/vendor/three/meshopt_decoder.module.js"}}</script>');return;}
  try{const root=path.startsWith('/modules/portal/')||path.startsWith('/pod/worlds/boards/')?source:built,file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});await run(browser,'http://127.0.0.1:'+server.address().port+'/__portal__');}
 finally{await browser?.close();await new Promise(r=>server.close(r));}
}

// The page-level switch: while window.noGL is true every WebGL context request fails, as on an Android that is out of contexts.
const failWebGL=()=>{window.noGL=true;const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return window.noGL&&/webgl/i.test(kind)?null:get.call(this,kind,...args);};};
const shown=page=>page.evaluate(()=>{const h=document.getElementById('portalHome');return {board:h.dataset.board,art:h.dataset.art};});
const renderers=page=>page.evaluate(()=>[...document.querySelectorAll('#portalBoardHost canvas')].filter(c=>c.getContext('webgl2')).length);
// Board art is visible: opaque, varied pixels somewhere on the canvas (a blank/transparent canvas fails).
const artVisible=page=>page.evaluate(()=>{
 const c=[...document.querySelectorAll('#portalBoardHost canvas')].find(c=>c.style.visibility!=='hidden'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data,seen=new Set();let opaque=0;
 for(let i=0;i<d.length;i+=4*97){if(d[i+3]>200){opaque++;seen.add((d[i]>>4)+','+(d[i+1]>>4)+','+(d[i+2]>>4));}}
 return {opaque,colors:seen.size};
});

test('no WebGL shows the picked board flat, keeps routes usable, returns to 3D with WebGL and survives a lost context',async()=>withPortal(async(browser,url)=>{
 await mkdir(resolve('.frames'),{recursive:true});
 const page=await browser.newPage({viewport:{width:375,height:812}});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(failWebGL);
 await page.addInitScript(()=>{localStorage.setItem('myr5.portalBoard','cogs');window.packOffers=[];window.myr5Packs={open:id=>window.packOffers.push(id)};});
 await page.goto(url);
 await page.evaluate(async()=>{const {openQuiltPortal}=await import('/modules/portal/portal-entry.mjs');window.portal=await openQuiltPortal();window.portal.show();});
 await page.waitForFunction(()=>document.getElementById('portalHome')?.hidden===false&&/Cogs is showing its flat art/.test(document.getElementById('portalStatus').textContent));

 assert.deepEqual(await shown(page),{board:'cogs',art:'flat'},'Cogs keeps its identity on its poster');
 assert.equal(await page.evaluate(()=>document.getElementById('portalHome').classList.contains('no-board')),false,'never the blank sheet');
 assert.equal(await page.locator('#portalBoardHost canvas').count(),1);
 const art=await artVisible(page);assert.ok(art.opaque>200&&art.colors>8,`Cogs poster is drawn (${JSON.stringify(art)})`);
 const {face,pattern}=await page.evaluate(()=>({face:portal.current().faceRect(),pattern:portal.current().patternRect()}));
 assert.ok(face.width>300&&pattern.top>=face.top&&pattern.top+pattern.height<=face.top+face.height+1,'face and shape area laid out');
 await page.screenshot({path:resolve('.frames','webgl-fallback-cogs-poster-375x812.png')});

 // Shape navigation and the menu still work: a shape opens its destination, and the menu chips stay usable.
 await page.evaluate(()=>portal.open('up'));
 await page.waitForSelector('.portal-glass:not(.gl)>b',{state:'attached'});
 assert.match(await page.locator('.portal-glass:not(.gl)>b').first().evaluate(el=>getComputedStyle(el).animationName),/portal-rainbow-turn/,'rainbow tunnel keeps moving without WebGL');
 await page.waitForFunction(()=>document.querySelector('#mealsPanel').open);
 await page.evaluate(()=>document.querySelector('#mealsPanel').close());
 await page.waitForFunction(()=>document.getElementById('portalHome').hidden===false&&!document.querySelector('#portalHome').classList.contains('no-board'));
 assert.ok((await artVisible(page)).opaque>200,'board art is back after the cut heals');
 assert.equal(await page.evaluate(()=>window.packOffers.length),0,'never redirects to Downloads');

 // WebGL comes back: picking the board again gives the 3D board over its poster.
 await page.evaluate(()=>{window.noGL=false;});
 await page.evaluate(()=>document.querySelector('#portalMenu').showModal());
 await page.evaluate(()=>document.querySelector('#portalMenu [data-board="cogs"]').click());
 await page.waitForFunction(()=>document.getElementById('portalHome').dataset.art==='3d',null,{timeout:20000});
 assert.equal(await renderers(page),1,'one live renderer');

 // A live context dropped by the OS/driver (and no way to get another) hands back to the poster instead of a blank canvas.
 await page.evaluate(()=>{const gl=[...document.querySelectorAll('#portalBoardHost canvas')].map(c=>c.getContext('webgl2')).find(Boolean);window.noGL=true;gl.getExtension('WEBGL_lose_context').loseContext();});
 await page.waitForFunction(()=>document.getElementById('portalHome').dataset.art==='flat');
 assert.deepEqual(await shown(page),{board:'cogs',art:'flat'},'the lost board stays Cogs, flat');
 assert.equal(await page.locator('#portalBoardHost canvas').count(),1,'lost renderer released, not stacked');
 assert.ok((await artVisible(page)).opaque>200,'poster art after a lost context');
 await page.waitForFunction(()=>/Cogs is showing its flat art/.test(document.getElementById('portalStatus').textContent),null,{timeout:5000}); // its one retry found no WebGL
 assert.equal(await page.evaluate(()=>window.packOffers.length),0);
 assert.deepEqual(errors,[]);
 await page.close();
}));

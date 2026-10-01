import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';

const MIME={'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.glb':'model/gltf-binary'};
let server,browser,url;
test.before(async()=>{
 const root=resolve('.');server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><style>body{margin:0}</style><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/loaders/GLTFLoader.js":"/vendor/three/GLTFLoader.js","three/addons/libs/meshopt_decoder.module.js":"/vendor/three/meshopt_decoder.module.js"}}</script>');return;}
  try{const file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',MIME[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));url='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});
});
test.after(async()=>{await browser?.close();await new Promise(r=>server.close(r));});

test('Jelly compiled 3D gash shader restores and updates its own selected tint without erasing the active trail',{timeout:90000},async()=>{
 const context=await browser.newContext({viewport:{width:800,height:800},reducedMotion:'reduce'}),page=await context.newPage();
 try{
  await page.goto(url);await page.evaluate(async()=>{
   localStorage.setItem('myr5.grimoireColor.jelly','#00ffff');const {jelly}=await import('/modules/portal/portal-board-jelly.mjs'),init=jelly.init;
   jelly.init=async function(args){await init(args);let compile=args.material.onBeforeCompile;Object.defineProperty(args.material,'onBeforeCompile',{configurable:true,get:()=>compile,set:fn=>{compile=function(shader,...rest){const result=fn.call(this,shader,...rest);window.__jellyShader=shader;return result;};}});};
   const step=jelly.step;jelly.step=function(...args){const result=step(...args),u=window.__jellyShader?.uniforms;if(window.__retintPending&&u?.uTrailN.value>0){window.__retintPending=false;const input=document.querySelector('[data-board-tint]');input.value='#ff00ff';input.dispatchEvent(new Event('input',{bubbles:true}));const c=u.uTrailTint.value;window.__retintResult={color:[c.r,c.g,c.b],mix:u.uTrailTintMix.value,trail:u.uTrailN.value};}return result;};
   const {openQuiltPortal}=await import('/modules/portal/portal-entry.mjs');window.portal=await openQuiltPortal();await portal.board('jelly');portal.show();
  });await page.waitForFunction(()=>window.__jellyShader?.uniforms.uTrailTint);
  const sample=()=>page.evaluate(()=>{const s=window.__jellyShader,c=s.uniforms.uTrailTint.value;return{color:[c.r,c.g,c.b],mix:s.uniforms.uTrailTintMix.value,trail:s.uniforms.uTrailN.value,fragment:s.fragmentShader};});
  const initial=await sample();assert.deepEqual(initial.color,[0,1,1]);assert.equal(initial.mix,1);assert.match(initial.fragment,/mix\([^;]*uTrailTint,uTrailTintMix\)/,'the compiled fragment actually applies the separate trail tint');
  await page.evaluate(()=>{window.__retintPending=true;const b=portal.current(),r=b.faceRect();for(let i=0;i<8;i++)b.press(31,r.left+r.width*(.3+i*.05),r.top+r.height*.5);b.release(31);});await page.waitForFunction(()=>window.__retintResult);const changed=await page.evaluate(()=>window.__retintResult);assert.deepEqual(changed.color,[1,0,1]);assert.equal(changed.mix,1);assert.ok(changed.trail>0,'changing color preserves the existing gash in the same rendered frame');
  await page.evaluate(()=>portal.board('jelly'));const restored=await sample();assert.deepEqual(restored.color,[1,0,1]);assert.equal(restored.mix,1);
  await page.evaluate(()=>portal.current().setTint('#b026ff',false));assert.equal((await sample()).mix,0,'without an explicit selection the original material palette is restored');
 }finally{await context.close();}
});

test('Cogs selected color reaches live emissive lamps, survives activation and restores on reselect',{timeout:90000},async()=>{
 const context=await browser.newContext({viewport:{width:800,height:800},reducedMotion:'reduce'}),page=await context.newPage();
 try{
  await page.goto(url);await page.evaluate(async()=>{
   localStorage.setItem('myr5.grimoireColor.cogs','#00ffff');const {cogs,LAYOUT}=await import('/modules/portal/portal-board-cogs.mjs'),init=cogs.init;window.__lampLayout=(await(await fetch(LAYOUT)).json()).parts.find(p=>p.kind==='light');
   cogs.init=async function(args){await init(args);window.__lamps=[];window.__parts=[];args.mesh.parent.traverse(n=>{if(n.isMesh&&n.material){window.__parts.push(n.material);if(n.material.emissive?.getHex()>0)window.__lamps.push(n.material);}});};
   const {openQuiltPortal}=await import('/modules/portal/portal-entry.mjs');window.portal=await openQuiltPortal();await portal.board('cogs');portal.show();
  });assert.equal(await page.locator('#portalHome').getAttribute('data-art'),'3d');
  const sample=()=>page.evaluate(()=>({lamps:window.__lamps.map(m=>({color:m.emissive.getHexString(),intensity:m.emissiveIntensity})),parts:window.__parts.map(m=>m.color.getHexString())}));
  const initial=await sample();assert.ok(initial.lamps.length>0,'capture actual GLB lamp materials');assert.ok(initial.lamps.every(m=>m.color==='00ffff'),'persisted cyan reaches lamp emissive materials');
  await page.evaluate(()=>{const b=portal.current(),r=b.faceRect(),p=window.__lampLayout;b.press(72,r.left+r.width*p.u,r.top+r.height*p.v);});await page.waitForFunction(()=>window.__lamps.some(m=>m.emissiveIntensity>.1));
  await page.evaluate(()=>{const input=document.querySelector('[data-board-tint]');input.value='#ff00ff';input.dispatchEvent(new Event('input',{bubbles:true}));});const changed=await sample();assert.ok(changed.lamps.every(m=>m.color==='ff00ff'),'existing lamps repaint while lit');assert.ok(changed.lamps.some(m=>m.intensity>.1),'color change retains lamp activation');assert.deepEqual(changed.parts,initial.parts,'lamp color does not overwrite physical gear or plate material colors');
  await page.evaluate(()=>{portal.current().release(72);return portal.board('cogs');});const restored=await sample();assert.ok(restored.lamps.length>0&&restored.lamps.every(m=>m.color==='ff00ff'),'recreated lamps restore the selected color');
 }finally{await context.close();}
});

for(const {id,flat} of [{id:'jelly',flat:true},{id:'ice',flat:true},{id:'ice',flat:false}])test(`${id} ${flat?'2D':'3D'} drawn effect restores its selected color and repaints existing and new trails`,{timeout:90000},async()=>{
 const context=await browser.newContext({viewport:{width:800,height:800},reducedMotion:'reduce'}),page=await context.newPage();
 try{
  if(flat)await page.route('**/*.glb',route=>route.abort());await page.goto(url);
  await page.evaluate(async({id,flat})=>{
   localStorage.setItem('myr5.grimoireColor.'+id,'#00ffff');const module=await import('/modules/portal/portal-board-'+id+'.mjs'),effect=module[id],trace=effect.trace2d;
   if(flat)effect.trace2d=Object.assign(()=>{const fx=trace(),init=fx.init;fx.init=function(args){window.__trace=fx;window.__paint=args.paint.canvas;window.__glow=args.glow.canvas;return init.call(this,args);};return fx;},trace);
   else{const init=effect.init;effect.init=function(args){window.__paint=args.paint.canvas;window.__glow=args.glow.canvas;return init.call(this,args);};}
   const {openQuiltPortal}=await import('/modules/portal/portal-entry.mjs');window.portal=await openQuiltPortal();await portal.board(id);portal.show();
  },{id,flat});
  assert.equal(await page.locator('#portalHome').getAttribute('data-art'),flat?'flat':'3d');
  const draw=offset=>page.evaluate(offset=>{const board=portal.current(),r=board.faceRect();for(let i=0;i<8;i++)board.press(11,r.left+r.width*(.3+i*.045),r.top+r.height*(.4+offset+i*.014));board.release(11);board.resume();},offset);
  const flush=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>{portal.current().pause();resolve();})));
  const colors=()=>page.evaluate(()=>{const counts={cyan:0,magenta:0};for(const c of [window.__paint,window.__glow]){const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=0;i<d.length;i+=4){const r=d[i],g=d[i+1],b=d[i+2];if(d[i+3]<16)continue;if(g>90&&b>90&&r<g*.7&&r<b*.7)counts.cyan++;if(r>90&&b>90&&g<r*.7&&g<b*.7)counts.magenta++;}}return counts;});
  await draw(0);await flush();const initial=await colors();assert.ok(initial.cyan>10,'actual trail canvas pixels use persisted cyan: '+JSON.stringify(initial));
  await page.evaluate(()=>{const input=document.querySelector('[data-board-tint]');input.value='#ff00ff';input.dispatchEvent(new Event('input',{bubbles:true}));});await flush();const changed=await colors();
  assert.ok(changed.magenta>10,'existing trail pixels repaint magenta: '+JSON.stringify(changed));assert.ok(changed.cyan<initial.cyan*.1,'old selected cyan disappears from existing trails');
  await draw(.2);await flush();const fresh=await colors();assert.ok(fresh.magenta>10&&fresh.cyan<initial.cyan*.1,'new trails follow the selected magenta: '+JSON.stringify(fresh));
  assert.equal(await page.evaluate(id=>localStorage.getItem('myr5.grimoireColor.'+id),id),'#ff00ff');
  await page.evaluate(id=>portal.board(id),id);await draw(0);await flush();const restored=await colors();assert.ok(restored.magenta>10,'recreated effect restores the saved selected color');
 }finally{await context.close();}
});

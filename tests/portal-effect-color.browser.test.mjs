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
   window.__jellyInitGeneration=0;window.__jellyShaderGeneration=0;jelly.init=async function(args){await init(args);const generation=++window.__jellyInitGeneration;let compile=args.material.onBeforeCompile;Object.defineProperty(args.material,'onBeforeCompile',{configurable:true,get:()=>compile,set:fn=>{compile=function(shader,...rest){const result=fn.call(this,shader,...rest);window.__jellyShader=shader;window.__jellyShaderGeneration=generation;return result;};}});};
   window.__jellySteps=0;const step=jelly.step;jelly.step=function(...args){window.__jellySteps++;const result=step(...args),u=window.__jellyShader?.uniforms;if(window.__retintPending&&u?.uTrailN.value>0){window.__retintPending=false;const input=document.querySelector('[data-board-tint]');input.value='#ff00ff';input.dispatchEvent(new Event('input',{bubbles:true}));const c=u.uTrailTint.value;window.__retintResult={color:[c.r,c.g,c.b],mix:u.uTrailTintMix.value,trail:u.uTrailN.value};}return result;};
   const {openQuiltPortal}=await import('/modules/portal/portal-entry.mjs');window.portal=await openQuiltPortal();await portal.board('jelly');portal.show();portal.current().resume();
  });await page.waitForFunction(()=>window.__jellyShader?.uniforms.uTrailTint);
  const sample=()=>page.evaluate(()=>{const s=window.__jellyShader,c=s.uniforms.uTrailTint.value;return{color:[c.r,c.g,c.b],mix:s.uniforms.uTrailTintMix.value,trail:s.uniforms.uTrailN.value,fragment:s.fragmentShader};});
  const initial=await sample();assert.deepEqual(initial.color,[0,1,1]);assert.equal(initial.mix,1);assert.match(initial.fragment,/mix\([^;]*uTrailTint,uTrailTintMix\)/,'the compiled fragment actually applies the separate trail tint');
  assert.equal(await page.locator('#portalHome').getAttribute('data-art'),'3d','the test is exercising the rendered 3D Jelly effect');await page.waitForFunction(()=>window.__jellySteps>0);await page.evaluate(()=>{const b=portal.current();b.resume();window.__retintPending=true;const r=b.faceRect();for(let i=0;i<8;i++)b.press(31,r.left+r.width*(.3+i*.05),r.top+r.height*.5);b.release(31);});await page.waitForFunction(()=>window.__retintResult);const changed=await page.evaluate(()=>window.__retintResult);assert.deepEqual(changed.color,[1,0,1]);assert.equal(changed.mix,1);assert.ok(changed.trail>0,'changing color preserves the existing gash in the same rendered frame');
  await page.evaluate(async()=>{await portal.board('jelly');portal.current().resume();});await page.waitForFunction(()=>window.__jellyInitGeneration===2&&window.__jellyShaderGeneration===2);const restored=await sample();assert.deepEqual(restored.color,[1,0,1]);assert.equal(restored.mix,1);
  await page.evaluate(()=>portal.current().setTint('#b026ff',false));assert.equal((await sample()).mix,0,'without an explicit selection the original material palette is restored');
 }finally{await context.close();}
});

test('Cogs mechanism and back wall tints persist independently across live updates and reselect',{timeout:90000},async()=>{
 const context=await browser.newContext({viewport:{width:800,height:800},reducedMotion:'reduce'}),page=await context.newPage();
 try{
  await page.goto(url);await page.evaluate(async()=>{
   localStorage.setItem('myr5.grimoireColor.cogs','#00ffff');localStorage.setItem('myr5.grimoireBackplateColor.cogs','#884422');const {cogs}=await import('/modules/portal/portal-board-cogs.mjs'),init=cogs.init;
   window.__cogsInitGeneration=0;cogs.init=async function(args){await init(args);window.__cogsInitGeneration++;window.__lamps=[];window.__parts=[];window.__compiled=[];args.scene.traverse(n=>{if(!n.material)return;const materials=Array.isArray(n.material)?n.material:[n.material];for(const mat of materials){if(!window.__parts.includes(mat))window.__parts.push(mat);if(n.geometry?.type==='TorusGeometry'&&mat.emissive?.getHex()>0){const p=n.parent.position;window.__lamps.push(mat);window.__lampLayout={u:p.x/args.face.w+.5,v:.5-p.y/args.face.h};}const compile=mat.onBeforeCompile;if(typeof compile!=='function')continue;mat.onBeforeCompile=function(shader,...rest){const result=compile.call(this,shader,...rest);if(shader.uniforms.uMetalTint||shader.uniforms.uRails)window.__compiled.push({material:this,shader});return result;};}});};
   const {openQuiltPortal}=await import('/modules/portal/portal-entry.mjs');window.portal=await openQuiltPortal();await portal.board('cogs');portal.show();portal.current().resume();
  });assert.equal(await page.locator('#portalHome').getAttribute('data-art'),'3d');assert.equal(await page.getByLabel('Mechanism colour').count(),1,'Cogs exposes a mechanism color control');assert.equal(await page.getByLabel('Back wall colour').count(),1,'Cogs exposes an independent back wall color control');
  await page.waitForFunction(()=>window.__compiled?.some(c=>c.shader.uniforms.uMetalTint)&&window.__compiled?.some(c=>c.shader.uniforms.uRails));
  const sample=()=>page.evaluate(()=>({lamps:window.__lamps.map(m=>({color:m.emissive.getHexString(),intensity:m.emissiveIntensity})),mechanism:window.__compiled.filter(c=>c.shader.uniforms.uMetalTint).map(c=>({tint:c.shader.uniforms.uMetalTint.value.getHexString(),mix:c.shader.uniforms.uMetalMix.value,fragment:c.shader.fragmentShader})),backplates:window.__compiled.filter(c=>c.shader.uniforms.uRails).map(c=>({color:c.material.color.getHexString(),fragment:c.shader.fragmentShader}))}));
  const initial=await sample();assert.ok(initial.lamps.length>0,'capture actual generated GLB lamp materials');assert.ok(initial.lamps.every(m=>m.color==='00ffff'),'persisted cyan reaches lamp emissive materials');assert.ok(initial.mechanism.length>0&&initial.mechanism.every(m=>m.tint==='00ffff'&&m.mix===1),'persisted mechanism color reaches compiled gear and wheel shaders');assert.ok(initial.mechanism.every(m=>/diffuseColor\.rgb=mix\(diffuseColor\.rgb,uMetalTint\*clamp/.test(m.fragment)&&/uMetalMix/.test(m.fragment)),'gear shader applies the shared mechanism tint');assert.ok(initial.backplates.length>0&&initial.backplates.every(m=>m.color==='884422'),'persisted back wall color reaches the separately compiled plate material');assert.ok(initial.backplates.every(m=>/texture2D\(uRails,vMetalUv\)\.r/.test(m.fragment)&&/uRailTint/.test(m.fragment)),'backplate shader applies its polished rail detail independently');
  await page.evaluate(()=>{const b=portal.current(),r=b.faceRect(),p=window.__lampLayout;b.press(72,r.left+r.width*p.u,r.top+r.height*p.v);});await page.waitForFunction(()=>window.__lamps.some(m=>m.emissiveIntensity>.1));
  await page.evaluate(()=>{const input=document.querySelector('[data-board-tint]');input.value='#ff00ff';input.dispatchEvent(new Event('input',{bubbles:true}));});const changed=await sample();assert.ok(changed.lamps.every(m=>m.color==='ff00ff'),'mechanism tint updates lit lamps');assert.ok(changed.lamps.some(m=>m.intensity>.1),'mechanism color change retains lamp activation');assert.ok(changed.mechanism.length&&changed.mechanism.every(m=>m.tint==='ff00ff'&&m.mix===1),'mechanism tint updates the existing gear and wheel shader uniforms');assert.ok(changed.backplates.every(m=>m.color==='884422'),'changing mechanism color leaves the independently tinted back wall alone');
  await page.evaluate(()=>{const input=document.querySelector('[data-backplate-tint]');input.value='#336699';input.dispatchEvent(new Event('input',{bubbles:true}));});const split=await sample();assert.ok(split.backplates.length&&split.backplates.every(m=>m.color==='336699'),'back wall selection updates the plate material');assert.ok(split.mechanism.every(m=>m.tint==='ff00ff'&&m.mix===1)&&split.lamps.every(m=>m.color==='ff00ff'),'back wall color leaves selected gears and lamps alone');assert.equal(await page.evaluate(()=>localStorage.getItem('myr5.grimoireColor.cogs')),'#ff00ff');assert.equal(await page.evaluate(()=>localStorage.getItem('myr5.grimoireBackplateColor.cogs')),'#336699');
  await page.evaluate(async()=>{portal.current().release(72);await portal.board('cogs');portal.current().resume();});await page.waitForFunction(()=>window.__cogsInitGeneration===2&&window.__compiled?.some(c=>c.shader.uniforms.uMetalTint)&&window.__compiled?.some(c=>c.shader.uniforms.uRails));const restored=await sample();assert.ok(restored.lamps.length>0&&restored.lamps.every(m=>m.color==='ff00ff'),'recreated lamps restore the selected mechanism color');assert.ok(restored.mechanism.length&&restored.mechanism.every(m=>m.tint==='ff00ff'&&m.mix===1),'recreated gear and wheel shaders restore the selected mechanism tint');assert.ok(restored.backplates.length&&restored.backplates.every(m=>m.color==='336699'),'recreated back wall restores its independent color');
 }finally{await context.close();}
});

for(const {id,flat} of [{id:'jelly',flat:true},{id:'ice',flat:true},{id:'ice',flat:false}])test(`${id} ${flat?'2D':'3D'} drawn effect restores its selected color and repaints existing and new trails`,{timeout:90000,skip:!flat&&process.env.MYR5_FULL_ENV!=='1'?'3D trail canvases fill unreliably under software GL on a busy machine: set MYR5_FULL_ENV=1 on a quiet GPU machine':false},async()=>{
 // Software GL paints on its own schedule: on a loaded machine the sampled canvases can still be empty, so give it three tries.
 for(let n=1;;n++){try{await attempt();break;}catch(error){if(n===3)throw error;}}
 async function attempt(){
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
 }
});

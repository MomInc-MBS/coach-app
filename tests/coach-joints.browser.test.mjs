import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright';

// R21 L1: coach parts never visibly separate. For every body, every gesture is played through the real
// MotionController at the shipped amount (1.5x) and the head/body and body/feet seams are measured.
// Needs `npm run build` first (serves dist/client models).
const root=resolve('dist/client'),outDir=resolve('.frames/r21-joints');
const bundle=(await build({entryPoints:['tests/coach-joints-fixture.ts'],bundle:true,format:'esm',platform:'browser',target:'es2022',write:false})).outputFiles[0].text;
const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.glb':'model/gltf-binary','.bin':'application/octet-stream'};
async function withPage(run){
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(req.method==='POST'&&path.startsWith('/capture/')){const id=decodeURIComponent(path.slice('/capture/'.length));if(!/^[a-z0-9_-]+$/.test(id)){res.writeHead(400);res.end();return;}const chunks=[];for await(const part of req)chunks.push(part);await writeFile(resolve(outDir,id+'.png'),Buffer.concat(chunks));res.writeHead(204);res.end();return;}
  if(path==='/__test__'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;background:#211d27}canvas{display:block}</style>');return;}
  if(path==='/test-fixture.mjs'){res.setHeader('Content-Type','text/javascript');res.end(bundle);return;}
  try{const file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});await run(browser,'http://127.0.0.1:'+server.address().port+'/__test__');}
 finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
}

// Seam measure, world space with skinning applied. At rest the surfaces are binned into vertical
// columns; where the upper part's lowest point meets the lower part's highest point (within ±tol), that
// pair of surface points is a seam stitch. A pose opens the seam by how far a stitch pulls apart.
const MEASURE=async([ids,rigid])=>{
 const {THREE:T,assembleCreature,fresh,createRig,MotionController,GESTURES,motionSettings}=await import('/test-fixture.mjs');
 const surfaces=node=>node.children.filter(o=>o.isMesh);
 // Surface samples (mesh, triangle corners, barycentrics) of the triangles keep() picks at rest.
 function part(nodes,spacing,keep){const samples=[],tri=[new T.Vector3(),new T.Vector3(),new T.Vector3()];
  for(const node of nodes)for(const mesh of surfaces(node)){const idx=mesh.geometry.index,n=idx?idx.count:mesh.geometry.attributes.position.count,at=i=>idx?idx.getX(i):i;
   for(let i=0;i<n;i+=3){for(let j=0;j<3;j++)mesh.getVertexPosition(at(i+j),tri[j]).applyMatrix4(mesh.matrixWorld);if(!keep(...tri))continue;
    const k=Math.min(6,Math.ceil(Math.max(tri[0].distanceTo(tri[1]),tri[1].distanceTo(tri[2]),tri[2].distanceTo(tri[0]))/spacing));
    for(let u=0;u<=k;u++)for(let w=0;u+w<=k;w++)samples.push([mesh,at(i),at(i+1),at(i+2),1-(u+w)/k,u/k,w/k]);}}
  const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
  return {samples,at(i,out=new T.Vector3()){const [mesh,ia,ib,ic,wa,wb,wc]=samples[i];mesh.getVertexPosition(ia,a);mesh.getVertexPosition(ib,b);mesh.getVertexPosition(ic,c);return out.copy(a).multiplyScalar(wa).addScaledVector(b,wb).addScaledVector(c,wc).applyMatrix4(mesh.matrixWorld);}};}
 function extreme(p,cell,lowest){const map=new Map(),v=new T.Vector3();for(let i=0;i<p.samples.length;i++){p.at(i,v);const key=Math.floor(v.x/cell)*4096+Math.floor(v.z/cell),old=map.get(key);if(!old||(lowest?v.y<old.y:v.y>old.y))map.set(key,{i,y:v.y});}return map;}
 function seam(upper,lower,cell,tol){const U=extreme(upper,cell,true),L=extreme(lower,cell,false),stitches=[];
  for(const [k,u] of U){const l=L.get(k);if(l&&Math.abs(u.y-l.y)<=tol)stitches.push([u.i,l.i,upper.at(u.i).distanceTo(lower.at(l.i))]);}
  const pu=new T.Vector3(),pl=new T.Vector3();
  return {size:stitches.length,check(){let worst=0;for(const [iu,il,d0] of stitches){const g=upper.at(iu,pu).distanceTo(lower.at(il,pl))-d0;if(g>worst){worst=g;this.last={d0,u:pu.toArray().map(n=>+n.toFixed(3)),sw:Array.from(upper.samples[iu].slice(1,4)).map(i=>upper.samples[iu][0].geometry.attributes.skinWeight?.getY(i).toFixed(2)),lw:Array.from(lower.samples[il].slice(1,4)).map(i=>lower.samples[il][0].geometry.attributes.skinWeight?.getY(i).toFixed(2)),l:pl.toArray().map(n=>+n.toFixed(3))};}}return worst;}};}
 const worldBox=nodes=>{const b=new T.Box3();for(const n of nodes)for(const m of surfaces(n))b.expandByObject(m);return b;};
 const results=[];
 for(const id of ids){
  const d=fresh();d.body=id;d.headFrom=id;d.armsFrom=id;d.feetFrom=id;
  const assembly=await assembleCreature(d,'/creature/');let rig,rigMs=performance.now();try{rig=createRig(assembly.root,d);}finally{assembly.dispose();}rigMs=performance.now()-rigMs;
  // rigid=true reproduces the pre-R21 rig (every part vertex follows its own pivot) for a before/after.
  if(rigid)rig.root.traverse(o=>{if(o.isSkinnedMesh){const w=o.geometry.attributes.skinWeight;for(let i=0;i<w.count;i++)w.setXYZW(i,0,1,0,0);}});
  const N=rig.nodes,pose=()=>{rig.root.updateMatrixWorld(true);rig.root.traverse(o=>o.skeleton?.update());};pose();
  const hb=worldBox([N.HeadMotion]),headH=hb.max.y-hb.min.y,cell=(hb.max.x-hb.min.x)/28,tol=Math.min(cell*.5,headH*.03),reach=headH*.3,pad=(hb.max.x-hb.min.x)*.1;
  const inXZ=(box,p)=>p.x>box.min.x-pad&&p.x<box.max.x+pad&&p.z>box.min.z-pad&&p.z<box.max.z+pad;
  const head=part([N.HeadMotion],cell/2,(a,b,c)=>Math.min(a.y,b.y,c.y)<hb.min.y+reach);
  const bodyTop=part([N.BodyMotion],cell/2,(a,b,c)=>Math.max(a.y,b.y,c.y)>hb.min.y-reach&&inXZ(hb,a));
  const headSeam=seam(head,bodyTop,cell,tol);
  const fb=worldBox([N.FootLeft,N.FootRight]);
  const feet=part([N.FootLeft,N.FootRight],cell/2,(a,b,c)=>Math.max(a.y,b.y,c.y)>fb.max.y-reach);
  const bodyLow=part([N.BodyMotion],cell/2,(a,b,c)=>Math.min(a.y,b.y,c.y)<fb.max.y+reach&&inXZ(fb,a));
  const feetSeam=seam(bodyLow,feet,cell,tol);
  const motion=new MotionController(rig);Object.assign(motion,motionSettings(null));
  const worst={head:{gap:0,at:''},feet:{gap:0,at:''}};
  for(const g of Object.keys(GESTURES)){motion.neutral();motion.current='';motion.play(g);
   for(let f=0;f<Math.ceil(GESTURES[g].duration*15);f++){motion.update(1/15);pose();
    const h=headSeam.check(),ft=feetSeam.check(),at=g+'@'+(f/15).toFixed(2);if(h>worst.head.gap)worst.head={gap:h,at,stitch:headSeam.last};if(ft>worst.feet.gap)worst.feet={gap:ft,at,stitch:feetSeam.last};}}
  motion.dispose();
  results.push({id,rigMs,headH,headMinY:hb.min.y,headPivotY:N.HeadMotion.getWorldPosition(new T.Vector3()).y,skinned:{head:surfaces(N.HeadMotion).some(m=>m.isSkinnedMesh),feet:surfaces(N.FootLeft).some(m=>m.isSkinnedMesh)},headContact:headSeam.size,feetContact:feetSeam.size,head:{gap:worst.head.gap/headH,at:worst.head.at,stitch:worst.head.stitch},feet:{gap:worst.feet.gap/headH,at:worst.feet.at,stitch:worst.feet.stitch}});
  rig.root.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();o.skeleton?.dispose();}});
 }
 return results;
};

const EPS=.01; // a seam may open by at most 1% of the head's height (sub-pixel at phone size).
test('no coach body opens a gap at the neck or feet at max lean, every gesture at amount 1.5',{timeout:1800000},async()=>withPage(async(browser,url)=>{
 await mkdir(outDir,{recursive:true});const page=await browser.newPage({viewport:{width:375,height:812}});if(process.env.JOINT_DEBUG)page.on('console',m=>console.log('[page]',m.text()));await page.goto(url);
 let ids=await page.evaluate(async()=>(await import('/test-fixture.mjs')).BODIES.map(b=>b.id));
 if(process.env.JOINT_IDS)ids=ids.filter(id=>process.env.JOINT_IDS.split(',').some(s=>id.includes(s)));
 const report=[];for(let i=0;i<ids.length;i+=8){report.push(...await page.evaluate(MEASURE,[ids.slice(i,i+8),process.env.JOINT_RIGID==='1']));console.log('measured',report.length,'/',ids.length);}
 await writeFile(resolve(outDir,process.env.JOINT_RIGID==='1'?'gap-report-rigid.json':'gap-report.json'),JSON.stringify(report,null,1));
 for(const r of report)console.log(r.id.padEnd(70),'head',r.head.gap.toFixed(4),r.head.at.padEnd(16),'feet',r.feet.gap.toFixed(4),r.feet.at.padEnd(16),'contact',r.headContact,r.feetContact);
 assert.ok(report.length===ids.length&&(ids.length>=71||process.env.JOINT_IDS),'every body measured');
 for(const r of report){assert.ok(r.head.gap<=EPS,`${r.id} neck opens ${(r.head.gap*100).toFixed(1)}% of head height at ${r.head.at}`);assert.ok(r.feet.gap<=EPS,`${r.id} feet open ${(r.feet.gap*100).toFixed(1)}% of head height at ${r.feet.at}`);}
 await page.close();
}));

// Phone-size captures at max lean (preview lighting/framing): MYR5, a humanoid, a quadruped and a floater.
test('375x812 captures at max lean',{timeout:600000},async()=>withPage(async(browser,url)=>{
 await mkdir(outDir,{recursive:true});const page=await browser.newPage({viewport:{width:375,height:812},deviceScaleFactor:1});await page.goto(url);
 const shots=await page.evaluate(async()=>{
  const {THREE:T,assembleCreature,fresh,createRig,MotionController,motionSettings}=await import('/test-fixture.mjs');
  const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(375,812,false);renderer.outputColorSpace=T.SRGBColorSpace;document.body.append(renderer.domElement);
  const scene=new T.Scene();scene.background=new T.Color('#211d27');scene.add(new T.HemisphereLight(0xf5f1ff,0x30242a,2.15));const key=new T.DirectionalLight(0xffffff,3.1);key.position.set(-3,5,5);scene.add(key);const fill=new T.DirectionalLight(0xb8d5ff,1.1);fill.position.set(4,1,2);scene.add(fill);
  const camera=new T.PerspectiveCamera(36,375/812,.1,100),out=[];
  const bodies=[['myr5','myr5'],['roster/09-monolith-tanka--boxy_humanoid_3d_model','boxy'],['roster/18-quad-all--robotic_dog_3d_model','robotic-dog'],['roster/10-petal-wisp--ghost_character_3d_model','ghost']];
  for(const [id,slug] of bodies){const d=fresh();d.body=id;d.headFrom=id;d.armsFrom=id;d.feetFrom=id;
   const assembly=await assembleCreature(d,'/creature/');let rig;try{rig=createRig(assembly.root,d);}finally{assembly.dispose();}scene.add(rig.root);
   // Frame the neck: the head plus the body top, about 2.6 head heights tall.
   const head=new T.Box3();for(const m of rig.nodes.HeadMotion.children)if(m.isMesh)head.expandByObject(m);const size=head.getSize(new T.Vector3()),center=head.getCenter(new T.Vector3()).setY(head.min.y+size.y*.2),dist=Math.max(size.y*1.3,size.x*1.3*812/375)/Math.tan(T.MathUtils.degToRad(18));
   // Laugh peaks at u=.5 (head thrown back), listening at u=.5 (full side lean), walk at a full stride.
   for(const [g,t,yaw] of [['laugh',1.7,.75],['listening',2,0],['walk',.225,.9]]){const motion=new MotionController(rig);Object.assign(motion,motionSettings(null));motion.neutral();motion.current='';motion.play(g);for(let s=0;s<t;s+=1/60)motion.update(1/60);
    camera.position.set(center.x+Math.sin(yaw)*dist,center.y+size.y*.08,center.z+Math.cos(yaw)*dist);camera.lookAt(center);renderer.render(scene,camera);
    const blob=await new Promise(r=>renderer.domElement.toBlob(r,'image/png'));const name=slug+'-'+g;await fetch('/capture/'+name,{method:'POST',body:blob});out.push(name);motion.neutral();motion.dispose();}
   scene.remove(rig.root);}
  renderer.dispose();return out;});
 assert.equal(shots.length,12);await page.close();
}));

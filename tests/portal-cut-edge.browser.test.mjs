import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';

let server,browser,url;
test.before(async()=>{
 const root=resolve('.');server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><style>body{margin:0;background:#e040c0}#board{width:360px;height:600px}</style><div id="board"></div><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/loaders/GLTFLoader.js":"/vendor/three/GLTFLoader.js","three/addons/libs/meshopt_decoder.module.js":"/vendor/three/meshopt_decoder.module.js"}}</script>');return;}
  try{const file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.webp':'image/webp'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));url='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader']});await mkdir('.frames',{recursive:true});
});
test.after(async()=>{await browser?.close();await new Promise(r=>server.close(r));});

for(const kind of ['quilt','coarse-glb'])test(`${kind} cut and falling piece follow diagonal and curved outlines independently of tessellation`,{timeout:90000},async()=>{
 const context=await browser.newContext({viewport:{width:360,height:600},deviceScaleFactor:1,reducedMotion:'no-preference'}),page=await context.newPage();
 try{
  await page.goto(url);await page.evaluate(async kind=>{
   const T=await import('three');window.__THREE=T;
   T.Scene.prototype.onBeforeRender=function(renderer,scene,camera){window.__render={renderer,scene,camera};};
   if(kind==='quilt'){const {createQuiltBoardGL}=await import('/modules/portal/portal-board.mjs');window.board=await createQuiltBoardGL(document.querySelector('#board'));}
   else{
    // A deliberately coarse two-triangle GLTF proves the boundary is independent of mesh density.
    const positions=new Float32Array([-150,-250,0,150,-250,0,150,250,0,-150,-250,0,150,250,0,-150,250,0]);
    const bytes=new Uint8Array(positions.buffer),gltf={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0},material:0}]}],materials:[{doubleSided:true,pbrMetallicRoughness:{baseColorFactor:[.7,.8,.9,1],metallicFactor:0,roughnessFactor:1}}],buffers:[{byteLength:bytes.length,uri:'data:application/octet-stream;base64,'+btoa(String.fromCharCode(...bytes))}],bufferViews:[{buffer:0,byteLength:bytes.length}],accessors:[{bufferView:0,componentType:5126,count:6,type:'VEC3',min:[-150,-250,0],max:[150,250,0]}]};
    const {createGlbBoard}=await import('/modules/portal/portal-board-glb.mjs');window.board=await createGlbBoard(document.querySelector('#board'),{effect:{id:'edge-test',asset:'data:model/gltf+json;base64,'+btoa(JSON.stringify(gltf)),guide:null}});
   }
   board.pause();window.capture=()=>{const {renderer,scene,camera}=window.__render;renderer.render(scene,camera);const c=document.createElement('canvas');c.width=360;c.height=600;const g=c.getContext('2d');g.drawImage(board.canvas,0,0,360,600);return g.getImageData(0,0,360,600).data;};window.initialAlpha=capture().filter((_,i)=>i%4===3);
  },kind);
  const failures=[];
  for(const shape of ['triangle','oval'])for(const piece of [false,true,'tilted']){
   const result=await page.evaluate(async({shape,piece})=>{
    board.heal();const {scene}=window.__render;scene.traverse(o=>{if(o.isMesh)o.material.visible=true;});
    const poly=shape==='triangle'?[[.18,.82],[.5,.18],[.82,.82]]:Array.from({length:96},(_,i)=>{const t=i*Math.PI*2/96;return[.5+.31*Math.cos(t),.5+.31*Math.sin(t)];});
    const baseline=capture(),face=board.faceRect();let healedErrors=0;for(let i=0;i<initialAlpha.length;i++)if(Math.abs(initialAlpha[i]-baseline[i*4+3])>10)healedErrors++;
    if(piece){
     board.cut(poly,'#ffffff',100000);board.pause();let falling;
     scene.traverse(o=>{if(o.isMesh){if(!o.material.transparent)o.material.visible=false;else if(o.material.opacity>.5)falling=o;}});
     if(piece==='tilted'){
      const T=window.__THREE,{camera}=window.__render;scene.updateMatrixWorld(true);const inverse=falling.matrixWorld.clone().invert(),ray=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,0,1),0);
      const points=poly.map(([u,v])=>{ray.setFromCamera(new T.Vector2((face.left+u*face.width)/360*2-1,1-(face.top+v*face.height)/600*2),camera);return ray.ray.intersectPlane(plane,new T.Vector3()).applyMatrix4(inverse);});
      const pivot=falling.parent;pivot.rotation.set(.45,.12,0);pivot.scale.setScalar(.8);pivot.position.z-=30;scene.updateMatrixWorld(true);
      points.forEach((p,i)=>{p.applyMatrix4(falling.matrixWorld).project(camera);poly[i]=[((p.x+1)*180-face.left)/face.width,((1-p.y)*300-face.top)/face.height];});
     }
    }
    else{await board.cut(poly,'#ffffff',0);board.pause();}
    const data=capture(),inside=(x,y)=>{let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
    let wrong=0,total=0,maxDistance=0;
    for(let y=Math.ceil(face.top+face.height*.08);y<face.top+face.height*.92;y++)for(let x=Math.ceil(face.left+face.width*.08);x<face.left+face.width*.92;x++){
     const u=(x+.5-face.left)/face.width,v=(y+.5-face.top)/face.height;let distance=Infinity;
     for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ax=a[0]*face.width,ay=a[1]*face.height,dx=(b[0]-a[0])*face.width,dy=(b[1]-a[1])*face.height,px=u*face.width,py=v*face.height,t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy)));distance=Math.min(distance,Math.hypot(px-ax-t*dx,py-ay-t*dy));}
     if(distance<2||distance>16)continue;const offset=(y*360+x)*4;if(baseline[offset+3]<240)continue;total++;
     const expected=piece?inside(u,v):!inside(u,v),visible=data[offset+3]>127;if(visible!==expected){wrong++;maxDistance=Math.max(maxDistance,distance);}
    }
    return{wrong,total,maxDistance,healedErrors};
   },{shape,piece});
   await page.screenshot({path:resolve('.frames',`cut-edge-${kind}-${shape}-${piece==='tilted'?'tilted-piece':piece?'piece':'hole'}.png`)});
   assert.ok(result.total>1000,'sample actual pixels near the traced outline');
   assert.ok(result.healedErrors<50,'healing restores the entire board before another shape: '+JSON.stringify(result));
   if(result.wrong/result.total>=.005)failures.push(`${shape} ${piece==='tilted'?'tilted piece':piece?'falling piece':'hole'}: ${JSON.stringify(result)}`);
  }
  assert.deepEqual(failures,[],'cut boundaries remain within a 2px antialias allowance');
 }finally{await context.close();}
});

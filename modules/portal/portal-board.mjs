// Quilt cloth board for the portal home. The solver is a port of Ten Minute Physics
// "Cloth Simulation" (c) 2022 Matthias Müller, MIT licence (see portal-board NOTICE below),
// adapted to a quilt pinned at its border that fingers press and drag. AGPL-3.0-or-later wrapper.
// NOTICE: Permission is hereby granted, free of charge, to any person obtaining a copy of the
// cloth solver to deal in it without restriction, subject to including this copyright notice.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
import * as THREE from 'three';
import {splitIndexByPolygon,pieceMaterial,fallPieces} from './portal-cut.mjs';

const IMAGE='/pod/worlds/quilt.webp',IMAGE_W=1024,IMAGE_H=1666;
// Stitched pattern (the eight shapes) inside the quilt image, as image fractions.
const PATTERN={left:22/IMAGE_W,top:22/IMAGE_H,right:1002/IMAGE_W,bottom:1575/IMAGE_H};
// Ian: heavier, calmer (2026-09-22)
export const QUILT={segX:24,substeps:6,compliance:3e-6,restore:1.0,stretch:1.15,damping:.955,radius:60,depth:40,drag:.7,sleepMs:1500};
const BACKGROUND='#17111e';

export async function createQuiltBoard(host,{knobs=QUILT}={}){
 // Transparent canvas; BACKGROUND goes on #portalHome (board.background) so the neon glass shows only through a cut.
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0x000000,0);
 const canvas=renderer.domElement;canvas.className='portal-board-canvas';canvas.setAttribute('aria-hidden','true');canvas.style.cssText='display:block;width:100%;height:100%';host.append(canvas);
 const texture=await new THREE.TextureLoader().loadAsync(IMAGE);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,1,20000);
 scene.add(new THREE.HemisphereLight(0xfff4e6,0x3a2f40,1.1));
 const sun=new THREE.DirectionalLight(0xfff0dc,2.4);sun.position.set(-.7,.55,.45);scene.add(sun);
 const material=new THREE.MeshStandardMaterial({map:texture,roughness:.95,metalness:0,side:THREE.DoubleSide});
 const segX=knobs.segX,segY=Math.round(segX*IMAGE_H/IMAGE_W),cols=segX+1,count=cols*(segY+1);
 const pos=new Float32Array(count*3),prev=new Float32Array(count*3),rest=new Float32Array(count*3),invMass=new Float32Array(count),uv=new Float32Array(count*2),index=[];
 for(let j=0;j<=segY;j++)for(let i=0;i<=segX;i++){const n=j*cols+i;uv[2*n]=i/segX;uv[2*n+1]=1-j/segY;invMass[n]=i===0||j===0||i===segX||j===segY?0:1;}
 for(let j=0;j<segY;j++)for(let i=0;i<segX;i++){const a=j*cols+i,b=a+1,c=a+cols,d=c+1;index.push(a,c,b,b,c,d);}
 // Stretch constraints along every triangle edge; bending between the two far corners of each triangle pair.
 const edges=new Map();
 for(let t=0;t<index.length;t+=3)for(let k=0;k<3;k++){const a=index[t+k],b=index[t+(k+1)%3],o=index[t+(k+2)%3],key=Math.min(a,b)*count+Math.max(a,b);(edges.get(key)||edges.set(key,{a,b,far:[]}).get(key)).far.push(o);}
 const stretch=[],bend=[];for(const e of edges.values()){stretch.push(e.a,e.b);if(e.far.length===2)bend.push(e.far[0],e.far[1]);}
 const stretchIds=new Int32Array(stretch),bendIds=new Int32Array(bend),stretchLen=new Float32Array(stretch.length/2),bendLen=new Float32Array(bend.length/2);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(pos,3));geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));geometry.setIndex(index);
 const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;scene.add(mesh);
 // Transparent twin for cut pieces, drawn once at load (opacity 0 over the quilt: invisible) so the first cut doesn't hitch on a compile.
 const pieceMat=pieceMaterial(material),warm=new THREE.Mesh(geometry,pieceMat);pieceMat.opacity=0;warm.frustumCulled=false;scene.add(warm);
 const fullIndex=geometry.index;let cutting=null;

 let width=1,height=1,quilt={left:0,top:0,width:1,height:1},frame=0,disposed=false,awakeUntil=0,last=0,frameMs=0;
 const pointers=new Map();
 function layout(){
  const box=host.getBoundingClientRect();width=Math.max(1,box.width);height=Math.max(1,box.height);
  // Contain (up to a slight vertical stretch): the whole quilt stays visible so every stitched shape can be traced.
  const w=Math.min(width,height*IMAGE_W/IMAGE_H),h=Math.min(height,w*IMAGE_H/IMAGE_W*knobs.stretch);quilt={left:(width-w)/2,top:(height-h)/2,width:w,height:h};
  for(let j=0;j<=segY;j++)for(let i=0;i<=segX;i++){const n=3*(j*cols+i);rest[n]=quilt.left+w*i/segX;rest[n+1]=-(quilt.top+h*j/segY);rest[n+2]=0;}
  pos.set(rest);prev.set(rest);
  const dist=(ids,k,a=ids[2*k],b=ids[2*k+1])=>Math.hypot(rest[3*a]-rest[3*b],rest[3*a+1]-rest[3*b+1]);
  for(let k=0;k<stretchLen.length;k++)stretchLen[k]=dist(stretchIds,k);for(let k=0;k<bendLen.length;k++)bendLen[k]=dist(bendIds,k);
  renderer.setSize(width,height,false);camera.aspect=width/height;
  // World units are CSS pixels on the z=0 plane: x right, y up (screen y negated).
  camera.position.set(width/2,-height/2,(height/2)/Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));camera.near=camera.position.z/10;camera.far=camera.position.z*10;camera.lookAt(width/2,-height/2,0);camera.updateProjectionMatrix();
  geometry.attributes.position.needsUpdate=true;geometry.computeVertexNormals();wake();
 }
 function solve(ids,lengths,alpha){
  for(let k=0;k<lengths.length;k++){
   const a=ids[2*k],b=ids[2*k+1],wa=invMass[a],wb=invMass[b],w=wa+wb;if(!w)continue;
   const dx=pos[3*a]-pos[3*b],dy=pos[3*a+1]-pos[3*b+1],dz=pos[3*a+2]-pos[3*b+2],len=Math.hypot(dx,dy,dz);if(!len)continue;
   const s=-(len-lengths[k])/(w+alpha)/len;
   pos[3*a]+=dx*s*wa;pos[3*a+1]+=dy*s*wa;pos[3*a+2]+=dz*s*wa;pos[3*b]-=dx*s*wb;pos[3*b+1]-=dy*s*wb;pos[3*b+2]-=dz*s*wb;
  }
 }
 function step(dt){
  const sdt=dt/knobs.substeps,alpha=knobs.compliance/sdt/sdt,pull=1-Math.exp(-knobs.restore*sdt),r2=knobs.radius*knobs.radius;
  for(let s=0;s<knobs.substeps;s++){
   for(let n=0;n<count;n++){if(!invMass[n])continue;const p=3*n;
    for(let c=0;c<3;c++){const v=(pos[p+c]-prev[p+c])*knobs.damping;prev[p+c]=pos[p+c];pos[p+c]+=v+(rest[p+c]-pos[p+c])*pull;}
   }
   // A finger presses the fabric in and drags it a little along the stroke.
   for(const touch of pointers.values()){
    const tx=touch.x,ty=-touch.y,mx=(touch.x-touch.px)*knobs.drag/knobs.substeps,my=-(touch.y-touch.py)*knobs.drag/knobs.substeps;
    for(let n=0;n<count;n++){if(!invMass[n])continue;const p=3*n,dx=pos[p]-tx,dy=pos[p+1]-ty,d2=dx*dx+dy*dy;if(d2>r2)continue;
     const f=(1-Math.sqrt(d2)/knobs.radius)**2;pos[p+2]=Math.min(pos[p+2],pos[p+2]+(-knobs.depth*f-pos[p+2])*.5);pos[p]+=mx*f;pos[p+1]+=my*f;}
   }
   solve(stretchIds,stretchLen,alpha);solve(bendIds,bendLen,alpha*4);
  }
  for(const touch of pointers.values()){touch.px=touch.x;touch.py=touch.y;}
 }
 function wake(){awakeUntil=performance.now()+knobs.sleepMs;if(!frame&&!disposed){last=performance.now();frame=requestAnimationFrame(tick);}}
 function tick(now){
  frame=0;if(disposed)return;
  const dt=Math.min(1/30,Math.max(1/240,(now-last)/1000));last=now;
  if(!document.hidden){const t=performance.now();step(dt);if(cutting?.fall.live)cutting.fall.pose(now);geometry.attributes.position.needsUpdate=true;geometry.computeVertexNormals();renderer.render(scene,camera);frameMs=frameMs*.9+(performance.now()-t)*.1;}
  if(pointers.size||now<awakeUntil||cutting?.fall.live)frame=requestAnimationFrame(tick);
 }
 const local=(x,y)=>{const box=host.getBoundingClientRect();return [x-box.left,y-box.top];};
 const observer=new ResizeObserver(layout);observer.observe(host);layout();renderer.render(scene,camera);scene.remove(warm);
 const quiltRect=()=>{const box=host.getBoundingClientRect();return {left:box.left+quilt.left,top:box.top+quilt.top,width:quilt.width,height:quilt.height};};
 // Cut-away: grid triangles whose centroid (in quilt-image fractions, v down) is inside poly leave the
 // index -> a hole; a static copy of their current positions + uvs falls into the board. The cloth
 // keeps simulating everything (constraints on the now-invisible vertices are harmless).
 function cut(poly,color,ms=1100){
  heal();
  const {keep,cut:tri}=splitIndexByPolygon(rest,fullIndex.array,(x,y)=>[(x-quilt.left)/quilt.width,(-y-quilt.top)/quilt.height],poly);
  const pieces=[];
  if(tri.length){
   const map=new Map(),P=[],U=[],I=[];let cx=0,cy=0,cz=0;
   for(const n of tri){let k=map.get(n);if(k===undefined){k=map.size;map.set(n,k);P.push(pos[3*n],pos[3*n+1],pos[3*n+2]);U.push(uv[2*n],uv[2*n+1]);cx+=pos[3*n];cy+=pos[3*n+1];cz+=pos[3*n+2];}I.push(k);}
   cx/=map.size;cy/=map.size;cz/=map.size;
   const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.Float32BufferAttribute(P,3));pg.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));pg.setIndex(I);pg.computeVertexNormals();
   const piece=new THREE.Mesh(pg,pieceMat),pivot=new THREE.Group();piece.frustumCulled=false;piece.position.set(-cx,-cy,-cz);pivot.position.set(cx,cy,cz);pivot.add(piece);scene.add(pivot);
   pieces.push({pivot,material:pieceMat,drop(){scene.remove(pivot);pg.dispose();}});
   geometry.setIndex(keep);
  }
  cutting={fall:fallPieces(pieces,quilt.height*.35,ms)};wake();
  return cutting.fall.done;
 }
 function heal(){
  if(!cutting)return;
  cutting.fall.end();geometry.setIndex(fullIndex);cutting=null;
  if(!disposed){geometry.computeVertexNormals();renderer.render(scene,camera);} // healed frame on the canvas now, even while paused
 }
 return {
  canvas,
  background:BACKGROUND,
  faceRect:quiltRect,
  cut,heal,
  // Stitched-shape area in client pixels; the portal normalises traces against it.
  patternRect(){const box=host.getBoundingClientRect();return {left:box.left+quilt.left+quilt.width*PATTERN.left,top:box.top+quilt.top+quilt.height*PATTERN.top,width:quilt.width*(PATTERN.right-PATTERN.left),height:quilt.height*(PATTERN.bottom-PATTERN.top)};},
  quiltRect,
  press(id,clientX,clientY){const [x,y]=local(clientX,clientY),touch=pointers.get(id);if(touch){touch.x=x;touch.y=y;}else pointers.set(id,{x,y,px:x,py:y});wake();},
  release(id){pointers.delete(id);wake();},
  frameMs:()=>frameMs,
  pause(){pointers.clear();cancelAnimationFrame(frame);frame=0;},
  resume:wake,
  dispose(){cutting?.fall.end();pieceMat.dispose();disposed=true;cancelAnimationFrame(frame);observer.disconnect();geometry.dispose();material.dispose();texture.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();},
 };
}

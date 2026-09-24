// Quilt cloth board for the portal home. The solver is a port of Ten Minute Physics
// "Cloth Simulation" (c) 2022 Matthias Müller, MIT licence (see portal-board NOTICE below),
// adapted to a quilt pinned at its border that fingers press and drag. AGPL-3.0-or-later wrapper.
// MIT License — Copyright (c) 2022 Matthias Müller
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software
// and associated documentation files (the "Software"), to deal in the Software without restriction,
// including without limitation the rights to use, copy, modify, merge, publish, distribute,
// sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or
// substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
// BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
import * as THREE from 'three';
import {splitIndexByPolygon,pieceMaterial,fallPieces} from './portal-cut.mjs';
import {SHAPES} from './portal-shapes.mjs';

const IMAGE='/pod/worlds/quilt.webp',IMAGE_W=1024,IMAGE_H=1666;
// Stitched pattern (the eight shapes) inside the quilt image, as image fractions.
const PATTERN={left:22/IMAGE_W,top:22/IMAGE_H,right:1002/IMAGE_W,bottom:1575/IMAGE_H};
// Ian: heavier, calmer (2026-09-22)
export const QUILT={segX:24,substeps:6,compliance:3e-6,restore:1.0,stretch:1.15,damping:.955,radius:60,depth:40,drag:.7,sleepMs:1500};
const BACKGROUND='#17111e';
// W2-2O: the quilt texture is Starter-pack art. Without it (offline, not downloaded) the board is a plain
// stitched quilt, same layout: cream cloth in its dark binding, the traceable shapes stitched where the art has them.
const STITCHES=[['oval','#c42a3c'],['x','#e0388f'],['up','#2c5cc2'],['down','#2f8a4c'],['cross','#4ea6da']];
function plainQuilt(){
 const canvas=document.createElement('canvas'),g=canvas.getContext('2d');canvas.width=IMAGE_W/2;canvas.height=IMAGE_H/2;g.scale(.5,.5);
 g.fillStyle='#3b3441';g.fillRect(0,0,IMAGE_W,IMAGE_H);g.fillStyle='#efe6d3';g.fillRect(22,22,IMAGE_W-44,IMAGE_H-44);
 const x=PATTERN.left*IMAGE_W,y=PATTERN.top*IMAGE_H,w=(PATTERN.right-PATTERN.left)*IMAGE_W,h=(PATTERN.bottom-PATTERN.top)*IMAGE_H;
 g.lineWidth=8;g.lineCap='round';g.setLineDash([18,10]);
 for(const [id,color] of STITCHES)for(const {points} of SHAPES[id]){
  g.strokeStyle=color;g.beginPath();points.forEach(([u,v],i)=>g[i?'lineTo':'moveTo'](x+u*w,y+v*h));if(id==='oval')g.closePath();g.stroke();
 }
 return canvas;
}

export async function createQuiltBoard(host,{knobs=QUILT}={}){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 // Transparent canvas; BACKGROUND goes on #portalHome (board.background) so the neon glass shows only through a cut.
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0x000000,0);
 const canvas=renderer.domElement;canvas.className='portal-board-canvas';canvas.setAttribute('aria-hidden','true');canvas.style.cssText='display:block;width:100%;height:100%';host.append(canvas);
 let texture;
 try{texture=await new THREE.TextureLoader().loadAsync(IMAGE);}
 catch{texture=new THREE.CanvasTexture(plainQuilt());}
 texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
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

 let width=1,height=1,quilt={left:0,top:0,width:1,height:1},frame=0,disposed=false,paused=false,awakeUntil=0,last=0,frameMs=0;
 // Contain (up to a slight vertical stretch): the whole quilt stays visible so every stitched shape can be traced.
 const fit=(width,height)=>{const w=Math.min(width,height*IMAGE_W/IMAGE_H),h=Math.min(height,w*IMAGE_H/IMAGE_W*knobs.stretch);return {left:(width-w)/2,top:(height-h)/2,width:w,height:h};};
 const pointers=new Map();
 // Untransformed size (the observer's contentRect, else clientWidth): the portal can be re-shown mid-dive, scaled.
 function layout(box={width:host.clientWidth,height:host.clientHeight}){
  width=Math.max(1,box.width);height=Math.max(1,box.height);
  quilt=fit(width,height);const w=quilt.width,h=quilt.height;
  for(const k in quilt)host.style.setProperty('--face-'+k,quilt[k]+'px'); // the portal's metal frame (#111) wraps this box
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
 function wake(){awakeUntil=performance.now()+(reduced?0:knobs.sleepMs);if(!frame&&!disposed&&!paused){last=performance.now();frame=requestAnimationFrame(tick);}}
 function tick(now){
  frame=0;if(disposed||paused)return;
  const dt=Math.min(1/30,Math.max(1/240,(now-last)/1000));last=now;
  if(!document.hidden){const t=performance.now();if(!reduced)step(dt);if(cutting?.fall.live)cutting.fall.pose(now);geometry.attributes.position.needsUpdate=true;geometry.computeVertexNormals();renderer.render(scene,camera);frameMs=frameMs*.9+(performance.now()-t)*.1;}
  if(pointers.size||now<awakeUntil||cutting?.fall.live)frame=requestAnimationFrame(tick);
 }
 const local=(x,y)=>{const box=host.getBoundingClientRect();return [x-box.left,y-box.top];};
 // Hidden (display:none) reads as 0x0: keep the last layout rather than shrink the renderer and reset the cloth, only to
 // rebuild both at full size the moment the quilt shows again.
 const observer=new ResizeObserver(entries=>{const box=entries.at(-1).contentRect;if(box.width&&box.height)layout(box);});observer.observe(host);layout();renderer.render(scene,camera);scene.remove(warm);
 // Measured fresh from the host box (not the last layout), so it's right before the ResizeObserver runs and mid-dive.
 const quiltRect=()=>{const box=host.getBoundingClientRect(),q=fit(box.width,box.height);return {left:box.left+q.left,top:box.top+q.top,width:q.width,height:q.height};};
 // Cut-away: grid triangles whose centroid (in quilt-image fractions, v down) is inside poly leave the
 // index -> a hole; a static copy of their current positions + uvs falls into the board. The cloth
 // keeps simulating everything (constraints on the now-invisible vertices are harmless).
 function cut(poly,color,ms=1100){
  if(reduced)ms=0;
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
  patternRect(){const q=quiltRect();return {left:q.left+q.width*PATTERN.left,top:q.top+q.height*PATTERN.top,width:q.width*(PATTERN.right-PATTERN.left),height:q.height*(PATTERN.bottom-PATTERN.top)};},
  quiltRect,
  press(id,clientX,clientY){if(reduced)return;const [x,y]=local(clientX,clientY),touch=pointers.get(id);if(touch){touch.x=x;touch.y=y;}else pointers.set(id,{x,y,px:x,py:y});wake();},
  release(id){pointers.delete(id);wake();},
  frameMs:()=>frameMs,
  pause(){paused=true;pointers.clear();cancelAnimationFrame(frame);frame=0;},
  resume(){paused=false;wake();},
  dispose(){cutting?.fall.end();pieceMat.dispose();disposed=true;cancelAnimationFrame(frame);observer.disconnect();geometry.dispose();material.dispose();texture.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();},
 };
}

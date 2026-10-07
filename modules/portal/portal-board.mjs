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
import {pieceMaterial,fallPieces,createPortalCutMask} from './portal-cut.mjs';
import {SHAPES,fromFrame} from './portal-shapes.mjs';

const IMAGE='/pod/worlds/quilt.webp',IMAGE_W=1024,IMAGE_H=1666,TRACE_PX=640;
// Stitched pattern (the eight shapes) inside the quilt image, as image fractions.
const PATTERN={left:22/IMAGE_W,top:22/IMAGE_H,right:1002/IMAGE_W,bottom:1575/IMAGE_H};
const PATTERN_RATIO=(1002-22)/(1575-22);
// Ian: heavier, calmer (2026-09-22)
export const QUILT={segX:24,substeps:6,compliance:3e-6,restore:1.0,stretch:1.15,damping:.955,radius:60,depth:40,drag:.7,sleepMs:1500};
const BACKGROUND='#17111e';
// W2-2O: the quilt texture is Starter-pack art. Without it (offline, not downloaded) the board is a plain
// stitched quilt, same layout: cream cloth in its dark binding, the traceable shapes stitched where the art has them.
const STITCHES=[['oval','#c42a3c'],['x','#e0388f'],['up','#2c5cc2'],['down','#2f8a4c'],['cross','#4ea6da']];

// Preserve the complete source image; unused space belongs to the mechanical cap.
export function quiltSurfaceLayout(width,height){
 const w=Math.max(1,width),h=Math.max(1,height),fw=Math.min(w,h*IMAGE_W/IMAGE_H),fh=fw*IMAGE_H/IMAGE_W;
 const face={left:(w-fw)/2,top:h-fh,width:fw,height:fh};
 return {face,pattern:{left:face.left+fw*PATTERN.left,top:face.top+fh*PATTERN.top,width:fw*(PATTERN.right-PATTERN.left),height:fh*(PATTERN.bottom-PATTERN.top)}};
}
export function quiltSourceToSurface(u,v,width,height){
 const {face}=quiltSurfaceLayout(width,height);return [face.left+u*face.width,face.top+v*face.height];
}

// Client coordinates are post-transform; the cloth solver is in the host's untransformed
// CSS-pixel space.  A scaled portal therefore keeps presses underneath the visible finger.
export function clientToBoardLocal(clientX,clientY,clientRect,boardWidth,boardHeight){
 if(!clientRect.width||!clientRect.height)return [0,0];
 return [(clientX-clientRect.left)*boardWidth/clientRect.width,(clientY-clientRect.top)*boardHeight/clientRect.height];
}

function axisWithAnchors(segments,...anchors){
 const values=[0,1,...Array.from({length:segments-1},(_,i)=>(i+1)/segments),...anchors];
 return [...new Set(values.map(v=>Math.round(Math.min(1,Math.max(0,v))*1e8)/1e8))].sort((a,b)=>a-b);
}

function remapMargin(t,start,end,sourceStart,sourceEnd){
 if(t<=start)return start?sourceStart*t/start:sourceStart;
 if(t>=end)return end<1?sourceEnd+(1-sourceEnd)*(t-end)/(1-end):sourceEnd;
 return sourceStart+(sourceEnd-sourceStart)*(t-start)/(end-start);
}
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

// Measured fresh from the host box, so it stays correct before ResizeObserver runs and while the portal is CSS-scaled during a dive.
function quiltRectOf(host){const box=host.getBoundingClientRect(),f=quiltSurfaceLayout(box.width,box.height).face;return {left:box.left+f.left,top:box.top+f.top,width:f.width,height:f.height};}
function patternRectOf(host){const q=quiltRectOf(host);return {left:q.left+q.width*PATTERN.left,top:q.top+q.height*PATTERN.top,width:q.width*(PATTERN.right-PATTERN.left),height:q.height*(PATTERN.bottom-PATTERN.top)};}

// The flat board: one still picture on a plain 2D canvas with a board's face layout, shape frame, cut hole and public
// interface. portal.mjs mounts it first, as the base layer under the 3D board, and shows it whenever 3D isn't drawing
// (no WebGL, a lost context, a stalled or broken download), so the portal is never a blank sheet.
// Quilt (the default) draws its plain stitched quilt at once and its art when that arrives, so it cannot fail. A grimoire
// board passes its poster (src), face width/height (ratio), shape frame ({x0,y0,x1,y1} face fractions) and guide, and
// rejects when the poster doesn't load within waitMs, so the portal can keep the board it already shows.
// trace (R7): the board's own touch effect in 2D (ice cracks, flowers, embers, weld, jelly gash) for when its 3D can't
// draw: a factory for an effect with portal-board-glb's interface, given 2D paint/glow layers over the face (glow adds
// light, as the 3D emissive does). The canvas redraws only while that effect animates.
// ponytail: no cloth ripple, dent or falling piece; the cut just opens a hole.
export async function createQuiltBoard2D(host,{src=IMAGE,ratio=IMAGE_W/IMAGE_H,frame={x0:PATTERN.left,y0:PATTERN.top,x1:PATTERN.right,y1:PATTERN.bottom},background=BACKGROUND,guide=null,fallback=src===IMAGE?plainQuilt:null,waitMs=0,trace=null,tint=null,tintSelected=true,tintTarget='poster',backplateTint='#263943',backplateTintSelected=true}={}){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const art=new Promise((ok,fail)=>{const img=new Image();img.onload=()=>ok(img);img.onerror=()=>fail(new Error('Board art unavailable: '+src));img.src=src;if(waitMs)setTimeout(()=>fail(new Error('Board art timed out: '+src)),waitMs);});
 let image=fallback?.(),width=1,height=1,holes=[],disposed=false,_tint=(typeof tint==='string'&&/^#[0-9A-Fa-f]{6}$/.test(tint))?tint:null,_traceTint=_tint,_traceSelected=!!tintSelected,_backplateTint=(typeof backplateTint==='string'&&/^#[0-9A-Fa-f]{6}$/.test(backplateTint))?backplateTint:'#263943',_backplateSelected=!!backplateTintSelected;
 if(image)art.then(img=>{image=img;draw();},()=>{});else image=await art;
 const canvas=document.createElement('canvas'),g=canvas.getContext('2d'); // no 2D context: a bare face, but the frame, layout and cuts still work
 canvas.className='portal-board-canvas';canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:absolute;inset:0;display:block;width:100%;height:100%';host.append(canvas);
 const faceOf=(w,h)=>{const fw=Math.min(w,h*ratio);return {left:(w-fw)/2,top:h-fw/ratio,width:fw,height:fw/ratio};};
 const rectOf=()=>{const box=host.getBoundingClientRect(),f=faceOf(box.width,box.height);return {left:box.left+f.left,top:box.top+f.top,width:f.width,height:f.height};};
 // The poster and its guides. A board with a trace draws them once per size into `still` and blits that on every trace
 // frame: re-drawing the poster and the blurred guide strokes each frame starved a phone's main thread (and a test's rAF).
 let still=null;
const tintCache=new Map();
 function paintStill(c,face){
  if(_tint){
    const tw=Math.max(1,Math.round(face.width)),th=Math.max(1,Math.round(face.height));
    const metal=!!trace?.metal&&_traceSelected,cogs=tintTarget==='cogs',key=`${image.src}-${tw}x${th}-${_tint}-${metal}-${cogs}-${_backplateTint}-${_backplateSelected}`;
    let off;
    if(tintCache.has(key)){
      off=tintCache.get(key);
    }else{
      const tmp=document.createElement('canvas');
      tmp.width=tw;tmp.height=th;
      const tc=tmp.getContext('2d');
      tc.drawImage(image,0,0,tw,th);
      const imgData=tc.getImageData(0,0,tw,th);
      const data=imgData.data;
      const tintRGB=parseInt(_tint.slice(1),16);
      const tr=(tintRGB>>16)&255, tg=(tintRGB>>8)&255, tb=tintRGB&255;
      for(let i=0;i<data.length;i+=4){
        const a=data[i+3];
        if(a===0)continue;
        const lum=data[i]*.2126+data[i+1]*.7152+data[i+2]*.0722;
        if(cogs){
         const hi=Math.max(data[i],data[i+1],data[i+2]),lo=Math.min(data[i],data[i+1],data[i+2]),chroma=hi-lo,l=lum/255;
         if(chroma<42&&l>.055&&l<.49){ // muted dark panels in the poster stand in for the separate backplate
          const rgb=parseInt(_backplateTint.slice(1),16),k=.28+.78*l;
          data[i]=Math.min(255,((rgb>>16)&255)*k);data[i+1]=Math.min(255,((rgb>>8)&255)*k);data[i+2]=Math.min(255,(rgb&255)*k);
         }else if(chroma>=42){ // colored gear teeth, pipes and lamps share the mechanism tint, including its default
          const l0=lum/255,k=.12+1.35*l0,s=l0>.55?((l0-.55)/.45)**2*.7:0;
          data[i]=Math.min(255,tr*k)*(1-s)+255*s;data[i+1]=Math.min(255,tg*k)*(1-s)+255*s;data[i+2]=Math.min(255,tb*k)*(1-s)+255*s;
         }
         continue;
        }
        if(metal){ // anodized metal (Cogs): deeper shadows, tint through the mids, a white-hot specular top
         const l=lum/255,k=.12+1.35*l,s=l>.55?((l-.55)/.45)**2*.7:0;
         data[i]=Math.min(255,tr*k)*(1-s)+255*s;data[i+1]=Math.min(255,tg*k)*(1-s)+255*s;data[i+2]=Math.min(255,tb*k)*(1-s)+255*s;
         continue;
        }
        data[i]=lum*tr/255;
        data[i+1]=lum*tg/255;
        data[i+2]=lum*tb/255;
      }
      tc.putImageData(imgData,0,0);
      off=tmp;
      tintCache.clear();
tintCache.set(key,tmp);
    }
    c.drawImage(off,face.left,face.top,face.width,face.height);
  } else {
    c.drawImage(image,face.left,face.top,face.width,face.height);
  }
  // A GLB board's guides are carved or painted in 3D, not in its flat poster: draw the same shape paths in its frame.
  if(guide){
   const trace=()=>{for(const [id,polys] of Object.entries(SHAPES)){if(id==='line')continue;for(const {points} of polys){c.beginPath();points.forEach(([u,v],i)=>{const [fu,fv]=fromFrame(u,v,frame);c[i?'lineTo':'moveTo'](face.left+fu*face.width,face.top+fv*face.height);});c.stroke();}}};
   const alpha=Math.max(guide.alpha||0,.42);c.strokeStyle=guide.color||'#fff';c.lineCap=c.lineJoin='round';
   c.shadowColor=c.strokeStyle;c.shadowBlur=8;c.globalAlpha=alpha*.65;c.lineWidth=5;trace();c.shadowBlur=0;c.globalAlpha=alpha;c.lineWidth=2;trace();
  }
 }
 function draw(){
  if(disposed||!g)return;
  const scale=Math.min(devicePixelRatio||1,2),face=faceOf(width,height),W=Math.round(width*scale),H=Math.round(height*scale);
  if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}else{g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,W,H);} // resizing also clears
  if(fx&&(still?.width!==W||still.height!==H||still.image!==image)){still=Object.assign(document.createElement('canvas'),{width:W,height:H,image});const c=still.getContext('2d');c.setTransform(scale,0,0,scale,0,0);paintStill(c,face);}
  g.setTransform(scale,0,0,scale,0,0);g.save();
  if(holes.length){g.beginPath();g.rect(0,0,width,height);for(const poly of holes){poly.forEach(([u,v],i)=>g[i?'lineTo':'moveTo'](face.left+u*face.width,face.top+v*face.height));g.closePath();}g.clip('evenodd');}
  if(fx)g.drawImage(still,0,0,width,height);else paintStill(g,face);
  if(fx){ // paint, a dark silhouette of the glow (so light glow still reads on a pale poster like Ice's), then the glow as light
   const put=c=>g.drawImage(c,face.left,face.top,face.width,face.height);
   g.globalAlpha=1;g.shadowBlur=0;put(fx.paint.canvas);g.filter='brightness(0)';g.globalAlpha=.8;put(fx.glow.canvas);g.filter='none';g.globalAlpha=1;g.globalCompositeOperation='lighter';put(fx.glow.canvas);
  }
  g.restore();
 }
 function layout(box={width:host.clientWidth,height:host.clientHeight}){
  if(!box.width||!box.height)return; // hidden (display:none) reads 0x0: keep the last layout
  width=box.width;height=box.height;
  if(canvas.style.visibility!=='hidden')for(const [k,v] of Object.entries(faceOf(width,height)))host.style.setProperty('--face-'+k,v+'px'); // under a live 3D board, that board owns the frame
  draw();
 }
 // The 2D trace: its layers TRACE_PX wide in face coords (u right, v down) like the 3D board's, redrawn by rAF while it runs.
 let fx=null,raf=0,last=0;const pointers=new Map();
 function tick(now){raf=0;if(disposed||!fx)return;const on=fx.step?.(Math.min(1/30,Math.max(1/240,(now-last)/1000)),now);last=now;draw();if(on||pointers.size)raf=requestAnimationFrame(tick);}
 const wake=()=>{if(!raf&&fx&&!disposed){last=performance.now();raf=requestAnimationFrame(tick);}};
 const observer=new ResizeObserver(entries=>layout(entries.at(-1).contentRect));observer.observe(host);layout();
 if(trace&&g){
  const layer=()=>{const c=document.createElement('canvas');c.width=TRACE_PX;c.height=Math.max(1,Math.round(TRACE_PX/ratio));return {canvas:c,ctx:c.getContext('2d'),texture:{}};};
  const toWorld=(u,v)=>{const f=faceOf(width,height);return [f.left+u*f.width,-(f.top+v*f.height)];};
  const next=trace(),paint=layer(),glow=layer();
  await next.init({paint,glow,face:{w:1,h:1/ratio},toWorld,wake});
  fx=Object.assign(next,{paint,glow});if(_traceTint&&/^#[0-9a-f]{6}$/i.test(_traceTint))fx.setTint?.(_traceTint,_traceSelected);draw(); // the still is ready before the first touch
 }
 return {
  canvas,background,faceRect:rectOf,quiltRect:rectOf,
  patternRect(){const q=rectOf();return {left:q.left+q.width*frame.x0,top:q.top+q.height*frame.y0,width:q.width*(frame.x1-frame.x0),height:q.height*(frame.y1-frame.y0)};},
  cut(poly,color,ms=1100){holes=[poly];draw();return new Promise(done=>setTimeout(done,reduced?0:ms));},
  heal(){if(holes.length){holes=[];draw();}},
  setTint(hex,selected=true){
   if(!/^#[0-9a-f]{6}$/i.test(hex))return;
   _traceTint=hex;_traceSelected=selected;fx?.setTint?.(hex,selected);
   if(tintTarget==='trace')return;
   _tint=hex;
   still=null;
   draw();
  },
  setBackplateTint(hex,selected=true){
   if(!/^#[0-9a-f]{6}$/i.test(hex))return;
   _backplateTint=selected?hex:'#263943';_backplateSelected=selected;
   still=null;draw();
  },
  press(id,x,y){
   if(!fx)return;const r=rectOf(),u=Math.min(1,Math.max(0,(x-r.left)/r.width)),v=Math.min(1,Math.max(0,(y-r.top)/r.height)),p=pointers.get(id);
   if(p){fx.move?.(id,u,v,p.u,p.v);p.u=u;p.v=v;}else{pointers.set(id,{u,v});fx.press?.(id,u,v);}
   wake();
  },
  claims(){return false;},
  release(id){const p=pointers.get(id);if(p){pointers.delete(id);fx.release?.(id,p.u,p.v);wake();}},
  frameMs:()=>0,
  pause(){for(const [id,p] of pointers)fx.release?.(id,p.u,p.v);pointers.clear();cancelAnimationFrame(raf);raf=0;},
  resume(){layout();wake();}, // back on screen (or back from under a 3D board): re-take the frame
  dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();fx?.dispose?.();canvas.remove();},
 };
}

// The WebGL cloth quilt (portal.mjs lays it over the flat quilt once it has drawn).
export async function createQuiltBoardGL(host,{knobs=QUILT}={}){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 // The art first, the renderer after: a stalled download never holds a WebGL context.
 let texture;
 try{texture=await new THREE.TextureLoader().loadAsync(IMAGE);}
 catch{texture=new THREE.CanvasTexture(plainQuilt());}
 // Transparent canvas; BACKGROUND goes on #portalHome (board.background) so the neon glass shows only through a cut.
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0x000000,0);
 const canvas=renderer.domElement;canvas.className='portal-board-canvas';canvas.setAttribute('aria-hidden','true');canvas.style.cssText='display:block;width:100%;height:100%';host.append(canvas);
 let observer,geometry,material,pieceMat,cutMask=null,frame=0,disposed=false; // outside the try: a failed build must also stop its frame loop
 try{ // a failure after the renderer exists must not leave its canvas and context behind
 texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,1,20000);
 scene.add(new THREE.HemisphereLight(0xfff4e6,0x3a2f40,1.1));
 const sun=new THREE.DirectionalLight(0xfff0dc,2.4);sun.position.set(-.7,.55,.45);scene.add(sun);
 material=new THREE.MeshStandardMaterial({map:texture,roughness:.95,metalness:0,side:THREE.DoubleSide});
 const cutSide={value:0},cutMaskUniform={value:null};material.userData.portalCutSideUniform=cutSide;
 material.onBeforeCompile=shader=>{
  shader.uniforms.uPortalCutMask=cutMaskUniform;shader.uniforms.uPortalCutSide=cutSide;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec2 portalCutUv;\nvarying vec2 vPortalCutUv;')
   .replace('#include <begin_vertex>','#include <begin_vertex>\nvPortalCutUv=portalCutUv;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vPortalCutUv;\nuniform sampler2D uPortalCutMask;\nuniform float uPortalCutSide;')
   .replace('#include <alphatest_fragment>','float portalCutCoverage=1.0;if(abs(uPortalCutSide)>.5){portalCutCoverage=texture2D(uPortalCutMask,vPortalCutUv).r;if(uPortalCutSide>.5&&portalCutCoverage<.5)discard;if(uPortalCutSide<-.5&&portalCutCoverage>=.5)discard;}\n#include <alphatest_fragment>');
 };
 material.customProgramCacheKey=()=> 'portal-quilt-cut-mask-v1';
 const segX=knobs.segX,segY=Math.round(segX*IMAGE_H/IMAGE_W);
 // Source-pattern anchor vertices stay in the topology.  layout() moves them to the
 // current pattern boundary, so resizing or rotation never interpolates across a stitch edge.
 const xAxis=axisWithAnchors(segX,PATTERN.left,PATTERN.right),yAxis=axisWithAnchors(segY,PATTERN.top,PATTERN.bottom),cols=xAxis.length,rows=yAxis.length,count=cols*rows;
 const pos=new Float32Array(count*3),prev=new Float32Array(count*3),rest=new Float32Array(count*3),invMass=new Float32Array(count),uv=new Float32Array(count*2),index=[];
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const n=j*cols+i;invMass[n]=i===0||j===0||i===cols-1||j===rows-1?0:1;}
 for(let j=0;j<rows-1;j++)for(let i=0;i<cols-1;i++){const a=j*cols+i,b=a+1,c=a+cols,d=c+1;index.push(a,c,b,b,c,d);}
 // Stretch constraints along every triangle edge; bending between the two far corners of each triangle pair.
 const edges=new Map();
 for(let t=0;t<index.length;t+=3)for(let k=0;k<3;k++){const a=index[t+k],b=index[t+(k+1)%3],o=index[t+(k+2)%3],key=Math.min(a,b)*count+Math.max(a,b);(edges.get(key)||edges.set(key,{a,b,far:[]}).get(key)).far.push(o);}
 const stretch=[],bend=[];for(const e of edges.values()){stretch.push(e.a,e.b);if(e.far.length===2)bend.push(e.far[0],e.far[1]);}
 const stretchIds=new Int32Array(stretch),bendIds=new Int32Array(bend),stretchLen=new Float32Array(stretch.length/2),bendLen=new Float32Array(bend.length/2);
 const cutUv=new Float32Array(count*2);
 geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(pos,3));geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));geometry.setAttribute('portalCutUv',new THREE.BufferAttribute(cutUv,2));geometry.setIndex(index);
 const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;scene.add(mesh);
 // Transparent twin for cut pieces, drawn once at load (opacity 0 over the quilt: invisible) so the first cut doesn't hitch on a compile.
 pieceMat=pieceMaterial(material);const pieceSide={value:0},sourceCompile=pieceMat.onBeforeCompile;pieceMat.userData.portalCutSideUniform=pieceSide;pieceMat.onBeforeCompile=function(shader,renderer){sourceCompile.call(this,shader,renderer);shader.uniforms.uPortalCutMask=cutMaskUniform;shader.uniforms.uPortalCutSide=pieceSide;};const warm=new THREE.Mesh(geometry,pieceMat);pieceMat.opacity=0;warm.frustumCulled=false;scene.add(warm);
 const fullIndex=geometry.index;let cutting=null;

 let width=1,height=1,surface=quiltSurfaceLayout(1,1),paused=false,awakeUntil=0,last=0,frameMs=0;
 const pointers=new Map();
 // Untransformed size (the observer's contentRect, else clientWidth): the portal can be re-shown mid-dive, scaled.
 function layout(box={width:host.clientWidth,height:host.clientHeight}){
  width=Math.max(1,box.width);height=Math.max(1,box.height);
  surface=quiltSurfaceLayout(width,height);const {face,pattern}=surface;
  for(const k in face)host.style.setProperty('--face-'+k,face[k]+'px'); // the portal's metal frame (#111) wraps the full cloth
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
   const n=j*cols+i,p=3*n,u=xAxis[i],v=yAxis[j];
   rest[p]=face.left+u*face.width;
   rest[p+1]=-(face.top+v*face.height);rest[p+2]=0;
   uv[2*n]=u;uv[2*n+1]=1-v;cutUv[2*n]=u;cutUv[2*n+1]=v;
  }
  pos.set(rest);prev.set(rest);
  const dist=(ids,k,a=ids[2*k],b=ids[2*k+1])=>Math.hypot(rest[3*a]-rest[3*b],rest[3*a+1]-rest[3*b+1]);
  for(let k=0;k<stretchLen.length;k++)stretchLen[k]=dist(stretchIds,k);for(let k=0;k<bendLen.length;k++)bendLen[k]=dist(bendIds,k);
  renderer.setSize(width,height,false);camera.aspect=width/height;
  // World units are CSS pixels on the z=0 plane: x right, y up (screen y negated).
  camera.position.set(width/2,-height/2,(height/2)/Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));camera.near=camera.position.z/10;camera.far=camera.position.z*10;camera.lookAt(width/2,-height/2,0);camera.updateProjectionMatrix();
  geometry.attributes.position.needsUpdate=true;geometry.attributes.uv.needsUpdate=true;geometry.attributes.portalCutUv.needsUpdate=true;geometry.computeVertexNormals();wake();
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
 const local=(x,y)=>clientToBoardLocal(x,y,host.getBoundingClientRect(),width,height);
 // Hidden (display:none) reads as 0x0: keep the last layout rather than shrink the renderer and reset the cloth, only to
 // rebuild both at full size the moment the quilt shows again.
 observer=new ResizeObserver(entries=>{const box=entries.at(-1).contentRect;if(box.width&&box.height)layout(box);});observer.observe(host);layout();renderer.render(scene,camera);scene.remove(warm);
 const quiltRect=()=>quiltRectOf(host);
 // Both the cloth and its falling snapshot retain boundary triangles. A shared local face-space
 // mask discards complementary pixels, so cut quality does not depend on the cloth grid density.
 function cut(poly,color,ms=1100){
  if(reduced)ms=0;
  heal();
  cutMask=createPortalCutMask(poly);cutMaskUniform.value=cutMask;cutSide.value=-1;pieceSide.value=1;
  const P=pos.slice(),U=uv.slice(),C=cutUv.slice(),pieceGeometry=new THREE.BufferGeometry();
  pieceGeometry.setAttribute('position',new THREE.Float32BufferAttribute(P,3));pieceGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));pieceGeometry.setAttribute('portalCutUv',new THREE.Float32BufferAttribute(C,2));pieceGeometry.setIndex(new THREE.BufferAttribute(fullIndex.array.slice(),1));pieceGeometry.computeVertexNormals();
  let u=0,v=0;for(const point of poly){u+=point[0];v+=point[1];}u/=poly.length;v/=poly.length;
  const cx=surface.face.left+u*surface.face.width,cy=-(surface.face.top+v*surface.face.height),cz=0;
  const piece=new THREE.Mesh(pieceGeometry,pieceMat),pivot=new THREE.Group();piece.frustumCulled=false;piece.position.set(-cx,-cy,-cz);pivot.position.set(cx,cy,cz);pivot.add(piece);scene.add(pivot);
  const pieces=[{pivot,material:pieceMat,drop(){scene.remove(pivot);pieceGeometry.dispose();}}];
  cutting={fall:fallPieces(pieces,height*.35,ms)};wake();
  return cutting.fall.done;
 }
 function heal(){
  if(!cutting)return;
  cutting.fall.end();cutSide.value=0;pieceSide.value=0;cutMaskUniform.value=null;cutMask?.dispose();cutMask=null;cutting=null;
  if(!disposed){geometry.computeVertexNormals();renderer.render(scene,camera);} // healed frame on the canvas now, even while paused
 }
 return {
  canvas,
  background:BACKGROUND,
  faceRect:quiltRect,
  cut,heal,
  // Stitched-shape area in client pixels; the portal normalises traces against it.
  patternRect:()=>patternRectOf(host),
  quiltRect,
  press(id,clientX,clientY){if(reduced)return;const [x,y]=local(clientX,clientY),touch=pointers.get(id);if(touch){touch.x=x;touch.y=y;}else pointers.set(id,{x,y,px:x,py:y});wake();},
  claims(){return false;}, // L4 fills this (quilt fold secret)
  release(id){pointers.delete(id);wake();},
  frameMs:()=>frameMs,
  pause(){paused=true;pointers.clear();cancelAnimationFrame(frame);frame=0;},
  resume(){paused=false;wake();},
  dispose(){cutting?.fall.end();cutMask?.dispose();cutMask=null;pieceMat.dispose();disposed=true;cancelAnimationFrame(frame);observer.disconnect();geometry.dispose();material.dispose();texture.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();},
 };
 }catch(error){disposed=true;cancelAnimationFrame(frame);observer?.disconnect();pieceMat?.dispose();geometry?.dispose();material?.dispose();texture?.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();throw error;}
}

// Generic 3D tablet board for the portal home: loads a decimated GLB board (Tripo -> Blender), fits
// its front face to the host, and lets an effect module paint two canvas textures onto it (finger
// dent + paint/glow layers injected into the GLB's own material via onBeforeCompile). Same public
// interface as createQuiltBoard so portal.mjs can swap boards freely. AGPL-3.0-or-later.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {SHAPES,fromFrame} from './portal-shapes.mjs';

export const GLB={inset:.06,texSize:1024,sleepMs:1500,dent:10,dentRadius:48,margin:.02};

// --- Pure helpers (no THREE dependency) -------------------------------------------------------
const AXIS={x:[1,0,0],y:[0,1,0],z:[0,0,1]};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
// size={x,y,z} bbox dims -> row-major 3x3 rotation [ex,ey,ez] sending the thinnest local axis to
// world Z and the longer of the remaining two to world Y. ex=ey×ez keeps it a proper rotation
// (det +1), never a mirror.
export function orientMatrix(size){
 const axes=['x','y','z'],thin=axes.reduce((a,b)=>size[a]<=size[b]?a:b);
 const others=axes.filter(a=>a!==thin),long=size[others[0]]>=size[others[1]]?others[0]:others[1];
 const ez=AXIS[thin],ey=AXIS[long];
 return [cross(ey,ez),ey,ez];
}
// rect={left,top,width,height} client px -> [u,v] on the face, u right, v down, corners at 0/1.
export function faceUV(rect,clientX,clientY){return [(clientX-rect.left)/rect.width,(clientY-rect.top)/rect.height];}
// Even-odd ray cast: is (u,v) inside the closed polygon poly=[[u,v],...]? A repeated closing point is harmless.
export function pointInPolygon(u,v,poly){
 let inside=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i],[xj,yj]=poly[j];if((yi>v)!==(yj>v)&&u<(xj-xi)*(v-yi)/(yj-yi)+xi)inside=!inside;}
 return inside;
}
// Splits a triangle index by where each triangle's centroid lands: positions is flat xyz, toUv(x,y)->[u,v]
// maps it to face coords; triangles inside poly go to `cut`, the rest to `keep` (both flat index arrays).
export function splitIndexByPolygon(positions,index,toUv,poly){
 const keep=[],cut=[],us=poly.map(p=>p[0]),vs=poly.map(p=>p[1]),u0=Math.min(...us),u1=Math.max(...us),v0=Math.min(...vs),v1=Math.max(...vs);
 for(let t=0;t<index.length;t+=3){
  const a=3*index[t],b=3*index[t+1],c=3*index[t+2],[u,v]=toUv((positions[a]+positions[b]+positions[c])/3,(positions[a+1]+positions[b+1]+positions[c+1])/3);
  (u>=u0&&u<=u1&&v>=v0&&v<=v1&&pointInPolygon(u,v,poly)?cut:keep).push(index[t],index[t+1],index[t+2]);
 }
 return {keep,cut};
}

// --- Cut-away pieces (shared with the quilt board) ----------------------------------------------
const TILT=35*Math.PI/180;
// Transparent twin of a board material for a falling piece. clone() drops the instance-assigned
// onBeforeCompile/customProgramCacheKey, so the paint/glow/rim injection is copied across by hand.
export function pieceMaterial(src){const m=src.clone();m.onBeforeCompile=src.onBeforeCompile;m.customProgramCacheKey=src.customProgramCacheKey;m.transparent=true;return m;}
// Drops pieces [{pivot,material,drop()}] (pivot at the piece centroid): each sinks `fall` along -z into
// the board, tilts about one random in-plane axis up to ~35°, shrinks to .6 and fades out, ease-in over
// ms; then drop() removes it and `done` resolves. Timed by setTimeout, not rAF, so a paused or
// backgrounded board can't stall the portal; the board's tick calls pose(now) while `live`.
export function fallPieces(pieces,fall,ms){
 const a=Math.random()*Math.PI*2,axis=new THREE.Vector3(Math.cos(a),Math.sin(a),0),t0=performance.now(),z0=pieces.map(p=>p.pivot.position.z);
 const f={live:true,pose(now){const t=Math.min(1,(now-t0)/Math.max(1,ms)),e=t*t;pieces.forEach((p,i)=>{p.pivot.position.z=z0[i]-fall*e;p.pivot.quaternion.setFromAxisAngle(axis,TILT*e);p.pivot.scale.setScalar(1-.4*e);p.material.opacity=1-e;});}};
 f.pose(t0);
 f.done=new Promise(resolve=>{f.end=()=>{if(!f.live)return;f.live=false;pieces.forEach(p=>p.drop());resolve();};if(ms>0)setTimeout(f.end,ms);else f.end();});
 return f;
}
// A piece's geometry rides on the door's own vertex buffers; detach them before dispose() or WebGL
// frees buffers the door is still drawing with.
function sharedGeometry(src,index){const g=new THREE.BufferGeometry();for(const k in src.attributes)g.setAttribute(k,src.attributes[k]);g.setIndex(index);return g;}
function disposeShared(g){for(const k in g.attributes)g.deleteAttribute(k);g.dispose();}

// --- Shader injection defaults -----------------------------------------------------------------
const DEFAULT_DISPLACE=`for(int di=0;di<8;di++){if(di>=uTouchCount)break;vec4 t=uTouch[di];vec2 tp=uFaceMin+vec2(t.x,1.0-t.y)*uFaceSize;float dd=distance(position.xy,tp);if(dd<uDentRadius){float f=1.0-dd/uDentRadius;transformed.z-=uDent*f*f*t.z;}}`;

function makeCanvasTex(w,h){
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
 const texture=new THREE.CanvasTexture(canvas);texture.flipY=false;texture.colorSpace=THREE.SRGBColorSpace; // canvas row 0 = board top = vPlanar.y 0; canvas colours are sRGB (sampler returns linear)
 return {canvas,ctx:canvas.getContext('2d'),texture};
}
// The eight traceable shapes, stitched onto the paint layer so every board shows them (skip 'line':
// it shares geometry with 'cross').
// Where the eight shapes sit on the face: the board's own carving when it has one (effect.frame,
// x0/y0/x1/y1 UV fractions — or the older effect.pattern left/top/right/bottom some boards still set),
// else an even inset. Traces are normalised against it (see toFrame/fromFrame in portal-shapes.mjs).
const frameOf=(effect,knobs)=>effect.frame||(effect.pattern&&{x0:effect.pattern.left,y0:effect.pattern.top,x1:effect.pattern.right,y1:effect.pattern.bottom})||{x0:knobs.inset,y0:knobs.inset,x1:1-knobs.inset,y1:1-knobs.inset};
// Each hint is drawn twice — a wide blurred halo, then a thin core — so it glows softly instead of reading as a hard wire.
function drawGuides(paint,texW,texH,knobs,effect){
 if(effect.guide===null)return;
 const g=effect.guide||{color:'#fff',alpha:.5,width:4},scale=knobs.texSize/1024,F=frameOf(effect,knobs);
 const ctx=paint.ctx;ctx.save();ctx.strokeStyle=g.color;ctx.lineCap='round';ctx.lineJoin='round';
 const trace=()=>{for(const [id,polys] of Object.entries(SHAPES)){
  if(id==='line')continue;
  for(const poly of polys){ctx.beginPath();poly.points.forEach(([x,y],i)=>{const [fx,fy]=fromFrame(x,y,F),cx=fx*texW,cy=fy*texH;i?ctx.lineTo(cx,cy):ctx.moveTo(cx,cy);});ctx.stroke();}
 }};
 ctx.filter=`blur(${6*scale}px)`;ctx.globalAlpha=g.alpha*.6;ctx.lineWidth=g.width*2*scale;trace();
 ctx.filter='none';ctx.globalAlpha=g.alpha;ctx.lineWidth=g.width*.5*scale;trace();
 ctx.restore();paint.texture.needsUpdate=true;
}

export async function createGlbBoard(host,{effect,knobs=GLB}={}){
 // Transparent canvas: the solid board colour is #portalHome's background (portal.mjs reads board.background),
 // so the neon glass can sit between the two and show only through a cut.
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0x000000,0);
 const canvas=renderer.domElement;canvas.className='portal-board-canvas';canvas.setAttribute('aria-hidden','true');canvas.style.cssText='display:block;width:100%;height:100%';host.append(canvas);
 try{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,1,20000);
 scene.add(new THREE.HemisphereLight(0xfff4e6,0x3a2f40,1.1));
 const sun=new THREE.DirectionalLight(0xfff0dc,2.4);sun.position.set(-.7,.55,.45);scene.add(sun);

 // Load, orient (thin axis -> +Z, long axis -> +Y), centre, and bake it all into the geometry.
 const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(effect.asset);
 gltf.scene.updateMatrixWorld(true);
 const meshes=[];gltf.scene.traverse(o=>{if(o.isMesh)meshes.push(o);});
 if(!meshes.length)throw new Error('portal-board-glb: no mesh in '+effect.asset);
 const rawGeoms=meshes.map(m=>{const g=m.geometry.clone();g.applyMatrix4(m.matrixWorld);return g;});
 const rawBox=new THREE.Box3();for(const g of rawGeoms){g.computeBoundingBox();rawBox.union(g.boundingBox);}
 const size=rawBox.getSize(new THREE.Vector3());
 const rot=orientMatrix({x:size.x,y:size.y,z:size.z});
 const rotM=new THREE.Matrix4().set(rot[0][0],rot[0][1],rot[0][2],0, rot[1][0],rot[1][1],rot[1][2],0, rot[2][0],rot[2][1],rot[2][2],0, 0,0,0,1);
 if(effect.flip)rotM.premultiply(new THREE.Matrix4().makeRotationY(Math.PI));
 const geoms=rawGeoms.map(g=>{g.applyMatrix4(rotM);return g;});
 const box=new THREE.Box3();for(const g of geoms){g.computeBoundingBox();box.union(g.boundingBox);}
 const center=box.getCenter(new THREE.Vector3());
 for(const g of geoms)g.translate(-center.x,-center.y,-center.z);
 const fw=box.max.x-box.min.x,fh=box.max.y-box.min.y,halfDepth=(box.max.z-box.min.z)/2,faceMin={x:-fw/2,y:-fh/2};

 const group=new THREE.Group();
 const meshObjs=geoms.map((g,i)=>{const mm=new THREE.Mesh(g,meshes[i].material);group.add(mm);return mm;});
 scene.add(group);
 const preservedAspect=true;
 // Several boards have carved or painted shape guides. Keep every slab at its source aspect
 // and extend edge texture into the host margins; stretching the slab moves those guides.
 const edgeFill=[];
 if(preservedAspect&&meshObjs[0].material.map?.image){
  const source=meshObjs[0].material.map.image;
  for(const side of ['top','bottom','left','right']){
   const vertical=side==='left'||side==='right',span=Math.min(96,vertical?source.width:source.height);
   const strip=document.createElement('canvas');strip.width=vertical?span:source.width;strip.height=vertical?source.height:span;
   const cx=strip.getContext('2d');cx.drawImage(source,side==='right'?source.width-span:0,side==='bottom'?source.height-span:0,strip.width,strip.height,0,0,strip.width,strip.height);
   const tex=new THREE.CanvasTexture(strip);tex.colorSpace=THREE.SRGBColorSpace;
   const mat=new THREE.MeshBasicMaterial({map:tex,color:0x777777,side:THREE.DoubleSide});
   const plane=new THREE.Mesh(new THREE.PlaneGeometry(1,1),mat);plane.position.z=-halfDepth-.1;
   group.add(plane);edgeFill.push({plane,side});
  }
 }

 const texW=knobs.texSize,texH=Math.max(1,Math.round(knobs.texSize*fh/fw));
 // rim: the cut edge's neon outline, on its own half-res layer because effects clear `glow` every frame.
 const paint=makeCanvasTex(texW,texH),glow=makeCanvasTex(texW,texH),rim=makeCanvasTex(texW>>1,texH>>1);
 // Guides are drawn after layout and effect.init, which may discover a painted frame.

 const touchArr=Array.from({length:8},()=>new THREE.Vector4(0,0,0,0));
 const uniforms={
  uTime:{value:0},uTouch:{value:touchArr},uTouchCount:{value:0},
  uPaint:{value:paint.texture},uGlow:{value:glow.texture},uRim:{value:rim.texture},uGlowStrength:{value:1.2},
  uFaceMin:{value:new THREE.Vector2(faceMin.x,faceMin.y)},uFaceSize:{value:new THREE.Vector2(fw,fh)},
  uDent:{value:knobs.dent},uDentRadius:{value:knobs.dentRadius},
  ...(effect.uniforms||{}),
 };
 function setupMaterial(mat){
  mat.customProgramCacheKey=()=>effect.id;
  mat.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,uniforms);
   const decl=`varying vec2 vPlanar;\nuniform float uTime;\nuniform vec4 uTouch[8];\nuniform int uTouchCount;\nuniform vec2 uFaceMin;\nuniform vec2 uFaceSize;\nuniform sampler2D uPaint;\nuniform sampler2D uGlow;\nuniform sampler2D uRim;\nuniform float uGlowStrength;\nuniform float uDent;\nuniform float uDentRadius;\n${effect.uniformDecls||''}\n`;
   shader.vertexShader=decl+shader.vertexShader.replace('#include <begin_vertex>',
    `#include <begin_vertex>\nvec2 planar=(position.xy-uFaceMin)/uFaceSize;planar.y=1.0-planar.y;vPlanar=planar;\n${effect.vertexDisplace||DEFAULT_DISPLACE}`);
   shader.fragmentShader=decl+shader.fragmentShader
    .replace('#include <map_fragment>','#include <map_fragment>\nvec4 pnt=texture2D(uPaint,vPlanar);diffuseColor.rgb=mix(diffuseColor.rgb,pnt.rgb,pnt.a);')
    .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\nvec4 glo=texture2D(uGlow,vPlanar),cutRim=texture2D(uRim,vPlanar);totalEmissiveRadiance+=glo.rgb*glo.a*uGlowStrength+cutRim.rgb*cutRim.a*2.0;\n'+(effect.fragment||'')); // optional effect GLSL: runs before lighting, may edit diffuseColor/roughnessFactor/normal (view space)/totalEmissiveRadiance
  };
  mat.needsUpdate=true;
 }

 let width=1,height=1,faceRect={left:0,top:0,width:1,height:1},scaleFit=1,viewFrame=frameOf(effect,knobs);
 function computeFit(){
  width=Math.max(1,host.clientWidth);height=Math.max(1,host.clientHeight);
  // The slab fills the host. Keep shape guides at the model's source aspect in a centered subrect.
  const sx=width/fw,sy=height/fh;scaleFit=Math.min(sx,sy);
  uniforms.uDent.value=knobs.dent/scaleFit;uniforms.uDentRadius.value=knobs.dentRadius/scaleFit;
  if(preservedAspect){
   scaleFit=Math.min(sx,sy);group.scale.setScalar(scaleFit);group.position.set(width/2,-height/2,-scaleFit*halfDepth);
   faceRect={left:(width-fw*scaleFit)/2,top:(height-fh*scaleFit)/2,width:fw*scaleFit,height:fh*scaleFit};
   const gapY=Math.max(0,(height/scaleFit-fh)/2),gapX=Math.max(0,(width/scaleFit-fw)/2);
   for(const {plane,side} of edgeFill){
    const horizontal=side==='top'||side==='bottom';plane.visible=horizontal?gapY>0:gapX>0;
    plane.scale.set(horizontal?width/scaleFit:gapX,horizontal?gapY:fh,1);
    plane.position.set(horizontal?0:(side==='right'?1:-1)*(fw+gapX)/2,horizontal?(side==='top'?1:-1)*(fh+gapY)/2:0,plane.position.z);
   }
  }else{
   group.scale.set(sx,sy,scaleFit);group.position.set(width/2,-height/2,-scaleFit*halfDepth);
   faceRect={left:0,top:0,width,height};
  }
  const F=frameOf(effect,knobs),natural=(fw*(F.x1-F.x0))/(fh*(F.y1-F.y0));
  const pw=Math.min(width,height*natural),ph=Math.min(height,width/natural);
  viewFrame=preservedAspect?F:{x0:(width-pw)/(2*width),y0:(height-ph)/(2*height),x1:(width+pw)/(2*width),y1:(height+ph)/(2*height)};
 }
 computeFit();
 const toWorld=(u,v)=>[faceRect.left+u*faceRect.width,-(faceRect.top+v*faceRect.height)];
 await effect.init?.({THREE,scene,mesh:meshObjs.length===1?meshObjs[0]:group,material:meshObjs[0].material,uniforms,paint,glow,face:{w:fw,h:fh},toWorld,faceZ:0,wake});
 computeFit();drawGuides(paint,texW,texH,knobs,{...effect,frame:viewFrame});
 meshObjs.forEach(m=>setupMaterial(m.material));
 // Transparent twins for cut pieces, drawn once at load (opacity 0, over the door itself: invisible) so
 // the first cut doesn't hitch on a shader compile.
 const pieceMats=new Map(),warm=[];
 meshObjs.forEach(o=>{if(!pieceMats.has(o.material)){const m=pieceMaterial(o.material);m.opacity=0;pieceMats.set(o.material,m);warm.push(new THREE.Mesh(o.geometry,m));}});
 warm.forEach(w=>group.add(w));

 let frame=0,disposed=false,awakeUntil=0,last=0,frameMs=0;const startTime=performance.now();
 const pointers=new Map();
 function layout(){
  computeFit();
  if(effect.guide!==null){paint.ctx.clearRect(0,0,texW,texH);drawGuides(paint,texW,texH,knobs,{...effect,frame:viewFrame});}
  renderer.setSize(width,height,false);camera.aspect=width/height;
  camera.position.set(width/2,-height/2,(height/2)/Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));camera.near=camera.position.z/10;camera.far=camera.position.z*10;camera.lookAt(width/2,-height/2,0);camera.updateProjectionMatrix();
  effect.resize?.({w:fw,h:fh});wake();
 }
 function wake(){awakeUntil=performance.now()+knobs.sleepMs;if(!frame&&!disposed){last=performance.now();frame=requestAnimationFrame(tick);}}
 function fillTouches(now){
  let i=0;for(const p of pointers.values()){if(i>=8)break;touchArr[i].set(p.u,p.v,1,(now-p.t0)/1000);i++;}
  for(;i<8;i++)touchArr[i].set(0,0,0,0);
  uniforms.uTouchCount.value=Math.min(pointers.size,8);
 }
 function tick(now){
  frame=0;if(disposed)return;
  const dt=Math.min(1/30,Math.max(1/240,(now-last)/1000));last=now;
  let animating=false;
  if(!document.hidden){
   const t0=performance.now();
   uniforms.uTime.value=(now-startTime)/1000;fillTouches(now);
   if(effect.step)animating=!!effect.step(dt,now);
   if(cutting?.fall.live){cutting.fall.pose(now);animating=true;}
   renderer.render(scene,camera);
   frameMs=frameMs*.9+(performance.now()-t0)*.1;
  }
  if(pointers.size||now<awakeUntil||animating)frame=requestAnimationFrame(tick);
 }
 function faceRectClient(){const hostBox=host.getBoundingClientRect();return {left:hostBox.left,top:hostBox.top,width:hostBox.width,height:hostBox.height};}
 const observer=new ResizeObserver(layout);observer.observe(host);layout();renderer.render(scene,camera);warm.forEach(w=>group.remove(w));

 // Cut-away: every triangle of the board's own mesh(es) whose centroid is inside polyUv (face coords, v down;
 // planar uv exactly as the shader computes it) moves into a falling piece that shares the mesh's vertex
 // buffers; the mesh keeps the rest, so the board has a real hole. Effect-owned meshes/props are never
 // sliced here: an effect takes part through its optional cut(polyUv,color)/heal() hooks (pointInPolygon is exported for them).
 let cutting=null;
 const toUv=(x,y)=>[(x-faceMin.x)/fw,1-(y-faceMin.y)/fh];
 function drawRim(poly,color){
  const {ctx:c,canvas:{width:w,height:h}}=rim,s=w/512;c.clearRect(0,0,w,h);c.save();c.lineJoin='round';
  c.beginPath();poly.forEach(([u,v],i)=>i?c.lineTo(u*w,v*h):c.moveTo(u*w,v*h));c.closePath();
  c.strokeStyle=color;c.shadowColor=color;c.shadowBlur=14*s;c.lineWidth=7*s;c.stroke();c.shadowBlur=0;c.strokeStyle='#fff';c.lineWidth=2*s;c.stroke();
  c.restore();rim.texture.needsUpdate=true;
 }
 function cut(polyUv,color='#ffffff',ms=1100){
  heal();
  if(preservedAspect)polyUv=polyUv.map(([u,v])=>[(u*width-faceRect.left)/faceRect.width,(v*height-faceRect.top)/faceRect.height]);
  const parts=[],pieces=[];
  for(const mesh of meshObjs){
   const g=mesh.geometry,p=g.attributes.position.array,index=g.index||(g.setIndex([...Array(g.attributes.position.count).keys()]),g.index);
   // ponytail: reads position.array as flat xyz (Blender exports aren't interleaved); de-interleave here if one ever is.
   const {keep,cut:tri}=splitIndexByPolygon(p,index.array,toUv,polyUv);
   if(!tri.length)continue;
   let cx=0,cy=0,cz=0;for(const i of tri){cx+=p[3*i];cy+=p[3*i+1];cz+=p[3*i+2];}cx/=tri.length;cy/=tri.length;cz/=tri.length;
   const pg=sharedGeometry(g,tri),material=pieceMats.get(mesh.material)||pieceMats.set(mesh.material,pieceMaterial(mesh.material)).get(mesh.material);
   const piece=new THREE.Mesh(pg,material),pivot=new THREE.Group();piece.frustumCulled=false;piece.position.set(-cx,-cy,-cz);pivot.position.set(cx,cy,cz);pivot.add(piece);mesh.add(pivot);
   g.setIndex(keep);parts.push({g,index});
   pieces.push({pivot,material,drop(){pivot.removeFromParent();disposeShared(pg);}});
  }
  drawRim(polyUv,color);
  cutting={parts,fall:fallPieces(pieces,Math.max(fw,fh)*.35,ms)};effect.cut?.(polyUv,color);wake();
  return cutting.fall.done;
 }
 function heal(){
  if(!cutting)return;
  cutting.fall.end();for(const {g,index} of cutting.parts)g.setIndex(index);cutting=null;effect.heal?.();
  rim.ctx.clearRect(0,0,rim.canvas.width,rim.canvas.height);rim.texture.needsUpdate=true;
  if(preservedAspect)computeFit();
  if(!disposed)renderer.render(scene,camera); // healed frame on the canvas now, even while paused
 }
 return {
  canvas,
  background:effect.background||'#17111e',
  faceRect:faceRectClient,
  cut,heal,
  patternRect(){const hostBox=host.getBoundingClientRect(),F=viewFrame,sx=hostBox.width/width,sy=hostBox.height/height;if(preservedAspect)return {left:hostBox.left+(faceRect.left+faceRect.width*F.x0)*sx,top:hostBox.top+(faceRect.top+faceRect.height*F.y0)*sy,width:faceRect.width*(F.x1-F.x0)*sx,height:faceRect.height*(F.y1-F.y0)*sy};return {left:hostBox.left+hostBox.width*F.x0,top:hostBox.top+hostBox.height*F.y0,width:hostBox.width*(F.x1-F.x0),height:hostBox.height*(F.y1-F.y0)};},
  press(id,clientX,clientY){
   const client=faceRectClient(),sx=client.width/width,sy=client.height/height,painted=preservedAspect?{left:client.left+faceRect.left*sx,top:client.top+faceRect.top*sy,width:faceRect.width*sx,height:faceRect.height*sy}:client;
   const [u,v]=faceUV(painted,clientX,clientY),cu=Math.min(1,Math.max(0,u)),cv=Math.min(1,Math.max(0,v)),ex=pointers.get(id);
   if(ex){effect.move?.(id,cu,cv,ex.u,ex.v);ex.u=cu;ex.v=cv;}
   else{pointers.set(id,{u:cu,v:cv,t0:performance.now()});effect.press?.(id,cu,cv);}
   wake();
  },
  release(id){const p=pointers.get(id);if(p){effect.release?.(id,p.u,p.v);pointers.delete(id);}wake();},
  frameMs:()=>frameMs,
  ink:effect.ink, // false: the effect draws its own trace trail, portal.mjs skips its glowing ink line
  pause(){pointers.clear();cancelAnimationFrame(frame);frame=0;},
  resume:wake,
  dispose(){
   cutting?.fall.end();disposed=true;cancelAnimationFrame(frame);observer.disconnect();effect.dispose?.();pieceMats.forEach(m=>m.dispose());rim.texture.dispose();
   group.traverse(n=>{n.geometry?.dispose();if(n.material)for(const mat of [n.material].flat()){for(const v of Object.values(mat))if(v?.isTexture)v.dispose();mat.dispose();}});
   paint.texture.dispose();glow.texture.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();
  },
 };
 }catch(error){renderer.dispose();renderer.forceContextLoss();canvas.remove();throw error;}
}

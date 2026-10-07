// grass board effect for portal-board-glb.mjs: a dense instanced blade lawn covers the block (hiding its
// quilted diamonds so the traced-shape guides are the only pattern), blades sway in the wind, part
// around a touch and spring back on release; mixed-colour flower clusters plant along a drag, pop in,
// and fade away 7 s later; cut()/heal() open the lawn over the board's cut-out. JS drives touch/flower
// state; all blade motion is GLSL. Vault secret (Achievement Vault L5): a tiny purple alien cap in one corner, a buried UFO in the
// opposite one; a flower line drawn between them walks the alien to the ship, which cracks the ground open on a metal plate. AGPL-3.0-or-later.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {pointInPolygon} from './portal-board-glb.mjs';

const FLOWER_ASSET='/pod/worlds/boards/flower.glb',FLOWER_CAP=120,PLANT_STEP_PX=36,POP_MS=300,SPRING_LIFE=1.2;
const FADE_MS=7000; // Ian: everything returns to normal after 7 s (2026-09-22)
const FADE_OUT_MS=700,FLOWER_FRAC=.075,CLUSTER_FRAC=.04,FLOWER_TILT=1.2,FLOWER_LIFT=.02;
const BLADES=7000,BLADE_W=.015,BLOCK_EXPOSURE=.75,FIELD_INSET=.025,GUIDE_GLOW='0.6'; // inset keeps edge tufts from overhanging far

// --- Pure helpers (no THREE dependency) -------------------------------------------------------
const clamp01=x=>Math.min(1,Math.max(0,x));
export const popScale=(ageMs,durMs=POP_MS)=>{const t=clamp01(ageMs/durMs);return 1-(1-t)*(1-t);};
// 1 while the flower lives, then eases in to 0 over outMs (shrink + fade), 0 after.
export const fadeLife=(ageMs,liveMs=FADE_MS,outMs=FADE_OUT_MS)=>{const t=clamp01((ageMs-liveMs)/outMs);return 1-t*t;};
export const springActive=(ageS,maxS=SPRING_LIFE)=>ageS>=0&&ageS<maxS;
export const plantStep=(lx,ly,x,y,stepPx=PLANT_STEP_PX)=>Math.hypot(x-lx,y-ly)>=stepPx;
// HSL triples: red, orange, yellow, pink, magenta, violet, white, sky blue.
export const FLOWER_HSL=[[0,.8,.52],[.07,.9,.55],[.14,.95,.56],[.94,.75,.74],[.86,.75,.52],[.76,.6,.6],[0,0,.95],[.56,.75,.66]];
const GREENS=[[.29,.6,.42],[.31,.62,.38],[.33,.55,.34],[.36,.5,.32],[.40,.45,.30]],YELLOW_GREENS=[[.22,.7,.48],[.24,.65,.52]];
const pickHSL=(set,rand,dh,ds,dl)=>{const [h,s,l]=set[Math.min(set.length-1,Math.floor(rand()*set.length))];return [(h+(rand()-.5)*dh+1)%1,clamp01(s+(rand()-.5)*ds),clamp01(l+(rand()-.5)*dl)];};
export const flowerHSL=(rand=Math.random)=>pickHSL(FLOWER_HSL,rand,0,.16,.12);
export const bladeHSL=(rand=Math.random)=>pickHSL(rand()<.06?YELLOW_GREENS:GREENS,rand,.02,.1,.08);
// n uniform random points in a disc of radius maxR.
// Indices of the roots (flat u0,v0,u1,v1,... face coords, v down) inside the closed polygon poly.
export const rootsInside=(uv,poly)=>{const out=[];for(let i=0;i<uv.length;i+=2)if(pointInPolygon(uv[i],uv[i+1],poly))out.push(i/2);return out;};
export const clusterOffsets=(n,maxR,rand=Math.random)=>Array.from({length:n},()=>{const a=rand()*Math.PI*2,r=maxR*Math.sqrt(rand());return [Math.cos(a)*r,Math.sin(a)*r];});

// Block shader: copies DEFAULT_DISPLACE's finger-dent loop (vertexDisplace replaces it), adds a slab
// bend away from the touch, a damped echo per released touch (uSpring ring buffer, filled in release())
// and a faint breeze gated by uBreeze (off under reduced motion). Mostly hidden under the blades now.
const VERTEX_DISPLACE=
`for(int di=0;di<8;di++){if(di>=uTouchCount)break;vec4 t=uTouch[di];vec2 tp=uFaceMin+vec2(t.x,1.0-t.y)*uFaceSize;float dd=distance(position.xy,tp);if(dd<uDentRadius){float f=1.0-dd/uDentRadius;transformed.z-=uDent*f*f*t.z;}}
float tipW=smoothstep(-uHalfDepth,uHalfDepth,position.z);
float bendR=uFaceSize.x*0.22,bendA=uFaceSize.x*0.06;
vec2 bend=vec2(0.0);
for(int bi=0;bi<8;bi++){if(bi>=uTouchCount)break;vec4 t=uTouch[bi];vec2 tp=uFaceMin+vec2(t.x,1.0-t.y)*uFaceSize;vec2 d=position.xy-tp;float dist=length(d);if(dist<bendR&&dist>1e-4){float f=1.0-dist/bendR;bend+=normalize(d)*bendA*f*f;}}
for(int si=0;si<6;si++){vec4 s=uSpring[si];if(s.w<=0.0)continue;float age=uTime-s.z;if(age<0.0||age>1.2)continue;vec2 sp=uFaceMin+vec2(s.x,1.0-s.y)*uFaceSize;vec2 d=position.xy-sp;float dist=length(d);if(dist<bendR&&dist>1e-4){float f=1.0-dist/bendR,wave=exp(-age*4.0)*sin(age*14.0);bend+=normalize(d)*bendA*f*f*wave*s.w;}}
transformed.xy+=bend*tipW;
transformed.xy+=vec2(uBreeze*uFaceSize.x*0.004*sin(uTime*1.3+planar.x*9.0))*tipW;`;

// Blade shader (replaces project_vertex; blade-local y is 0 at the root, 1 at the tip). Works in the
// board group's local space: sway on a travelling wave, bend away from each held touch (eased in over
// 120 ms), a damped cos spring-back from the release pose (the whole blade leans, so the lawn parts; wind moves tips). vPlanar is
// the rest position on the face so the guide paint sits on the lawn like the block's own paint did.
const BLADE_VDECL='varying vec2 vPlanar;\nuniform float uTime;\nuniform vec4 uTouch[8];\nuniform int uTouchCount;\nuniform vec2 uFaceMin;\nuniform vec2 uFaceSize;\nuniform vec4 uSpring[6];\nuniform float uBreeze;\n';
const BLADE_VERTEX=
`vec4 bw=instanceMatrix*vec4(transformed,1.0);
vec2 root=instanceMatrix[3].xy,rp=(bw.xy-uFaceMin)/uFaceSize,pr=(root-uFaceMin)/uFaceSize;vPlanar=vec2(rp.x,1.0-rp.y);
float tw=position.y*position.y,bendR=uFaceSize.x*0.2,bendA=uFaceSize.x*0.1;
vec2 bend=vec2(0.0);
for(int i=0;i<8;i++){if(i>=uTouchCount)break;vec4 t=uTouch[i];vec2 d=root-(uFaceMin+vec2(t.x,1.0-t.y)*uFaceSize);float dist=length(d);if(dist<bendR&&dist>1e-4){float f=1.0-dist/bendR;bend+=d/dist*bendA*f*f*t.z*smoothstep(0.0,0.12,t.w);}}
for(int i=0;i<6;i++){vec4 s=uSpring[i];float age=uTime-s.z;if(s.w<=0.0||age<0.0||age>1.2)continue;vec2 d=root-(uFaceMin+vec2(s.x,1.0-s.y)*uFaceSize);float dist=length(d);if(dist<bendR&&dist>1e-4){float f=1.0-dist/bendR;bend+=d/dist*bendA*f*f*exp(-age*4.0)*cos(age*14.0)*s.w;}}
vec2 wind=vec2(0.9,0.4)*uBreeze*uFaceSize.x*0.006*sin(uTime*1.6+pr.x*9.0+pr.y*5.0);
bw.xy+=bend*position.y+wind*tw;bw.z-=length(bend)*0.5*position.y;
vec4 mvPosition=modelViewMatrix*bw;gl_Position=projectionMatrix*mvPosition;`;

// --- Vault secret: pure reducer (face-width units: x=u, y=v/aspect; state is replaced, never mutated) ---
export const SECRET={speed:1.5,lag:2,gapMs:3000,boardMs:700,flyMs:1400,crackMs:1700,splitMs:1900,shipR:.14,reach:1.5};
const d2=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
export const grassSecretInit=(start,ship,step)=>({phase:'idle',start,ship,step,path:[],len:0,pos:0,drawing:null,wait:0,last:null,t0:0,claimed:false,resets:0,added:0});
export const secretPoint=(path,d)=>{for(let i=1;i<path.length;i++){const l=d2(path[i-1],path[i]);if(d<=l||i===path.length-1){const k=l?Math.min(1,d/l):1,a=path[i-1],b=path[i];return [a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k];}d-=l;}return path[0]||[0,0];};
const NEXT={board:['boardMs','fly'],fly:['flyMs','crack'],crack:['crackMs','split'],split:['splitMs','done']};
// ev: {t:'down'|'move',id,x,y} | {t:'up',id} | {t:'tick'} | {t:'reset'}. A stroke starts within reach of the alien and each point
// must land 1..1.5 steps from the line's tip (a longer jump plants nothing: that is the gap).
export function grassSecret(s,ev,now){
 const C=SECRET,tip=s.path[s.path.length-1],p=[ev.x,ev.y];
 if(ev.t==='down'){
  if(s.phase==='idle'&&d2(p,s.start)<=C.reach*s.step)return grassSecret({...s,phase:'walk',path:[s.start],len:0,pos:0,drawing:ev.id,wait:0,last:now,claimed:false},{...ev,t:'move'},now);
  if(s.phase==='walk'&&s.drawing==null&&d2(p,tip)<=C.reach*s.step)return {...s,drawing:ev.id,wait:0};
  return s;
 }
 if(ev.t==='move'){
  if(s.phase!=='walk'||s.drawing!==ev.id)return s;
  const d=d2(p,tip);if(d<s.step||d>C.reach*s.step)return s;
  return {...s,path:[...s.path,p],len:s.len+d,wait:0,added:s.added+1};
 }
 if(ev.t==='up')return s.drawing===ev.id?{...s,drawing:null}:s;
 if(ev.t==='reset')return {...grassSecretInit(s.start,s.ship,s.step),resets:s.resets+1};
 if(ev.t!=='tick')return s;
 const dt=s.last==null?0:Math.min(.1,Math.max(0,(now-s.last)/1000)),n={...s,last:now};
 if(s.phase==='walk'){
  const near=tip&&d2(tip,s.ship)<=C.shipR,limit=s.drawing!=null&&!near?Math.max(0,s.len-C.lag*s.step):s.len;
  if(n.pos<limit-1e-9){n.pos=Math.min(limit,n.pos+C.speed*dt);n.wait=0;if(n.pos>0)n.claimed=true;}
  else if(near&&s.len>0){n.phase='board';n.t0=now;}
  else{n.wait+=dt*1000;if(n.wait>C.gapMs)return {...grassSecretInit(s.start,s.ship,s.step),last:now,resets:s.resets+1,added:s.added};}
 }else if(NEXT[s.phase]&&now-s.t0>=C[NEXT[s.phase][0]]){n.phase=NEXT[s.phase][1];n.t0=now;}
 return n;
}
// Pointer ids the board must not also treat as a tap/shape: the line stroke once the alien walks, everything after boarding.
export const grassSecretClaims=(s,id)=>s.phase!=='idle'&&(s.phase==='walk'?s.drawing===id&&s.claimed:true);
// Jagged angular bolt a->b (face-width units), endpoints exact, offsets taper to 0 at the ends and alternate sides so it stays simple.
export function crackPath(a,b,rand=Math.random,n=12){
 const dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy),nx=-dy/L,ny=dx/L,out=[a];
 for(let i=1;i<n;i++){const t=(i+(rand()-.5)*.5)/n,o=(i%2?1:-1)*L*(.03+rand()*.045)*Math.sin(Math.PI*t);out.push([a[0]+dx*t+nx*o,a[1]+dy*t+ny*o]);}
 return [...out,b];
}

let S=null; // per-instance state; a single portal board is ever active at once (see portal-board-ice.mjs)

// Tapered, slightly drooping strip: 4 rows x 2 verts = 3 quads; vertex colour darkens toward the root.
function bladeGeometry(T){
 const pos=[],col=[],idx=[];
 [[0,.5],[.35,.42],[.7,.28],[1,.06]].forEach(([y,w],i)=>{const z=-.22*y*y,c=.55+.45*y;pos.push(-w,y,z,w,y,z);col.push(c,c,c,c,c,c);if(i)idx.push(2*i-2,2*i-1,2*i+1,2*i-2,2*i+1,2*i);});
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();
 return g;
}
// One InstancedMesh under the board group (instance matrices in its local space, so it scales with the
// board). rootUV keeps each blade's root in face coords for cut(); rest is the matrix buffer heal() restores.
function makeBlades(T,uniforms,group){
 const fw=uniforms.uFaceSize.value.x,fh=uniforms.uFaceSize.value.y,min=uniforms.uFaceMin.value,z0=uniforms.uHalfDepth.value-fw*.004;
 const cols=Math.round(Math.sqrt(BLADES*fw/fh)),rows=Math.round(BLADES/cols);
 const mat=new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide});
 mat.customProgramCacheKey=()=>'grass-blades';
 mat.onBeforeCompile=sh=>{
  for(const k of ['uTime','uTouch','uTouchCount','uFaceMin','uFaceSize','uSpring','uBreeze','uPaint'])sh.uniforms[k]=uniforms[k];
  sh.vertexShader=BLADE_VDECL+sh.vertexShader.replace('#include <project_vertex>',BLADE_VERTEX);
  sh.fragmentShader='varying vec2 vPlanar;\nuniform sampler2D uPaint;\n'+sh.fragmentShader
   .replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\nnormal=normalize(mix(normal,vec3(0.0,0.0,1.0),0.5));') // half the lawn normal: calmer shading
   .replace('#include <color_fragment>','#include <color_fragment>\nvec4 pnt=texture2D(uPaint,vPlanar);diffuseColor.rgb=mix(diffuseColor.rgb,pnt.rgb,pnt.a);')
   .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=pnt.rgb*pnt.a*'+GUIDE_GLOW+';'); // faint glow so the guides read over the busy blades
 };
 const im=new T.InstancedMesh(bladeGeometry(T),mat,cols*rows),rootUV=new Float32Array(cols*rows*2),o=new T.Object3D(),c=new T.Color();
 im.frustumCulled=false;
 for(let r=0,i=0;r<rows;r++)for(let q=0;q<cols;q++,i++){
  const h=fw*(.04+Math.random()*.03),lean=.6+Math.random()*.62; // 4-7% of face width, 34-70 deg off the normal
  const fx=FIELD_INSET+(q+Math.random())/cols*(1-2*FIELD_INSET),fy=FIELD_INSET+(r+Math.random())/rows*(1-2*FIELD_INSET);
  o.position.set(min.x+fx*fw,min.y+fy*fh,z0);
  o.rotation.set(Math.PI/2-lean,Math.random()-.5,Math.random()*Math.PI*2,'ZXY');
  o.scale.set(fw*BLADE_W*(.8+Math.random()*.45),h,h);
  o.updateMatrix();im.setMatrixAt(i,o.matrix);im.setColorAt(i,c.setHSL(...bladeHSL()));
  rootUV[2*i]=fx;rootUV[2*i+1]=1-fy;
 }
 group.add(im);
 return {im,rootUV,rest:im.instanceMatrix.array.slice(),cutIdx:null};
}

async function init({THREE:T,scene,mesh,material,uniforms,toWorld,faceZ,wake}){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const box=new T.Box3();
 for(const m of mesh.isMesh?[mesh]:mesh.children.filter(c=>c.isMesh)){if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();box.union(m.geometry.boundingBox);}
 uniforms.uHalfDepth.value=box.max.z; // slab is centred by the generic board: front face sits at +max.z
 uniforms.uBreeze.value=reduced?0:1;
 uniforms.uSpring.value.forEach(v=>v.set(0,0,0,0));
 material.color.multiplyScalar(BLOCK_EXPOSURE); // gaps between blades read as shade, not quilting
 const warm=new T.DirectionalLight(0xffe6b0,1.1);warm.position.set(.4,.85,.55);scene.add(warm);
 const [x0,y0]=toWorld(0,0),[x1,y1]=toWorld(1,1),faceW=Math.abs(x1-x0),faceH=Math.abs(y1-y0);
 const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(FLOWER_ASSET);
 const tmpl=gltf.scene,tsize=new T.Box3().setFromObject(tmpl).getSize(new T.Vector3());
 let petal=null;
 tmpl.traverse(n=>{if(!n.isMesh)return;n.material.metalness=0; // Kenney ships metalness 1: black without an env map
  const c=n.material.color;if(n.material.name==='colorRed'||(c.r>.5&&c.g<.3&&c.b<.3))petal=n.material;});
 S={scene,toWorld,faceZ,uniforms,tmpl,petal,lawn:makeBlades(T,uniforms,mesh.isMesh?mesh.parent:mesh),warm,wake,reduced,faceW,aspect:faceW/faceH,
  flowerScale:faceW*FLOWER_FRAC/(Math.max(tsize.x,tsize.z)||1),flowerScaleRatio:FLOWER_FRAC/(Math.max(tsize.x,tsize.z)||1),flowers:[],pool:[],lastPlanted:new Map(),springIdx:0,timer:0,petalTint:null};
 S.ob=buildSecret(T,scene);secReset();
 window.myr5GrassSecret={autoWalk,state:()=>S?.sec,claims:id=>claims(id),freeze};
}
function makeFlower(){
 const obj=S.tmpl.clone(true),mats=[];let petal=null;
 obj.traverse(n=>{if(!n.isMesh)return;const m=n.material.clone();m.transparent=true;if(n.material===S.petal)petal=m;n.material=m;mats.push(m);});
 return {obj,mats,petal,randomColor:new THREE.Color()};
}
function setPetalTint(hex,selected=true){
 if(!S)return;if(selected&&!/^#[0-9a-f]{6}$/i.test(hex||''))return;
 S.petalTint=selected?new THREE.Color(hex):null;
 for(const f of [...S.flowers,...S.pool])f.petal?.color.copy(S.petalTint||f.randomColor);
}
function plant(u,v,hold){
 const [wx,wy]=S.toWorld(u,v);
 const f=(S.flowers.length>=FLOWER_CAP?S.flowers.shift():S.pool.pop())||makeFlower();
 f.randomColor.setHSL(...flowerHSL());f.petal?.color.copy(S.petalTint||f.randomColor);
 f.obj.position.set(wx,wy,S.faceZ+S.faceW*FLOWER_LIFT);f.obj.visible=true;f.u=u;f.v=v;
 f.obj.rotation.set(FLOWER_TILT,Math.random()*Math.PI*2,0); // stand toward the camera, random yaw about the stem
 f.hold=!!hold;f.sizeFactor=.8+Math.random()*.5;f.target=S.flowerScale*f.sizeFactor;f.born=performance.now();
 f.obj.scale.setScalar(S.reduced?f.target:1e-4);
 for(const m of f.mats)m.opacity=1;
 S.scene.add(f.obj);S.flowers.push(f);
}
function plantCluster(u,v,n,hold){for(const [du,dv] of clusterOffsets(n,CLUSTER_FRAC))plant(clamp01(u+du),clamp01(v+dv*S.aspect),hold);}
// Vault secret: a stroke the reducer owns plants only the flowers that extend its line (so planted line === walkable line).
const pt=(u,v)=>({x:u,y:v/S.aspect});
function press(id,u,v){
 if(S.sec.phase==='done')secReset(); // the board was healed/resumed after the door showed: start over
 secEv({t:'down',id,...pt(u,v)});
 plantCluster(u,v,3,S.sec.drawing===id);S.lastPlanted.set(id,[u,v]);
}
function claims(id){return !!S&&grassSecretClaims(S.sec,id);}
function move(id,u,v){
 if(S.sec.drawing===id){const n=S.sec.added;secEv({t:'move',id,...pt(u,v)});if(S.sec.added!==n)plantCluster(u,v,2+(Math.random()<.5),true);return;}
 if(S.sec.phase!=='idle'&&S.sec.phase!=='walk')return;
 const cur=S.toWorld(u,v),last=S.lastPlanted.get(id);
 if(!last){S.lastPlanted.set(id,[u,v]);return;}
 const old=S.toWorld(last[0],last[1]);
 if(plantStep(old[0],old[1],cur[0],cur[1])){plantCluster(u,v,2+(Math.random()<.5));S.lastPlanted.set(id,[u,v]);}
}
function resize(){
 if(!S)return;
 const [x0,y0]=S.toWorld(0,0),[x1,y1]=S.toWorld(1,1);S.faceW=Math.abs(x1-x0);S.aspect=S.faceW/Math.max(1,Math.abs(y1-y0));S.flowerScale=S.faceW*S.flowerScaleRatio;if(S.sec.phase==='idle')secReset();
 const now=performance.now();
 for(const f of S.flowers){
  const [x,y]=S.toWorld(f.u,f.v),age=now-f.born,k=fadeLife(age),pop=S.reduced?1:popScale(age);
  f.obj.position.set(x,y,S.faceZ+S.faceW*FLOWER_LIFT);f.target=S.flowerScale*f.sizeFactor;f.obj.scale.setScalar(f.target*pop*k);
 }
}
function release(id,u,v){
 secEv({t:'up',id});S.lastPlanted.delete(id);
 const slot=S.uniforms.uSpring.value[S.springIdx];
 slot.set(u,v,S.uniforms.uTime.value,1);
 S.springIdx=(S.springIdx+1)%S.uniforms.uSpring.value.length;
}
function step(dt,now){
 let animating=secStep(dt,now);
 for(let i=S.flowers.length-1;i>=0;i--){
  const f=S.flowers[i],age=now-f.born,k=fadeLife(age);
  if(k<=0||(S.reduced&&k<1)){S.scene.remove(f.obj);S.pool.push(f);S.flowers.splice(i,1);continue;}
  const pop=S.reduced?1:popScale(age);
  if(pop<1||k<1)animating=true;
  f.obj.scale.setScalar(f.target*pop*k);
  for(const m of f.mats)m.opacity=k;
 }
 const t=S.uniforms.uTime.value;
 for(const v of S.uniforms.uSpring.value){
  if(v.w<=0)continue;
  if(springActive(t-v.z))animating=true;else v.set(0,0,0,0);
 }
 // Flowers still waiting to fade: sleep, but wake when the oldest one's fade starts.
 clearTimeout(S.timer);
 if(!animating&&S.flowers.length)S.timer=setTimeout(S.wake,Math.max(0,S.flowers[0].born+FADE_MS-now));
 return animating;
}
// Board hooks: after the board cuts polyUv (face coords, v down) out of the block, collapse every blade
// rooted inside it (zero the instance's 3x3, so its triangles are zero-area) and hide flowers inside it,
// so the hole's edge follows the shape; heal() restores the saved matrices and shows the flowers.
function cut(polyUv){
 if(!S)return;
 heal();
 const {im,rootUV}=S.lawn,m=im.instanceMatrix.array,idx=rootsInside(rootUV,polyUv);
 for(const i of idx)for(const k of [0,1,2,4,5,6,8,9,10])m[16*i+k]=0;
 im.instanceMatrix.needsUpdate=true;S.lawn.cutIdx=idx;
 for(const f of S.flowers)if(pointInPolygon(f.u,f.v,polyUv))f.obj.visible=false;
}
function heal(){
 if(!S)return;if(S.sec.phase!=='idle')secReset();
 if(!S.lawn.cutIdx)return;
 const {im,rest,cutIdx}=S.lawn,m=im.instanceMatrix.array;
 for(const i of cutIdx)m.set(rest.subarray(16*i,16*i+16),16*i);
 im.instanceMatrix.needsUpdate=true;S.lawn.cutIdx=null;
 for(const f of S.flowers)f.obj.visible=true;
}
function dispose(){
 clearTimeout(S.timer);
 for(const f of [...S.flowers,...S.pool]){S.scene.remove(f.obj);for(const m of f.mats)m.dispose();}
 S.tmpl.traverse(n=>{n.geometry?.dispose();if(n.material)for(const m of [n.material].flat())m.dispose();});
 const {im}=S.lawn;im.removeFromParent();im.geometry.dispose();im.material.dispose();im.dispose();
 S.scene.remove(S.warm);
 if(S.fx)secDropFx();for(const o of [S.ob.shade,S.ob.alien,S.ob.tuft,S.ob.ufo])S.scene.remove(o);for(const d of S.ob.dis)d.dispose();delete window.myr5GrassSecret;
 S=null;
}

// --- Vault secret: THREE visuals (all primitives; unit = face width, so every object is scaled by S.faceW) ---
const SEC_START=[.1,.085],SEC_SHIP=[.9,.915]; // face (u,v) corners: alien top-left, ship bottom-right
const ease=t=>{t=clamp01(t);return t*t*(3-2*t);};
function secGeom(){const W=S.faceW,hw=1/S.aspect;return {W,hw,start:[SEC_START[0],SEC_START[1]*hw],ship:[SEC_SHIP[0],SEC_SHIP[1]*hw]};}
function secReset(){const g=secGeom();if(S.fx)secDropFx();for(const f of S.flowers)f.obj.visible=true;S.sec=grassSecretInit(g.start,g.ship,PLANT_STEP_PX/g.W);S.emerge=0;S.fired=false;S.vis=null;S.seen=0;S.apos=g.start;}
function secEv(ev){const before=S.sec;S.sec=grassSecret(S.sec,ev,performance.now());return S.sec!==before;}
function buildSecret(T,scene){
 const dis=[],mat=m=>(dis.push(m),m),geo=g=>(dis.push(g),g),radial=col=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),r=g.createRadialGradient(32,32,2,32,32,32);r.addColorStop(0,col);r.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=r;g.fillRect(0,0,64,64);const t=new T.CanvasTexture(c);dis.push(t);return t;};
 const lam=(color,extra)=>mat(new T.MeshLambertMaterial({color,...extra})),blob=(r,sx,sy,m)=>{const o=new T.Mesh(geo(new T.SphereGeometry(r,16,10)),m);o.scale.set(sx,sy,1);return o;};
 const disc=(r,col,op)=>new T.Mesh(geo(new T.PlaneGeometry(r*2,r*2)),mat(new T.MeshBasicMaterial({map:radial(col),transparent:true,opacity:op,depthWrite:false})));
 // alien: the top of a MYR5 alien's head, a purple cone (MOM purple #7a2fc4) with a pale nub, half hidden by a grass tuft until it walks
 const coneG=geo(new T.ConeGeometry(.03,.075,20));coneG.translate(0,.0375,0);
 const cone=new T.Mesh(coneG,lam(0x7a2fc4,{emissive:0x2a0d4a})),nub=new T.Mesh(geo(new T.SphereGeometry(.006,10,8)),mat(new T.MeshBasicMaterial({color:0xc9a0ff})));nub.position.y=.076;
 const alien=new T.Group();alien.add(cone,nub);
 const tuft=new T.Group(),shade=disc(.085,'rgba(0,0,0,.9)',.7);tuft.add(blob(.034,1.1,.4,lam(0x2f7a24,{emissive:0x0c2a08})));
 // ufo: squashed sphere + glass dome + gold ring, tilted sideways, its lower side buried in a dirt mound
 const ufoTilt=new T.Group(),saucer=blob(.07,1,.32,lam(0xc4ccd6,{emissive:0x3a424c})),ring=new T.Mesh(geo(new T.TorusGeometry(.07,.005,6,28)),lam(0xffd36e,{emissive:0x6a4a10})),dome=new T.Mesh(geo(new T.SphereGeometry(.034,16,10,0,Math.PI*2,0,Math.PI/2)),lam(0xbfe6ff,{emissive:0x2a5a7a,transparent:true,opacity:.8}));
 ring.rotation.x=Math.PI/2;dome.position.y=.008;ufoTilt.add(saucer,ring,dome);ufoTilt.rotation.z=-.9;
 const mound=blob(.045,1.2,.4,lam(0x6b4526)),dirt=disc(.12,'rgba(70,44,24,1)',.85);mound.position.set(-.03,.048,.02);
 const ufo=new T.Group();ufo.add(dirt,ufoTilt,mound);
 for(const o of [shade,alien,tuft,ufo])scene.add(o);
 return {alien,tuft,shade,ufo,ufoTilt,dis};
}
// ground crack + split: lazily built when the ship has gone. Both halves are a turf-green sheet laid over the lawn (shared jagged bolt edge),
// they slide apart across the face and reveal a dark riveted metal plate (stands in for the vault door poster).
function buildCrack(){
 const T=THREE,{W,hw,start,ship}=secGeom(),main=crackPath(ship,start),edge=[[1,hw],...main,[0,0]],clampP=p=>[Math.min(1,Math.max(0,p[0])),Math.min(hw,Math.max(0,p[1]))];
 const polyA=[...edge,[1,0]],polyB=[...edge,[0,hw]],cw=384,ch=Math.round(cw*hw),dis=[];
 const cvs=()=>{const c=document.createElement('canvas');c.width=cw;c.height=ch;return c;},path=(g,pts)=>{g.beginPath();pts.forEach(([x,y],i)=>g[i?'lineTo':'moveTo'](x*cw,y*cw));};
 const tex=c=>{const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;dis.push(t);return t;};
 const turf=poly=>{const c=cvs(),g=c.getContext('2d');g.save();path(g,poly);g.closePath();g.clip();g.fillStyle='#1b4318';g.fillRect(0,0,cw,ch);g.lineWidth=2;
  for(let i=0;i<2200;i++){const [h,s,l]=bladeHSL(),x=Math.random()*cw,y=Math.random()*ch,a=-Math.PI/2+(Math.random()-.5)*1.6;g.strokeStyle=`hsl(${h*360} ${s*100}% ${l*100}%)`;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*10,y+Math.sin(a)*10);g.stroke();}
  g.lineJoin='miter';path(g,edge);g.strokeStyle='#2e1b0e';g.lineWidth=cw*.045;g.stroke();g.strokeStyle='#6b4a2a';g.lineWidth=cw*.016;g.stroke();g.restore();return tex(c);};
 const plate=(()=>{const c=cvs(),g=c.getContext('2d'),gr=g.createLinearGradient(0,0,cw,ch);gr.addColorStop(0,'#1d2026');gr.addColorStop(.5,'#2b2f38');gr.addColorStop(1,'#16181d');g.fillStyle=gr;g.fillRect(0,0,cw,ch); // dark gunmetal
  g.strokeStyle='rgba(255,255,255,.04)';for(let y=0;y<ch;y+=3){g.beginPath();g.moveTo(0,y);g.lineTo(cw,y);g.stroke();}
  const glow=g.createRadialGradient(cw/2,ch/2,cw*.05,cw/2,ch/2,cw*.75);glow.addColorStop(0,'rgba(150,70,240,.55)');glow.addColorStop(1,'rgba(122,47,196,0)');g.fillStyle=glow;g.fillRect(0,0,cw,ch); // purple glow
  g.strokeStyle='#0d0e11';g.lineWidth=7;g.strokeRect(cw*.08,ch*.1,cw*.84,ch*.8);g.strokeStyle='#ffd36e';g.lineWidth=3;g.strokeRect(cw*.08+5,ch*.1+5,cw*.84-10,ch*.8-10); // gold trim
  g.fillStyle='#ffd36e';for(const [x,y] of [[.14,.14],[.86,.14],[.14,.86],[.86,.86]]){g.beginPath();g.arc(x*cw,y*ch,5,0,7);g.fill();}
  g.shadowColor='#b06cff';g.shadowBlur=18;g.strokeStyle='#ffd36e';g.lineWidth=4;g.beginPath();g.arc(cw/2,ch/2,cw*.18,0,7);g.stroke();return tex(c);})();
 const shape=(poly,t)=>{const sh=new T.Shape();poly.forEach(([x,y],i)=>sh[i?'lineTo':'moveTo'](x-.5,hw/2-y));const g=new T.ShapeGeometry(sh),p=g.attributes.position,uv=g.attributes.uv;dis.push(g);
  for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)+.5,1-(hw/2-p.getY(i))/hw);
  const m=new T.MeshBasicMaterial({map:t,transparent:true,opacity:0});dis.push(m);const o=new T.Mesh(g,m);o.scale.setScalar(W);return o;};
 const A=shape(polyA,turf(polyA)),B=shape(polyB,turf(polyB)),P=new T.Mesh(new T.PlaneGeometry(1,hw),new T.MeshBasicMaterial({map:plate}));dis.push(P.geometry,P.material);P.scale.setScalar(W);P.visible=false;
 const gc=cvs(),glow=new T.CanvasTexture(gc),G=new T.Mesh(new T.PlaneGeometry(1,hw),new T.MeshBasicMaterial({map:glow,transparent:true,depthWrite:false}));dis.push(glow,G.geometry,G.material);G.scale.setScalar(W);
 const branches=[2,5,8].map(i=>{const a=main[i],d=i%2?1:-1;return [a,clampP([a[0]+.06*d,a[1]+.05]),clampP([a[0]+.1*d,a[1]+.045*d+.09]),clampP([a[0]+.13*d,a[1]+.14])];});
 const cx=S.toWorld(.5,.5),ctr=(o,z)=>o.position.set(cx[0],cx[1],S.faceZ+W*z);
 ctr(A,.06);ctr(B,.06);ctr(P,.05);ctr(G,.08);for(const o of [A,B,P,G])S.scene.add(o);
 const mean=p=>p.reduce((a,q)=>[a[0]+q[0]/p.length,a[1]+q[1]/p.length],[0,0]),ca=mean(polyA),cb=mean(polyB),dx=ca[0]-cb[0],dy=-(ca[1]-cb[1]),dl=Math.hypot(dx,dy)||1;
 S.fx={A,B,P,G,main,branches,gc,glow,cw,ch,cx,dir:[dx/dl,dy/dl],dis,drawn:-1};
}
function drawCrack(prog){
 const F=S.fx;if(F.drawn===prog)return;F.drawn=prog;const g=F.gc.getContext('2d'),{cw,ch}=F;g.clearRect(0,0,cw,ch);if(prog<=0){F.glow.needsUpdate=true;return;}
 const seg=(pts,k)=>{g.beginPath();let tot=0;for(let i=1;i<pts.length;i++)tot+=d2(pts[i-1],pts[i]);let rem=tot*k;g.moveTo(pts[0][0]*cw,pts[0][1]*cw);for(let i=1;i<pts.length&&rem>0;i++){const l=d2(pts[i-1],pts[i]),f=Math.min(1,rem/l);g.lineTo((pts[i-1][0]+(pts[i][0]-pts[i-1][0])*f)*cw,(pts[i-1][1]+(pts[i][1]-pts[i-1][1])*f)*cw);rem-=l;}g.stroke();};
 g.lineJoin='miter';g.lineCap='round';g.miterLimit=3;
 for(const [w,col,blur] of [[cw*.03,'#2a1206',0],[cw*.016,'#ff8a1f',cw*.04],[cw*.006,'#fff3c2',0]]){g.lineWidth=w;g.strokeStyle=col;g.shadowColor='#ff9a2a';g.shadowBlur=blur;seg(F.main,prog);if(prog>.35)for(const b of F.branches)seg(b,Math.min(1,(prog-.35)/.5));}
 F.glow.needsUpdate=true;
}
function secDropFx(){const F=S.fx;S.fx=null;for(const o of [F.A,F.B,F.P,F.G])S.scene.remove(o);for(const d of F.dis)d.dispose();}
// per-frame: tick the reducer, then pose everything from it. Returns true while anything is moving.
function secStep(dt,now){
 if(S.sec.phase==='done'&&S.fired&&!S.vis)return false;
 if(S.freezeT==null)S.sec=grassSecret(S.sec,{t:'tick'},now);const sec=S.sec,ph=sec.phase,W=S.faceW,wp=(x,y)=>S.toWorld(x,y*S.aspect),set=(o,[x,y],z,sc=1)=>{const [px,py]=wp(x,y);o.position.set(px,py,S.faceZ+W*z);o.scale.setScalar(W*sc);},t=S.freezeT??now-sec.t0;
 if(sec.resets!==S.seen){S.seen=sec.resets;S.vis={t0:now,from:S.apos};}
 S.emerge=ph==='walk'?Math.min(1,S.emerge+dt*3):ph==='idle'?0:S.emerge;
 let ap=ph==='walk'?secretPoint(sec.path,sec.pos):sec.start,asc=1;
 if(ph==='board'){const k=ease(t/SECRET.boardMs),e=secretPoint(sec.path,sec.len);ap=[e[0]+(sec.ship[0]-e[0])*k,e[1]+(sec.ship[1]-e[1])*k];asc=1-k;}
 let vis=false;
 if(S.vis){const k=(now-S.vis.t0)/350;vis=k<2.4;if(k<1){ap=S.vis.from||ap;asc=1-ease(k);}else asc=ease((k-1)/1.4);if(!vis)S.vis=null;}
 S.apos=ap;const bob=ph==='walk'?Math.abs(Math.sin(now*.012))*.01:0,{alien,tuft,shade,ufo,ufoTilt}=S.ob,em=S.emerge;
 alien.visible=ph==='idle'||ph==='walk'||ph==='board'||vis;alien.rotation.z=ph==='walk'?Math.sin(now*.012)*.14:0;set(alien,[ap[0],ap[1]+(1-em)*.02-bob],.016,asc);
 tuft.visible=alien.visible&&em<1;set(tuft,[sec.start[0],sec.start[1]+.005],.03,1-em);shade.visible=ph==='idle'||ph==='walk'||vis;set(shade,sec.start,.006);
 let up=sec.ship,usc=1,tilt=-.9,fk=0;const spent=ph==='crack'||ph==='split'||ph==='done';
 if(ph==='fly'){fk=ease(t/SECRET.flyMs);up=[sec.ship[0]+fk*fk*.9,sec.ship[1]-fk*fk*1.6];usc=1-.8*fk;tilt=-.9*(1-Math.min(1,fk*3));}
 ufo.visible=!spent;ufoTilt.rotation.z=tilt;set(ufo,up,.016+fk*.3,usc);
 let anim=ph==='walk'||ph==='board'||ph==='fly'||vis;
 if(spent){
  if(!S.fx)buildCrack();for(const f of S.flowers)f.obj.visible=false; // the lawn sheet covers them
 const F=S.fx,k=ph==='crack'?t/SECRET.crackMs:1,sk=ph==='split'?t/SECRET.splitMs:ph==='done'?1:0,sp=ease(sk);
  drawCrack(Math.round(ease(Math.min(1,k*1.15))*40)/40);F.G.material.opacity=1-clamp01(sk*3);F.G.visible=sk<.34;F.P.visible=sk>0;
  for(const [o,sg] of [[F.A,1],[F.B,-1]]){o.material.opacity=ph==='crack'?clamp01(t/450):1-clamp01((sk-.62)/.38);o.visible=ph!=='done';o.position.set(F.cx[0]+F.dir[0]*sg*sp*W*.7,F.cx[1]+F.dir[1]*sg*sp*W*.7,S.faceZ+W*.06);o.rotation.z=sg*sp*.07;}
  anim=ph!=='done';
  if(ph==='done'&&!S.fired){S.fired=true;window.dispatchEvent(new CustomEvent('myr5:portal-secret',{detail:{board:'grass'}}));}
 }
 // line flowers never fade while a walk is live: pin them at full pop age
 if(ph!=='idle')for(const f of S.flowers)if(f.hold&&now-f.born>FADE_MS-1500)f.born=now-POP_MS-1;
 return anim;
}
// debug hook (screenshots): hold the ship/crack sequence at phase `ph`, fraction k of its duration; freeze(null) resumes from idle.
function freeze(ph,k=0){
 if(!ph){S.freezeT=null;secReset();return;}
 if(S.fx)secDropFx();for(const f of S.flowers)f.obj.visible=true;
 const g=secGeom(),e=g.start,d=SECRET[NEXT[ph]?.[0]]||1;S.freezeT=k*d;S.fired=false;
 S.sec={...grassSecretInit(g.start,g.ship,PLANT_STEP_PX/g.W),phase:ph,path:[e,g.ship],len:d2(e,g.ship)};S.wake();
}
// debug / test hook: draw a flower line from the alien to the ship through the real press/move/release path.
// opts: gapAt (0..1 of the way: lift there), gapMs (stay lifted this long, then draw on; 0 = never resume), rate (steps per second).
async function autoWalk({gapAt=null,gapMs=0,rate=30}={}){
 const g=secGeom(),sleep=ms=>new Promise(r=>setTimeout(r,ms)),id=77,at=k=>[g.start[0]+(g.ship[0]-g.start[0])*k,g.start[1]+(g.ship[1]-g.start[1])*k],uv=([x,y])=>[x,y*S.aspect],n=Math.ceil(d2(g.start,g.ship)/(PLANT_STEP_PX/g.W*1.1));
 let down=false;
 for(let i=0;i<=n;i++){
  const k=i/n,[u,v]=uv(at(k));
  if(gapAt!=null&&k>=gapAt&&down){release(id,u,v);down=false;if(!gapMs)return;await sleep(gapMs);gapAt=null;}
  if(!down){press(id,u,v);down=true;}else move(id,u,v);
  S.wake();await sleep(1000/rate);
 }
 if(down)release(id,...uv(g.ship));
}

// R7: the flowers in 2D, for the flat board: the same clusters along a drag, popping in and fading out after FADE_MS,
// drawn on `paint` as five-petal blooms with a dark rim so they read on the lawn. Own state, no THREE.
export function grassFlowers(){
 let S=null;
 const bloom=(g,f,k)=>{
  const r=f.r*k;if(r<.5)return;
  g.save();g.translate(f.x,f.y);g.rotate(f.rot);g.globalAlpha=k;g.fillStyle=f.col;g.strokeStyle='rgba(20,30,10,.55)';g.lineWidth=r*.12;
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;g.beginPath();g.ellipse(Math.cos(a)*r*.55,Math.sin(a)*r*.55,r*.52,r*.34,a,0,Math.PI*2);g.fill();g.stroke();}
  g.fillStyle='#ffd23a';g.beginPath();g.arc(0,0,r*.27,0,Math.PI*2);g.fill();g.stroke();g.restore();
 };
 const plantOne=(u,v)=>{const [h,s,l]=flowerHSL(),randomColor=`hsl(${h*360} ${s*100}% ${l*100}%)`;S.flowers.push({x:u*S.W,y:v*S.H,r:S.W*FLOWER_FRAC*.5*(.8+Math.random()*.5),rot:Math.random()*Math.PI,randomColor,col:S.petalTint||randomColor,born:performance.now()});if(S.flowers.length>FLOWER_CAP)S.flowers.shift();};
 const cluster=(u,v,n)=>{for(const [du,dv] of clusterOffsets(n,CLUSTER_FRAC))plantOne(clamp01(u+du),clamp01(v+dv*S.aspect));};
 return {
  init({paint,toWorld,wake}){S={paint,toWorld,wake,W:paint.canvas.width,H:paint.canvas.height,aspect:paint.canvas.width/paint.canvas.height,flowers:[],last:new Map(),timer:0,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,petalTint:null};},
  setTint(hex,selected=true){if(selected&&!/^#[0-9a-f]{6}$/i.test(hex||''))return;S.petalTint=selected?hex:null;for(const f of S.flowers)f.col=S.petalTint||f.randomColor;S.wake();},
  press(id,u,v){cluster(u,v,3);S.last.set(id,S.toWorld(u,v));},
  move(id,u,v){const cur=S.toWorld(u,v),last=S.last.get(id);if(!last){S.last.set(id,cur);return;}if(plantStep(last[0],last[1],cur[0],cur[1])){cluster(u,v,2+(Math.random()<.5));S.last.set(id,cur);}},
  release(id){S.last.delete(id);},
  step(dt,now){
   const g=S.paint.ctx,n=S.flowers.length;let animating=false;
   S.flowers=S.flowers.filter(f=>fadeLife(now-f.born)>0);
   g.clearRect(0,0,S.W,S.H);
   for(const f of S.flowers){const age=now-f.born,k=fadeLife(age),pop=S.reduced?1:popScale(age);if(pop<1||k<1)animating=true;bloom(g,f,pop*k);}
   clearTimeout(S.timer);if(!animating&&S.flowers.length)S.timer=setTimeout(S.wake,Math.max(0,S.flowers[0].born+FADE_MS-now));
   return animating||S.flowers.length!==n;
  },
  dispose(){clearTimeout(S?.timer);S=null;},
 };
}
grassFlowers.tintTarget='trace';

export const grass={
 id:'grass',asset:'/pod/worlds/boards/grass.glb',flip:false,background:'#0b150a',
 guide:{color:'#d8ffc0',alpha:.2,width:4},
 uniforms:{uHalfDepth:{value:0},uSpring:{value:Array.from({length:6},()=>new THREE.Vector4(0,0,0,0))},uBreeze:{value:1}},
 uniformDecls:'uniform float uHalfDepth;\nuniform vec4 uSpring[6];\nuniform float uBreeze;\n',
 vertexDisplace:VERTEX_DISPLACE,
  init,press,move,release,claims,resize,step,cut,heal,dispose,setTint:setPetalTint,trace2d:grassFlowers,
};

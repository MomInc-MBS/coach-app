// grass board effect for portal-board-glb.mjs: a dense instanced blade lawn covers the block (hiding its
// quilted diamonds so the traced-shape guides are the only pattern), blades sway in the wind, part
// around a touch and spring back on release; mixed-colour flower clusters plant along a drag, pop in,
// and fade away 7 s later; cut()/heal() open the lawn over the board's cut-out. JS drives touch/flower
// state; all blade motion is GLSL. AGPL-3.0-or-later.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {pointInPolygon} from './portal-board-glb.mjs';

const FLOWER_ASSET='./pod/worlds/boards/flower.glb',FLOWER_CAP=120,PLANT_STEP_PX=36,POP_MS=300,SPRING_LIFE=1.2;
const FADE_MS=7000; // Ian: everything returns to normal after 7 s (2026-09-22)
const FADE_OUT_MS=700,FLOWER_FRAC=.06,CLUSTER_FRAC=.04,FLOWER_TILT=1.2,FLOWER_LIFT=.02;
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
 const gltf=await new GLTFLoader().loadAsync(FLOWER_ASSET);
 const tmpl=gltf.scene,tsize=new T.Box3().setFromObject(tmpl).getSize(new T.Vector3());
 let petal=null;
 tmpl.traverse(n=>{if(!n.isMesh)return;n.material.metalness=0; // Kenney ships metalness 1: black without an env map
  const c=n.material.color;if(n.material.name==='colorRed'||(c.r>.5&&c.g<.3&&c.b<.3))petal=n.material;});
 S={scene,toWorld,faceZ,uniforms,tmpl,petal,lawn:makeBlades(T,uniforms,mesh.isMesh?mesh.parent:mesh),warm,wake,reduced,faceW,aspect:faceW/faceH,
  flowerScale:faceW*FLOWER_FRAC/(Math.max(tsize.x,tsize.z)||1),flowers:[],pool:[],lastPlanted:new Map(),springIdx:0,timer:0};
}
function makeFlower(){
 const obj=S.tmpl.clone(true),mats=[];let petal=null;
 obj.traverse(n=>{if(!n.isMesh)return;const m=n.material.clone();m.transparent=true;if(n.material===S.petal)petal=m;n.material=m;mats.push(m);});
 return {obj,mats,petal};
}
function plant(u,v){
 const [wx,wy]=S.toWorld(u,v);
 const f=(S.flowers.length>=FLOWER_CAP?S.flowers.shift():S.pool.pop())||makeFlower();
 f.petal?.color.setHSL(...flowerHSL());
 f.obj.position.set(wx,wy,S.faceZ+S.faceW*FLOWER_LIFT);f.obj.visible=true;f.u=u;f.v=v;
 f.obj.rotation.set(FLOWER_TILT,Math.random()*Math.PI*2,0); // stand toward the camera, random yaw about the stem
 f.target=S.flowerScale*(.8+Math.random()*.5);f.born=performance.now();
 f.obj.scale.setScalar(S.reduced?f.target:1e-4);
 for(const m of f.mats)m.opacity=1;
 S.scene.add(f.obj);S.flowers.push(f);
}
function plantCluster(u,v,n){for(const [du,dv] of clusterOffsets(n,CLUSTER_FRAC))plant(clamp01(u+du),clamp01(v+dv*S.aspect));}
function press(id,u,v){plantCluster(u,v,3);S.lastPlanted.set(id,S.toWorld(u,v));}
function move(id,u,v){
 const cur=S.toWorld(u,v),last=S.lastPlanted.get(id);
 if(!last){S.lastPlanted.set(id,cur);return;}
 if(plantStep(last[0],last[1],cur[0],cur[1])){plantCluster(u,v,2+(Math.random()<.5));S.lastPlanted.set(id,cur);}
}
function release(id,u,v){
 S.lastPlanted.delete(id);
 const slot=S.uniforms.uSpring.value[S.springIdx];
 slot.set(u,v,S.uniforms.uTime.value,1);
 S.springIdx=(S.springIdx+1)%S.uniforms.uSpring.value.length;
}
function step(dt,now){
 let animating=false;
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
 if(!S?.lawn.cutIdx)return;
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
 S=null;
}

export const grass={
 id:'grass',asset:'./pod/worlds/boards/grass.glb',flip:false,background:'#0b150a',
 guide:{color:'#d8ffc0',alpha:.2,width:4},
 uniforms:{uHalfDepth:{value:0},uSpring:{value:Array.from({length:6},()=>new THREE.Vector4(0,0,0,0))},uBreeze:{value:1}},
 uniformDecls:'uniform float uHalfDepth;\nuniform vec4 uSpring[6];\nuniform float uBreeze;\n',
 vertexDisplace:VERTEX_DISPLACE,
 init,press,move,release,step,cut,heal,dispose,
};

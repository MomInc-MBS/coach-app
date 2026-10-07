// The vault door: Ian's old painted cogs door (door.glb art + kit gear trains, valves, lights, pipes, weld trail) plus the
// mechanical door's pistons, bolts, tubes, pulleys/cables/weights, lamps with halos, dial and real shadows, in MOM purple/gold.
// Nothing here is tied to the eight portal shapes: any touch drives whatever mechanism is near it. Top-middle a MOM logo plate and a
// purple CRT (orange text) show one goal's clue; the dial knob scrolls goals; one full turn of the MOM flywheel swings the door open.
// Renders on demand only (wake/awakeUntil, no free-running RAF); shadows are on only while the loop is awake. AGPL-3.0-or-later.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {orientMatrix} from '../portal/portal-board-glb.mjs';
import {applyTorque,stepTrain,gearsFromLayout,hitGear,nearestPipe,wiggleStep,wiggleKick,valveAngle,lightLevel,heatColor,beadAlpha,stepSpark,KNOBS,pistonExt} from '../portal/portal-board-cogs.mjs';

const BOARD='/pod/worlds/boards/cogs/',DOOR_GLB=BOARD+'door.glb',KIT_GLB=BOARD+'parts-kit.glb',LAYOUT=BOARD+'door-layout.json',LOGO='/pod/mom-inc-engrave.png';
const TAU=Math.PI*2,PURPLE='#7a2fc4',GOLD='#ffd36e',WALL='#171020',CREAM='#f6eddf',ORANGE='#ff9a2b';
// The painted art is 1024x1792; the square door shows rows Y0..Y0+1024 (lower neon "V", the plain gear strip, the bottom hub).
const IMG_H=1792,Y0=700,SLAB=.07,DETENT=Math.PI/6,SWING=100*Math.PI/180,SWING_MS=1300;
const vOf=v=>(v*IMG_H-Y0)/1024; // layout v (full image) -> door v (0 top .. 1 bottom, width units)
// Door-plane layout (u across, v down, both in door widths).
const L={logo:{u:.5,v:.032,w:.44,h:.054},crt:{u:.5,v:.212,w:.72,h:.29,sw:.65,sh:.25},knob:{u:.5,v:.455,r:.062},fly:{u:.5,v:.718,r:.15}};
const LAMPS=[[.1,.47],[.1,.57],[.1,.67],[.9,.47],[.9,.57],[.9,.67]],PISTONS=[[.2,.455,1],[.8,.455,-1]],PULLEYS=[[.09,.11],[.91,.11]],BOLTS=[[.06,.3,1],[.06,.56,1],[.06,.86,1],[.94,.3,-1],[.94,.56,-1],[.94,.86,-1]];

// --- Pure reducers (unit-tested) -----------------------------------------------------------------
export const wrapPi=a=>a-TAU*Math.round(a/TAU);
export const wrapIndex=(i,n)=>n?((i%n)+n)%n:0;
// Dial: feed it the finger's angle round the knob. Returns {st,steps}: every DETENT (30 deg) of travel is one step (+ clockwise on screen).
export function knobStep(st,angle,detent=DETENT){
 if(st.last==null)return {st:{last:angle,acc:0,total:0},steps:0};
 const d=wrapPi(angle-st.last);let acc=st.acc+d;const steps=Math.trunc(acc/detent);acc-=steps*detent;
 return {st:{last:angle,acc,total:st.total+d},steps};
}
// Flywheel: signed accumulated turn, clamped to one full turn each way; progress 0..1, open at 1.
export function flyTurn(st,angle){
 if(st.last==null)return {last:angle,total:st.total||0,progress:Math.min(1,Math.abs(st.total||0)/TAU)};
 const total=Math.max(-TAU,Math.min(TAU,st.total+wrapPi(angle-st.last)));
 return {last:angle,total,progress:Math.abs(total)/TAU};
}
export function wrapText(text,cols){
 const lines=[];let line='';
 for(const w of String(text||'').split(/\s+/).filter(Boolean)){
  if(line&&(line+' '+w).length>cols){lines.push(line);line=w;}else line=line?line+' '+w:w;
 }
 if(line)lines.push(line);return lines;
}
const safe=(f,...a)=>{try{return f?.(...a);}catch{return undefined;}};
// What the CRT shows for goal i: header, wrapped clue, footer ({earned,progress have/need}).
export function crtView(goals,i,state,cols=24){
 const n=goals.length;if(!n)return {head:'NO SIGNAL',lines:[],foot:'',earned:false};
 const g=goals[wrapIndex(i,n)],earned=!!(state?.earned?.[g.id]||safe(g.test,state));
 const p=safe(g.progress,state),have=p&&typeof p==='object'?p.have:null,need=p&&typeof p==='object'?p.need:null;
 const foot=earned?'✓ '+(g.title||g.id):have!=null&&need?have+' / '+need:typeof p==='number'?Math.round(Math.min(1,p)*100)+'%':'';
 return {head:'GOAL '+String(wrapIndex(i,n)+1).padStart(2,'0')+'/'+String(n).padStart(2,'0')+' · '+String(g.tier||'').toUpperCase(),lines:wrapText(g.clue,cols).slice(0,4),foot,earned,id:g.id};
}

// --- Textures --------------------------------------------------------------------------------------
const ctxOf=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c.getContext('2d');};
const tex=(c,srgb=true)=>{const t=new THREE.CanvasTexture(c.canvas||c);if(srgb)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;};
const CW_=768,CH_=312;
function drawCrt(c,w,h,view,t=0){
 const g=c.createRadialGradient(w/2,h/2,10,w/2,h/2,w*.62);g.addColorStop(0,'#4a1a7a');g.addColorStop(.7,'#2a0d4a');g.addColorStop(1,'#12041f');
 c.fillStyle=g;c.fillRect(0,0,w,h);
 c.font='bold 25px ui-monospace,Menlo,Consolas,monospace';c.textBaseline='top';c.shadowColor=ORANGE;c.shadowBlur=10;c.fillStyle=ORANGE;
 c.globalAlpha=.75;c.fillText(view.head,30,14);c.globalAlpha=1;
 c.font='bold 44px ui-monospace,Menlo,Consolas,monospace';
 view.lines.forEach((s,i)=>c.fillText(s,30,50+i*52));
 c.font='bold 30px ui-monospace,Menlo,Consolas,monospace';c.fillStyle=view.earned?'#ffd36e':ORANGE;c.shadowColor=c.fillStyle;
 c.fillText(view.foot,30,h-46);c.shadowBlur=0;
 c.fillStyle='rgba(0,0,0,.28)';for(let y=(t|0)%4;y<h;y+=4)c.fillRect(0,y,w,1.6);
 const v=c.createRadialGradient(w/2,h/2,h*.35,w/2,h/2,w*.62);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.7)');c.fillStyle=v;c.fillRect(0,0,w,h);
}
function doorwayTexture(){
 // dark gunmetal wall, gold trim, faint purple glow, one small USB-A port (~8% of the door width) in the centre
 const c=ctxOf(512,512);c.fillStyle='#1d1f29';c.fillRect(0,0,512,512);
 c.strokeStyle='#0c0d13';c.lineWidth=3;for(let i=0;i<=512;i+=128){c.beginPath();c.moveTo(i,0);c.lineTo(i,512);c.moveTo(0,i);c.lineTo(512,i);c.stroke();}
 c.strokeStyle=GOLD;c.globalAlpha=.7;c.lineWidth=3;c.strokeRect(14,14,484,484);c.globalAlpha=1;
 c.fillStyle=GOLD;for(const [x,y] of [[30,30],[482,30],[30,482],[482,482]]){c.beginPath();c.arc(x,y,5,0,TAU);c.fill();}
 const g=c.createRadialGradient(256,256,4,256,256,230);g.addColorStop(0,'rgba(154,75,224,.55)');g.addColorStop(1,'rgba(122,47,196,0)');c.fillStyle=g;c.fillRect(0,0,512,512);
 c.fillStyle='rgba(255,154,43,.95)';c.font='bold 17px ui-monospace,Menlo,Consolas,monospace';c.textAlign='center';c.fillText('TAP THE PORT',256,318);
 c.fillStyle='#ffd36e';c.fillRect(230,242,52,28);c.fillStyle='#07040f';c.fillRect(234,246,44,20);
 const p=c.createLinearGradient(0,246,0,266);p.addColorStop(0,'#d9a8ff');p.addColorStop(1,'#7a2fc4');c.fillStyle=p;c.shadowColor='#b66cff';c.shadowBlur=16;c.fillRect(236,248,40,16);c.shadowBlur=0;
 c.fillStyle='#07040f';c.fillRect(240,254,32,5);
 return tex(c);
}
let envTex=null;
function studioEnv(){
 if(envTex)return envTex;
 const c=ctxOf(128,64),g=c.createLinearGradient(0,0,0,64);g.addColorStop(0,'#f4f0fa');g.addColorStop(.42,'#8a8498');g.addColorStop(.55,'#2b2535');g.addColorStop(1,'#08070b');
 c.fillStyle=g;c.fillRect(0,0,128,64);c.fillStyle='#fff';[[18,8,10,22],[80,4,22,9],[46,10,16,14],[104,14,8,18]].forEach(r=>c.fillRect(...r));
 envTex=tex(c);envTex.mapping=THREE.EquirectangularReflectionMapping;return envTex;
}
// MOM logo (white-on-clear PNG) as an engraved decal: dark cut with a gold lip, or plain gold.
async function logoTexture(engrave){
 const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=LOGO;}).catch(()=>null);
 const w=512,h=Math.round(w*(img?img.height/img.width:72/363)),c=ctxOf(w,h),pass=(dx,dy,col,a)=>{
  const t=ctxOf(w,h);if(img)t.drawImage(img,8,8,w-16,h-16);t.globalCompositeOperation='source-in';t.fillStyle=col;t.fillRect(0,0,w,h);
  c.globalAlpha=a;c.drawImage(t.canvas,dx,dy);c.globalAlpha=1;
 };
 if(engrave){pass(3,3,'#ffd36e',.55);pass(-1.5,-1.5,'#05020a',.95);pass(0,0,'#1a1022',.9);}else{pass(2,2,'#05020a',.8);pass(0,0,GOLD,1);}
 const t=tex(c);return {t,aspect:h/w};
}

// --- Kit helpers (copied from the cogs door: not exported there) ---------------------------------
function kitMesh(gltf,name){
 gltf.scene.updateMatrixWorld(true);let src=null;(name?gltf.scene.getObjectByName(name):gltf.scene)?.traverse(o=>{if(o.isMesh&&!src)src=o;});
 if(!src)throw Error('no mesh '+name);return src;
}
function fitModel(src,radius){
 const box=new THREE.Box3().setFromObject(src),rot=new THREE.Matrix4(),R=orientMatrix(box.getSize(new THREE.Vector3()));
 rot.set(...R[0],0,...R[1],0,...R[2],0,0,0,0,1);box.applyMatrix4(rot);
 const size=box.getSize(new THREE.Vector3()),k=radius/(Math.max(size.x,size.y)/2),c=box.getCenter(new THREE.Vector3());
 const m=new THREE.Mesh(src.geometry,src.material);m.frustumCulled=false;m.matrixAutoUpdate=false;
 m.matrix.makeScale(k,k,k).multiply(new THREE.Matrix4().makeTranslation(-c.x,-c.y,-c.z)).multiply(rot).multiply(src.matrixWorld);
 return {m,depth:size.z*k};
}
const loads=new Map(),load=u=>{let p=loads.get(u);if(!p){p=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(u).catch(e=>{loads.delete(u);throw e;});loads.set(u,p);}return p;};
const metal=(color,m=.85,r=.38)=>new THREE.MeshStandardMaterial({color,metalness:m,roughness:r,envMap:studioEnv(),envMapIntensity:1.1});

// Is (u,v) free of the CRT stack, dial, flywheel, pistons, lamps and pulley strips? r = the part's own radius.
export function blocked(u,v,r=0){
 const d=(a,b)=>Math.hypot(u-a,v-b),box=(b,pad)=>Math.abs(u-b.u)<b.w/2+pad&&Math.abs(v-b.v)<b.h/2+pad;
 return box(L.logo,r)||box(L.crt,r)||d(L.knob.u,L.knob.v)<L.knob.r*1.5+r||d(L.fly.u,L.fly.v)<L.fly.r*1.12+r
  ||PISTONS.some(([pu,pv])=>Math.abs(u-pu)<.13+r&&Math.abs(v-pv)<.04+r)||LAMPS.some(([lu,lv])=>d(lu,lv)<.04+r)
  ||PULLEYS.some(([pu])=>Math.abs(u-pu)<.04+r&&v<.42)||BOLTS.some(([bu,bv])=>Math.abs(u-bu)<.1+r&&Math.abs(v-bv)<.025+r)||u<.065&&v>.07&&v<.93||u>.935&&v>.07&&v<.93;
}

// --- The scene -----------------------------------------------------------------------------------------
// host: element to fill. goals/read: the vault contract. onEnter(api): the doorway was tapped. Resolves to the door api.
export async function mountVaultDoor(host,{goals=[],read=()=>({}),onEnter,onOpen}={}){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(WALL);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
 const canvas=renderer.domElement;canvas.style.cssText='display:block;width:100%;height:100%;touch-action:none';canvas.setAttribute('aria-label','Vault door');host.append(canvas);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.1,40),root=new THREE.Group();scene.add(root);
 scene.add(new THREE.HemisphereLight('#d9c8ff','#241532',1.1));
 const sun=new THREE.DirectionalLight('#fff0d8',2.6);sun.position.set(-.9,1.4,3);sun.castShadow=true;sun.shadow.normalBias=.01;sun.shadow.bias=-.0005;
 const small=Math.min(host.clientWidth||400,host.clientHeight||400)<500;sun.shadow.mapSize.set(small?512:1024,small?512:1024);
 Object.assign(sun.shadow.camera,{left:-.9,right:.9,top:.9,bottom:-.9,near:.5,far:7});scene.add(sun,sun.target);
 const face=new THREE.Group(),pivot=new THREE.Group();pivot.position.set(-.5,0,0);face.position.set(.5,0,0);pivot.add(face);root.add(pivot);
 const at=(u,v,z=0)=>new THREE.Vector3(u-.5,.5-v,z),wallMat=metal('#2a1d3c',.5,.6);
 const mk=(geo,mat,parent,p,shadow=true)=>{const m=new THREE.Mesh(geo,mat);if(p)m.position.copy(p);m.castShadow=shadow;m.receiveShadow=true;parent.add(m);return m;};
 // wall + casing + doorway (static)
// the vault wall: a gunmetal space-hull bulkhead that fills the frame (1 world unit = 320 px; canvas centre = world origin)
 const wallTex=(()=>{const W=1024,H=2176,c=ctxOf(W,H),X=x=>W/2+x*320,Y=y=>H/2-y*320,g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#2a2c38');g.addColorStop(.5,'#23252f');g.addColorStop(1,'#1a1b24');c.fillStyle=g;c.fillRect(0,0,W,H);
  for(let i=0;i<9000;i++){c.fillStyle=Math.random()>.5?'rgba(255,255,255,.025)':'rgba(0,0,0,.05)';c.fillRect(Math.random()*W,Math.random()*H,2+Math.random()*10,1);}
  const seam=(x0,y0,x1,y1)=>{c.strokeStyle='#0b0b11';c.lineWidth=4;c.beginPath();c.moveTo(x0,y0);c.lineTo(x1,y1);c.stroke();c.strokeStyle='rgba(255,255,255,.1)';c.lineWidth=1.5;c.beginPath();c.moveTo(x0+3,y0+3);c.lineTo(x1+3,y1+3);c.stroke();
   const n=Math.hypot(x1-x0,y1-y0)/56|0;for(let k=1;k<n;k++){const x=x0+(x1-x0)*k/n,y=y0+(y1-y0)*k/n+(y1===y0?10:0),r=c.createRadialGradient(x-1,y-1,0,x,y,4);r.addColorStop(0,'#9fa2b5');r.addColorStop(1,'#444656');c.fillStyle=r;c.beginPath();c.arc(x,y,3.6,0,TAU);c.fill();}};
  for(let y=-8;y<=8;y++)seam(0,Y(y*.85),W,Y(y*.85));
  for(let y=-8;y<8;y++)for(let x=-4;x<=4;x++)seam(X(x*.8+(y&1?.4:0)),Y(y*.85),X(x*.8+(y&1?.4:0)),Y((y+1)*.85));
  const gold=(y,w)=>{c.fillStyle=GOLD;c.globalAlpha=.85;c.fillRect(0,Y(y),W,w);c.fillRect(0,Y(y)+w+7,W,w*.4);c.globalAlpha=1;};gold(1.13,6);gold(-1.1,6);
  const star=(cx,cy,r)=>{const g2=c.createRadialGradient(cx,cy,0,cx,cy,r);g2.addColorStop(0,'#241040');g2.addColorStop(.6,'#0c0618');g2.addColorStop(1,'#04020a');c.save();c.beginPath();c.arc(cx,cy,r,0,TAU);c.clip();c.fillStyle=g2;c.fillRect(cx-r,cy-r,2*r,2*r);
   for(let i=0;i<46;i++){const q=Math.random();c.fillStyle=q>.9?GOLD:q>.7?'#d9b8ff':'#fff';c.globalAlpha=.3+Math.random()*.7;c.fillRect(cx+(Math.random()*2-1)*r,cy+(Math.random()*2-1)*r,1.6,1.6);}c.globalAlpha=1;c.restore();
   c.strokeStyle=GOLD;c.lineWidth=7;c.beginPath();c.arc(cx,cy,r+3,0,TAU);c.stroke();c.strokeStyle='#0b0b11';c.lineWidth=5;c.beginPath();c.arc(cx,cy,r+10,0,TAU);c.stroke();
   for(let k=0;k<12;k++){const a=k*TAU/12;c.fillStyle='#8e91a6';c.beginPath();c.arc(cx+Math.cos(a)*(r+19),cy+Math.sin(a)*(r+19),3.4,0,TAU);c.fill();}};
  star(X(-.3),Y(.88),42);star(X(.3),Y(.88),42);star(X(-.3),Y(-.91),42);star(X(.3),Y(-.91),42);
  const led=(x,y,col)=>{c.shadowColor=col;c.shadowBlur=14;c.fillStyle=col;c.beginPath();c.arc(x,y,5,0,TAU);c.fill();c.shadowBlur=0;};
  [-.12,-.04,.04,.12].forEach((x,i)=>led(X(x),Y(.88),i%3===2?GOLD:'#b66cff'));
  [-.12,-.04,.04,.12].forEach((x,i)=>led(X(x),Y(-.91),i%3===1?GOLD:'#b66cff'));
  c.fillStyle='rgba(255,211,110,.8)';c.font='bold 22px ui-monospace,Menlo,Consolas,monospace';c.textAlign='center';c.fillText('M.O.M. INC. · VAULT 01',W/2,Y(-1.19));
  c.fillStyle='#ffd36e';
  return tex(c);})();
 const wall=new THREE.Mesh(new THREE.PlaneGeometry(3.2,6.8),new THREE.MeshBasicMaterial({map:wallTex,toneMapped:false}));wall.position.z=-.22;root.add(wall);
 const cas=metal('#3a3c4a',.9,.38),jamb=metal('#15131c',.7,.5),CW=1.34,HOLE=1.02;
 [[0,(CW+HOLE)/4,CW,(CW-HOLE)/2],[0,-(CW+HOLE)/4,CW,(CW-HOLE)/2]].forEach(([x,y,w,h])=>mk(new THREE.BoxGeometry(w,h,.24),cas,root,new THREE.Vector3(x,y,-.1)));
 [[-(CW+HOLE)/4,0],[(CW+HOLE)/4,0]].forEach(([x,y])=>mk(new THREE.BoxGeometry((CW-HOLE)/2,HOLE,.24),cas,root,new THREE.Vector3(x,y,-.1)));
 for(const [x,y,w,h] of [[0,.5,HOLE,.02],[0,-.5,HOLE,.02],[-.5,0,.02,HOLE],[.5,0,.02,HOLE]])mk(new THREE.BoxGeometry(w,h,.2),jamb,root,new THREE.Vector3(x,y,-.12),false);
 for(const sx of [-1,1])for(const sy of [-1,1])mk(new THREE.CylinderGeometry(.022,.022,.03,8).rotateX(Math.PI/2),metal(GOLD,.9,.3),root,new THREE.Vector3(sx*.6,sy*.6,.025));
 const screenMat=new THREE.MeshBasicMaterial({map:doorwayTexture(),toneMapped:false}),doorway=new THREE.Mesh(new THREE.PlaneGeometry(HOLE,HOLE),screenMat);doorway.position.z=-.2;root.add(doorway);
 // the door slab: Ian's painted art, cropped square, duotoned to MOM purple/gold
 const doorGltf=await load(DOOR_GLB).catch(()=>null),art=doorGltf?.scene.getObjectByProperty('isMesh',true)?.material.map?.clone();
 const side=metal('#2c2e3a',.9,.4),back=metal('#4a4d5e',.9,.35);
 const front=new THREE.MeshStandardMaterial({color:'#fff',metalness:.35,roughness:.55,envMap:studioEnv(),envMapIntensity:.7,map:art||null});
 if(art){art.repeat.set(1,-1024/IMG_H);art.offset.set(0,(Y0+1024)/IMG_H);art.wrapS=art.wrapT=THREE.ClampToEdgeWrapping;art.needsUpdate=true;}
 front.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n{float l=clamp(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722))*1.9,0.,1.);vec3 w=vec3(.05,.052,.075),p=vec3(.5,.2,.85),g=vec3(1.,.83,.43);vec3 d=l<.5?mix(w,p,l*2.):mix(p,g,(l-.5)*2.);diffuseColor.rgb=mix(diffuseColor.rgb*vec3(.4,.4,.5),d*1.25,.85);}');};
 front.customProgramCacheKey=()=>'vault-duotone';
 const slab=new THREE.Mesh(new THREE.BoxGeometry(1,1,SLAB),[side,side,side,side,front,back]);slab.position.z=-SLAB/2;slab.castShadow=slab.receiveShadow=true;face.add(slab);
 const trimMat=metal(GOLD,.9,.32);for(const [x,y,w,h] of [[0,.49,1,.02],[0,-.49,1,.02],[-.49,0,.02,1],[.49,0,.02,1]])mk(new THREE.BoxGeometry(w,h,.016),trimMat,face,new THREE.Vector3(x,y,.006),false);
 const hit=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({visible:false}));face.add(hit);
 // state
 const S={goals,read,idx:0,total:0,progress:0,open:0,opening:false,target:0,flySpin:0,phase:0,pomega:0,drag:new Map(),weld:[],sparks:[],heads:new Map(),glitch:0,alive:true,knob:{last:null,acc:0,total:0},fly:{last:null,total:0}};
 const parts={gears:[],pipes:[],valves:[],lights:[],lamps:[],bolts:[],pistons:[],weights:[],pulleys:[],spin:[]},rest=[];
 // kit parts from the old door layout, cropped to the square, kept clear of the new controls
 const [layout,kit]=await Promise.all([fetch(LAYOUT).then(r=>r.json()),load(KIT_GLB)]).catch(e=>{console.warn('vault door kit',e);return [null,null];});
 const mats=new Map(),matFor=(src,kind)=>{const k=src.material.uuid+kind;let m=mats.get(k);if(!m){m=src.material.clone();m.envMap=studioEnv();m.envMapIntensity=1.1;m.metalness=.9;m.roughness=.34;m.map=src.material.map;
  m.color.set(kind==='plate'?'#8a8da2':kind==='pipe'?'#c9a8ff':kind==='light'?'#ffffff':'#ffd9a0');if(kind==='pipe'){m.emissive.set(PURPLE);m.emissiveMap=m.map;m.emissiveIntensity=.9;}if(kind==='light'){m.emissive.set(GOLD);m.emissiveMap=m.map;m.emissiveIntensity=0;}mats.set(k,m);}return m;};
 let topZ=.03;
 if(layout&&kit){
  const list=[],keep=new Map(),cyc={},pick=k=>{const a=layout.parts.filter(p=>p.kind===k);cyc[k]=((cyc[k]??-1)+1)%a.length;return a[cyc[k]];};
  // trains: the old lower-left cluster squeezed (positions and radii together, so teeth still mesh) into the bottom strip, mirrored to the right
  const SC=.71,xf=(p,m)=>({...p,u:m?1-(.075+(p.u-.04)*SC):.075+(p.u-.04)*SC,v:.76+(vOf(p.v)-.7307)*SC,r:p.r*SC,rot:m?-(p.rot||0):p.rot});
  for(const m of [0,1])layout.parts.slice(0,16).forEach((p,i)=>{const q=xf(p,m);if(blocked(q.u,q.v,q.r*.8))return;keep.set(m*100+i,list.length);list.push({...q,drives:p.drives!=null?m*100+p.drives:undefined});});
  list.forEach(q=>{q.drives=q.drives!=null?keep.get(q.drives):undefined;});
  // tidy mounted fittings on a symmetric grid in the free panels beside the dial and flywheel, a light row, and screws
  const slot=(kind,u,v,r,rot)=>{const p=pick(kind);list.push({node:p.node,kind,u,v,r:Math.min(p.r,r),rot,layer:list.length%9+1});};
  for(const u of [.24,.76])for(const v of [.52,.67])slot('pipe',u,v,.06,0);
  for(const u of [.24,.76])slot('valve',u,.595,.035,0);
  for(const u of [.17,.83])for(const v of [.52,.67])slot('screw',u,v,.014,0);
  for(const [u,v] of [[.12,.032],[.2,.032],[.8,.032],[.88,.032],[.47,.968],[.53,.968]])slot('light',u,v,.015,0);
  parts.gears=gearsFromLayout(list);
  let gi=0;
  list.forEach((p,i)=>{
   let src;try{src=kitMesh(kit,p.node);}catch{if(p.kind==='gear')gi++;return;}
   const {m,depth}=fitModel(src,p.r),g=new THREE.Group();m.material=matFor(src,p.kind);m.castShadow=m.receiveShadow=true;g.add(m);
   const z=.002+(p.layer||0)*.0035+depth/2;g.position.set(p.u-.5,.5-p.v,z);g.rotation.z=(p.rot||0)*Math.PI/180;face.add(g);topZ=Math.max(topZ,z+depth/2);
   const part={...p,g,rot:g.rotation.z,angle:0,omega:0,z0:z,mat:m.material,level:0,nearUntil:-Infinity,phase:i*2.3,dir:i%2?1:-1};
   if(p.kind==='gear')parts.gears[gi++].g=g;else if(p.kind==='pipe')parts.pipes.push(part);else if(p.kind==='valve')parts.valves.push(part);else if(p.kind==='light'){m.material=m.material.clone();part.mat=m.material;parts.lights.push(part);}
  });
  // the flywheel: the kit's twenty-spoke cog, big, over the painted bottom hub, MOM logo on its boss
  try{
   const src=kitMesh(kit,'m19'),{m,depth}=fitModel(src,L.fly.r),g=new THREE.Group();m.material=matFor(src,'gear');m.castShadow=m.receiveShadow=true;g.add(m);
   g.position.copy(at(L.fly.u,L.fly.v,.03+depth/2));face.add(g);S.flyG=g;
   const boss=mk(new THREE.CylinderGeometry(.062,.062,.02,28).rotateX(Math.PI/2),metal('#2a1d3c',.8,.4),g,new THREE.Vector3(0,0,depth/2+.006));
   S.bossLogo=boss;
  }catch(e){console.warn('flywheel',e);}
 }
 if(!S.flyG){const g=new THREE.Group();g.position.copy(at(L.fly.u,L.fly.v,.05));g.add(new THREE.Mesh(new THREE.TorusGeometry(L.fly.r,.02,8,36),metal(GOLD,.9,.3)));face.add(g);S.flyG=g;S.bossLogo=mk(new THREE.CylinderGeometry(.062,.062,.02,28).rotateX(Math.PI/2),metal('#2a1d3c',.8,.4),g,new THREE.Vector3(0,0,.01));}
 const mount=new THREE.Group();face.add(mount);S.mount=mount;
 const [engr,gold]=await Promise.all([logoTexture(true),logoTexture(false)]);
 // logo plate (engraved) + CRT bezel/screen
 const plate=mk(new THREE.BoxGeometry(L.logo.w,L.logo.h,.02),metal('#2b1f3a',.75,.45),face,at(L.logo.u,L.logo.v,.012));
 const decal=new THREE.Mesh(new THREE.PlaneGeometry(L.logo.w*.9,L.logo.w*.9*engr.aspect),new THREE.MeshBasicMaterial({map:engr.t,transparent:true,depthWrite:false,toneMapped:false}));decal.position.copy(at(L.logo.u,L.logo.v,.024));face.add(decal);
 const bossDecal=new THREE.Mesh(new THREE.PlaneGeometry(.1,.1*gold.aspect),new THREE.MeshBasicMaterial({map:gold.t,transparent:true,depthWrite:false,toneMapped:false}));bossDecal.position.z=.0125;S.bossLogo.add(bossDecal);bossDecal.rotation.x=0;
 // CylinderGeometry rotated about X: its cap faces +z; the decal sits on it
 mk(new THREE.BoxGeometry(L.crt.w,L.crt.h,.05),metal('#1b1226',.7,.5),face,at(L.crt.u,L.crt.v,.02));
 const cc=ctxOf(CW_,CH_),crtTex=tex(cc),sg=new THREE.PlaneGeometry(L.crt.sw,L.crt.sh,18,10),uv=sg.attributes.uv;
 for(let i=0;i<uv.count;i++){const x=uv.getX(i)-.5,y=uv.getY(i)-.5,k=1+.12*(x*x+y*y);uv.setXY(i,.5+x*k,.5+y*k);}
 const crt=new THREE.Mesh(sg,new THREE.MeshBasicMaterial({map:crtTex,toneMapped:false}));crt.position.copy(at(L.crt.u,L.crt.v,.047));face.add(crt);
 const drawView=()=>{S.view=crtView(S.goals,S.idx,S.read());drawCrt(cc,CW_,CH_,S.view,performance.now()/60|0);crtTex.needsUpdate=true;};
 // dial knob with 12 static tick marks
 const knob=new THREE.Group();knob.position.copy(at(L.knob.u,L.knob.v,.03));face.add(knob);S.knobG=knob;
 mk(new THREE.CylinderGeometry(L.knob.r,L.knob.r*1.06,.05,24).rotateX(Math.PI/2),metal('#d8b25a',.95,.28),knob,new THREE.Vector3(0,0,.03));
 mk(new THREE.BoxGeometry(.012,L.knob.r*.8,.012),metal('#1a1022',.4,.6),knob,new THREE.Vector3(0,L.knob.r*.5,.058),false);
 for(let k=0;k<12;k++){const a=k*Math.PI/6;mk(new THREE.BoxGeometry(.008,.02,.008),metal(GOLD,.9,.3),face,at(L.knob.u+Math.sin(a)*L.knob.r*1.4,L.knob.v-Math.cos(a)*L.knob.r*1.4,.03),false).rotation.z=-a;}
 // pistons (body + rod), bolts (latch bars), tubes, pulleys + cables + weights, lamps + halos
 const bodyGeo=new THREE.CylinderGeometry(1,1,1,12).rotateZ(Math.PI/2),pm=metal('#ffd36e',.95,.28),rod=metal('#e8e2f0',.95,.2);
 for(const [u,v,s] of PISTONS){const body=mk(bodyGeo,pm,face,at(u,v,.03));body.scale.set(.1,.022,.022);const r=mk(bodyGeo,rod,face,at(u,v,.03));r.scale.set(.06,.009,.009);parts.pistons.push({r,u,s,base:u+s*.08});}
 for(const [u,v,s] of BOLTS){const b=mk(new THREE.BoxGeometry(.14,.03,.02),metal('#8b7fa0',.9,.3),face,at(u-s*.02,v,.026));parts.bolts.push({b,u:u-s*.02,s});}
 for(const u of [.035,.965])mk(new THREE.CylinderGeometry(.011,.011,.84,10),metal(PURPLE,.7,.35),face,at(u,.5,.022));
 for(const [u,v] of PULLEYS){const p=mk(new THREE.TorusGeometry(.04,.012,8,24),pm,face,at(u,v,.03));parts.pulleys.push(p);mk(new THREE.CylinderGeometry(.012,.012,.02,8).rotateX(Math.PI/2),pm,face,at(u,v,.03),false);
  const c=mk(new THREE.BoxGeometry(.005,1,.005),metal('#3a2a50',.5,.6),face,at(u,v+.2,.026),false),w=mk(new THREE.BoxGeometry(.05,.05,.04),pm,face,at(u,v+.3,.03));parts.weights.push({c,w,u,v});}
 const halo=(()=>{const c=ctxOf(64,64),g=c.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.3,'rgba(255,255,255,.4)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,64,64);return tex(c);})();
 LAMPS.forEach(([u,v],i)=>{
  mk(new THREE.TorusGeometry(.027,.007,6,16),metal(GOLD,.9,.3),face,at(u,v,.036),false);
  const core=new THREE.Mesh(new THREE.SphereGeometry(.02,12,8),new THREE.MeshBasicMaterial({color:'#2a1d12',toneMapped:false}));core.position.copy(at(u,v,.04));face.add(core);
  const h=new THREE.Mesh(new THREE.PlaneGeometry(.2,.2),new THREE.MeshBasicMaterial({map:halo,color:GOLD,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,toneMapped:false,opacity:0}));h.position.copy(at(u,v,.05));h.renderOrder=20;face.add(h);
  parts.lamps.push({core,h,u,v,level:0,nearUntil:-Infinity,phase:i*2.3,station:i,n:LAMPS.length});
 });
 // weld trail layers (on the door, so they swing with it): bead (normal) and glow (additive) on the door plane
 const layer=(add,z)=>{const c=ctxOf(512,512),t=tex(c),m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,toneMapped:false,blending:add?THREE.AdditiveBlending:THREE.NormalBlending}));m.position.z=z;m.renderOrder=add?31:30;face.add(m);return {c,t};};
 const bead=layer(false,topZ+.004),glow=layer(true,topZ+.006);
 for(const c of [...face.children])if(c!==slab&&c!==hit&&c!==mount)mount.add(c); // everything on the front rides in one group, hidden once the door swings (edge-on bits)
 drawView();
 const ringTex=(()=>{const c=ctxOf(128,128),g=c.createRadialGradient(64,64,34,64,64,62);g.addColorStop(0,'rgba(182,108,255,0)');g.addColorStop(.55,'rgba(182,108,255,.95)');g.addColorStop(1,'rgba(122,47,196,0)');c.fillStyle=g;c.fillRect(0,0,128,128);return tex(c);})();
 const ring=new THREE.Mesh(new THREE.PlaneGeometry(.26,.26),new THREE.MeshBasicMaterial({map:ringTex,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));ring.position.set(0,0,-.19);ring.visible=false;root.add(ring);
 // --- camera & layout
 function layout2(){
  const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight),aspect=w/h;renderer.setSize(w,h,false);camera.aspect=aspect;
  const need=1.09,fovT=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),dist=Math.max(need/2/(fovT*aspect),1.5/2/fovT);S.base=dist;
  camera.position.set(0,-.08,dist);camera.lookAt(0,-.08,0);camera.updateProjectionMatrix();S.pxPerUnit=h/(2*dist*fovT);S.scale=512/Math.max(60,S.pxPerUnit);
  sun.target.position.set(0,0,0);wake();
 }
 const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
 const pick=(cx,cy)=>{const r=canvas.getBoundingClientRect();ndc.set((cx-r.left)/r.width*2-1,-((cy-r.top)/r.height)*2+1);ray.setFromCamera(ndc,camera);
  if(S.open>.6){const h=ray.intersectObject(doorway)[0];return h&&Math.hypot(h.uv.x-.5,h.uv.y-.5)*HOLE<.14?{screen:true}:{wall:true};}
  const h=ray.intersectObject(hit)[0];return h?{u:h.uv.x,v:1-h.uv.y}:{wall:true};};
 // --- weld (compact: hot trail + sparks on the glow layer, cooling bead on the paint layer)
 const spark=(u,v,n)=>{for(let i=0;i<n&&S.sparks.length<KNOBS.sparkMax;i++){const a=Math.random()*TAU,sp=(KNOBS.sparkSpeedMinPx+Math.random()*(KNOBS.sparkSpeedMaxPx-KNOBS.sparkSpeedMinPx))*S.scale;S.sparks.push({x:u*512,y:v*512,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,born:performance.now(),life:KNOBS.sparkLifeMin+Math.random()*(KNOBS.sparkLifeMax-KNOBS.sparkLifeMin),floor:Math.random()<KNOBS.sparkBounce?v*512+(30+Math.random()*80)*S.scale:Infinity});}};
 const weldPush=(id,u,v)=>{const prev=S.heads.get(id)||null;if(prev&&Math.hypot(u-prev.u,v-prev.v)<KNOBS.weldStep)return;const p={u,v,t:performance.now(),prev};S.weld.push(p);S.heads.set(id,p);if(S.weld.length>KNOBS.weldCap)S.weld.shift();};
 function weldDraw(now){
  const K=KNOBS,sc=S.scale,g=glow.c,b=bead.c;g.clearRect(0,0,512,512);b.clearRect(0,0,512,512);g.lineCap=b.lineCap='round';
  g.globalCompositeOperation='lighter';
  for(const p of S.weld){if(!p.prev)continue;const age=now-p.t;
   if(age<K.weldHotMs){const f=age/K.weldHotMs,c=heatColor(f);g.lineWidth=K.weldTrailHaloPx*sc;g.strokeStyle=`rgba(${c.r},${c.g},${c.b},${.35*(1-f)})`;g.beginPath();g.moveTo(p.prev.u*512,p.prev.v*512);g.lineTo(p.u*512,p.v*512);g.stroke();g.lineWidth=K.weldTrailWidthPx*sc;g.strokeStyle=`rgba(${c.r},${c.g},${c.b},${1-f})`;g.stroke();}
   const a=beadAlpha(age);if(a>0){b.globalAlpha=a;b.lineWidth=K.weldBeadRadiusPx*2*sc;b.strokeStyle='#767880';b.beginPath();b.moveTo(p.prev.u*512,p.prev.v*512);b.lineTo(p.u*512,p.v*512);b.stroke();b.lineWidth=K.weldBeadRadiusPx*.7*sc;b.strokeStyle='#d6d8e0';b.stroke();}}
  b.globalAlpha=1;
  for(const s of S.sparks){const f=Math.min(1,(now-s.born)/1000/s.life),c=heatColor(f*.85);g.lineWidth=K.sparkWidthPx*sc*(1-.5*f);g.strokeStyle=`rgba(${c.r},${c.g},${c.b},${1-f*f})`;g.beginPath();g.moveTo(s.x-s.vx*K.sparkStreakS,s.y-s.vy*K.sparkStreakS);g.lineTo(s.x,s.y);g.stroke();}
  for(const d of S.drag.values())if(d.weld){const R=K.torchBloomPx*sc*(.88+Math.random()*.24),x=d.u*512,y=d.v*512,gr=g.createRadialGradient(x,y,0,x,y,R);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.25,'rgba(225,238,255,.9)');gr.addColorStop(.5,'rgba(255,160,60,.3)');gr.addColorStop(1,'rgba(255,110,30,0)');g.fillStyle=gr;g.fillRect(x-R,y-R,2*R,2*R);}
  g.globalCompositeOperation='source-over';glow.t.needsUpdate=bead.t.needsUpdate=true;
 }
 // --- input
 const clientToUv=(e)=>pick(e.clientX,e.clientY);
 const angleOf=(u,v,c)=>Math.atan2(v-c.v,u-c.u);
 function setIdx(i){const n=S.goals.length;S.idx=wrapIndex(i,n);S.glitch=performance.now()+160;drawView();}
 function onDown(e){
  const p=clientToUv(e);canvas.setPointerCapture?.(e.pointerId);
  if(p.screen){S.drag.set(e.pointerId,{tap:'enter',x:e.clientX,y:e.clientY});return;}
  if(p.wall){if(S.open>.6)S.drag.set(e.pointerId,{tap:'close',x:e.clientX,y:e.clientY});return;}
  const d={u:p.u,v:p.v,pu:p.u,pv:p.v,t0:performance.now(),weld:false,mode:'touch',moved:false};
  if(!S.opening&&S.open<.02&&Math.hypot(p.u-L.fly.u,p.v-L.fly.v)<L.fly.r*1.15){d.mode='fly';S.fly={last:null,total:S.fly.total};S.flySpin=0;S.fly=flyTurn(S.fly,angleOf(p.u,p.v,L.fly));}
  else if(Math.hypot(p.u-L.knob.u,p.v-L.knob.v)<L.knob.r*1.6){d.mode='knob';S.knob={last:null,acc:0,total:S.knob.total};S.knob=knobStep(S.knob,angleOf(p.u,p.v,L.knob)).st;}
  else{d.weld=true;d.gi=hitGear(parts.gears,{w:1,h:1},p.u,p.v);weldPush(e.pointerId,p.u,p.v);spark(p.u,p.v,KNOBS.sparkPressCount);}
  S.drag.set(e.pointerId,d);wake();
 }
 function onMove(e){
  const d=S.drag.get(e.pointerId);if(!d||d.tap)return;const p=clientToUv(e);if(p.u==null)return;
  const du=p.u-d.u,dv=p.v-d.v;d.pu=d.u;d.pv=d.v;d.u=p.u;d.v=p.v;if(Math.hypot(du,dv)>.004)d.moved=true;
  if(d.mode==='fly'){S.fly=flyTurn(S.fly,angleOf(p.u,p.v,L.fly));S.progress=S.fly.progress;if(S.progress>=1)openDoor();}
  else if(d.mode==='knob'){const r=knobStep(S.knob,angleOf(p.u,p.v,L.knob));S.knob=r.st;if(r.steps){setIdx(S.idx+r.steps);navigator.vibrate?.(5);}}
  else{
   S.pomega+=Math.hypot(du,dv)*70;
   // gears near the finger: tangential drag turns the whole train (scene y is up, uv y is down)
   parts.gears.forEach((g,gi)=>{const dx=d.pu-g.u,dy=d.pv-g.v,r2=dx*dx+dy*dy;if(r2<(g.r*2.2)**2&&r2>1e-8)applyTorque(parts.gears,gi,-(dx*dv-dy*du)/r2*18);});
   for(const pp of parts.pipes)if(Math.hypot(p.u-pp.u,p.v-pp.v)<pp.r+KNOBS.wiggleMargin)pp.omega+=wiggleKick(du,-dv,pp.rot,KNOBS.wiggleKick);
   weldPush(e.pointerId,p.u,p.v);spark(p.u,p.v,Math.min(KNOBS.sparkMoveMax,Math.round(Math.hypot(du,dv)/KNOBS.sparkPerFrac)));
  }
  wake();
 }
 function onUp(e){
  const d=S.drag.get(e.pointerId);S.drag.delete(e.pointerId);if(!d)return;
  if(d.tap){if(Math.hypot(e.clientX-d.x,e.clientY-d.y)<12){if(d.tap==='enter')enter();else closeDoor();}return;}
  if(d.weld){if(!d.moved){if(d.gi>=0)applyTorque(parts.gears,d.gi,KNOBS.wiggleTapKick*6);else{const i=nearestPipe(parts.pipes,{w:1,h:1},d.u,d.v,KNOBS.wiggleMargin);if(i>=0)parts.pipes[i].omega+=KNOBS.wiggleTapKick;}}S.heads.delete(e.pointerId);spark(d.u,d.v,KNOBS.sparkReleaseCount);}
  wake();
 }
 canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointermove',onMove);canvas.addEventListener('pointerup',onUp);canvas.addEventListener('pointercancel',onUp);
 // --- door open / close / enter
 function openDoor(){if(S.opening||S.target)return;S.opening=true;S.target=1;S.t0=performance.now();S.from=S.open;
  window.dispatchEvent(new CustomEvent('myr5:vault-door-open'));import('./vault-hall.mjs').catch(()=>{}); // warm the hall while the door swings
  import('./vault-store.mjs').then(m=>m.bump?.('door-open')).catch(()=>{});onOpen?.(api);wake();}
 function closeDoor(){S.dolly=null;S.veil?.remove();S.veil=null;S.target=0;S.t0=performance.now();S.from=S.open;S.opening=false;S.fly={last:null,total:0};S.progress=0;wake();}
 function enter(){
  if(S.dolly)return;S.dolly={t0:performance.now()};
  const veil=document.createElement('div');veil.style.cssText='position:absolute;inset:0;background:radial-gradient(circle,#d9a8ff,#7a2fc4 55%,#2a0d4a);opacity:0;pointer-events:none';host.append(veil);S.veil=veil;wake();onEnter?.(api);
 }
 function finishDolly(){
  import('./vault-hall.mjs').then(m=>{if(!m.enterHall)throw Error('no hall');return m.enterHall({host,door:api,goals:S.goals,read:S.read});})
   .catch(()=>{S.dolly=null;S.veil?.remove();S.veil=null;S.view={head:'ERROR',lines:['THE HALL IS NOT','BUILT YET.'],foot:'',earned:false};drawCrt(cc,CW_,CH_,S.view,0);crtTex.needsUpdate=true;wake();});
 }
 // --- on-demand loop
 let frame=0,awakeUntil=0,last=0;
 function wake(){awakeUntil=performance.now()+1500;if(!frame&&S.alive){last=performance.now();frame=requestAnimationFrame(tick);}}
 const reduced=matchMedia?.('(prefers-reduced-motion: reduce)');
 function tick(now){
  frame=0;if(!S.alive)return;const rdt=Math.min(.5,(now-last)/1000||.016),dt=Math.min(.05,rdt);last=now;let busy=S.drag.size>0;
  renderer.shadowMap.enabled=true;
  // flywheel: follows the finger; unfinished turns spring back
  if(!S.drag.size&&!S.opening&&S.open<.02&&Math.abs(S.fly.total)>.01){S.fly={last:null,total:S.fly.total*Math.exp(-rdt*5)};S.progress=Math.abs(S.fly.total)/TAU;busy=true;}
  S.flyG.rotation.z=-S.fly.total;
  // door swing (ease in-out)
  if(S.open!==S.target){const k=Math.min(1,(now-S.t0)/SWING_MS),e=k*k*(3-2*k);S.open=S.from+(S.target-S.from)*e;if(k>=1){S.open=S.target;if(!S.target)S.opening=false;}busy=true;}
  pivot.rotation.y=-S.open*SWING;mount.visible=S.open<.2;
  if(S.open>=.99&&S.target===1){if(!S.pulseUntil)S.pulseUntil=now+6000;}else S.pulseUntil=0;
  ring.visible=S.open>=.99&&!S.dolly;if(ring.visible){const k=Math.sin(now*.006);ring.scale.setScalar(1+.22*k);ring.material.opacity=.7+.3*k;if(now<S.pulseUntil)busy=true;}camera.position.set(-.2*S.open,-.08,S.base*(1+.2*S.open));camera.lookAt(-.2*S.open,-.08,0);
  if(S.dolly){const k=Math.min(1,(now-S.dolly.t0)/1000),e=k*k*(3-2*k),z0=S.base*1.2;camera.position.set(-.2*S.open*(1-e),-.08*(1-e),z0+(-.1-z0)*e);camera.lookAt(0,0,-.2);if(S.veil)S.veil.style.opacity=Math.max(0,Math.min(1,(k-.55)/.4));if(k<1)busy=true;if(k>=1&&!S.dolly.done){S.dolly.done=true;finishDolly();}}
  // knob follows the finger
  S.knobG.rotation.z=-S.knob.total;
  // train, valves, pipes, lights, lamps
  const moving=stepTrain(parts.gears,dt);parts.gears.forEach(g=>{if(g.g)g.g.rotation.z=g.angle%TAU;});
  let rootOmega=0;for(const g of parts.gears)if(g.drives==null&&Math.abs(g.omega)>Math.abs(rootOmega))rootOmega=g.omega;
  if(Math.abs(rootOmega)>.02||S.drag.size)for(const v of parts.valves){v.angle=valveAngle(v.angle,dt,v.dir,Math.sign(rootOmega)||1,rootOmega);v.g.rotation.z=v.rot+v.angle;}
  let wob=false;
  for(const p of parts.pipes){const r=wiggleStep(p.angle,p.omega,dt,KNOBS.wiggleFreqHz,KNOBS.wiggleDamping,KNOBS.wiggleMaxAngle);p.angle=r.angle;p.omega=r.omega;
   if(Math.abs(p.angle)<KNOBS.wiggleRestAngle&&Math.abs(p.omega)<KNOBS.wiggleRestOmega){if(p.angle){p.angle=p.omega=0;p.g.rotation.z=p.rot;p.g.position.z=p.z0;}}
   else{wob=true;p.g.rotation.z=p.rot+p.angle;p.g.position.z=p.z0+Math.abs(p.angle)/KNOBS.wiggleMaxAngle*KNOBS.wiggleBob;}}
  let lit=false;const near=(u,v)=>{for(const d of S.drag.values())if(d.u!=null&&Math.hypot(d.u-u,d.v-v)<KNOBS.lightRadius)return true;return false;};
  for(const l of parts.lights){if(near(l.u,l.v))l.nearUntil=now+KNOBS.lightHoldMs;const t=now<l.nearUntil?1:0;l.level=lightLevel(l.level,t,dt,KNOBS.lightRampMs,KNOBS.lightFadeMs);l.mat.emissiveIntensity=KNOBS.lightOn*l.level;if(l.level!==t)lit=true;}
  for(const l of parts.lamps){if(near(l.u,l.v))l.nearUntil=now+KNOBS.lightHoldMs;const t=now<l.nearUntil||S.progress>=(l.station+.5)/l.n*.999||S.open>.02?1:0;l.level=lightLevel(l.level,t,dt,KNOBS.lightRampMs,KNOBS.lightFadeMs);
   const fl=!reduced?.matches&&l.level>.95?1+Math.sin(now*.02+l.phase)*KNOBS.lightFlicker:1,k=.6+.5*l.level;l.core.material.color.set('#2a1d12').lerp(new THREE.Color(GOLD),l.level*fl);l.core.scale.setScalar(k);l.h.material.opacity=l.level*.9*fl;if(l.level!==t)lit=true;}
  // pistons/weights/pulleys: pumped by finger travel and flywheel turn
  S.pomega*=Math.exp(-dt*2.2);S.phase+=(S.pomega+Math.abs(rootOmega)*.5)*dt;const ph=S.phase+S.fly.total*3;
  for(const p of parts.pistons)p.r.position.x=(p.u-.5)+p.s*(.04+pistonExt(.05,ph));
  for(const w of parts.weights){const t=.5+.5*Math.sin(ph),y=.2+.07*t;w.w.position.y=.5-(w.v+y);w.c.scale.y=y;w.c.position.y=.5-(w.v+y/2);}
  for(const p of parts.pulleys)p.rotation.z=-ph;
  for(const b of parts.bolts)b.b.position.x=(b.u-.5)+b.s*.07*Math.max(S.progress,Math.min(1,S.open*5));
  // weld
  S.scale=512/Math.max(60,S.pxPerUnit);let n=0;for(const s of S.sparks)if((now-s.born)/1000<s.life)S.sparks[n++]=stepSpark(s,dt,KNOBS.sparkGravityPx*S.scale,KNOBS.sparkBounceKeep);S.sparks.length=n;
  for(const d of S.drag.values())if(d.weld&&now-(d.ls||0)>KNOBS.sparkIdleMs){d.ls=now;spark(d.u,d.v,KNOBS.sparkIdleCount);}
  let k=0;while(k<S.weld.length&&now-S.weld[k].t>KNOBS.weldHotMs+KNOBS.weldBeadMs)k++;if(k)S.weld.splice(0,k);
  const weldLive=S.sparks.length>0||S.weld.length>0||[...S.drag.values()].some(d=>d.weld);
  if(weldLive||S.weldWas)weldDraw(now);S.weldWas=weldLive;
  if(now<S.glitch){crt.position.x=(Math.random()-.5)*.006;drawCrt(cc,CW_,CH_,S.view,now/60|0);crtTex.needsUpdate=true;busy=true;}else if(crt.position.x!==at(L.crt.u,L.crt.v).x){crt.position.x=at(L.crt.u,L.crt.v).x;drawView();}
  renderer.render(scene,camera);
  const go=busy||moving||wob||lit||weldLive||S.pomega>.05||now<awakeUntil;
  if(go)frame=requestAnimationFrame(tick);else renderer.shadowMap.enabled=false; // asleep: the canvas keeps its last (shadowed) frame
 }
 const ro=new ResizeObserver(layout2);ro.observe(host);layout2();
 const api={
  canvas,renderer,state:S,goals:()=>S.goals,
  goTo:setIdx,step:n=>setIdx(S.idx+n),openDoor,closeDoor,enter,wake,
  // client position of a door-plane point (u,v in door widths): for scripted/driven tests
  project(u,v,z=0){const p=new THREE.Vector3(u-.5,.5-v,z);face.localToWorld(p);pivot.updateMatrixWorld(true);p.project(camera);const r=canvas.getBoundingClientRect();return {x:r.left+(p.x+1)/2*r.width,y:r.top+(1-p.y)/2*r.height};},
  projectWorld(x,y,z){const p=new THREE.Vector3(x,y,z).project(camera),r=canvas.getBoundingClientRect();return {x:r.left+(p.x+1)/2*r.width,y:r.top+(1-p.y)/2*r.height};},
  info:()=>({idx:S.idx,open:S.open,progress:S.progress,shadows:renderer.shadowMap.enabled,awake:!!frame,view:S.view,kitParts:parts.gears.length+parts.pipes.length+parts.valves.length+parts.lights.length}),
  dispose(){S.alive=false;cancelAnimationFrame(frame);ro.disconnect();for(const t of ['pointerdown','pointermove','pointerup','pointercancel'])canvas.removeEventListener(t,t==='pointerdown'?onDown:t==='pointermove'?onMove:onUp);
   renderer.dispose();renderer.forceContextLoss();canvas.remove();},
 };
 return api;
}

// The route entry: a modal dialog (#vaultPanel) holding the door. Returns the dialog.
export async function openVault(){
 let dlg=document.getElementById('vaultPanel');
 if(!dlg){dlg=document.createElement('dialog');dlg.id='vaultPanel';document.body.append(dlg);}
 dlg.style.cssText='position:fixed;inset:0;width:100%;height:100%;max-width:none;max-height:none;margin:0;padding:0;border:0;background:#171020;color:#f6eddf;overflow:hidden';
 dlg.replaceChildren();const host=document.createElement('div');host.style.cssText='position:absolute;inset:0';dlg.append(host);
 const close=document.createElement('button');close.textContent='✕';close.setAttribute('aria-label','Close vault');close.style.cssText='position:absolute;top:10px;right:10px;z-index:2;width:44px;height:44px;border-radius:22px;border:1px solid #7a2fc4;background:#171020cc;color:#ffd36e;font-size:18px';
 close.onclick=()=>dlg.close();dlg.append(close);
 if(!dlg.open)dlg.showModal?.();
 const [{GOALS},{view}]=await Promise.all([import('./vault-goals.mjs'),import('./vault-store.mjs')]);
 const api=await mountVaultDoor(host,{goals:GOALS,read:view});dlg._vault=api;
 dlg.addEventListener('close',()=>api.dispose(),{once:true});
 return dlg;
}

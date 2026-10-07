// Jelly board effect for portal-board-glb.mjs — Ian's green lattice-brick GLB (the "bog swamp
// bones" asset was never made) driven to wobble like jelly. Wobble is a ring buffer of up to 6
// ripples pushed on press/drag/release; vertexDisplace turns each into a decaying radial heave
// (z) plus outward slosh (xy), weighted toward the front face so the back of the slab stays put.
// The camera looks straight at the face, so z alone barely reads: the analytic height gradient of
// dent + ripples also tilts vNormal, letting the lights (and the normal map's TBN) show the wobble.
// Distance is normalised by face width (uFaceSize.x) rather than raw model units so the k/decay/
// spread constants below don't depend on the GLB's arbitrary export scale.
// The raised lattice rods are BONES: vertices above uBoneZ sample the field once at their grid
// cell's centre (damped by follow), so each cell of rod moves as one rigid vertebra riding the
// jelly. The fragment hook shades them as solid struts (ivory core, jelly-tinted rim, rim light,
// brighter knuckles on the tallest nodes) and cuts the trail: a finger SPLITS the jelly (dark gash,
// bright lips, normals rolling into the cut) that closes behind it, all shading, no geometry.
// AGPL-3.0-or-later.

const RK=12,RW=10.5,RDECAY=1.7,RSPREAD=1.8,SLOSH=.5; // spatial freq, temporal freq (rad/s: ~2.5 wobbles in 1.5 s), time decay, spatial decay (all in "face widths"), lateral/heave ratio
const TAP_AMP=.065,DRAG_AMP=.03,RELEASE_AMP=.03; // ripple heave at the centre, in face widths
const DENT_AMT=2.6,DENT_RAD=1.4; // finger dent vs. DEFAULT_DISPLACE (ice): deeper, wider/softer falloff
let selectedTint=null,trail3d=null,trail2d=null;
const validTint=hex=>typeof hex==='string'&&/^#[0-9a-f]{6}$/i.test(hex);
function tintRgb(hex,factor=1){const m=hex?.match(/^#([0-9a-f]{6})$/i);if(!m)return null;const n=parseInt(m[1],16);return `rgb(${[n>>16,(n>>8)&255,n&255].map(v=>Math.round(v*factor)).join(',')})`;}
function writeLinearTint(color,hex){const n=parseInt((hex||'#ffffff').slice(1),16),linear=c=>{const s=c/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4;};color.r=linear(n>>16);color.g=linear((n>>8)&255);color.b=linear(n&255);color.isColor=true;}
// Ian: bones rigid + segmented, jelly wobbles (2026-09-22)
// zFrac: bone threshold as a fraction of depth back->front (jelly face sits ~.89-.93, rods .94-1);
// seg: segment length in face widths, with centre: a face uv (v down) the grid is centred on — the
// middle rod crossing; this seg puts the straight rods (x 0/±.25, rows .162 apart) mid-cell, so
// no rod is split lengthwise between two cells; follow: bones' share of the jelly motion;
// ridgeAmp/ridgeFreq: per-segment sine ridge in the normal (0 = off: it banded the rods into
// broken-looking beads). Shading (fragment, by undisplaced depth fraction): mask ramps over
// mask[0]..mask[1], core over core[0]..core[1] (rod crest), knuckle over knuckle[0..1] (the tallest
// nodes, mostly where rods cross); tint: how far the texture is pulled to the bone colours.
const BONE={zFrac:.94,seg:.0546,centre:[.5,.444],follow:.55,ridgeAmp:0,ridgeFreq:1,
 mask:[.925,.945],core:[.935,.965],knuckle:[.965,.985],tint:.7,
 coreRGB:[.95,.85,.6],rimRGB:[.24,.22,.07],rough:.45,rimLight:.25,rimLightRGB:[.55,.8,.35],knuckleGlow:.1};
// Ian: the trail SPLITS the jelly and it re-heals behind the finger (2026-09-23). Face widths / s.
// width: gash width at the finger; close: s until the lips meet (width -> 0, so the gash tapers
// back along the trail); ease: closing curve exponent; life: s until seam + bulge are gone (points
// evicted, well inside the 7 s rule); step: min spacing between trail points.
// Ian 2026-09-26: "lets make the trail shorter for the jelly" — only the recent part of the stroke is kept (cap
// points, oldest evicted: cap x step = .96 face widths) and the slit closes within close, so it's a short gash that
// follows the finger. This replaces 2026-09-24's longer, slower slit.
// Lips: a ridge of half-width lip on each edge (normal tilt lipTilt, glossy, lipGlow sheen) plus a
// crisp edgeGlow line on the cut edge. Inside: wallRGB at the walls to deepRGB at the centre (mixed
// by interior), matte (interiorRough), walls tilting wallTilt into the cut; the wall facing the key
// light glows litRGB (litWall) and its edge line is brighter, the far wall stays dark.
// Healing: the two lip ridges merge into one bulge (bulge x a lip, bulgeW wide, its sheen fading
// with it) that wobbles at wobbleHz, dying at wobbleDecay /s, over a dark seam (half-width seam,
// seamDark); all of it fades out between close and life.
export const TRAIL={
 // R7 (Android): cap is the GLSL uTrail array size and the fragment loop bound. At 160 it made Jelly's fragment shader
 // ~206 uniform vectors (the GLES 3.0 floor is 224; every other board is under ~50), dynamically indexed in a 160-pass
 // loop, and picking Jelly took down the phone's GPU process and with it WebGL for every board. Keep it at 32 or under
 // (tests/portal-board-jelly.test.mjs); uTrailBounds still skips the loop off the gash.
 cap:32,
 // R7: wider and brighter-lipped than 24 Sept so the short gash reads on a phone.
 step:.03,width:.055,close:.8,ease:1,life:2.3,
 lip:.0035,lipTilt:1,lipGlow:.45,lipRGB:[.8,1,.65],edgeGlow:1.2,edgeRGB:[.85,1,.75],
 wallTilt:.7,wallRGB:[.05,.15,.03],deepRGB:[.004,.025,.004],interior:.92,interiorRough:.85,litWall:.5,litRGB:[.25,.55,.12],
 light:[-.79,.62], // key light (portal-board-glb's sun) as a face-xy direction, y up
 bulge:1.2,bulgeW:.01,wobbleHz:4.5,wobbleDecay:1.6,seam:.006,seamDark:.6,
};
const RIPPLE_MAX_AGE=2,DRAG_STEP_PX=30;
const F=x=>x.toFixed(4); // GLSL float literal
const V3=a=>`vec3(${a.map(F).join(',')})`;

// Pure mirror of the shader's quantisation: centre of the seg-sized grid cell (corner at ox,oy)
// holding (x,y).
export const segmentCentre=(x,y,seg,ox=0,oy=0)=>[(Math.floor((x-ox)/seg)+.5)*seg+ox,(Math.floor((y-oy)/seg)+.5)*seg+oy];
// Pure mirror of the shader's gash: full width (face widths) at `age` s behind the finger.
export const gashWidth=(age,T=TRAIL)=>T.width*Math.max(0,1-Math.max(0,age)/T.close)**T.ease;
// Trail points {u,v,t,prev}: prev is the same stroke's previous point (null = stroke start).
// No-THREE helpers (edit pts in place): append, evicting the oldest past cap; drop points older
// than life at time now.
export function trailPush(pts,p,cap=TRAIL.cap){pts.push(p);if(pts.length>cap)pts.splice(0,pts.length-cap);return pts;}
export function trailExpire(pts,now,life=TRAIL.life){let k=0;while(k<pts.length&&now-pts[k].t>life)k++;if(k)pts.splice(0,k);return pts;}
// Pure: pack into out[i].set(u,v,birth,back) where back = how many slots behind its predecessor
// sits (0: none, or evicted), so interleaved strokes from two fingers still join up.
export function trailPack(pts,out){
 const at=new Map(pts.map((p,i)=>[p,i]));
 pts.forEach((p,i)=>out[i].set(p.u,p.v,p.t,at.has(p.prev)?i-at.get(p.prev):0));
 return pts.length;
}
// Pure: axis-aligned face-uv box around the whole trail, padded by the widest the gash ever gets
// (half the max width, plus a hair of slack) — marginV divided by the board's aspect since the
// shader's distance test scales v by it (a non-square face reaches further in raw v than in u for
// the same on-screen width). Lets the fragment shader reject a pixel nowhere near the trail with
// one cheap test instead of walking the (now much bigger) point array per pixel. null when there's
// no trail to bound.
export function trailBounds(pts,marginU=TRAIL.width/2+.01,marginV=marginU){
 if(!pts.length)return null;
 let minU=Infinity,minV=Infinity,maxU=-Infinity,maxV=-Infinity;
 for(const{u,v}of pts){if(u<minU)minU=u;if(u>maxU)maxU=u;if(v<minV)minV=v;if(v>maxV)maxV=v;}
 return[minU-marginU,minV-marginV,maxU+marginU,maxV+marginV];
}

// Dent + ripple displacement (xy slosh, z heave) at face point p, plus its height gradient.
// Rides in vertexDecls: a GLSL function can't be declared inside main(), where vertexDisplace goes.
const JELLY_FIELD=`
vec3 jellyField(vec2 p,out vec2 grad){
vec3 d=vec3(0.0);grad=vec2(0.0);
for(int di=0;di<8;di++){if(di>=uTouchCount)break;vec4 t=uTouch[di];vec2 dv=p-(uFaceMin+vec2(t.x,1.0-t.y)*uFaceSize);float dd=length(dv),rad=uDentRadius*${F(DENT_RAD)};if(dd<rad){float s=1.0-dd/rad,f=s*s*(3.0-2.0*s),h=uDent*${F(DENT_AMT)}*t.z;d.z-=h*f*f;if(dd>1e-4)grad+=dv/dd*h*12.0*f*s*(1.0-s)/rad;}}
for(int ri=0;ri<6;ri++){vec4 r=uRipple[ri];if(r.w<=0.0)continue;float age=uTime-r.z;if(age<0.0||age>${F(RIPPLE_MAX_AGE)})continue;vec2 dv=p-(uFaceMin+vec2(r.x,1.0-r.y)*uFaceSize);float dist=length(dv),dn=dist/uFaceSize.x,env=r.w*exp(-age*${F(RDECAY)})*exp(-dn*${F(RSPREAD)}),phase=dn*${F(RK)}-age*${F(RW)},sn=sin(phase),cs=cos(phase);d.z+=env*sn;if(dist>1e-4){vec2 dir=dv/dist;d.xy+=dir*env*${F(SLOSH)}*cs*smoothstep(0.0,0.1,dn);grad+=dir*env*(${F(RK)}*cs-${F(RSPREAD)}*sn)/uFaceSize.x;}}
return d;
}
`;

// Bones: the whole cell shares one sample and one weight (front weight is ~1 that high, so it's
// dropped to keep the segment rigid). Ridge on both in-cell axes: a straight rod sits mid-cell, so
// its across term is ~0 and the along term bands it; diagonals get bands from both.
const VERTEX_DISPLACE=`
bool bone=position.z>uBoneZ;vec2 q=(floor((position.xy-uGridO)/uSeg)+0.5)*uSeg+uGridO,jg;
vDepthF=0.5+0.5*position.z/uHalfDepth;
float jw=bone?uBoneFollow:smoothstep(-uHalfDepth,uHalfDepth,position.z);
transformed+=jellyField(bone?q:position.xy,jg)*jw;jg*=jw;
if(bone)jg+=uRidgeAmp*sin((position.xy-q)*uRidgeFreq);
#ifndef FLAT_SHADED
vNormal=normalize(normalMatrix*(objectNormal-vec3(jg,0.0)));
#endif
`;

// Runs before lighting (portal-board-glb's effect.fragment). The board is never rotated and the
// camera looks straight down -z, so view-space xy = face xy (y up) and normals tilt directly.
const T=TRAIL,B=BONE;
const FRAGMENT=`
float boneM=smoothstep(${F(B.mask[0])},${F(B.mask[1])},vDepthF),boneC=smoothstep(${F(B.core[0])},${F(B.core[1])},vDepthF),knuckle=smoothstep(${F(B.knuckle[0])},${F(B.knuckle[1])},vDepthF);
{float lum=dot(diffuseColor.rgb,vec3(0.3,0.59,0.11));
vec3 bc=mix(${V3(B.rimRGB)},${V3(B.coreRGB)},boneC)*(0.7+0.6*lum)*(1.0+0.25*knuckle);
diffuseColor.rgb=mix(diffuseColor.rgb,bc,boneM*${F(B.tint)});roughnessFactor=mix(roughnessFactor,${F(B.rough)},boneM);
float fr=1.0-clamp(normal.z,0.0,1.0);totalEmissiveRadiance+=boneM*(${V3(B.coreRGB)}*${F(B.knuckleGlow)}*knuckle+${V3(B.rimLightRGB)}*${F(B.rimLight)}*fr*fr*(1.0-boneC));}
if(uTrailN>0&&vPlanar.x>=uTrailBounds.x&&vPlanar.x<=uTrailBounds.z&&vPlanar.y>=uTrailBounds.y&&vPlanar.y<=uTrailBounds.w){
 float asp=uFaceSize.y/uFaceSize.x,best=1e9,bd=1.0,ba=1e9;vec2 P=vec2(vPlanar.x,vPlanar.y*asp),dir=vec2(0.0);
 for(int i=0;i<${T.cap};i++){if(i>=uTrailN)break;vec4 b=uTrail[i],a=b.w>0.5?uTrail[i-int(b.w+0.5)]:b;
  if(uTime-max(a.z,b.z)>${F(T.life)})continue;
  vec2 A=vec2(a.x,a.y*asp),ab=vec2(b.x,b.y*asp)-A,ap=P-A;float h=clamp(dot(ap,ab)/max(dot(ab,ab),1e-10),0.0,1.0);
  vec2 off=ap-ab*h;float d=length(off),age=max(uTime-mix(a.z,b.z,h),0.0),e=d-${F(T.width/2)}*pow(max(0.0,1.0-age/${F(T.close)}),${F(T.ease)});
  if(e<best){best=e;bd=d;ba=age;dir=off/max(d,1e-6);}}
 float open=pow(max(0.0,1.0-ba/${F(T.close)}),${F(T.ease)}),hw=${F(T.width/2)}*open,keep=(1.0-boneM)*(1.0-smoothstep(${F(T.close)},${F(T.life)},ba)),aa=fwidth(P.x);
 float inside=(1.0-smoothstep(hw-aa,hw+aa,bd))*smoothstep(0.0,0.15,open)*keep,dep=1.0-bd*bd/max(hw*hw,1e-10);
 float since=max(ba-${F(T.close)},0.0),amp=open>0.0?mix(${F(T.bulge)},1.0,open):${F(T.bulge)}*exp(-since*${F(T.wobbleDecay)})*mix(1.0,cos(since*${F(2*Math.PI*T.wobbleHz)}),uWobble);
 float x=(bd-hw)/mix(${F(T.bulgeW)},${F(T.lip)},open),g=exp(-x*x),edge=(1.0-smoothstep(0.0,1.5*aa,abs(bd-hw)))*keep;
 vec2 tilt=(dir*(${F(T.lipTilt/.4289)}*amp*x*g)-dir*${F(T.wallTilt)}*inside*bd/max(hw,1e-5))*keep;
 normal=normalize(normal+vec3(tilt.x,-tilt.y,0.0));
 float lit=max(0.0,dot(vec2(-dir.x,dir.y),vec2(${F(T.light[0])},${F(T.light[1])}))); // wall/lip whose inward normal faces the light
 diffuseColor.rgb=mix(diffuseColor.rgb,mix(mix(${V3(T.wallRGB)},${V3(T.deepRGB)},dep),uTrailTint,uTrailTintMix),inside*${F(T.interior)});
 totalEmissiveRadiance+=mix(${V3(T.litRGB)},uTrailTint,uTrailTintMix)*${F(T.litWall)}*lit*(1.0-dep)*inside*open;
 roughnessFactor=mix(mix(roughnessFactor,0.12,g*keep*open),${F(T.interiorRough)},inside);
 totalEmissiveRadiance+=mix(${V3(T.lipRGB)},uTrailTint,uTrailTintMix)*${F(T.lipGlow)}*g*keep*(1.0-inside)*abs(amp)+mix(${V3(T.edgeRGB)},uTrailTint,uTrailTintMix)*${F(T.edgeGlow)}*edge*(0.3+0.7*lit)*open;
 diffuseColor.rgb=mix(diffuseColor.rgb,mix(${V3(T.deepRGB)},uTrailTint,uTrailTintMix),${F(T.seamDark)}*(1.0-smoothstep(0.0,${F(T.seam)}+aa,bd))*(1.0-open)*keep);
}
`;

// ---- Vault secret (Ian 2026-10-06): hold one finger 7 s -> bubbles spread from the finger and cluster on the bones,
// the block boils, a dark door rises out of the middle and parts the jelly. Fires myr5:portal-secret {board:'jelly'}.
// jellySecret is the pure reducer (ms clock): state {id,x,y,t0,skip,up,upH,done}; held() is the effective hold in ms
// (a lifted finger's value drains to 0 over `subside`, so every visual below just follows it).
export const HOLD={ms:7000,drift:24,subside:1000,front:6,boil:5.5,doorFrom:6.2,door:7,sink:.7}; // seconds: front reaches every bone, boil ramp starts, door rise, lands at ms; sink = door drop per s on lift
export const held=(s,now)=>s.done?HOLD.ms:s.id==null?0:s.up!=null?Math.max(0,s.upH*(1-(now-s.up)/HOLD.subside)):Math.max(0,now-s.t0+s.skip);
export function jellySecret(s,ev,now){
 s=s||{};const live=s.id!=null&&s.up==null&&!s.done,mine=live&&ev.id===s.id;
 switch(ev.type){
  case'down':return s.done||live?s:{id:ev.id,x:ev.x,y:ev.y,t0:now,skip:0,up:null,done:false};
  case'move':return mine&&Math.hypot(ev.x-s.x,ev.y-s.y)>HOLD.drift?{...s,up:now,upH:held(s,now),drift:true}:s;
  case'up':return mine?{...s,up:now,upH:held(s,now)}:s;
  case'skip':return live?{...s,skip:s.skip+ev.ms}:s;
  case'tick':return live&&held(s,now)>=HOLD.ms?{...s,done:true}:s;
 }
 return s;
}
const clamp01=x=>Math.max(0,Math.min(1,x)),ease=x=>x*x*(3-2*x);
function rng(seed){return()=>(seed=(seed*1664525+1013904223)>>>0)/4294967296;}
const NB=300,NS=36; // bubbles (bone clusters + free + boil extras), steam puffs
function makeFx(THREE,scene,mesh,face,toWorld,boneZ){
 const rnd=rng(7),g=new THREE.Group(),dummy=new THREE.Object3D(),bones=[];
 g.frustumCulled=false;
 const geo=mesh.isMesh?mesh.geometry:mesh.children?.[0]?.geometry,pos=geo?.attributes?.position;
 if(pos&&pos.count){const st=Math.max(1,Math.floor(pos.count/400));for(let i=0;i<pos.count;i+=st)if(pos.getZ(i)>boneZ)bones.push([(pos.getX(i)+face.w/2)/face.w,(face.h/2-pos.getY(i))/face.h]);}
 if(!bones.length)for(let i=0;i<150;i++)bones.push([.1+.8*rnd(),.08+.84*rnd()]); // no mesh (tests): scatter
 const bub=Array.from({length:NB},(_,i)=>{ // 0-159 ride the bones, 160-219 free, 220+ boil extras
  const b=i<160?bones[Math.floor(rnd()*bones.length)]:[.06+.88*rnd(),.05+.9*rnd()],j=i<160?.012:0;
  return{u:b[0]+(rnd()-.5)*j,v:b[1]+(rnd()-.5)*j,r:3+4*rnd(),P:.8+.5*rnd(),ph:rnd(),w:rnd()*6.28,extra:i>=220?rnd():-1};});
 const bm=new THREE.InstancedMesh(new THREE.SphereGeometry(1,10,8),new THREE.MeshStandardMaterial({color:0xcfffb8,emissive:0x2f7a22,roughness:.1,transparent:true,opacity:.5,depthWrite:false}),NB);
 const sc=document.createElement('canvas');sc.width=sc.height=64;const x=sc.getContext('2d'),gr=x.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(235,255,225,.9)');gr.addColorStop(1,'rgba(235,255,225,0)');x.fillStyle=gr;x.fillRect(0,0,64,64);
 const steamTex=new THREE.CanvasTexture(sc),sm=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:steamTex,transparent:true,opacity:.3,depthWrite:false}),NS);
 const steam=Array.from({length:NS},()=>({u:rnd(),P:1.6+1.2*rnd(),ph:rnd(),s:30+30*rnd(),w:rnd()*6.28}));
 bm.frustumCulled=sm.frustumCulled=false;g.add(bm,sm);
 // door: dark gap, gold frame, slab, flywheel; two jelly flaps part to either side
 const door=new THREE.Group(),m=(c,o={})=>new THREE.MeshStandardMaterial({color:c,...o}),B=new THREE.BoxGeometry(1,1,1);
 const add=(geom,mat,px,py,pz,sx,sy,sz)=>{const o=new THREE.Mesh(geom,mat);o.position.set(px,py,pz);o.scale.set(sx,sy,sz);door.add(o);return o;};
 const flapMat=new THREE.MeshStandardMaterial({color:0x7ddc4a,emissive:0x1d4a12,roughness:.15,transparent:true,opacity:.62,depthWrite:false});
 const flaps=[-1,1].map(()=>{const f=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),flapMat);g.add(f);return f;});
 const parts={gap:add(B,new THREE.MeshBasicMaterial({color:0x04060a,transparent:true,opacity:.92}),0,0,0,1.1,1.06,.1),
  frame:add(B,m(0xc9a24a,{metalness:.8,roughness:.35,emissive:0x2a1f05}),0,0,1,1.07,1.04,.6),
  slab:add(B,m(0x34303c,{metalness:.7,roughness:.42,emissive:0x120a1c}),0,0,2,1,1,1),
  wheel:add(new THREE.TorusGeometry(1,.14,8,24),m(0xd8b45c,{metalness:.8,roughness:.3,emissive:0x2a1f05}),0,0,2,1,1,1)};
 g.add(door);door.visible=false;scene.add(g);
 const sizes=()=>{const[x0,y0]=toWorld(0,0),[x1,y1]=toWorld(1,1);return{fw:x1-x0,fh:y0-y1,cx:(x0+x1)/2,cy:(y0+y1)/2-.03*(y0-y1)};};
 let doorP=0,lastT=0;
 return{bones:bones.length,get doorP(){return doorP;},reset(){doorP=0;},
  update(h,calm,time){ // h seconds held, calm 0..1 post-done fade, time seconds (any clock)
   const{fw,fh,cx,cy}=sizes(),[fu,fv]=S.fin,boil=ease(clamp01(h-HOLD.boil)),dmax=Math.max(.6,...bub.map(b=>Math.hypot(b.u-fu,(b.v-fv)*face.h/face.w))),keep=1-calm,Z=3,k=fw/300;
   bub.forEach((b,i)=>{
    const[wx,wy]=toWorld(b.u,b.v),d=Math.hypot(b.u-fu,(b.v-fv)*face.h/face.w);
    const delay=b.extra>=0?HOLD.boil+b.extra:d<.5?d*8:4+(d-.5)/Math.max(.1,dmax-.5)*(HOLD.front-4),c=h-delay,P=b.P*(1-.45*boil);
    let ph=(c/P+b.ph)%1;if(ph<0)ph+=1;
    const grow=ease(clamp01(c/.3))*(ph<.82?1:(1-ph)/.18)*keep,r=b.r*(1+.7*boil)*grow*k;
    dummy.position.set(wx+Math.sin(time*3+b.w)*3*(1+boil),wy+ph*fw*(.09+.1*boil),Z+r);dummy.scale.setScalar(Math.max(r,1e-4));dummy.updateMatrix();bm.setMatrixAt(i,dummy.matrix);});
   bm.instanceMatrix.needsUpdate=true;
   steam.forEach((s,i)=>{const ph=(time/s.P+s.ph)%1,a=boil*keep*Math.sin(ph*Math.PI),[sx,sy]=toWorld(s.u,.9-ph*.7);
    dummy.position.set(sx+Math.sin(time*.8+s.w)*10,sy,Z+14);dummy.scale.setScalar(Math.max(s.s*(.6+ph)*k*a,1e-4));dummy.updateMatrix();sm.setMatrixAt(i,dummy.matrix);});
   sm.instanceMatrix.needsUpdate=true;
   const tp=ease(clamp01((h-HOLD.doorFrom)/(HOLD.door-HOLD.doorFrom))),dt=Math.max(0,Math.min(.1,time-lastT));lastT=time;doorP=Math.max(tp,doorP-HOLD.sink*dt);const p=doorP,W=fw*.36,H=fh*.44,D=14*k;door.visible=p>.01;
   door.position.set(cx,cy,-D+p*D*1.8);door.scale.setScalar(Math.max(p,1e-3));
   parts.gap.scale.set(W*1.1,H*1.06,.1);parts.frame.scale.set(W*1.07,H*1.04,D*.6);parts.slab.scale.set(W,H,D);parts.slab.position.z=D*.3;parts.wheel.scale.setScalar(W*.2);parts.wheel.position.z=D*.9;
   flaps.forEach((f,i)=>{f.visible=p>.01;f.position.set(cx+(i?1:-1)*(W*p/2+W*.1),cy,Z+4);f.scale.set(W*.14*p+1e-3,H*.55*p+1e-3,10*k);});
  },
  dispose(){scene.remove?.(g);g.traverse(o=>{o.geometry?.dispose();o.material?.dispose?.();});steamTex.dispose();bm.dispose();sm.dispose();}};
}

let S=null; // per-instance state; a single portal board is ever active at once

function computeHalfDepth(THREE,mesh){
 const box=new THREE.Box3(),parts=mesh.isMesh?[mesh]:mesh.children;
 for(const m of parts){m.geometry.computeBoundingBox();box.union(m.geometry.boundingBox);}
 return box.max.z;
}
// uTime only advances on rendered frames, so a press on a sleeping board would stamp a stale time
// and the ripple would be born already expired. Stamp with the live clock (epoch learnt in step).
const clock=()=>S.epoch==null?S.uniforms.uTime.value:performance.now()/1000-S.epoch;
function pushRipple(u,v,amp){
 if(S.reduced)return; // reduced motion: no ripples (the gash still cuts, without the wobble)
 S.rippleVecs[S.nextSlot].set(u,v,clock(),amp);
 S.nextSlot=(S.nextSlot+1)%6;
}
function pushTrail(id,u,v,join){
 const prev=join?S.heads.get(id):null;
 if(prev&&Math.hypot(u-prev.u,(v-prev.v)*S.aspect)<TRAIL.step)return;
 const p={u,v,t:clock(),prev:prev||null};trailPush(S.trail,p);S.heads.set(id,p);
}

async function init({THREE,mesh,material,uniforms,scene,face,toWorld,wake}){
 material.roughness=.28;material.metalness=0;
 const rim=new THREE.DirectionalLight(0x9fe8ff,1.1);rim.position.set(.7,.6,.5);scene.add(rim); // cool highlight, upper-right-front
 uniforms.uRipple.value=Array.from({length:6},()=>new THREE.Vector4(0,0,0,0));
 uniforms.uTrail.value=Array.from({length:TRAIL.cap},()=>new THREE.Vector4(0,0,0,0));uniforms.uTrailN.value=0;
 uniforms.uTrailBounds.value=new THREE.Vector4(0,0,0,0);
 const hd=computeHalfDepth(THREE,mesh),seg=BONE.seg*face.w; // glb centres the mesh: z spans -hd..hd
 uniforms.uHalfDepth.value=hd;uniforms.uBoneZ.value=hd*(2*BONE.zFrac-1);uniforms.uSeg.value=seg;uniforms.uBoneFollow.value=BONE.follow;
 uniforms.uGridO.value=new THREE.Vector2((BONE.centre[0]-.5)*face.w-seg/2,(.5-BONE.centre[1])*face.h-seg/2); // face centred on 0
 uniforms.uRidgeAmp.value=BONE.ridgeAmp;uniforms.uRidgeFreq.value=2*Math.PI*BONE.ridgeFreq/seg;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;uniforms.uWobble.value=reduced?0:1;
 uniforms.uTrailTint.value={r:1,g:1,b:1,isColor:true};writeLinearTint(uniforms.uTrailTint.value,selectedTint||'#ffffff');uniforms.uTrailTintMix.value=selectedTint?1:0;
 S={uniforms,toWorld,faceW:face.w,aspect:face.h/face.w,rippleVecs:uniforms.uRipple.value,nextSlot:0,lastSpawn:new Map(),
    reduced,trail:[],heads:new Map(),epoch:null,wake,sec:{},fin:[.5,.5],fxLast:0,calmAt:0,
    fx:THREE.InstancedMesh&&typeof document!=='undefined'?makeFx(THREE,scene,mesh,face,toWorld,uniforms.uBoneZ.value):{update(){},reset(){},dispose(){}}};trail3d=S;
 globalThis.myr5JellyFF=ms=>{S&&secret({type:'skip',ms});S?.wake();};myr5JellyFF.held=()=>S&&held(S.sec,performance.now())/1000;myr5JellyFF.door=()=>S?.fx.doorP; // debug: fast-forward the hold / read it
}
function press(id,u,v){
 const[x,y]=S.toWorld(u,v);if(S.sec.id==null||S.sec.up!=null){S.fin=[u,v];}secret({type:'down',id,x,y});
 S.lastSpawn.set(id,[u,v]);
 pushRipple(u,v,S.faceW*TAP_AMP);
 pushTrail(id,u,v,false);
}
function move(id,u,v,pu,pv){
 {const[x,y]=S.toWorld(u,v);secret({type:'move',id,x,y});}
 const last=S.lastSpawn.get(id)||[pu,pv],[lx,ly]=S.toWorld(last[0],last[1]),[cx,cy]=S.toWorld(u,v);
 if(Math.hypot(cx-lx,cy-ly)>=DRAG_STEP_PX){pushRipple(u,v,S.faceW*DRAG_AMP);S.lastSpawn.set(id,[u,v]);}
 pushTrail(id,u,v,true);
}
function release(id,u,v){secret({type:'up',id});pushRipple(u,v,S.faceW*RELEASE_AMP);S.lastSpawn.delete(id);pushTrail(id,u,v,true);S.heads.delete(id);}
const secret=ev=>{S.sec=jellySecret(S.sec,ev,performance.now());};
// claims(id): the finger that is (still) holding the secret; a drifted-off finger is just a stroke again.
const claims=id=>!!S&&S.sec.id===id&&S.sec.up==null;
function step(dt,frameNow){
 let active=false;
 const ut=S.uniforms.uTime.value;S.epoch=frameNow/1000-ut;
 {const was=S.sec.done,now=frameNow;S.sec=jellySecret(S.sec,{type:'tick'},now);
  if(S.sec.done&&!was){S.calmAt=now;if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('myr5:portal-secret',{detail:{board:'jelly'}}));}
  const h=held(S.sec,now)/1000,calm=S.sec.done?clamp01((now-S.calmAt)/1500):0;
  if(h>0){ // finger bobble, then a harder boil: ripples around the finger / anywhere
   const gap=h>HOLD.boil?140:450;if(now-S.fxLast>gap){S.fxLast=now;const b=h>HOLD.boil,a=Math.random();pushRipple(b?.1+.8*a:S.fin[0]+(a-.5)*.2,b?.1+.8*Math.random():S.fin[1]+(Math.random()-.5)*.2,S.faceW*(b?.03:.015)*(1-calm));}}
  S.fx.update(h,calm,now/1000);active=h>0&&calm<1||!S.sec.done&&S.fx.doorP>.01;}
 for(const r of S.rippleVecs)if(r.w>0&&(ut-r.z)<RIPPLE_MAX_AGE)active=true;
 trailExpire(S.trail,ut);
 S.uniforms.uTrailN.value=trailPack(S.trail,S.uniforms.uTrail.value);
 const margin=TRAIL.width/2+.01,b=trailBounds(S.trail,margin,margin/S.aspect);
 S.uniforms.uTrailBounds.value.set(...(b||[0,0,0,0]));
 return active||S.trail.length>0;
}
function setJellyTint(hex,selected=true){
 if(selected&&!validTint(hex))return;
 selectedTint=selected?hex:null;
 if(trail3d){writeLinearTint(trail3d.uniforms.uTrailTint.value,selectedTint||'#ffffff');trail3d.uniforms.uTrailTintMix.value=selectedTint?1:0;trail3d.wake?.();}
 if(trail2d){trail2d.tint=selectedTint;trail2d.wake?.();}
}
// Back to a fresh block after the secret (portal.mjs / the glb host call this through heal): door, flaps and bubbles gone, hold forgotten.
function healSecret(){if(!S)return;S.sec={};S.calmAt=0;S.fx.reset();S.fx.update(0,0,performance.now()/1000);S.wake?.();}
function dispose(){S?.fx.dispose();delete globalThis.myr5JellyFF;if(S===trail3d)trail3d=null;S=null;}

// R7: the gash in 2D, for the flat board: the same short trail (trailPush/trailExpire/gashWidth) as a translucent lime
// slit on `paint` (drawn opaque, deeper down its middle, then faded as a whole by SLIT.alpha, so the round joins never
// stack into beads) inside a light rim on `glow`, tapering to a thin healing seam behind the finger. Own state, no THREE.
const SLIT={lime:'rgb(150,240,70)',deep:'rgb(45,125,20)',deepFrac:.4,alpha:.62,rim:.008,seam:'rgb(195,255,140)',seamAlpha:.55};
export function jellyGash(){
 let S=null;
 const rgb=(c,k)=>`rgb(${c.map(v=>v*k*255|0)})`;
 const push=(id,u,v,join)=>{const prev=join?S.heads.get(id):null;if(prev&&Math.hypot(u-prev.u,(v-prev.v)*S.aspect)<TRAIL.step)return;const p={u,v,t:performance.now()/1000,prev:prev||null};trailPush(S.trail,p);S.heads.set(id,p);};
 return {
  init({paint,glow,wake}){S={paint,glow,W:paint.canvas.width,H:paint.canvas.height,aspect:paint.canvas.height/paint.canvas.width,trail:[],heads:new Map(),wake,tint:selectedTint};trail2d=S;},
  setTint(hex,selected=true){setJellyTint(hex,selected);},
  press(id,u,v){push(id,u,v,false);},
  move(id,u,v){push(id,u,v,true);},
  release(id,u,v){push(id,u,v,true);S.heads.delete(id);},
  step(dt,now){
   const t=now/1000,{W,H}=S,pc=S.paint.ctx,gc=S.glow.ctx,live=new Set(trailExpire(S.trail,t));
   pc.clearRect(0,0,W,H);gc.clearRect(0,0,W,H);pc.lineCap=gc.lineCap='round';
   const segs=[...live].filter(b=>b.prev&&live.has(b.prev)).map(b=>{const a=b.prev,age=t-(a.t+b.t)/2;return {age,w:gashWidth(age)*W,x0:a.u*W,y0:a.v*H,x1:b.u*W,y1:b.v*H};});
   const line=(c,s,width,{x0,y0,x1,y1})=>{c.strokeStyle=s;c.lineWidth=width;c.beginPath();c.moveTo(x0,y0);c.lineTo(x1,y1);c.stroke();};
   const open=segs.filter(s=>s.w>.5);
   const lime=S.tint?tintRgb(S.tint):SLIT.lime,deep=S.tint?tintRgb(S.tint,.42):SLIT.deep,seam=S.tint?tintRgb(S.tint,.82):SLIT.seam,edge=S.tint?tintRgb(S.tint,.92):rgb(TRAIL.edgeRGB,1);
   for(const s of open)line(pc,lime,s.w,s);for(const s of open)line(pc,deep,s.w*SLIT.deepFrac,s); // the slit, opaque
   pc.globalCompositeOperation='destination-in';pc.fillStyle=`rgba(0,0,0,${SLIT.alpha})`;pc.fillRect(0,0,W,H);pc.globalCompositeOperation='source-over'; // then translucent
   for(const s of segs)if(s.w<=.5){pc.globalAlpha=SLIT.seamAlpha*(1-Math.min(1,(s.age-TRAIL.close)/(TRAIL.life-TRAIL.close)));line(pc,seam,W*TRAIL.seam,s);} // the healing tail
   pc.globalAlpha=1;
   for(const s of open)line(gc,edge,s.w+2*W*SLIT.rim,s); // the rim, the slit cut out of it
   gc.globalCompositeOperation='destination-out';for(const s of open)line(gc,'#000',s.w,s);gc.globalCompositeOperation='source-over';
   return S.trail.length>0;
  },
  dispose(){if(S===trail2d)trail2d=null;S=null;},
 };
}

export const jelly={
 id:'jelly',asset:'/pod/worlds/boards/jelly.glb',flip:false,background:'#0d160a',ink:false, // the gash is the trace trail: no portal ink line over it
 guide:{color:'#c8ffb0',alpha:.12,width:4},
 pattern:{left:.07,top:.055,right:.93,bottom:.87}, // measured in-browser against the carved oval's extremes
 uniforms:{uRipple:{value:[]},uHalfDepth:{value:1},uBoneZ:{value:1},uSeg:{value:1},uGridO:{value:null},uBoneFollow:{value:1},uRidgeAmp:{value:0},uRidgeFreq:{value:0},uTrail:{value:[]},uTrailN:{value:0},uTrailBounds:{value:null},uWobble:{value:1},uTrailTint:{value:null},uTrailTintMix:{value:0}},
 uniformDecls:'varying float vDepthF;\n',
 vertexDecls:'uniform vec4 uRipple[6];\nuniform float uHalfDepth;\nuniform float uBoneZ;\nuniform float uSeg;\nuniform vec2 uGridO;\nuniform float uBoneFollow;\nuniform float uRidgeAmp;\nuniform float uRidgeFreq;\n'+JELLY_FIELD,
 fragmentDecls:`uniform vec4 uTrail[${TRAIL.cap}];\nuniform int uTrailN;\nuniform vec4 uTrailBounds;\nuniform float uWobble;\nuniform vec3 uTrailTint;\nuniform float uTrailTintMix;\n`, // fragment only (portal-board-glb.mjs)
 vertexDisplace:VERTEX_DISPLACE,
 fragment:FRAGMENT,
 init,press,move,release,claims,step,healSecret,dispose,setTint:setJellyTint,tintTarget:'trace',trace2d:jellyGash,
};

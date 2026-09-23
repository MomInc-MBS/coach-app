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
// jelly, with a static sine ridge in the normal so the segments catch light. AGPL-3.0-or-later.

const RK=12,RW=10.5,RDECAY=1.7,RSPREAD=1.8,SLOSH=.5; // spatial freq, temporal freq (rad/s: ~2.5 wobbles in 1.5 s), time decay, spatial decay (all in "face widths"), lateral/heave ratio
const TAP_AMP=.065,DRAG_AMP=.03,RELEASE_AMP=.03; // ripple heave at the centre, in face widths
const DENT_AMT=2.6,DENT_RAD=1.4; // finger dent vs. DEFAULT_DISPLACE (ice): deeper, wider/softer falloff
// Ian: bones rigid + segmented, jelly wobbles (2026-09-22)
// zFrac: bone threshold as a fraction of depth back->front (jelly face sits ~.89-.93, rods .94-1);
// seg: segment length in face widths, with centre: a face uv (v down) the grid is centred on — the
// middle rod crossing; this seg puts the straight rods (x 0/±.25, rows .162 apart) mid-cell, so
// no rod is split lengthwise between two cells; follow: bones' share of the jelly motion;
// ridgeAmp: normal slope of the ridge (~1/4 of a tap's wobble slope; .13 barely read over the
// bone texture); ridgeFreq: ridge cycles per segment.
const BONE={zFrac:.94,seg:.0546,centre:[.5,.444],follow:.55,ridgeAmp:.2,ridgeFreq:1};
const RIPPLE_MAX_AGE=2,GLOW_MS=600,GLOW_REDRAW_MS=80,DRAG_STEP_PX=30;
const GLOW_RGB='150,255,120',GLOW_ALPHA=.45,GLOW_R=.06; // soft green touch glow, radius in face widths
const F=x=>x.toFixed(4); // GLSL float literal

// Pure mirror of the shader's quantisation: centre of the seg-sized grid cell (corner at ox,oy)
// holding (x,y).
export const segmentCentre=(x,y,seg,ox=0,oy=0)=>[(Math.floor((x-ox)/seg)+.5)*seg+ox,(Math.floor((y-oy)/seg)+.5)*seg+oy];

// Dent + ripple displacement (xy slosh, z heave) at face point p, plus its height gradient.
// Rides in uniformDecls: a GLSL function can't be declared inside main(), where vertexDisplace goes.
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
float jw=bone?uBoneFollow:smoothstep(-uHalfDepth,uHalfDepth,position.z);
transformed+=jellyField(bone?q:position.xy,jg)*jw;jg*=jw;
if(bone)jg+=uRidgeAmp*sin((position.xy-q)*uRidgeFreq);
#ifndef FLAT_SHADED
vNormal=normalize(normalMatrix*(objectNormal-vec3(jg,0.0)));
#endif
`;

let S=null; // per-instance state; a single portal board is ever active at once

function computeHalfDepth(THREE,mesh){
 const box=new THREE.Box3(),parts=mesh.isMesh?[mesh]:mesh.children;
 for(const m of parts){m.geometry.computeBoundingBox();box.union(m.geometry.boundingBox);}
 return box.max.z;
}
// Redraw every live blob on a cleared canvas (the whole texture re-uploads anyway), so fading or
// expiring one blob never leaves stale pixels or holes in an overlapping one.
function drawGlow(now){
 const ctx=S.glow.ctx,{width:w,height:h}=S.glow.canvas;
 ctx.clearRect(0,0,w,h);S.glowBlobs=S.glowBlobs.filter(b=>now-b.start<GLOW_MS);
 for(const b of S.glowBlobs){
  const g=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,b.r);
  g.addColorStop(0,`rgba(${GLOW_RGB},${GLOW_ALPHA*(1-(now-b.start)/GLOW_MS)})`);g.addColorStop(1,`rgba(${GLOW_RGB},0)`);
  ctx.fillStyle=g;ctx.fillRect(b.x-b.r,b.y-b.r,b.r*2,b.r*2);
 }
 S.lastGlow=now;S.glow.texture.needsUpdate=true;
}
// uTime only advances on rendered frames, so a press on a sleeping board would stamp a stale time
// and the ripple would be born already expired. Stamp with the live clock (epoch learnt in step).
const clock=()=>S.epoch==null?S.uniforms.uTime.value:performance.now()/1000-S.epoch;
function pushRipple(u,v,amp){
 if(S.reduced)return; // reduced motion: no ripples, glow only
 S.rippleVecs[S.nextSlot].set(u,v,clock(),amp);
 S.nextSlot=(S.nextSlot+1)%6;
}

async function init({THREE,scene,mesh,material,uniforms,paint,glow,face,toWorld}){
 material.roughness=.28;material.metalness=0;
 const rim=new THREE.DirectionalLight(0x9fe8ff,1.1);rim.position.set(.7,.6,.5);scene.add(rim); // cool highlight, upper-right-front
 uniforms.uRipple.value=Array.from({length:6},()=>new THREE.Vector4(0,0,0,0));
 const hd=computeHalfDepth(THREE,mesh),seg=BONE.seg*face.w; // glb centres the mesh: z spans -hd..hd
 uniforms.uHalfDepth.value=hd;uniforms.uBoneZ.value=hd*(2*BONE.zFrac-1);uniforms.uSeg.value=seg;uniforms.uBoneFollow.value=BONE.follow;
 uniforms.uGridO.value=new THREE.Vector2((BONE.centre[0]-.5)*face.w-seg/2,(.5-BONE.centre[1])*face.h-seg/2); // face centred on 0
 uniforms.uRidgeAmp.value=BONE.ridgeAmp;uniforms.uRidgeFreq.value=2*Math.PI*BONE.ridgeFreq/seg;
 S={uniforms,toWorld,faceW:face.w,rippleVecs:uniforms.uRipple.value,nextSlot:0,lastSpawn:new Map(),
    reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,glow,glowBlobs:[],lastGlow:0,epoch:null};
 void paint; // paint layer unused by jelly (lattice + guides carry the shapes)
}
function press(id,u,v){
 S.lastSpawn.set(id,[u,v]);
 pushRipple(u,v,S.faceW*TAP_AMP);
 const w=S.glow.canvas.width,h=S.glow.canvas.height,now=performance.now();
 S.glowBlobs.push({x:u*w,y:v*h,r:w*GLOW_R,start:now});
 drawGlow(now);
}
function move(id,u,v,pu,pv){
 const last=S.lastSpawn.get(id)||[pu,pv],[lx,ly]=S.toWorld(last[0],last[1]),[cx,cy]=S.toWorld(u,v);
 if(Math.hypot(cx-lx,cy-ly)>=DRAG_STEP_PX){pushRipple(u,v,S.faceW*DRAG_AMP);S.lastSpawn.set(id,[u,v]);}
}
function release(id,u,v){pushRipple(u,v,S.faceW*RELEASE_AMP);S.lastSpawn.delete(id);}
function step(dt,frameNow){
 let active=false;
 const ut=S.uniforms.uTime.value,now=performance.now();S.epoch=frameNow/1000-ut;
 for(const r of S.rippleVecs)if(r.w>0&&(ut-r.z)<RIPPLE_MAX_AGE)active=true;
 if(S.glowBlobs.length){if(now-S.lastGlow>=GLOW_REDRAW_MS)drawGlow(now);active=true;}
 return active;
}
function dispose(){S=null;}

export const jelly={
 id:'jelly',asset:'./pod/worlds/boards/jelly.glb',flip:false,background:'#0d160a',
 guide:{color:'#c8ffb0',alpha:.12,width:4},
 pattern:{left:.07,top:.055,right:.93,bottom:.87}, // measured in-browser against the carved oval's extremes
 uniforms:{uRipple:{value:[]},uHalfDepth:{value:1},uBoneZ:{value:1},uSeg:{value:1},uGridO:{value:null},uBoneFollow:{value:1},uRidgeAmp:{value:0},uRidgeFreq:{value:0}},
 uniformDecls:'uniform vec4 uRipple[6];\nuniform float uHalfDepth;\nuniform float uBoneZ;\nuniform float uSeg;\nuniform vec2 uGridO;\nuniform float uBoneFollow;\nuniform float uRidgeAmp;\nuniform float uRidgeFreq;\n'+JELLY_FIELD,
 vertexDisplace:VERTEX_DISPLACE,
 init,press,move,release,step,dispose,
};

// Pond grimoire (R21 L4) for portal-board-glb.mjs: a square, murky, brackish blue-green pond. The water is a
// procedural plane (effect.build, no GLB) whose surface runs a CPU ripple height-field (the physics): it bends
// the bed and the koi like the portal's liquid glass (GLASS bend + fringe + finger-lit rim, portal.mjs lensMap/
// tunnelFragment), tilts the pads, and pushes the free ones. Small instanced low-poly 3D lily pads (with their
// notch) and lily flowers float on top: anchor lilies rest on every vertex/base/apex/line end of every traceable
// template (and along each template so the shapes read). All pads move aside around the finger and ripples, then
// ease home; free ones also drift. Under the surface, blurred dark koi shadows wander (boids); a held finger slowly draws them
// in, arriving face first under it; drawing leads them as a snaking school that grows as more join. 8 s with no
// touch (idleMs 4 s wander + scatterMs 4 s): the fish scatter off the pond, one huge koi shadow drifts slowly across in a
// random direction for bigMs 16 s, then they come back. SECRET (Achievement Vault): press and hold on the huge koi; it
// pitches up toward the surface, grows and warms to koi colour over <= 2 s (its shadow shrinks on the bed), then bursts into
// ripples + droplets and dispatches 'myr5:portal-secret' {board:'pond'}. Lift early and it gets bored: turns and swims off
// the face (no award). pondSecret is the pure reducer. Reduced motion: still water, still fish. AGPL-3.0-or-later.
import {SHAPES,fromFrame} from './portal-shapes.mjs';
import {pointInPolygon} from './portal-cut.mjs';

// Every tunable in one place. Lengths are in face widths (the pond's width = 1), speeds per second.
export const POND={
 aspect:16/9,          // face height / width (portal.mjs FACE.pond = 1/aspect)
 frame:{x0:.1,y0:.13,x1:.9,y1:.85}, // where the templates sit on the face (UV, v down)
 padR:.058,            // pad radius: ~100 pads side by side fill a phone screen
 anchorSpacing:.17,    // anchor lilies along each template, at most this far apart
 anchorMerge:.075,     // anchors closer than this are one lily (templates overlap a lot)
 anchorScale:.5,      // an along-the-line anchor pad vs a vertex one
 freePads:16,lilyShare:.35,padClear:2.1, // drifting pads, the share carrying a flower, min spacing (pad radii)
 drift:.014,driftHz:.045,                // free pads' slow wander about home
 spring:2.6,damping:2.2,pushR:.17,pushK:1.6,waveK:1.5,tilt:2.5, // pad physics: back home, finger push, ripple push, ripple tilt
 fish:14,koiLen:.24,koiAlpha:.72,swimHz:1.1,bend:.5, // koi shadows: count, length, darkness, tail beat, body undulation
 wanderSpeed:.06,attractSpeed:.17,schoolSpeed:.6,scatterSpeed:.4,maxForce:.9,arriveR:.14,
 jitter:2.4,margin:.12,sepR:.07,sepK:.6,
 attractR:.14,joinR:.085,leaveR:.22,gap:.075,trailStep:.012,trailCap:160, // stronger nearby attraction and a more persistent following school
 releaseMs:850,releaseSpeed:.52, // a short outward swim when the finger lifts
 idleMs:4000,scatterMs:4000,bigMs:16000,bigLen:1.3,bigAlpha:.62, // big fish starts at eight seconds total
 wave:{cols:64,damping:.982,press:.9,drag:.35,hold:.05,holdHz:1.6,gain:90}, // ripple height-field
 glass:{bend:.12,fringe:.3,rim:.55},     // refraction (face widths at full slope), dispersion, finger-lit rim glint
 lily:'#ffd3e4',lilyCore:'#ffcc33',shadow:[.01,.035,.03],
};

// --- Pure helpers (no THREE, no DOM) ------------------------------------------------------------
// Seedable PRNG (mulberry32): the layout is the same every visit, and tests can drive the fish.
export function rng(seed=1){let a=seed>>>0;return()=>{a=a+0x6D2B79F5>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
const TAU=Math.PI*2;
// Secret reducer. s={st:'idle'|'hold'|'done'|'bored',id,t0,x0,y0}. ev (pond space): {type:'down',id,x,y,phase,big:{x,y}},
// {type:'move',id,x,y}, {type:'up',id}, {type:'tick'}, {type:'reset'}. Held >= riseMs => done; early lift or > drift => bored.
export const SECRET={riseMs:2000,drift:.07,hit:.35}; // drift 24 px ~ .07 face widths on a 345 px face
export function pondSecret(s,ev,now,K=POND,C=SECRET){
 s=s||{st:'idle',id:null};
 if(ev.type==='reset')return {st:'idle',id:null};
 if(ev.type==='down')return s.st==='idle'&&ev.phase==='big'&&Math.hypot(ev.x-ev.big.x,ev.y-ev.big.y)<=K.bigLen*C.hit?{st:'hold',id:ev.id,t0:now,x0:ev.x,y0:ev.y}:s;
 if(s.st!=='hold')return ev.type==='up'&&ev.id===s.id?{...s,id:null}:s;
 if(ev.type==='tick')return now-s.t0>=C.riseMs?{...s,st:'done'}:s;
 if(ev.id!==s.id)return s;
 if(ev.type==='move')return Math.hypot(ev.x-s.x0,ev.y-s.y0)>C.drift?{...s,st:'bored'}:s;
 return {...s,st:now-s.t0>=C.riseMs?'done':'bored',id:null}; // up
}
// Template point -> pond space (x right, y down, both in face widths: y = v * aspect).
const toPond=(tx,ty,frame,A)=>{const [u,v]=fromFrame(tx,ty,frame);return [u,v*A];};
// Every vertex / base / apex / line end of every template: the oval's four extremes, every other polyline's points.
export function templateVertices(){
 const out=[];
 for(const polys of Object.values(SHAPES))for(const {points} of polys){
  if(points.length>40){for(const k of [0,.25,.5,.75])out.push(points[Math.round(k*points.length)%points.length]);}
  else for(const p of points)out.push(p);
 }
 return out;
}
// Anchor lilies [{x,y,vertex}] in pond space: a lily on every template vertex (merged when near-duplicate), then pads
// along every template, spaced at most `spacing`, skipping any spot within `merge` of an anchor already placed.
export function anchorLilies(frame=POND.frame,A=POND.aspect,{spacing=POND.anchorSpacing,merge=POND.anchorMerge}={}){
 const out=[],near=(x,y)=>out.some(p=>Math.hypot(p.x-x,p.y-y)<merge),add=(x,y,vertex)=>{if(!near(x,y))out.push({x,y,vertex});};
 for(const [tx,ty] of templateVertices())add(...toPond(tx,ty,frame,A),true);
 for(const polys of Object.values(SHAPES))for(const {points} of polys){
  const pts=points.map(([tx,ty])=>toPond(tx,ty,frame,A));if(points.length>40)pts.push(pts[0]); // close the oval
  if(points.length>40){ // smooth: walk the arc length
   let run=0;for(let i=1;i<pts.length;i++){const d=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);run+=d;if(run>=spacing){add(pts[i][0],pts[i][1],false);run=0;}}
  }else for(let i=1;i<pts.length;i++){ // straight: even steps along each side
   const [ax,ay]=pts[i-1],[bx,by]=pts[i],n=Math.ceil(Math.hypot(bx-ax,by-ay)/spacing);
   for(let k=1;k<n;k++)add(ax+(bx-ax)*k/n,ay+(by-ay)*k/n,false);
  }
 }
 return out;
}
// Free pads scattered between the anchors (rejection sampling, seeded): [{x,y}] in pond space.
export function freePads(anchors,A=POND.aspect,rand=rng(7),K=POND){
 const out=[],r=K.padR,min=K.padClear*r,all=[...anchors];
 for(let t=0;t<4000&&out.length<K.freePads;t++){
  const x=r+rand()*(1-2*r),y=r+rand()*(A-2*r);
  if(all.some(p=>Math.hypot(p.x-x,p.y-y)<min*(p.vertex===false?.8:1)))continue;
  const p={x,y};out.push(p);all.push(p);
 }
 return out;
}
// Idle show by ms since the last touch: 'wander' for idleMs, then 'scatter' (fish leave), then 'big' (the huge koi
// crosses), then round again (the fish return during the next wander). cycle counts shows, so each crossing differs.
export function idlePhase(ms,K=POND){
 const P=K.idleMs+K.scatterMs+K.bigMs,cycle=Math.floor(Math.max(0,ms)/P),m=Math.max(0,ms)-cycle*P;
 if(m<K.idleMs)return {phase:'wander',t:m,cycle};
 if(m<K.idleMs+K.scatterMs)return {phase:'scatter',t:m-K.idleMs,cycle};
 return {phase:'big',t:m-K.idleMs-K.scatterMs,cycle};
}
// The huge koi's pose t01 of the way across (pond space): a random direction per show, a line through near the
// centre, starting and ending fully off the pond.
export function bigFishPose(seed,t01,A=POND.aspect,len=POND.bigLen,out={x:0,y:0,a:0}){
 const r=rng(seed*7919+13),a=r()*TAU,off=(r()-.5)*.5,dx=Math.cos(a),dy=Math.sin(a),R=Math.hypot(.5,A/2)+len*.6;
 const cx=.5-dy*off,cy=A/2+dx*off;out.x=cx+dx*R*(2*t01-1);out.y=cy+dy*R*(2*t01-1);out.a=a;return out;
}
// Steer (Reynolds seek with arrival) f={x,y,vx,vy} toward (tx,ty): desired speed max, slowing inside arrive; the
// change of velocity is capped at force per second. Integrates position. Returns the distance left.
export function steer(f,tx,ty,max,force,arrive,dt){
 const dx=tx-f.x,dy=ty-f.y,d=Math.hypot(dx,dy)||1e-9,sp=d<arrive?max*d/arrive:max;
 let ax=dx/d*sp-f.vx,ay=dy/d*sp-f.vy;const a=Math.hypot(ax,ay),cap=force*dt;if(a>cap){ax*=cap/a;ay*=cap/a;}
 f.vx+=ax;f.vy+=ay;f.x+=f.vx*dt;f.y+=f.vy*dt;return d;
}
// The finger's trail as a ring buffer in pond space; pointAt walks back `dist` along it from the newest point.
export function makeTrail(cap=POND.trailCap){return {x:new Float32Array(cap),y:new Float32Array(cap),n:0,head:-1,cap};}
export function trailPush(T,x,y,step=POND.trailStep){
 if(T.n&&Math.hypot(x-T.x[T.head],y-T.y[T.head])<step)return false;
 T.head=(T.head+1)%T.cap;T.x[T.head]=x;T.y[T.head]=y;T.n=Math.min(T.cap,T.n+1);return true;
}
export function trailAt(T,dist,out){
 let i=T.head,x=T.x[i],y=T.y[i],left=dist;
 for(let k=1;k<T.n;k++){const j=(T.head-k+T.cap)%T.cap,d=Math.hypot(T.x[j]-x,T.y[j]-y);if(d>=left){const s=left/d;out.x=x+(T.x[j]-x)*s;out.y=y+(T.y[j]-y)*s;return out;}left-=d;x=T.x[j];y=T.y[j];}
 out.x=x;out.y=y;return out;
}
// The school: koi shadows in pond space with their swim state.
export function makeFish(n=POND.fish,A=POND.aspect,rand=Math.random){
 return Array.from({length:n},()=>({x:.15+.7*rand(),y:A*(.1+.8*rand()),vx:0,vy:0,a:rand()*TAU,w:rand()*TAU,phase:rand()*TAU,member:-1}));
}
const P0={x:0,y:0};
// One step of every fish. S={fish,A,rand,touch:{x,y}|null,lastTouch(ms),trail,members}. Sets S.phase.
export function stepFish(S,dt,now,K=POND){
 const {fish,A,touch}=S,idle=touch?null:idlePhase(now-S.lastTouch,K),away=idle&&idle.phase!=='wander',releasing=!touch&&now<(S.releaseUntil||0);
 S.phase=touch?'touch':releasing?'release':idle.phase;
 for(const f of fish){
  let tx,ty,max,arrive=K.arriveR,face=false;
  if(touch){
   if(f.member>=0){trailAt(S.trail,f.member*K.gap,P0);if(Math.hypot(f.x-P0.x,f.y-P0.y)>K.leaveR)f.member=-1;}
   const fingerDist=Math.hypot(f.x-touch.x,f.y-touch.y);
   if(f.member<0&&fingerDist<K.joinR)f.member=S.members++;
   if(f.member>=0){trailAt(S.trail,f.member*K.gap,P0);tx=P0.x;ty=P0.y;max=K.schoolSpeed;arrive=K.arriveR*.6;}
   else if(fingerDist<K.attractR){tx=touch.x;ty=touch.y;max=K.attractSpeed;}
   if(tx!==undefined)face=Math.hypot(tx-f.x,ty-f.y)<arrive;
  }else if(releasing&&f.release){ // only fish that noticed the finger fan out
   const dx=f.x-S.releaseX,dy=f.y-S.releaseY,d=Math.hypot(dx,dy)||1;
   tx=f.x+(dx||Math.cos(f.a)*.01)/d;ty=f.y+(dy||Math.sin(f.a)*.01)/d;max=K.releaseSpeed;arrive=.01;
  }else if(away){ // swim straight out, away from the middle
   let ox=f.x-.5,oy=f.y-A/2;const o=Math.hypot(ox,oy)||1,R=Math.hypot(.5,A/2)+.25;ox/=o;oy/=o;tx=.5+ox*R;ty=A/2+oy*R;max=K.scatterSpeed;arrive=.01;
  }
  if(tx===undefined){ // wander: a jittered heading, turned back toward the pond when near or past its edge
   f.w+=(S.rand()-.5)*K.jitter*dt*4;
   const m=K.margin,out=f.x<m||f.x>1-m||f.y<m||f.y>A-m;
   if(out){tx=.5+(f.x<.5?-.1:.1);ty=A/2;max=K.wanderSpeed*(f.x<-.05||f.x>1.05||f.y<-.05||f.y>A+.05?2.5:1.2);}
   else{const h=Math.atan2(f.vy,f.vx)||f.a;tx=f.x+Math.cos(h)*.25+Math.cos(f.w)*.15;ty=f.y+Math.sin(h)*.25+Math.sin(f.w)*.15;max=K.wanderSpeed;}
   arrive=.01;
  }
  // separation: koi keep a body's width apart (all n², n is small)
  for(const g of fish)if(g!==f){const dx=f.x-g.x,dy=f.y-g.y,d=Math.hypot(dx,dy);if(d>1e-6&&d<K.sepR){const k=K.sepK*(1-d/K.sepR)*dt;f.vx+=dx/d*k;f.vy+=dy/d*k;}}
  steer(f,tx,ty,max,K.maxForce,arrive,dt);
  // heading follows the velocity; arrived under the finger, it turns to face the finger (face first)
  const sp=Math.hypot(f.vx,f.vy),want=face?Math.atan2(touch.y-f.y,touch.x-f.x):sp>.004?Math.atan2(f.vy,f.vx):f.a;
  let da=want-f.a;da-=TAU*Math.round(da/TAU);f.a+=da*Math.min(1,dt*(face?2.5:4));
  f.phase+=dt*TAU*K.swimHz*(.5+Math.min(2,sp/K.wanderSpeed)*.5);
 }
 if(touch){let n=0;for(const f of fish.filter(f=>f.member>=0).sort((a,b)=>a.member-b.member))f.member=n++;S.members=n;}
}
// Pointer state for stepFish: the newest finger leads.
export function fishTouch(S,x,y,now){if(!S.touch){S.trail.n=0;S.trail.head=-1;S.members=0;for(const f of S.fish){f.member=-1;f.release=false;}}S.releaseUntil=0;S.touch=S.touch||{x,y};S.touch.x=x;S.touch.y=y;trailPush(S.trail,x,y);S.lastTouch=now;}
export function fishRelease(S,now){if(S.touch){S.releaseX=S.touch.x;S.releaseY=S.touch.y;S.releaseUntil=now+POND.releaseMs;}S.touch=null;S.members=0;for(const f of S.fish){f.release=f.member>=0||Math.hypot(f.x-S.releaseX,f.y-S.releaseY)<POND.attractR;f.member=-1;}S.lastTouch=now;}

// --- Ripple height-field (classic two-buffer wave), pure typed arrays ---------------------------------------
export function makeWaves(cols,rows){return {cols,rows,cur:new Float32Array(cols*rows),prev:new Float32Array(cols*rows),energy:0};}
export function disturb(W,x,y,amp){ // x,y in 0..1 face UV
 const cx=Math.round(x*(W.cols-1)),cy=Math.round(y*(W.rows-1));
 for(let j=-2;j<=2;j++)for(let i=-2;i<=2;i++){const X=cx+i,Y=cy+j;if(X<1||Y<1||X>=W.cols-1||Y>=W.rows-1)continue;W.cur[Y*W.cols+X]-=amp*Math.exp(-(i*i+j*j)/2);}
 W.energy=Math.max(W.energy,Math.abs(amp));
}
export function stepWaves(W,damping){
 const {cols,rows}=W;let {cur,prev}=W,e=0;
 for(let y=1;y<rows-1;y++)for(let x=1,i=y*cols+1;x<cols-1;x++,i++){const v=((cur[i-1]+cur[i+1]+cur[i-cols]+cur[i+cols])*.5-prev[i])*damping;prev[i]=v;const a=v<0?-v:v;if(a>e)e=a;}
 W.prev=cur;W.cur=prev;W.energy=e;return e;
}
// Surface slope at x,y (face UV) in height per cell: [dh/du, dh/dv] (into out).
export function slopeAt(W,x,y,out){const X=Math.min(W.cols-2,Math.max(1,Math.round(x*(W.cols-1)))),Y=Math.min(W.rows-2,Math.max(1,Math.round(y*(W.rows-1)))),i=Y*W.cols+X,c=W.cur;out[0]=(c[i+1]-c[i-1])*.5;out[1]=(c[i+W.cols]-c[i-W.cols])*.5;return out;}

// --- Shaders --------------------------------------------------------------------------------------------
const F=x=>(+x).toFixed(4),V3=a=>`vec3(${a.map(F).join(',')})`,G=POND.glass;
// Murky bed: deep blue-green, brackish olive silt, darker in the deep middle; a dark mossy stone lip makes it a square pond.
const WATER_DECLS=`uniform sampler2D uWave;uniform vec4 uFinger;
float pH(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float pN(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(pH(i),pH(i+vec2(1.0,0.0)),f.x),mix(pH(i+vec2(0.0,1.0)),pH(i+1.0),f.x),f.y);}
vec3 pondBed(vec2 p,float asp){
 float n=pN(p*5.0+vec2(uTime*.02,0.0))*.62+pN(p*13.0-vec2(0.0,uTime*.035))*.38;
 vec3 c=mix(vec3(.008,.040,.062),vec3(.040,.135,.150),n);
 c=mix(c,vec3(.090,.130,.075),smoothstep(.62,.92,n)*.45);
 float deep=1.0-smoothstep(.0,.55,length((p-vec2(.5,asp*.5))*vec2(1.0,.62)));
 return c*(1.0-.45*deep);
}
`;
const WATER_FRAGMENT=`{
 float asp=uFaceSize.y/uFaceSize.x;vec2 P=vec2(vPlanar.x,vPlanar.y*asp);
 vec4 wv=texture2D(uWave,vPlanar);vec2 g=(wv.rg-0.5)*2.0;float slope=length(g);
 vec2 off=g*${F(G.bend)};
 vec3 col=slope>.02?vec3(pondBed(P+off*${F(1-G.fringe)},asp).r,pondBed(P+off,asp).g,pondBed(P+off*${F(1+G.fringe)},asp).b):pondBed(P+off,asp);
 vec2 L=normalize(uFinger.xy*vec2(1.0,asp)-P+vec2(1e-4));float lit=max(dot(g/max(slope,1e-4),L),0.0);
 totalEmissiveRadiance+=vec3(.75,.95,.9)*${F(G.rim)}*pow(lit,1.4)*smoothstep(.04,.5,slope)*(.35+.65*uFinger.z);
 totalEmissiveRadiance+=vec3(.6,.8,.75)*.05*smoothstep(.15,.6,slope);
 float e=min(min(vPlanar.x,1.0-vPlanar.x),min(vPlanar.y,1.0-vPlanar.y)*asp),lip=1.0-smoothstep(.018,.024,e);
 col*=.55+.45*smoothstep(.02,.09,e);
 vec3 stone=mix(vec3(.10,.115,.09),vec3(.20,.21,.16),pN(P*40.0))*(.75+.5*smoothstep(.0,.02,e));
 diffuseColor.rgb=mix(col,stone,lip);roughnessFactor=mix(.16,.85,lip);metalnessFactor=0.0;
 normal=normalize(normal+vec3(-g.x,g.y,0.0)*1.6*(1.0-lip));
 vec4 pg=texture2D(uPaint,vPlanar);totalEmissiveRadiance+=pg.rgb*pg.a*.8*(1.0-lip);
}`;
// Koi shadows: a segmented strip (head at +x) whose tail sways (phase travels head->tail), shifted by the same water
// slope as the bed (the refraction), drawn as a dark blurred silhouette under the pads.
const FISH_VS=`attribute vec4 aFish;uniform sampler2D uWave;uniform vec4 uFace;uniform float uRefract;varying vec2 vUv;varying float vA;varying float vC;
void main(){
 vec3 p=position;float t=0.5-p.x;
 p.y+=sin(aFish.x-t*4.5)*aFish.z*t*t*.32;p.x+=(cos(aFish.x-t*4.5)-1.0)*aFish.z*t*.03;
 vec4 w=instanceMatrix*vec4(p,1.0);
 vec2 uv=vec2((w.x-uFace.x)/uFace.z,(-w.y-uFace.y)/uFace.w);
 vec2 g=(texture2D(uWave,clamp(uv,0.0,1.0)).rg-0.5)*2.0;w.xy+=vec2(g.x,-g.y)*uRefract;
 vA=aFish.y;vC=aFish.w;vUv=vec2(position.x+0.5,position.y/.5+0.5);
 gl_Position=projectionMatrix*modelViewMatrix*w;
}`;
const FISH_FS=`uniform sampler2D uKoi;uniform vec3 uShadow;uniform float uFade;varying vec2 vUv;varying float vA;varying float vC;
void main(){float t=texture2D(uKoi,vUv).a,a=mix(t,smoothstep(.14,.42,t),vC)*vA*uFade;if(a<.004)discard;
 float p=sin(vUv.x*11.0+1.0)*.5+sin(vUv.x*4.0+vUv.y*9.0)*.5; // the risen koi: crisp edge, orange with cream patches
 vec3 koi=mix(vec3(.95,.42,.12),vec3(.98,.92,.82),smoothstep(.15,.4,p));
 koi*=.7+.3*(1.0-abs(vUv.y-.5)*1.8);koi=mix(koi,vec3(.04,.03,.03),max(smoothstep(.03,.015,length(vec2(vUv.x-.8,abs(vUv.y-.5)-.1))),0.0)*step(.6,vC));
 gl_FragColor=vec4(mix(uShadow,koi,vC),a);}`;

// --- Procedural low-poly meshes --------------------------------------------------------------------------
function padGeometry(THREE,rand){
 const seg=13,notch=.55,pos=[0,0,.05],idx=[];
 for(let i=0;i<=seg;i++){const a=notch/2+(TAU-notch)*i/seg;
  pos.push(Math.cos(a)*.55,Math.sin(a)*.55,.03+rand()*.04);
  pos.push(Math.cos(a)*(.97+rand()*.06),Math.sin(a)*(.97+rand()*.06),.1+rand()*.08);}
 for(let i=0;i<seg;i++){const a=1+2*i,b=a+1,c=a+2,d=a+3;idx.push(0,a,c, a,b,d, a,d,c);}
 idx.push(0,1,2);idx.push(0,2*seg+2,2*seg+1); // the notch's two cut edges stay closed to the centre
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);
 const flat=g.toNonIndexed();flat.computeVertexNormals();g.dispose();return flat;
}
function lilyGeometry(THREE){
 const pos=[],col=[],tri=(a,b,c,ca,cb,cc)=>{pos.push(...a,...b,...c);col.push(...ca,...cb,...cc);};
 const base=[1,.82,.88],tip=[1,1,1],mid=[1,.93,.95];
 for(const L of [{n:8,len:1,lift:.45,w:.36,rot:0},{n:6,len:.72,lift:.8,w:.34,rot:.4}]){
  for(let i=0;i<L.n;i++){
   const a=L.rot+TAU*i/L.n,c=Math.cos(a),s=Math.sin(a),at=(r,da,z)=>[Math.cos(a+da)*r,Math.sin(a+da)*r,z];
   const o=[c*.06,s*.06,.1],t=[c*L.len,s*L.len,.1+L.lift*L.len],l=at(L.len*.5,L.w,.1+L.lift*L.len*.35),r=at(L.len*.5,-L.w,.1+L.lift*L.len*.35),m=at(L.len*.55,0,.06+L.lift*L.len*.42);
   tri(o,r,m,base,mid,mid);tri(o,m,l,base,mid,mid);tri(r,t,m,mid,tip,mid);tri(m,t,l,mid,tip,mid);
  }
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.computeVertexNormals();return g;
}
function coreGeometry(THREE){const g=new THREE.ConeGeometry(.2,.32,6,1);g.rotateX(Math.PI/2);g.translate(0,0,.32);return g;}
// The koi silhouette (alpha only, head right), blurred by the shadow trick (works where ctx.filter doesn't).
function koiTexture(THREE){
 const W=256,H=128,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
 x.translate(-W*2,0);x.shadowOffsetX=W*2;x.shadowColor='#000';x.shadowBlur=9;x.fillStyle='#000';
 x.beginPath();x.ellipse(150,64,74,20,0,0,TAU);x.fill(); // body
 x.beginPath();x.ellipse(205,64,22,15,0,0,TAU);x.fill(); // head
 x.beginPath();x.moveTo(84,64);x.quadraticCurveTo(48,52,22,30);x.quadraticCurveTo(40,64,22,98);x.quadraticCurveTo(48,76,84,64);x.fill(); // tail
 for(const s of [-1,1]){x.beginPath();x.moveTo(172,64+s*14);x.quadraticCurveTo(160,64+s*44,138,64+s*42);x.quadraticCurveTo(150,64+s*26,160,64+s*12);x.fill();} // pectoral fins
 for(const s of [-1,1]){x.beginPath();x.moveTo(108,64+s*12);x.quadraticCurveTo(98,64+s*30,86,64+s*28);x.quadraticCurveTo(96,64+s*18,100,64+s*8);x.fill();} // pelvic fins
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.NoColorSpace;return t;
}

// --- The effect -------------------------------------------------------------------------------------------
let S=null; // one portal board at a time
const DROPS=72;
const reducedMotion=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const validTint=hex=>typeof hex==='string'&&/^#[0-9a-f]{6}$/i.test(hex);

function dropTexture(THREE){const c=document.createElement('canvas');c.width=c.height=32;const x=c.getContext('2d'),g=x.createRadialGradient(16,16,2,16,16,15);g.addColorStop(0,'#fff');g.addColorStop(.6,'rgba(255,255,255,.85)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,32,32);return new THREE.CanvasTexture(c);}
function build(THREE){
 const A=POND.aspect,geo=new THREE.PlaneGeometry(1,A,16,28);
 return new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0x0b2626,roughness:.2,metalness:0}));
}

function init({THREE,scene,mesh,uniforms,toWorld,wake}){
 const K=POND,A=K.aspect,rand=rng(21),reduced=reducedMotion();
 // Water: the ripple field, packed as slope (rg) + height (b) into a small texture the water and the koi both read.
 const cols=K.wave.cols,rows=Math.round(cols*A),waves=makeWaves(cols,rows),data=new Uint8Array(cols*rows*4).fill(128);
 const waveTex=new THREE.DataTexture(data,cols,rows,THREE.RGBAFormat,THREE.UnsignedByteType);
 waveTex.magFilter=waveTex.minFilter=THREE.LinearFilter;waveTex.needsUpdate=true;
 uniforms.uWave.value=waveTex;uniforms.uFinger.value=new THREE.Vector4(.5,.3,0,0);
 mesh.material&&(mesh.material.roughness=.2);

 // Pads and lilies: shape anchors first, then the freely drifting ones.
 const anchors=anchorLilies(K.frame,A),free=freePads(anchors,A,rng(7),K),pads=[...anchors.map(p=>({...p,anchor:true})),...free.map(p=>({...p,anchor:false,vertex:false}))];
 const lr=rng(11);
 for(const p of pads){p.hx=p.x;p.hy=p.y;p.vx=p.vy=0;p.rot=lr()*TAU;p.s=(p.anchor&&!p.vertex?K.anchorScale:.85+lr()*.3);p.seed=lr()*TAU;p.lily=p.vertex||(!p.anchor&&lr()<K.lilyShare);p.hidden=false;}
 const lilies=pads.filter(p=>p.lily);
 const padMat=new THREE.MeshStandardMaterial({flatShading:true,roughness:.62,metalness:0});
 const padMesh=new THREE.InstancedMesh(padGeometry(THREE,rng(3)),padMat,pads.length);
 const green=new THREE.Color();pads.forEach((p,i)=>{green.setHSL(.27+lr()*.06,.42+lr()*.15,.2+lr()*.08);padMesh.setColorAt(i,green);});
 const lilyMat=new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.5,side:THREE.DoubleSide,emissive:0x2a1c22});
 const lilyMesh=new THREE.InstancedMesh(lilyGeometry(THREE),lilyMat,lilies.length);
 const coreMesh=new THREE.InstancedMesh(coreGeometry(THREE),new THREE.MeshStandardMaterial({color:K.lilyCore,flatShading:true,roughness:.5,emissive:0x332200}),lilies.length);
 for(const m of [padMesh,lilyMesh,coreMesh]){m.frustumCulled=false;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(m);}

 // Koi shadows (+2: the huge one and its bed shadow while it rises), one instanced strip.
 const n=K.fish,fishGeo=new THREE.PlaneGeometry(1,.5,12,1),aFish=new THREE.InstancedBufferAttribute(new Float32Array((n+2)*4),4);
 aFish.setUsage(THREE.DynamicDrawUsage);fishGeo.setAttribute('aFish',aFish);
 const koi=koiTexture(THREE),fishMat=new THREE.ShaderMaterial({vertexShader:FISH_VS,fragmentShader:FISH_FS,transparent:true,depthWrite:false,
  uniforms:{uKoi:{value:koi},uWave:uniforms.uWave,uFace:{value:new THREE.Vector4(0,0,1,1)},uRefract:{value:0},uShadow:{value:new THREE.Vector3(...K.shadow)},uFade:{value:1}}});
 const fishMesh=new THREE.InstancedMesh(fishGeo,fishMat,n+2);fishMesh.frustumCulled=false;fishMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);fishMesh.renderOrder=1;scene.add(fishMesh);

 const dropPos=new Float32Array(DROPS*3),dropGeo=new THREE.BufferGeometry();dropGeo.setAttribute('position',new THREE.BufferAttribute(dropPos,3));
 const dropTex=dropTexture(THREE),dropMat=new THREE.PointsMaterial({color:0xe8fbff,map:dropTex,size:15,sizeAttenuation:false,transparent:true,depthWrite:false}),dropMesh=new THREE.Points(dropGeo,dropMat);dropMesh.frustumCulled=false;dropMesh.visible=false;dropMesh.renderOrder=3;scene.add(dropMesh);
 const foam=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:dropTex,transparent:true,depthWrite:false,opacity:0}));foam.visible=false;foam.renderOrder=4;scene.add(foam);
 const fishS={fish:makeFish(n,A,rng(5)),A,rand:rng(9),touch:null,lastTouch:performance.now(),trail:makeTrail(K.trailCap),members:0,phase:'wander'};
 S={foam,dropTex,sec:{st:'idle',id:null},an:null,drops:[],dropPos,dropGeo,dropMat,dropMesh,THREE,K,A,toWorld,wake,uniforms,reduced,waves,waveTex,data,pads,lilies,padMesh,lilyMesh,coreMesh,fishMesh,fishMat,aFish,koi,fishS,
  pointers:new Map(),lilyColor:new THREE.Color(K.lily),m:new THREE.Matrix4(),q:new THREE.Quaternion(),e:new THREE.Euler(),v:new THREE.Vector3(),sc:new THREE.Vector3(),
  born:performance.now(),lead:null,slope:[0,0],big:{x:0,y:0,a:0},bigSeed:Math.floor(Math.random()*1e6),fade:1,fadeTo:1,cutPoly:null,lastNow:performance.now(),dirty:true};
 setLilyColor(K.lily);
 place(0,performance.now());
}

function setLilyColor(hex){if(!S)return;S.lilyColor.set(hex);for(let i=0;i<S.lilies.length;i++)S.lilyMesh.setColorAt(i,S.lilyColor);if(S.lilyMesh.instanceColor)S.lilyMesh.instanceColor.needsUpdate=true;S.wake?.();}
let selectedTint=null;
function setTint(hex,selected=true){if(selected&&!validTint(hex))return;selectedTint=selected?hex:null;setLilyColor(selectedTint||POND.lily);}

// Writes every instance's matrix: pads ride the ripples (tilt), koi sway, the huge koi crosses.
function place(dt,now){
 const {K,A,toWorld,pads,lilies,padMesh,lilyMesh,coreMesh,fishMesh,aFish,m,q,e,v,sc,slope,waves}=S;
 const [ox,oy]=toWorld(0,0),[x1]=toWorld(1,0),px=x1-ox; // face width in world px
 const put=(x,y,z,rx,ry,rz,s,s2=s)=>{e.set(rx,ry,rz);q.setFromEuler(e);v.set(ox+x*px,oy-y*px,z);sc.set(s,s2,s);m.compose(v,q,sc);return m;};
 let li=0;
 pads.forEach((p,i)=>{
  slopeAt(waves,p.x,p.y/A,slope);const tx=-slope[1]*K.tilt,ty=slope[0]*K.tilt,r=K.padR*px*p.s*(p.hidden?0:1);
  padMesh.setMatrixAt(i,put(p.x,p.y,2+i*.03,tx,ty,p.rot,r));
  if(p.lily){lilyMesh.setMatrixAt(li,put(p.x,p.y,2.4+i*.03,tx,ty,p.rot+p.seed,r*.6));coreMesh.setMatrixAt(li,m);li++;}
 });
 padMesh.instanceMatrix.needsUpdate=lilyMesh.instanceMatrix.needsUpdate=coreMesh.instanceMatrix.needsUpdate=true;
 const fish=S.fishS.fish,ph=S.fishS.phase,arr=aFish.array,bend=S.reduced?0:K.bend;
 fish.forEach((f,i)=>{fishMesh.setMatrixAt(i,put(f.x,f.y,.6+i*.01,0,0,-f.a,K.koiLen*px));arr[4*i]=f.phase;arr[4*i+1]=K.koiAlpha;arr[4*i+2]=bend;});
 // The huge koi: only while the fish are away.
 const n=fish.length,idle=ph==='big'&&S.sec.st==='idle'?idlePhase(now-S.fishS.lastTouch,K):null,b=S.an;
 arr[4*n+3]=arr[4*n+7]=0;arr[4*n+5]=0;
 if(b){
  e.set(0,-b.pitch,-b.a,'ZYX');q.setFromEuler(e);e.order='XYZ';v.set(ox+b.x*px,oy-b.y*px,b.z*px+.4);sc.set(b.s*px,b.s*px,b.s*px);m.compose(v,q,sc);fishMesh.setMatrixAt(n,m);
  arr[4*n]=now/1000*TAU*.35*(1+6*b.e);arr[4*n+1]=b.alpha;arr[4*n+2]=bend*(.7+.8*b.e);arr[4*n+3]=b.mix;
  fishMesh.setMatrixAt(n+1,put(b.sx,b.sy,.35,0,0,-b.sa,b.ss*px));arr[4*n+4]=arr[4*n];arr[4*n+5]=b.sAlpha;arr[4*n+6]=bend*.7;
 }else if(idle){const b=bigFishPose(S.bigSeed+idle.cycle,idle.t/K.bigMs,A,K.bigLen,S.big),fadeIn=Math.min(1,idle.t/1500,(K.bigMs-idle.t)/1500);fishMesh.setMatrixAt(n,put(b.x,b.y,.4,0,0,-b.a,K.bigLen*px));arr[4*n]=now/1000*TAU*.35;arr[4*n+1]=.8*Math.max(0,fadeIn)*(.92+.08*Math.sin(now/300));arr[4*n+2]=bend*.7;arr[4*n+3]=.6;}
 else arr[4*n+1]=0;
 fishMesh.instanceMatrix.needsUpdate=true;aFish.needsUpdate=true;
 S.fishMat.uniforms.uFace.value.set(ox,-oy,px,px*A);S.fishMat.uniforms.uRefract.value=K.glass.bend*px*2;
}

export function stepPads(state,dt,t){
 const {K,A,pads,pointers,waves,slope}=state;
 for(const p of pads){
  if(p.hidden)continue;
  const drift=p.anchor?0:K.drift;
  const hx=p.hx+Math.sin(t*K.driftHz*TAU+p.seed)*drift,hy=p.hy+Math.cos(t*K.driftHz*TAU*.8+p.seed*1.7)*drift;
  let fx=(hx-p.x)*K.spring-p.vx*K.damping,fy=(hy-p.y)*K.spring-p.vy*K.damping;
  for(const f of pointers.values()){
   let dx=p.x-f.x,dy=p.y-f.y,d=Math.hypot(dx,dy);
   if(d<K.pushR){
    // Even a pad directly under the fingertip needs a direction to move aside.
    if(d<1e-5){dx=Math.cos(p.seed);dy=Math.sin(p.seed);d=1;}
    const distance=Math.hypot(p.x-f.x,p.y-f.y),k=K.pushK*(1-distance/K.pushR)**2;
    fx+=dx/d*k;fy+=dy/d*k;
   }
  }
  slopeAt(waves,p.x,p.y/A,slope);fx-=slope[0]*K.waveK;fy-=slope[1]*K.waveK;
  p.vx+=fx*dt;p.vy+=fy*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=(p.vx-p.vy)*dt*2;
 }
}

function stepWater(t){
 const {K,waves,pointers}=S;
 for(const f of pointers.values()){disturb(waves,f.x,f.y/S.A,f.moved?K.wave.drag:K.wave.hold*Math.sin(t*TAU*K.wave.holdHz));f.moved=false;}
 const e=stepWaves(waves,K.wave.damping);
 if(e>1e-4||S.dirty){
  const {cur,cols,rows}=waves,d=S.data,gain=K.wave.gain;
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
   const i=y*cols+x,l=cur[x>0?i-1:i],r=cur[x<cols-1?i+1:i],u=cur[y>0?i-cols:i],dn=cur[y<rows-1?i+cols:i],o=4*i;
   d[o]=Math.max(0,Math.min(255,128+(r-l)*gain));d[o+1]=Math.max(0,Math.min(255,128+(dn-u)*gain));d[o+2]=Math.max(0,Math.min(255,128+cur[i]*gain));
  }
  S.waveTex.needsUpdate=true;S.dirty=e>1e-4;
 }
 return e>1e-4;
}

function step(dt,now){
 if(!S)return false;
 const t=now/1000,fin=S.lead;
 S.fade+=(S.fadeTo-S.fade)*Math.min(1,dt*4);S.fishMat.uniforms.uFade.value=S.fade;
 if(fin)S.uniforms.uFinger.value.set(fin.x,fin.y/S.A,1,0);else S.uniforms.uFinger.value.z=Math.max(0,S.uniforms.uFinger.value.z-dt*2);
 if(S.reduced){secretStep(dt,now);place(dt,now);return Math.abs(S.fade-S.fadeTo)>.01||S.sec.st!=='idle';}
 stepWater(t);stepPads(S,dt,t);stepFish(S.fishS,dt,now,S.K);secretStep(dt,now);place(dt,now);
 return true; // the koi never stop swimming
}

// --- Secret animation: rise (held), splash (done), bored (lifted early) --------------------------------------
const wrapA=d=>d-TAU*Math.round(d/TAU),ease=p=>p*p*(3-2*p);
function startSecret(now){ // a hold landed on the big koi: freeze its pose and take it over from the idle show
 const b=S.big,K=S.K;S.an={x:b.x,y:b.y,a:b.a,a0:b.a,x0:b.x,y0:b.y,pitch:0,z:0,s:K.bigLen,alpha:.8,mix:.6,e:0,sx:b.x,sy:b.y,sa:b.a,ss:K.bigLen,sAlpha:K.bigAlpha*.8,bt:0};S.wake?.();
}
function startBored(){S.an.bt=.001;S.an.tgt=Math.hypot(S.an.x-.5,S.an.y-S.A/2)>.05?Math.atan2(S.an.y-S.A/2,S.an.x-.5):S.an.a+Math.PI/2;S.wake?.();}
function startSplash(now){
 const c={x:.5,y:S.A/2};S.an=null;S.sec={...S.sec,st:'done'};S.splashT=now;S.splashFired=false;S.ringN=0;S.drops=[];
 for(let i=0;i<DROPS;i++){const ang=Math.random()*TAU,up=i%2===0; // even: a spray column; odd: a crown arcing out
  S.drops.push({x:c.x+Math.cos(ang)*.03,y:c.y+Math.sin(ang)*.02,cx:Math.cos(ang),cy:Math.sin(ang),vr:up?.04+Math.random()*.2:.35+Math.random()*1.0,vh:up?4.2+Math.random()*2.2:2.4+Math.random()*1.8,landed:false});}
 for(const d of S.drops)d.life=2*d.vh/6;
 for(const p of S.pads){const dx=p.x-c.x,dy=p.y-c.y,d=Math.hypot(dx,dy)||1,k=.5*Math.max(0,1-d/1.3);p.vx+=dx/d*k;p.vy+=dy/d*k;} // pads ride the wave outward
 S.dropMesh.visible=true;S.foam.visible=true;disturb(S.waves,.5,.5,6);S.dirty=true;S.wake?.();
}
function secretStep(dt,now){
 const sec=S.sec,an=S.an,K=S.K;
 if(sec.st==='hold'){
  const ns=pondSecret(sec,{type:'tick'},now);S.sec=ns;if(ns.st==='done')return startSplash(now);
  const p=Math.min(1,(now-sec.t0)/SECRET.riseMs),e=ease(p),ep=ease(Math.min(1,p*1.5)); // steers to the middle a little ahead of the growth
  an.e=e;an.x=an.x0+(.5-an.x0)*ep;an.y=an.y0+(S.A/2-an.y0)*ep;an.a=an.a0+wrapA(-Math.PI/2-an.a0)*ep;an.pitch=e*.55;an.z=e*.56;an.s=K.bigLen*(1+e*.4);an.alpha=.8+.2*e;an.mix=.6+.4*e;an.ss=K.bigLen*(1-e*.55);an.sAlpha=K.bigAlpha*.8*(1-e*.75);
 }else if(sec.st==='bored'&&an&&!an.bt)startBored();
 if(sec.st==='bored'&&an&&an.bt){ // turns away, levels out, swims off the face
  an.bt+=dt;const k=Math.min(1,dt*3.5),f=Math.exp(-dt*5);
  an.a+=wrapA(an.tgt-an.a)*k;an.pitch*=f;an.z*=f;an.s+=(K.bigLen-an.s)*Math.min(1,dt*3);an.mix+=(.6-an.mix)*k;an.alpha+=(.8-an.alpha)*k;an.e*=f;an.sAlpha*=Math.exp(-dt*6);
  const sp=Math.min(.55,.1+an.bt*.5);an.x+=Math.cos(an.a)*sp*dt;an.y+=Math.sin(an.a)*sp*dt;an.sx=an.x;an.sy=an.y;an.sa=an.a;an.ss=an.s;
  if(Math.hypot(an.x-.5,an.y-S.A/2)>Math.hypot(.5,S.A/2)+K.bigLen*.6||an.bt>9)endSecret(now);
 }
 if(sec.st==='done'&&!an){ // splash: rings across the face, foam flash, spray column + crown that fall back with tiny ripples
  const t=now-S.splashT,rings=[[130,.5,.5,5],[300,.5,.5,4],[480,.5,.5,3.2],[680,.5,.5,2.4],[200,.4,.42,2.5],[260,.6,.58,2.5]];
  while(S.ringN<rings.length&&t>=rings[S.ringN][0]){const r=rings[S.ringN++];disturb(S.waves,r[1],r[2],r[3]);S.dirty=true;}
  const [wx,wy]=S.toWorld(0,0),[x1]=S.toWorld(1,0),px=x1-wx,ts=t/1000;
  S.drops.forEach((d,i)=>{const h=d.vh*ts-3*ts*ts,ok=ts<d.life,gx=d.x+d.cx*d.vr*ts,gy=d.y+d.cy*d.vr*ts*.6;
   if(!ok&&!d.landed){d.landed=true;disturb(S.waves,Math.min(.97,Math.max(.03,gx)),Math.min(.97,Math.max(.03,gy/S.A)),.7);S.dirty=true;}
   S.dropPos[3*i]=wx+gx*px;S.dropPos[3*i+1]=wy-(gy-Math.max(0,h)*.35)*px;S.dropPos[3*i+2]=ok?4:-9999;});
  S.dropGeo.attributes.position.needsUpdate=true;S.dropMat.opacity=Math.min(1,Math.max(0,(1900-t)/500));
  const f=Math.max(0,1-t/420),fs=(.35+Math.min(1,t/420)*1.5)*px;S.foam.position.set(wx+.5*px,wy-S.A/2*px,4.5);S.foam.scale.set(fs,fs,1);S.foam.material.opacity=f*.85;
  if(!S.splashFired&&t>=1300){S.splashFired=true;typeof window!=='undefined'&&window.dispatchEvent(new CustomEvent('myr5:portal-secret',{detail:{board:'pond'}}));}
  if(t>=1900)endSecret(now);
 }
}
function endSecret(now){S.an=null;S.sec={st:'idle',id:null};S.dropMesh.visible=false;S.foam.visible=false;S.fishS.lastTouch=now;S.wake?.();}
const toPondXY=(u,v)=>({x:u,y:v*POND.aspect});
function press(id,u,v){
 if(!S)return;const p=toPondXY(u,v),now=performance.now(),was=S.sec.st;
 S.sec=pondSecret(S.sec,{type:'down',id,x:p.x,y:p.y,phase:S.fishS.phase,big:S.big},now);if(was==='idle'&&S.sec.st==='hold')startSecret(now);
 S.lead={...p,moved:true};S.pointers.set(id,S.lead);
 if(!S.reduced)disturb(S.waves,u,v,S.K.wave.press);
 if(S.sec.id!==id)fishTouch(S.fishS,p.x,p.y,now); // a claimed hold leaves the fish show alone
 S.dirty=true;
}
function move(id,u,v){
 if(!S)return;const f=S.pointers.get(id),p=toPondXY(u,v);if(!f)return press(id,u,v);
 f.moved=f.moved||Math.hypot(p.x-f.x,p.y-f.y)>.002;f.x=p.x;f.y=p.y;
 S.sec=pondSecret(S.sec,{type:'move',id,x:p.x,y:p.y},performance.now());
 if(S.sec.id!==id)fishTouch(S.fishS,p.x,p.y,performance.now());
}
function release(id){
 if(!S)return;const mine=S.sec.id===id,now=performance.now();S.pointers.delete(id);const last=S.lead=[...S.pointers.values()].at(-1)||null;
 if(mine){S.sec=pondSecret(S.sec,{type:'up',id},now);if(S.sec.st==='done'&&S.an)startSplash(now);return;}
 if(last)fishTouch(S.fishS,last.x,last.y,now);else fishRelease(S.fishS,now);
}
const claims=id=>!!S&&S.sec.id===id; // read by the board wrapper before release forgets the pointer
// The cut: pads inside the shape sink away with the water; the koi dive (fade) until it heals.
function cut(polyUv){
 if(!S)return;S.cutPoly=polyUv;
 for(const p of S.pads)p.hidden=pointInPolygon(p.x,p.y/S.A,polyUv);
 S.fadeTo=0;S.wake?.();
}
function heal(){if(!S)return;S.cutPoly=null;for(const p of S.pads)p.hidden=false;S.fadeTo=1;S.wake?.();}
function dispose(){
 if(!S)return;
 for(const m of [S.padMesh,S.lilyMesh,S.coreMesh,S.fishMesh]){m.removeFromParent();m.geometry.dispose();m.material.dispose();m.dispose?.();}
 S.foam.removeFromParent();S.foam.geometry.dispose();S.foam.material.dispose();S.dropMesh.removeFromParent();S.dropGeo.dispose();S.dropMat.dispose();S.dropTex.dispose();
 S.koi.dispose();S.waveTex.dispose();S=null;
}

export const pond={
 id:'pond',build,background:'#06110f',ink:true,
 guide:{color:'#bff8ee',alpha:.08,width:4}, // the hint shapes glow faintly on the water
 frame:POND.frame,keepColors:true,tintTarget:'trace',
 uniforms:{uWave:{value:null},uFinger:{value:null}},
 fragmentDecls:WATER_DECLS,
 vertexDisplace:'/* pond: flat water; the ripples live in the fragment */',
 fragment:WATER_FRAGMENT,
 init,step,press,move,release,claims,cut,heal,dispose,setTint,
 forceBig(){if(!S)return;const K=S.K,now=performance.now();S.sec={st:'idle',id:null};S.an=null;S.fishS.touch=null;S.fishS.lastTouch=now-(K.idleMs+K.scatterMs+K.bigMs*.5);S.wake?.();}, // test/preview: big koi mid-crossing now
 debug:()=>S&&{sec:S.sec.st,big:S.big,an:S.an&&{...S.an},phase:S.fishS.phase,since:performance.now()-S.fishS.lastTouch,born:S.born,members:S.fishS.members,fish:S.fishS.fish.map(f=>[f.x,f.y,f.a]),pads:S.pads.length,lilies:S.lilies.length,anchors:S.pads.filter(p=>p.anchor).length},
};

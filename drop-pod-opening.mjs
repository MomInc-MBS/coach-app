// Drop-pod pack opening: a full-screen space drop in the style of FPS pack openings (Siege Alpha Packs, Apex).
// sky -> drop -> landed (steaming in a dirt mound) -> tap the pod -> opened (lid pops, beam) -> reveal card.
// Served unbundled (external in scripts/build.mjs and scripts/dev.mjs) so three.js is only fetched when a pack
// is opened (same pattern as food/pyramid-scanner.mjs). pods/drop-pod-<tier>.glb drop in with no code change;
// until they exist the procedural canister below is the pod.
export const PHASES=Object.freeze(['sky','drop','landed','opened','reveal']);
export const startPhase=({reduced=false}={})=>reduced?'landed':'sky';
const EDGES={sky:{fall:'drop',land:'landed'},drop:{land:'landed'},landed:{tap:'opened'},opened:{revealed:'reveal',fail:'landed'}};
// Pure state machine (unit-tested in node). skip jumps straight to the reveal; restart is "Open another".
export function advance(phase,event){
 if(event==='skip')return 'reveal';
 if(event==='restart')return phase==='reveal'?'sky':phase;
 return EDGES[phase]?.[event]??phase;
}
// Seconds: the sky, the fall, then the impact settling before the "Tap the pod" prompt appears.
export const TIERS=Object.freeze({
 uncommon:{color:'#76e356',sky:1.0,fall:2.1,settle:1.3,shake:.34,dust:1,sparks:1,rocks:10,rumble:0},
 rare:{color:'#4bafff',sky:1.0,fall:2.4,settle:1.5,shake:.52,dust:1.3,sparks:1.4,rocks:14,rumble:.03},
 legendary:{color:'#ff9c36',sky:1.8,fall:3.0,settle:1.5,shake:.85,dust:1.8,sparks:2.4,rocks:22,rumble:.07,gold:true,big:true,aftershock:.45},
 // Secret (from secret achievements): the longest build-up and biggest hit, a holographic kettlebell pod and holo sparks.
 secret:{color:'#b388ff',sky:2.4,fall:3.4,settle:1.7,shake:1,dust:2,sparks:3,rocks:26,rumble:.1,holo:true,big:true,aftershock:.55}
});
export const promptAt=tier=>{const c=TIERS[tier]||TIERS.uncommon;return c.sky+c.fall+c.settle;};

const CSS=`
dialog.drop-pod:focus{outline:none}
dialog.drop-pod{position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;max-height:none;margin:0;padding:0;border:0;background:#02030a;color:#fff7df;font:500 16px/1.4 system-ui;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none}
dialog.drop-pod::backdrop{background:#02030a}
.drop-pod canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.drop-pod-flash{position:absolute;inset:0;background:radial-gradient(circle at 50% 64%,#fff 0,color-mix(in srgb,var(--pack) 65%,#fff) 14%,color-mix(in srgb,var(--pack) 50%,transparent) 34%,transparent 62%);opacity:0;pointer-events:none}
.drop-pod-flash.go{animation:dp-flash .4s ease-out;--k:.9}.drop-pod-flash.pop{animation:dp-flash .3s ease-out;--k:.5}
@keyframes dp-flash{0%{opacity:var(--k,1)}100%{opacity:0}}
.drop-pod-caption{position:absolute;left:0;right:0;top:calc(14% + env(safe-area-inset-top,0px));text-align:center;font:900 13px system-ui;letter-spacing:.42em;text-transform:uppercase;color:var(--pack);text-shadow:0 0 14px var(--pack);opacity:0;transition:opacity .4s;pointer-events:none}
.drop-pod[data-phase=sky] .drop-pod-caption,.drop-pod[data-phase=drop] .drop-pod-caption{opacity:.95;animation:dp-blink .5s steps(2) infinite}
.drop-pod[data-phase=drop] .drop-pod-caption{opacity:.7}
@keyframes dp-blink{50%{opacity:.35}}
.drop-pod-skip{position:absolute;top:calc(12px + env(safe-area-inset-top,0px));right:12px;min-height:44px;min-width:64px;border:1px solid #fff7df80;border-radius:22px;background:#0008;color:#fff7df;font:800 13px system-ui;letter-spacing:.1em;text-transform:uppercase;padding:0 16px;cursor:pointer;z-index:3}
.drop-pod[data-phase=reveal] .drop-pod-skip{display:none}
.drop-pod-hit{position:absolute;left:50%;top:60%;width:200px;height:260px;transform:translate(-50%,-50%);border:0;border-radius:50%;background:transparent;cursor:pointer;display:none;z-index:2;-webkit-tap-highlight-color:transparent}
.drop-pod.ready .drop-pod-hit{display:block}
.drop-pod-hit::after{content:"";position:absolute;inset:6%;border:3px solid var(--pack);border-radius:50%;box-shadow:0 0 22px var(--pack),inset 0 0 22px color-mix(in srgb,var(--pack) 45%,transparent);animation:dp-ring 1.1s ease-in-out infinite}
@keyframes dp-ring{0%,100%{transform:scale(.92);opacity:.5}50%{transform:scale(1.04);opacity:1}}
.drop-pod-prompt{position:absolute;left:0;right:0;bottom:calc(6% + env(safe-area-inset-bottom,0px));text-align:center;font:900 22px system-ui;letter-spacing:.2em;text-transform:uppercase;color:#fff7df;text-shadow:0 0 18px var(--pack),0 2px 0 #000;opacity:0;pointer-events:none;transition:opacity .25s}
.drop-pod.ready .drop-pod-prompt{opacity:1;animation:dp-pulse 1s ease-in-out infinite}
.drop-pod-prompt small{display:block;margin-top:6px;font:700 12px system-ui;letter-spacing:.12em;color:#ffb4a8;text-shadow:none;min-height:1em}
@keyframes dp-pulse{50%{transform:scale(1.06)}}
.drop-pod-card{position:absolute;left:50%;top:9%;width:min(calc(100vw - 36px),340px);max-height:44%;overflow:auto;box-sizing:border-box;transform:translate(-50%,46vh) scale(.5);opacity:0;pointer-events:none;text-align:center;border:2px solid var(--pack);border-radius:20px;background:radial-gradient(circle at 50% 20%,color-mix(in srgb,var(--pack) 30%,#21152e),#100d1b 75%);box-shadow:0 0 50px color-mix(in srgb,var(--pack) 55%,transparent),0 18px 40px #000b;padding:16px 16px 18px;transition:transform .9s cubic-bezier(.2,1.25,.3,1),opacity .35s}
.drop-pod[data-phase=reveal] .drop-pod-card{transform:translate(-50%,0) scale(1);opacity:1;pointer-events:auto}
.drop-pod-card .eyebrow{margin:0;color:var(--pack);font:800 12px system-ui;letter-spacing:.24em;text-transform:uppercase}
.drop-pod-card strong{display:block;margin-top:6px;font:900 24px/1.15 system-ui;color:#fff7df;text-shadow:0 0 18px var(--pack)}
.drop-pod-card small{display:block;opacity:.85;text-transform:uppercase;letter-spacing:.12em;font-size:12px;margin-top:4px}
.drop-pod-item+.drop-pod-item{margin-top:12px;padding-top:12px;border-top:1px solid color-mix(in srgb,var(--pack) 40%,transparent)}
.drop-pod-swatches{display:flex;justify-content:center;gap:6px;margin-top:10px}.drop-pod-swatches i{width:30px;height:30px;border:2px solid #fff7df;border-radius:5px}
.drop-pod[data-tier=legendary] .drop-pod-card::before{content:"";position:absolute;inset:-60%;z-index:-1;background:conic-gradient(from 0deg,transparent 0 10%,#ffd36a55 12%,transparent 16% 35%,#ffd36a44 37%,transparent 41% 60%,#ffd36a55 62%,transparent 66% 85%,#ffd36a44 87%,transparent 91%);animation:dp-spin 9s linear infinite}
.drop-pod[data-tier=legendary] .drop-pod-card{overflow:visible;isolation:isolate}
.drop-pod[data-tier=legendary] .drop-pod-card strong{background:linear-gradient(100deg,#fff7df 20%,#ffd36a 45%,#fff 50%,#ffd36a 55%,#fff7df 80%);background-size:250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:none;animation:dp-shimmer 2.6s linear infinite}
@keyframes dp-spin{to{transform:rotate(1turn)}}@keyframes dp-shimmer{to{background-position:-250% 0}}
.drop-pod[data-tier=secret] .drop-pod-card{border-color:transparent;background:radial-gradient(circle at 50% 20%,#3a2160,#0d0b1c 75%) padding-box,linear-gradient(120deg,#3ff5ff,#b388ff,#ff4bd8,#ffd36a,#3ff5ff) border-box;background-size:auto,300% 100%;animation:dp-iri 4s linear infinite;box-shadow:0 0 50px #b388ff88,0 0 90px #3ff5ff33,0 18px 40px #000b}
.drop-pod[data-tier=secret] .drop-pod-card .eyebrow{font:900 30px/1 system-ui;letter-spacing:.32em;margin:2px 0 4px;background:linear-gradient(100deg,#3ff5ff,#b388ff 30%,#ff4bd8 55%,#ffd36a 80%,#3ff5ff);background-size:250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:dp-shimmer 3s linear infinite;filter:drop-shadow(0 0 10px #b388ffaa)}
.drop-pod[data-tier=secret] .drop-pod-caption{background:linear-gradient(90deg,#3ff5ff,#ff4bd8,#ffd36a,#3ff5ff);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:none;filter:drop-shadow(0 0 8px #b388ff)}
@keyframes dp-iri{to{background-position:0 0,-300% 0}}
.drop-pod-actions{position:absolute;left:0;right:0;bottom:calc(5% + env(safe-area-inset-bottom,0px));display:flex;gap:10px;justify-content:center;opacity:0;pointer-events:none;transition:opacity .4s .5s}
.drop-pod[data-phase=reveal] .drop-pod-actions{opacity:1;pointer-events:auto}
.drop-pod-actions button{min-height:48px;min-width:120px;border:2px solid var(--pack);border-radius:14px;background:var(--pack);color:#15101c;font:800 15px system-ui;padding:8px 20px;cursor:pointer}
.drop-pod-actions button.secondary{background:#0009;color:#fff7df}
.drop-pod button:focus-visible{outline:3px solid #fff;outline-offset:3px}.drop-pod .drop-pod-hit:focus-visible{outline:none}
.drop-pod-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
@media(prefers-reduced-motion:reduce){.drop-pod-flash.go,.drop-pod-flash.pop{animation-duration:.15s}.drop-pod-card{transition:opacity .2s;transform:translate(-50%,0) scale(1)}.drop-pod[data-tier=legendary] .drop-pod-card::before,.drop-pod[data-tier=legendary] .drop-pod-card strong,.drop-pod[data-tier=secret] .drop-pod-card,.drop-pod[data-tier=secret] .drop-pod-card .eyebrow{animation:none}.drop-pod-hit::after,.drop-pod.ready .drop-pod-prompt{animation:none}}
`;

const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)),lerp=(a,b,k)=>a+(b-a)*k,smooth=k=>k*k*(3-2*k);
const easeOutBack=k=>{const c=1.9;return 1+(c+1)*Math.pow(k-1,3)+c*Math.pow(k-1,2);};
const rnd=(a=0,b=1)=>a+Math.random()*(b-a);
const hash=(x,y)=>{const s=Math.sin(x*127.1+y*311.7)*43758.5453;return s-Math.floor(s);};
const vnoise=(x,y)=>{const ix=Math.floor(x),iy=Math.floor(y),fx=smooth(x-ix),fy=smooth(y-iy);return lerp(lerp(hash(ix,iy),hash(ix+1,iy),fx),lerp(hash(ix,iy+1),hash(ix+1,iy+1),fx),fy);};
const MOUND_R=3.7;
// Height of the dirt mound the pod lands in (also where thrown rocks and steam vents sit).
const moundHeight=(r,theta)=>{
 const s=clamp((r-.62)/(MOUND_R-.62)),base=(r<.62?1:1.05*Math.pow(1-s,1.4))+.3*Math.exp(-Math.pow((r-1.5)/.55,2));
 return Math.max(0,base*(.72+.5*vnoise(theta*2.2+r*1.3,r*2.1))+.1*(vnoise(theta*6,r*5)-.5)*(1-s));
};

const VERT=`attribute float aSize;attribute float aAlpha;attribute vec3 aColor;uniform float uScale;varying float vA;varying vec3 vC;
void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=max(.0,aSize*uScale/max(.1,-mv.z));vA=aAlpha;vC=aColor;}`;
const FRAG=`uniform sampler2D uTex;varying float vA;varying vec3 vC;
void main(){float a=texture2D(uTex,gl_PointCoord).a*vA;if(a<.004)discard;gl_FragColor=vec4(vC,a);
#include <colorspace_fragment>
}`;
const BEAM_VERT=`varying vec2 vUv;varying float vE;void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vE=abs(dot(normalize(normalMatrix*normal),normalize(-mv.xyz)));gl_Position=projectionMatrix*mv;}`;
const BEAM_FRAG=`uniform vec3 uColor;uniform float uOpacity;uniform float uPow;varying vec2 vUv;varying float vE;
void main(){float fade=pow(clamp(1.-vUv.y,0.,1.),uPow);float edge=pow(clamp(vE,0.,1.),1.4);float a=fade*edge*uOpacity;gl_FragColor=vec4(mix(vec3(1.),uColor,clamp(vUv.y*1.2,0.,1.))*1.15,a);
#include <colorspace_fragment>
}`;

function glowTexture(THREE,inner='255,255,255',stops=[[0,1],[.25,.55],[.6,.14],[1,0]]){
 const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,64);
 for(const [k,a] of stops)g.addColorStop(k,`rgba(${inner},${a})`);x.fillStyle=g;x.fillRect(0,0,128,128);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
// A lumpy puff: several soft blobs so steam and dust do not read as perfect discs.
function puffTexture(THREE){
 const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
 for(let i=0;i<9;i++){const px=64+rnd(-20,20),py=64+rnd(-20,20),r=rnd(26,44),g=x.createRadialGradient(px,py,0,px,py,r);g.addColorStop(0,'rgba(255,255,255,.55)');g.addColorStop(.6,'rgba(255,255,255,.18)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,128,128);}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}

class Pool{
 constructor(THREE,n,{additive=false,tex,uniforms}){
  this.n=n;this.i=0;this.THREE=THREE;this.gravity=0;this.drag=0;this.wobble=0;
  this.pos=new Float32Array(n*3);this.vel=new Float32Array(n*3);this.size=new Float32Array(n);this.alpha=new Float32Array(n);this.col=new Float32Array(n*3);
  this.age=new Float32Array(n).fill(9);this.life=new Float32Array(n).fill(1);this.s0=new Float32Array(n);this.s1=new Float32Array(n);this.a0=new Float32Array(n);this.ph=new Float32Array(n);
  const geo=this.geo=new THREE.BufferGeometry();
  for(const [name,arr,k] of [['position',this.pos,3],['aSize',this.size,1],['aAlpha',this.alpha,1],['aColor',this.col,3]])geo.setAttribute(name,new THREE.BufferAttribute(arr,k).setUsage(THREE.DynamicDrawUsage));
  this.mat=new THREE.ShaderMaterial({vertexShader:VERT,fragmentShader:FRAG,uniforms:{uTex:{value:tex},uScale:uniforms.uScale},transparent:true,depthWrite:false,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending});
  this.points=new THREE.Points(geo,this.mat);this.points.frustumCulled=false;
 }
 emit(x,y,z,vx,vy,vz,life,s0,s1,color,alpha){
  const i=this.i;this.i=(i+1)%this.n;const p=i*3;
  this.pos[p]=x;this.pos[p+1]=y;this.pos[p+2]=z;this.vel[p]=vx;this.vel[p+1]=vy;this.vel[p+2]=vz;
  this.life[i]=life;this.age[i]=0;this.s0[i]=s0;this.s1[i]=s1;this.a0[i]=alpha;this.ph[i]=Math.random()*6.28;
  this.col[p]=color.r;this.col[p+1]=color.g;this.col[p+2]=color.b;
 }
 update(dt){
  const {pos,vel,age,life,size,alpha,s0,s1,a0,ph}=this,dr=Math.exp(-this.drag*dt);
  for(let i=0;i<this.n;i++){
   if(age[i]>=life[i]){alpha[i]=0;size[i]=0;continue;}
   age[i]+=dt;const k=Math.min(1,age[i]/life[i]),p=i*3;
   vel[p+1]+=this.gravity*dt;vel[p]*=dr;vel[p+1]*=dr;vel[p+2]*=dr;
   if(this.wobble)vel[p]+=Math.sin(age[i]*2.1+ph[i])*this.wobble*dt;
   pos[p]+=vel[p]*dt;pos[p+1]+=vel[p+1]*dt;pos[p+2]+=vel[p+2]*dt;
   size[i]=lerp(s0[i],s1[i],k);alpha[i]=a0[i]*Math.min(1,k*9)*Math.pow(1-k,1.25);
  }
  for(const name of ['position','aSize','aAlpha','aColor'])this.geo.getAttribute(name).needsUpdate=true;
 }
}

// The GLBs are untextured, so the pod's look is set here: dark metal in the tier colour with a glowing fresnel rim so it
// reads at night (Legendary gold); Secret is a hologram (iridescent rim, rising scanlines, ~75% opacity, flicker).
function tierMaterial(THREE,name){
 const c=new THREE.Color(TIERS[name]?.color||TIERS.uncommon.color),gold=name==='legendary';
 const m=new THREE.MeshStandardMaterial({color:gold?new THREE.Color(0xb07818):c.clone().multiplyScalar(.13),metalness:gold?.85:.7,roughness:gold?.3:.35,emissive:c,emissiveIntensity:.02});
 m.onBeforeCompile=sh=>{sh.uniforms.uRim={value:c.clone().multiplyScalar(gold?.9:.6)};
  sh.fragmentShader='uniform vec3 uRim;\n'+sh.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=uRim*pow(1.-abs(dot(normalize(vNormal),normalize(vViewPosition))),2.2);');};
 return m;
}
const HOLO_VERT=`uniform float uTime;varying vec3 vN;varying vec3 vV;varying float vY;
void main(){vec3 p=position;float g=step(.93,fract(sin(floor(uTime*9.)*91.7)*4375.5));p.x+=g*.03*sin(position.y*60.+uTime*80.);
vec4 mv=modelViewMatrix*vec4(p,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);vY=(modelMatrix*vec4(p,1.)).y;gl_Position=projectionMatrix*mv;}`;
const HOLO_FRAG=`uniform float uTime;uniform float uOpacity;uniform float uRimOnly;varying vec3 vN;varying vec3 vV;varying float vY;
vec3 iri(float h){h=fract(h)*3.;vec3 a=vec3(.25,.95,1.),b=vec3(1.,.3,.85),c=vec3(1.,.82,.35);return h<1.?mix(a,b,h):h<2.?mix(b,c,h-1.):mix(c,a,h-2.);}
void main(){float f=1.-abs(dot(normalize(vN),normalize(vV)));float rim=pow(f,1.6);
vec3 hue=iri(f*1.3+vY*.25+uTime*.12);
float scan=smoothstep(.55,1.,sin((vY*22.-uTime*3.)*3.1416)*.5+.5);
float fine=.85+.15*sin((vY*140.-uTime*9.)*3.1416);
float flick=.9+.06*sin(uTime*31.)+.04*sin(uTime*17.3);float g=step(.95,fract(sin(floor(uTime*9.)*91.7)*4375.5));flick*=1.-.35*g;
vec3 col=(mix(vec3(.16,.05,.4),hue,.45+.55*rim)*(.7+.8*rim)+hue*scan*.55)*fine*flick;
float a=uRimOnly>.5?rim*flick:uOpacity*(.85+.15*rim+.15*scan)*flick;
gl_FragColor=vec4(col,a);
#include <colorspace_fragment>
}`;
function holoMaterials(THREE,uTime){
 const mk=(rimOnly,extra)=>new THREE.ShaderMaterial({vertexShader:HOLO_VERT,fragmentShader:HOLO_FRAG,uniforms:{uTime,uOpacity:{value:.75},uRimOnly:{value:rimOnly}},transparent:true,...extra});
 return {body:mk(0,{depthWrite:true}),glow:mk(1,{depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.BackSide})};
}
function loadGlb(THREE,tier){
 return (async()=>{
  try{
   const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
   const gltf=await Promise.race([new GLTFLoader().loadAsync(new URL(`./pods/drop-pod-${tier}.glb`,import.meta.url).href),new Promise((_,no)=>setTimeout(no,7000))]);
   const model=gltf.scene,box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),mid=box.getCenter(new THREE.Vector3());
   const big=Math.max(size.x,size.y,size.z);if(!(big>0))return null;
   // Normalise by the largest side so a pod modelled lying down keeps its pose; base sits on y=0.
   const k=2.4/big;model.scale.setScalar(k);model.position.set(-mid.x*k,-box.min.y*k,-mid.z*k);
   const holder=new THREE.Group();holder.add(model);holder.userData={top:size.y*k,radius:Math.min(size.x,size.z)*k*.5};return holder;
  }catch{return null;}
 })();
}

// The procedural pod: chunky canister, swept fins, tier-colour paint and glowing seams, hinged lid. Origin at its base, 2.4 tall.
function buildFallbackPod(THREE,tier){
 const color=new THREE.Color(tier.color),group=new THREE.Group(),parts={};
 const hull=new THREE.MeshStandardMaterial({vertexColors:true,metalness:.82,roughness:.42});
 const dark=new THREE.MeshStandardMaterial({color:0x1b2029,metalness:.85,roughness:.5});
 const paint=new THREE.MeshStandardMaterial({color,metalness:.55,roughness:.38,emissive:color,emissiveIntensity:.07});
 const glow=parts.glow=new THREE.MeshStandardMaterial({color:0x111111,emissive:color,emissiveIntensity:1.6,metalness:0,roughness:.6});
 const profile=[[0,0],[.34,0],[.46,.07],[.55,.3],[.61,.7],[.63,1.15],[.61,1.6],[.56,1.92],[.5,2.1],[.46,2.14]].map(([r,y])=>new THREE.Vector2(r,y));
 const body=new THREE.LatheGeometry(profile,40),pos=body.attributes.position,cols=new Float32Array(pos.count*3),metal=new THREE.Color(0x56627a),char=new THREE.Color(0x120d0c),scorch=new THREE.Color();
 for(let i=0;i<pos.count;i++){const y=pos.getY(i),k=clamp((y-.15)/1.1)+.12*(vnoise(pos.getX(i)*6,y*5+pos.getZ(i)*4)-.5);scorch.copy(char).lerp(metal,clamp(k));cols[i*3]=scorch.r;cols[i*3+1]=scorch.g;cols[i*3+2]=scorch.b;}
 body.setAttribute('color',new THREE.BufferAttribute(cols,3));
 group.add(new THREE.Mesh(body,hull));
 // engine bell, bands, seams
 const bell=new THREE.Mesh(new THREE.CylinderGeometry(.3,.2,.28,24,1,true),dark);bell.position.y=-.06;group.add(bell);
 const nozzle=parts.nozzle=new THREE.Mesh(new THREE.CircleGeometry(.22,24),new THREE.MeshBasicMaterial({color:0xffb060}));nozzle.rotation.x=Math.PI/2;nozzle.position.y=-.2;group.add(nozzle);
 for(const [y,r,tube,m] of [[.2,.55,.06,dark],[1.85,.59,.07,dark],[.62,.625,.028,glow],[1.42,.625,.028,glow],[1.08,.64,.05,paint]]){const t=new THREE.Mesh(new THREE.TorusGeometry(r,tube,10,48),m);t.rotation.x=Math.PI/2;t.position.y=y;group.add(t);}
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2+.2,s=new THREE.Mesh(new THREE.BoxGeometry(.035,.74,.03),glow);s.position.set(Math.cos(a)*.625,1.02,Math.sin(a)*.625);s.rotation.y=-a;group.add(s);}
 for(let i=0;i<6;i++){const a=i/6*Math.PI*2,p=new THREE.Mesh(new THREE.BoxGeometry(.28,.5,.05),dark);p.position.set(Math.cos(a)*.625,.75+(i%2)*.55,Math.sin(a)*.625);p.rotation.y=-a;group.add(p);}
 // porthole
 const win=new THREE.Mesh(new THREE.CircleGeometry(.14,20),new THREE.MeshBasicMaterial({color}));win.position.set(0,1.22,.658);group.add(win);
 const rim=new THREE.Mesh(new THREE.TorusGeometry(.16,.03,8,24),dark);rim.position.copy(win.position);group.add(rim);
 // fins
 const fs=new THREE.Shape();fs.moveTo(.5,.18);fs.lineTo(1.12,-.2);fs.lineTo(1.18,.04);fs.lineTo(.68,1.02);fs.lineTo(.56,1.02);fs.closePath();
 const fin=new THREE.ExtrudeGeometry(fs,{depth:.07,bevelEnabled:true,bevelSize:.02,bevelThickness:.02,bevelSegments:1});fin.translate(0,0,-.035);
 for(let i=0;i<4;i++){const f=new THREE.Mesh(fin,paint),tip=new THREE.Mesh(new THREE.BoxGeometry(.05,.05,.1),glow);tip.position.set(1.15,-.08,0);const h=new THREE.Group();h.add(f,tip);h.rotation.y=i/4*Math.PI*2+Math.PI/4;group.add(h);}
 // hatch core (the light inside) and hinged lid
 const core=parts.core=new THREE.Mesh(new THREE.CircleGeometry(.42,28),new THREE.MeshBasicMaterial({color:new THREE.Color(1,1,1).lerp(color,.35)}));core.rotation.x=-Math.PI/2;core.position.y=2.1;group.add(core);
 const hinge=parts.hinge=new THREE.Group();hinge.position.set(-.46,2.13,0);group.add(hinge);
 const lidProfile=[[0,.0],[.46,.0],[.47,.06],[.43,.14],[.3,.24],[.15,.31],[0,.34]].map(([r,y])=>new THREE.Vector2(r,y));
 const lid=new THREE.Mesh(new THREE.LatheGeometry(lidProfile,36),paint);lid.position.x=.46;hinge.add(lid);
 const lidRing=new THREE.Mesh(new THREE.TorusGeometry(.4,.025,8,32),glow);lidRing.rotation.x=Math.PI/2;lidRing.position.set(.46,.04,0);hinge.add(lidRing);
 const hook=new THREE.Mesh(new THREE.BoxGeometry(.12,.1,.2),dark);hook.position.set(-.02,.02,0);hinge.add(hook);
 const handle=new THREE.Mesh(new THREE.TorusGeometry(.09,.025,8,16,Math.PI),dark);handle.position.set(.46,.33,0);hinge.add(handle);
 group.userData=parts;return group;
}

function buildTerrain(THREE,tier){
 const g=new THREE.Group(),color=new THREE.Color(tier.color);
 const size=170,seg=70,geo=new THREE.PlaneGeometry(size,size,seg,seg);geo.rotateX(-Math.PI/2);
 const p=geo.attributes.position,cols=new Float32Array(p.count*3),c=new THREE.Color();
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),r=Math.hypot(x,z),h=(vnoise(x*.09,z*.09)-.5)*1.4*clamp((r-5)/12)+(vnoise(x*.4,z*.4)-.5)*.12*clamp((r-4)/6);p.setY(i,h);c.set(0x2c2430).lerp(new THREE.Color(0x3a2e33),vnoise(x*.2+7,z*.2));c.multiplyScalar(.85+.3*vnoise(x*1.3,z*1.3));cols[i*3]=c.r;cols[i*3+1]=c.g;cols[i*3+2]=c.b;}
 geo.setAttribute('color',new THREE.BufferAttribute(cols,3));geo.computeVertexNormals();
 g.add(new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.96,metalness:0})));
 // mound
 const rings=26,segs=72,pts=[],idx=[],mc=[];
 for(let ri=0;ri<=rings;ri++){const r=ri===0?0:Math.pow(ri/rings,.85)*MOUND_R;for(let si=0;si<segs;si++){const th=si/segs*Math.PI*2,rr=r*(1+.08*(vnoise(th*3,r)-.5)),h=ri===rings?0:moundHeight(rr,th)+(ri===rings?0:0);pts.push(Math.cos(th)*rr,h,Math.sin(th)*rr);const k=clamp(h/1.2);const cc=new THREE.Color(0x4a3426).lerp(new THREE.Color(0x9c7a58),k*.7+.3*vnoise(th*9,r*7));mc.push(cc.r,cc.g,cc.b);}}
 for(let ri=0;ri<rings;ri++)for(let si=0;si<segs;si++){const a=ri*segs+si,b=ri*segs+(si+1)%segs,c2=(ri+1)*segs+si,d=(ri+1)*segs+(si+1)%segs;idx.push(a,c2,b,b,c2,d);}
 const mg=new THREE.BufferGeometry();mg.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));mg.setAttribute('color',new THREE.Float32BufferAttribute(mc,3));mg.setIndex(idx);mg.computeVertexNormals();
 const mound=new THREE.Mesh(mg,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true}));mound.position.y=.02;mound.scale.y=.001;mound.visible=false;g.add(mound);
 // scorch under the impact
 const sc=document.createElement('canvas');sc.width=sc.height=128;const sx=sc.getContext('2d'),sg=sx.createRadialGradient(64,64,6,64,64,64);sg.addColorStop(0,'rgba(0,0,0,.95)');sg.addColorStop(.5,'rgba(10,6,4,.75)');sg.addColorStop(1,'rgba(0,0,0,0)');sx.fillStyle=sg;sx.fillRect(0,0,128,128);
 const scorch=new THREE.Mesh(new THREE.PlaneGeometry(10,10),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(sc),transparent:true,depthWrite:false,opacity:0}));scorch.rotation.x=-Math.PI/2;scorch.position.y=.03;g.add(scorch);
 // far ridge so the horizon has depth
 const ridge=new THREE.CylinderGeometry(70,70,9,96,1,true),rp=ridge.attributes.position;
 for(let i=0;i<rp.count;i++)if(rp.getY(i)>0){const a=Math.atan2(rp.getZ(i),rp.getX(i));rp.setY(i,3+vnoise(a*5,1)*9+vnoise(a*17,3)*3);}
 const rm=new THREE.Mesh(ridge,new THREE.MeshBasicMaterial({color:0x0b0f24,side:THREE.BackSide,fog:true}));rm.position.y=-3.5;g.add(rm);
 const rim=new THREE.Mesh(new THREE.CylinderGeometry(52,52,5,80,1,true),new THREE.MeshBasicMaterial({color:0x0f1330,side:THREE.BackSide}));
 const rp2=rim.geometry.attributes.position;for(let i=0;i<rp2.count;i++)if(rp2.getY(i)>0){const a=Math.atan2(rp2.getZ(i),rp2.getX(i));rp2.setY(i,1.5+vnoise(a*8,9)*5);}
 rim.position.y=-2.4;g.add(rim);
 return {group:g,mound,scorch};
}

function makeSky(THREE,tier){
 const c=document.createElement('canvas');c.width=4;c.height=512;const x=c.getContext('2d'),g=x.createLinearGradient(0,0,0,512),tc=new THREE.Color(tier.color);
 const tint=(k,base)=>'#'+new THREE.Color(base).lerp(tc,k).getHexString();
 g.addColorStop(0,'#01020a');g.addColorStop(.45,'#070b24');g.addColorStop(.72,tint(.14,0x141a4a));g.addColorStop(.86,tint(.28,0x2a2150));g.addColorStop(1,'#1a1228');x.fillStyle=g;x.fillRect(0,0,4,512);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}

function makeStars(THREE,uniforms){
 const layers=[];
 for(const [n,R,size,tw] of [[800,95,1.5,.3],[360,70,2.3,.5],[120,45,3.6,.8]]){
  const pos=new Float32Array(n*3),sz=new Float32Array(n),ph=new Float32Array(n),col=new Float32Array(n*3),cc=new THREE.Color();
  for(let i=0;i<n;i++){const u=Math.random(),th=Math.random()*Math.PI*2,y=Math.pow(u,.8)*.97+.03,r=Math.sqrt(1-y*y);pos[i*3]=Math.cos(th)*r*R;pos[i*3+1]=y*R*.75;pos[i*3+2]=-Math.abs(Math.sin(th))*r*R*.9-R*.12;sz[i]=size*rnd(.5,1.2);ph[i]=Math.random()*6.28;cc.setHSL(rnd(.55,.68)*(Math.random()<.2?.13:1),.5,rnd(.8,.95));col.set([cc.r,cc.g,cc.b],i*3);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('aSize',new THREE.BufferAttribute(sz,1));geo.setAttribute('aPh',new THREE.BufferAttribute(ph,1));geo.setAttribute('aColor',new THREE.BufferAttribute(col,3));
  const mat=new THREE.ShaderMaterial({uniforms:{uTime:uniforms.uTime,uDpr:uniforms.uDpr,uTw:{value:tw}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
   vertexShader:`attribute float aSize;attribute float aPh;attribute vec3 aColor;uniform float uTime;uniform float uDpr;uniform float uTw;varying vec3 vC;varying float vT;void main(){vT=.65+.35*sin(uTime*(1.5+aPh*.4)+aPh*9.)*uTw/.5*.5+(1.-uTw)*.1;vC=aColor;gl_PointSize=aSize*uDpr*(.85+.3*vT);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
   fragmentShader:`varying vec3 vC;varying float vT;void main(){float d=length(gl_PointCoord-.5)*2.;float a=smoothstep(1.,0.,d);a*=a;gl_FragColor=vec4(vC*(.8+.5*vT),a);
#include <colorspace_fragment>
}`});
  const pts=new THREE.Points(geo,mat);pts.frustumCulled=false;pts.renderOrder=-3;layers.push({pts,depth:R});
 }
 return layers;
}

function createWorld(THREE,renderer,tierName,{reduced,onEvent}){
 const tier=TIERS[tierName]||TIERS.uncommon,color=new THREE.Color(tier.color),gold=new THREE.Color(0xffd36a),white=new THREE.Color(0xfff1c8),hot=new THREE.Color(0xff8a3a);
 // Spark colour: gold flecks for Legendary, holographic cyan/violet/magenta/gold for Secret, else white-to-tier.
 const holoHues=[0x3ff5ff,0xb388ff,0xff4bd8,0xffd36a].map(h=>new THREE.Color(h));
 const sparkCol=(mix=.9)=>tier.holo?holoHues[(Math.random()*4)|0]:tier.gold&&Math.random()<.6?gold:white.clone().lerp(color,Math.random()*mix);
 const scene=new THREE.Scene(),aspect0=Math.max(.3,innerWidth/innerHeight);
 const camera=new THREE.PerspectiveCamera(50,aspect0,.1,400);
 const uniforms={uScale:{value:1},uTime:{value:0},uDpr:{value:renderer.getPixelRatio()}};
 const owned=[];const own=o=>(owned.push(o),o);
 scene.background=own(makeSky(THREE,tier));
 scene.fog=new THREE.Fog(0x1a1228,28,95);
 // lighting: cool moon rim from behind-left, tier rim from behind-right, tier point light on the pod, warm impact light
 scene.add(new THREE.HemisphereLight(0x4a5aa0,0x2a1a1c,.75));
 const moon=new THREE.DirectionalLight(0xa9c2ff,2.2);moon.position.set(-9,11,-9);scene.add(moon);
 const rimR=new THREE.DirectionalLight(color.clone().lerp(white,.35),.45);rimR.position.set(9,5,-7);scene.add(rimR);
 const front=new THREE.DirectionalLight(0x6a7ab8,.55);front.position.set(2,3,10);scene.add(front);
 const podLight=new THREE.PointLight(color.clone().lerp(white,.4),0,16,1.6);podLight.position.set(0,2.2,2.6);scene.add(podLight);
 const impactLight=new THREE.PointLight(0xff8a3a,0,14,1.8);impactLight.position.set(0,.6,1.6);scene.add(impactLight);
 const hatchLight=new THREE.PointLight(color,0,12,1.4);scene.add(hatchLight);
 // environment reflections so the metal reads: dark sky, a tier-coloured strip and a cool softbox
 {const env=new THREE.Scene(),sky=new THREE.Mesh(new THREE.SphereGeometry(20,24,12),new THREE.MeshBasicMaterial({color:0x10142c,side:THREE.BackSide}));env.add(sky);
  for(const [x,y,z,w,h,c] of [[-8,8,-6,10,3,0xa9c2ff],[9,3,-5,2.5,10,color.getHex()],[0,12,4,14,2,0x5566aa],[0,2,10,12,3,0x333a60]]){const b=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:c,side:THREE.DoubleSide}));b.position.set(x,y,z);b.lookAt(0,0,0);env.add(b);}
  const pm=new THREE.PMREMGenerator(renderer);scene.environment=own(pm.fromScene(env,.03).texture);scene.environmentIntensity=.9;pm.dispose();env.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
 // sky dressing
 const stars=makeStars(THREE,uniforms),starGroup=new THREE.Group();for(const l of stars)starGroup.add(l.pts);scene.add(starGroup);
 const nebTex=own(glowTexture(THREE,'255,255,255',[[0,.55],[.35,.28],[.7,.08],[1,0]]));
 const nebula=(tier.holo?[[-24,24,-85,135,color,.75],[30,44,-95,120,new THREE.Color(0x2fe0ff),.55],[2,62,-80,140,new THREE.Color(0xff4bd8),.32],[-40,52,-90,90,new THREE.Color(0x3ff5ff),.3]]:[[-22,26,-85,110,color,.5],[30,48,-95,95,new THREE.Color(0x5a3cff),.38],[0,60,-80,120,new THREE.Color(0x2fd0c0),.18]]).map(([x,y,z,s,col,o])=>{const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:nebTex,color:col,transparent:true,opacity:o,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));sp.position.set(x,y,z);sp.scale.set(s,s*.7,1);sp.renderOrder=-2;scene.add(sp);return {sp,o};});
 const moonTex=own(glowTexture(THREE,'200,220,255',[[0,1],[.18,.95],[.22,.35],[.6,.08],[1,0]]));
 const moonSp=new THREE.Sprite(new THREE.SpriteMaterial({map:moonTex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));moonSp.position.set(-30,34,-85);moonSp.scale.setScalar(30);scene.add(moonSp);
 const terrain=buildTerrain(THREE,tier);scene.add(terrain.group);
 // particles
 const glow=own(glowTexture(THREE)),puff=own(puffTexture(THREE));
 const fire=new Pool(THREE,700,{additive:true,tex:glow,uniforms}),sparks=new Pool(THREE,500,{additive:true,tex:glow,uniforms}),smoke=new Pool(THREE,500,{tex:puff,uniforms}),dust=new Pool(THREE,420,{tex:puff,uniforms}),steam=new Pool(THREE,520,{tex:puff,uniforms}),embers=new Pool(THREE,300,{additive:true,tex:glow,uniforms});
 sparks.gravity=-9;sparks.drag=.35;dust.drag=1.4;dust.gravity=-.2;steam.wobble=.5;steam.drag=.25;smoke.drag=.6;fire.drag=1.2;embers.drag=.15;embers.wobble=1;
 for(const [pool,order] of [[smoke,1],[dust,2],[steam,3],[fire,4],[sparks,5],[embers,6]]){pool.points.renderOrder=order;scene.add(pool.points);}
 // pod
 const podRoot=new THREE.Group(),podVisual=new THREE.Group();podRoot.add(podVisual);scene.add(podRoot);
 let parts=null,glbMode=false,hatchY=2.1,coreScale=1;
 const fallback=buildFallbackPod(THREE,tier);podVisual.add(fallback);parts=fallback.userData;
 const hatchGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,color:new THREE.Color(1,1,1).lerp(color,.4),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:0}));hatchGlow.scale.setScalar(2.4);scene.add(hatchGlow);
 const heat=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,color:hot.clone().lerp(color,.25),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:0}));scene.add(heat);
 const trailMat=new THREE.ShaderMaterial({vertexShader:BEAM_VERT,fragmentShader:BEAM_FRAG,uniforms:{uColor:{value:color.clone()},uOpacity:{value:0},uPow:{value:1.4}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
 const cone=new THREE.ConeGeometry(.6,1,20,1,true);cone.translate(0,.5,0);const trail=new THREE.Mesh(cone,trailMat);trail.visible=false;scene.add(trail);
 const beamMat=new THREE.ShaderMaterial({vertexShader:BEAM_VERT,fragmentShader:BEAM_FRAG,uniforms:{uColor:{value:color.clone()},uOpacity:{value:0},uPow:{value:.8}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
 const cyl=new THREE.CylinderGeometry(.85,.5,1,28,1,true);cyl.translate(0,.5,0);const beam=new THREE.Mesh(cyl,beamMat);beam.visible=false;scene.add(beam);
 const beamMat2=beamMat.clone();beamMat2.uniforms={uColor:{value:white.clone().lerp(color,.3)},uOpacity:{value:0},uPow:{value:.6}};const cyl2=new THREE.CylinderGeometry(.34,.18,1,20,1,true);cyl2.translate(0,.5,0);const beam2=new THREE.Mesh(cyl2,beamMat2);beam2.visible=false;scene.add(beam2);
 const ringMat=new THREE.MeshBasicMaterial({color:white.clone().lerp(color,.4),transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
 const ringGeo=new THREE.RingGeometry(.9,1,72),shock=[0,1].map(()=>{const m=new THREE.Mesh(ringGeo,ringMat.clone());m.rotation.x=-Math.PI/2;m.position.y=.12;m.visible=false;scene.add(m);return {m,t0:0};});
 // rocks
 const rockGeo=new THREE.DodecahedronGeometry(1,0),rockMat=new THREE.MeshStandardMaterial({color:0x4a3828,roughness:1,flatShading:true}),rocks=[];
 for(let i=0;i<tier.rocks;i++){const m=new THREE.Mesh(rockGeo,rockMat),s=rnd(.07,.2)*(tier.big?1.3:1);m.scale.set(s,s*rnd(.6,1),s*rnd(.8,1.1));m.visible=false;scene.add(m);rocks.push({m,v:new THREE.Vector3(),s,bounce:0});}

 // timeline
 const T_FALL=tier.sky,T_LAND=tier.sky+tier.fall,T_PROMPT=T_LAND+tier.settle;
 const START=new THREE.Vector3(1.8,11.5,-2.5),END=new THREE.Vector3(0,-1.02,.1),dirFall=END.clone().sub(START).normalize();
 const qFall=new THREE.Quaternion(),qLand=new THREE.Quaternion().setFromEuler(new THREE.Euler(.06,0,-.15)),qSpin=new THREE.Quaternion(),Y=new THREE.Vector3(0,1,0),down=new THREE.Vector3(0,-1,0);
 qFall.setFromUnitVectors(down,dirFall);
 let t=0,last=performance.now(),tapT=null,gate=false,popped=false,landed=false,silent=false,done=false,failed=false,prevPos=START.clone(),pop0=0,landT=0,revealed=false;
 const shakes=[];const addShake=(at,amp,decay=4.4)=>{if(!reduced)shakes.push({at,amp,decay});};
 const lookY=new THREE.Vector3(),camBase=new THREE.Vector3(),tmp=new THREE.Vector3(),hatchPos=new THREE.Vector3();
 const fit=()=>Math.max(1,.46/Math.max(.2,camera.aspect));
 const sh=(tt,s)=>Math.sin(tt*41+s)*.6+Math.sin(tt*27.3+s*2.3)*.4;
 const hatchWorld=out=>parts?.core?podRoot.localToWorld(out.set(0,hatchY,0).applyMatrix4(podVisual.matrix)):out.set(0,2.1,0);
 podRoot.position.copy(START);podRoot.visible=false;

 function setUniformsSize(){uniforms.uScale.value=innerHeight*renderer.getPixelRatio()/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));uniforms.uDpr.value=renderer.getPixelRatio();}
 function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();setUniformsSize();}

 function impact(){
  landed=true;landT=t;podRoot.visible=true;podRoot.position.copy(END);
  terrain.mound.visible=true;
  if(!silent){
   onEvent('impact');addShake(t,tier.shake,4.2);if(tier.aftershock)addShake(t+.5,tier.aftershock,5);
   impactLight.intensity=140;
   shock[0].m.visible=true;shock[0].t0=t;shock[1].m.visible=!!tier.big;shock[1].t0=t+.16;
   const nd=Math.round(95*tier.dust);
   for(let i=0;i<nd;i++){const a=Math.random()*6.28,sp=rnd(2,6.5)*(tier.big?1.2:1);dust.emit(Math.cos(a)*.8,.25,Math.sin(a)*.8,Math.cos(a)*sp,rnd(.4,2.6),Math.sin(a)*sp,rnd(1.6,2.8),rnd(.7,1.2),rnd(2.4,4)*(tier.big?1.25:1),new THREE.Color().setRGB(.47,.37,.3).lerp(color,.05).multiplyScalar(rnd(.8,1.15)),.62);}
   for(let i=0;i<40*tier.dust;i++){dust.emit(rnd(-.5,.5),.3,rnd(-.5,.5),rnd(-.8,.8),rnd(3,7.5),rnd(-.8,.8),rnd(1.4,2.4),rnd(.7,1),rnd(2,3.4),new THREE.Color().setRGB(.5,.4,.33).multiplyScalar(rnd(.8,1.1)),.55);}
   const ns=Math.round(70*tier.sparks);
   for(let i=0;i<ns;i++){const a=Math.random()*6.28,sp=rnd(4,12),c=sparkCol();sparks.emit(Math.cos(a)*.5,.4,Math.sin(a)*.5,Math.cos(a)*sp,rnd(3,10),Math.sin(a)*sp,rnd(.6,1.5),rnd(.1,.2),.02,c,1);}
   for(const r of rocks){r.m.visible=true;const a=Math.random()*6.28,sp=rnd(4.5,10);r.m.position.set(Math.cos(a)*1.5,.4,Math.sin(a)*1.5);r.v.set(Math.cos(a)*sp,rnd(4,9),Math.sin(a)*sp);r.bounce=0;}
  }else for(const r of rocks){const a=Math.random()*6.28,d=rnd(MOUND_R*.9,MOUND_R+3.5);r.m.visible=true;r.m.position.set(Math.cos(a)*d,r.s*.5,Math.sin(a)*d);r.bounce=9;}
  terrain.mound.userData.t0=t;
  silent=false;
 }

 function pop(){
  popped=true;pop0=t;onEvent('pop');const quiet=silent;silent=false;
  hatchWorld(hatchPos);
  if(!quiet){
   addShake(t,tier.big?.4:.26,6);
   for(let i=0;i<80;i++){const a=Math.random()*6.28,sp=rnd(.3,2.2);steam.emit(hatchPos.x+Math.cos(a)*.3,hatchPos.y,hatchPos.z+Math.sin(a)*.3,Math.cos(a)*sp,rnd(3.5,8),Math.sin(a)*sp,rnd(1.6,3),rnd(.6,1),rnd(2.5,4.5),new THREE.Color(.9,.93,1),.55);}
   const ns=Math.round(60*tier.sparks);for(let i=0;i<ns;i++){const a=Math.random()*6.28,sp=rnd(1,5);sparks.emit(hatchPos.x,hatchPos.y,hatchPos.z,Math.cos(a)*sp,rnd(4,11),Math.sin(a)*sp,rnd(.8,1.8),rnd(.08,.16),.02,sparkCol(.8),1);}
  }
 }

 function emitTrail(a,b,speedK){
  const dist=a.distanceTo(b),n=Math.min(40,Math.ceil(dist/.14)+2);
  for(let i=0;i<n;i++){
   const k=i/n,x=lerp(a.x,b.x,k)-dirFall.x*1.1,y=lerp(a.y,b.y,k)-dirFall.y*1.1,z=lerp(a.z,b.z,k)-dirFall.z*1.1,c=Math.random()<.45?white.clone().lerp(hot,Math.random()*.6):color.clone().lerp(white,Math.random()*.4);
   fire.emit(x,y,z,-dirFall.x*rnd(.5,3)+rnd(-.4,.4),-dirFall.y*rnd(.5,3)+rnd(-.4,.4),-dirFall.z*rnd(.5,3)+rnd(-.4,.4),rnd(.45,.95),rnd(.5,.85)*(1+speedK*.4),.08,c,.95);
   if(Math.random()<.5)smoke.emit(x,y,z,rnd(-.4,.4),rnd(-.2,.5),rnd(-.4,.4),rnd(1.2,1.9),rnd(.5,.8),rnd(1.4,2.2),new THREE.Color(.2,.18,.24).lerp(color,.12),.3);
   if(Math.random()<.18)sparks.emit(x,y,z,rnd(-2,2)-dirFall.x*3,rnd(-2,2)-dirFall.y*3,rnd(-2,2)-dirFall.z*3,rnd(.3,.8),rnd(.09,.15),.02,tier.holo?sparkCol():tier.gold?gold:white,1);
  }
 }

 let steamAcc=0,emberAcc=0;
 const ventPts=[[-1.15,.42],[1.25,.28],[.35,1.15],[-.55,-.95],[.9,-.7]].map(([x,z])=>{const r=Math.hypot(x,z),th=Math.atan2(z,x);return [x,moundHeight(r,th)+.06,z];});
 function steamTick(dt,rate){
  steamAcc+=dt*rate;
  while(steamAcc>1){steamAcc--;
   let x,y,z;if(Math.random()<.55){const v=ventPts[(Math.random()*ventPts.length)|0];x=v[0]+rnd(-.15,.15);y=v[1];z=v[2]+rnd(-.15,.15);}else{const a=Math.random()*6.28,r=rnd(.6,1.9);x=Math.cos(a)*r;z=Math.sin(a)*r;y=moundHeight(r,a)+.06;}
   steam.emit(x,y,z,rnd(-.15,.15),rnd(.8,1.7),rnd(-.1,.2),rnd(2.2,3.6),rnd(.6,1),rnd(2.2,3.6),new THREE.Color(.8,.84,.93).lerp(color,.12),.4);
  }
 }

 function update(){
  const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;
  t=(t0real===null?(t0real=now,0):(now-t0real)/1000)+skipOffset;
  uniforms.uTime.value=t;
  // ---- events
  if(!landed&&t>=T_LAND)impact();
  const u=tapT===null?-1:t-tapT;
  if(tapT!==null&&!popped&&gate&&u>=.5){pop();if(fast){pop0=t-2;fast=false;}}
  const pu=popped?t-pop0:-1;
  if(popped&&!revealed&&pu>=1.25){revealed=true;onEvent('revealed');}
  // ---- pod
  const s=clamp((t-T_FALL)/tier.fall),p=Math.pow(s,1.85);
  if(!landed){
   podRoot.visible=t>=T_FALL;
   podRoot.position.lerpVectors(START,END,p);
   qSpin.setFromAxisAngle(Y,(1-p)*Math.PI*4);podRoot.quaternion.copy(qFall).multiply(qSpin);
   if(podRoot.visible){
    const speedK=p;emitTrail(prevPos,podRoot.position,speedK);
    trail.visible=true;trail.position.copy(podRoot.position).addScaledVector(dirFall,-.9);
    tmp.copy(dirFall).negate();trail.quaternion.setFromUnitVectors(Y,tmp);const len=1.5+7*Math.min(1,p*1.4);trail.scale.set(.4+.8*p,len,.4+.8*p);
    trailMat.uniforms.uOpacity.value=.55+.35*p;
    heat.visible=true;heat.position.copy(podRoot.position).addScaledVector(dirFall,.1);heat.material.opacity=.7+.3*Math.sin(t*40);heat.scale.setScalar(2.2+3.4*p);
   }
   prevPos.copy(podRoot.position);
   // the engine glows hot during re-entry, panels tinted by heat
   if(parts?.glow)parts.glow.emissiveIntensity=2+2*p;
  }else{
   const lt=t-landT;podRoot.position.copy(END);
   podRoot.quaternion.slerp(qLand,clamp(dt*14));
   if(trail.visible){trailMat.uniforms.uOpacity.value=Math.max(0,.9-lt*3.5);if(lt>.3)trail.visible=false;}
   if(heat.visible){heat.material.opacity=Math.max(0,1-lt*4);heat.scale.setScalar(4+lt*10);if(lt>.25)heat.visible=false;}
   // settle: seams cool from white-hot to tier glow and pulse
   if(parts?.glow&&u<.5)parts.glow.emissiveIntensity=lerp(5,1.3,clamp(lt/1.6))+.4*Math.sin(t*3.2)*clamp(lt-1);
   if(parts?.nozzle)parts.nozzle.material.color.lerp(new THREE.Color(0x201510),clamp(dt*1.2));
  }
  // mound grows on impact
  if(landed){const mk=clamp((t-landT)/.4);terrain.mound.scale.y=Math.max(.001,silent?1:easeOutBack(mk));terrain.scorch.material.opacity=clamp((t-landT)/.5)*.9;}
  // shockwaves
  for(const sw of shock){if(!sw.m.visible)continue;const k=clamp((t-sw.t0)/.75);if(t<sw.t0){sw.m.scale.setScalar(.001);continue;}sw.m.scale.setScalar(.8+k*8);sw.m.material.opacity=(1-k)*(1-k)*.8;if(k>=1)sw.m.visible=false;}
  // rocks
  for(const r of rocks){if(!r.m.visible||r.bounce>=3)continue;r.v.y-=14*dt;r.m.position.addScaledVector(r.v,dt);r.m.rotation.x+=r.v.x*dt;r.m.rotation.z+=r.v.z*dt;
   const rr=Math.hypot(r.m.position.x,r.m.position.z),gy=(rr<MOUND_R?moundHeight(rr,Math.atan2(r.m.position.z,r.m.position.x))*terrain.mound.scale.y:0)+r.s*.4;
   if(r.m.position.y<gy){if(rr<1.5){const a=Math.atan2(r.m.position.z,r.m.position.x);r.m.position.x=Math.cos(a)*1.6;r.m.position.z=Math.sin(a)*1.6;}r.m.position.y=gy;r.v.y*=-.35;r.v.x*=.5;r.v.z*=.5;r.bounce++;}}
  // impact + pod lights
  impactLight.intensity=Math.max(0,impactLight.intensity*Math.exp(-dt*5.5));
  const pulse=.5+.5*Math.sin(t*3.4);
  podLight.intensity=!landed?(podRoot.visible?18+16*p:0):lerp(18,26,clamp((t-landT)/1.2))+6*pulse+(u>=0?20*clamp(u):0);
  podLight.position.set(0,2.4,3);
  if(!landed&&podRoot.visible)podLight.position.copy(podRoot.position).add(tmp.set(0,0,3));
  // rattle, lid, beam
  podVisual.position.set(0,0,0);podVisual.rotation.set(0,0,0);
  if(tapT!==null&&u>=0&&!popped&&!reduced){const k=Math.min(1,u/.5),a=.016+.03*k;podVisual.position.set(rnd(-a,a),0,rnd(-a,a));podVisual.rotation.z=rnd(-a,a)*.5;if(parts?.glow)parts.glow.emissiveIntensity=lerp(1.4,6,k);steamTick(dt,50);if(Math.random()<.6)sparks.emit(rnd(-.5,.5),1.2+rnd(0,.8),rnd(-.1,.5)+.5,rnd(-1,1),rnd(1,3),rnd(0,2),rnd(.3,.7),.08,.02,white,1);}
  podVisual.updateMatrix();
  hatchWorld(hatchPos);
  if(parts?.hinge){parts.hinge.rotation.z=popped?2.05*(1-Math.exp(-9*pu)*Math.cos(15*pu)):0;}
  if(parts?.core)parts.core.visible=glbMode?popped:true;
  if(glbMode&&parts?.core)parts.core.scale.setScalar(popped?clamp(pu*4)*coreScale:.001);
  if(popped){
   const k=clamp(pu/.5),grow=1-Math.pow(1-k,3);
   beam.visible=beam2.visible=true;beam.position.copy(hatchPos);beam2.position.copy(hatchPos);
   const flick=.92+.08*Math.sin(t*23)+.05*Math.sin(t*9.7);
   beam.scale.set(1,18*grow,1);beam2.scale.set(1,18*grow,1);
   beamMat.uniforms.uOpacity.value=.5*grow*flick;beamMat2.uniforms.uOpacity.value=.6*grow*flick;
   hatchLight.position.copy(hatchPos).add(tmp.set(0,.6,.8));hatchLight.intensity=(55+25*flick)*grow;
   hatchGlow.position.copy(hatchPos);hatchGlow.material.opacity=.9*grow*flick;hatchGlow.scale.setScalar(2.4+.4*Math.sin(t*14)+(1-grow)*1.5);
   emberAcc+=dt*(tier.big?90:55);
   while(emberAcc>1){emberAcc--;const a=Math.random()*6.28,r=rnd(0,.4);embers.emit(hatchPos.x+Math.cos(a)*r,hatchPos.y+.1,hatchPos.z+Math.sin(a)*r,rnd(-.3,.3),rnd(2.2,5.5),rnd(-.3,.3),rnd(1.4,2.6),rnd(.08,.18),.02,tier.holo||tier.gold?sparkCol(.7):white.clone().lerp(color,.7),1);}
  }
  // steam: continuous, loops forever once landed
  if(landed&&!(tapT!==null&&!popped))steamTick(dt,(popped?44:30)*clamp((t-landT)/.9)*(silent?1:1));
  // ---- camera
  const asp=Math.max(.2,camera.aspect),f=fit(),lt2=clamp(t/T_LAND);
  let camY=2.4,camZ=8.6*f,lk=lerp(6,1.5,smooth(lt2));
  if(landed){lk=1.5;camBase.x=Math.sin(t*.28)*.22*(1-clamp(pu/1));}else camBase.x=0;
  if(popped){const k=smooth(clamp(pu/1.5));camZ=lerp(8.6,8,k)*f;camY=lerp(2.4,2.5,k);lk=lerp(1.5,2.1,k);}
  camera.position.set(camBase.x,camY,camZ);lookY.set(0,lk,0);
  // tier rumble builds while the pod is incoming (Rare and Legendary)
  let amp=0,fov=50;
  if(!landed&&tier.rumble&&!reduced)amp+=tier.rumble*smooth(clamp(t/T_LAND))*(t>=T_FALL?1.6:.5);
  for(let i=shakes.length-1;i>=0;i--){const sk=shakes[i],age=t-sk.at;if(age<0)continue;const a=sk.amp*Math.exp(-age*sk.decay);if(a<.004&&age>.2)shakes.splice(i,1);else{amp+=a;}}
  camera.position.x+=sh(t,1)*amp*.8;camera.position.y+=sh(t,7)*amp*.8;camera.position.z+=sh(t,13)*amp*.4;
  camera.lookAt(lookY);camera.rotateZ(sh(t,19)*amp*.07);
  fov=50-amp*5;if(Math.abs(fov-camera.fov)>.01){camera.fov=fov;camera.updateProjectionMatrix();setUniformsSize();}
  // sky motion: stars drift, layers parallax against the camera's pan
  starGroup.rotation.y=t*.006;for(const [i,l] of stars.entries()){l.pts.position.y=(lk-1.5)*(i+1)*.6;l.pts.rotation.y=t*.004*(i+1);}
  for(const n of nebula){n.sp.material.opacity=n.o*(1+(tier.big?.35:.12)*Math.sin(t*.6+n.o*9))*(1+(!landed?.0:0));}
  if(tier.big&&!landed&&t>T_FALL){nebula[0].sp.material.opacity=nebula[0].o*(1.4+.4*Math.sin(t*9));}
  // ---- particles
  for(const pool of [fire,sparks,smoke,dust,steam,embers])pool.update(dt);
  renderer.render(scene,camera);
 }
 let t0real=null,skipOffset=0,fast=false;
 resize();
 const world={
  update,resize,tier,pools:{fire,sparks,smoke,dust,steam,embers},
  get t(){return t;},get landed(){return landed;},get promptReady(){return landed&&t>=T_PROMPT&&tapT===null;},get tapped(){return tapT!==null;},
  tap(){if(tapT===null){tapT=t;gate=false;}},
  release(){gate=true;},
  cancelTap(){tapT=null;gate=false;},
  skipToPrompt(){silent=true;if(t<T_PROMPT)skipOffset+=T_PROMPT-t+.001;},
  skipToOpen(){fast=true;if(!popped)silent=true;if(popped){pop0=Math.min(pop0,t-2);fast=false;}},
  get popped(){return popped;},
  // Where the pod is on screen in CSS px (for the tap target): centre and pixels per world unit.
  podScreen(){tmp.set(0,(hatchY-END.y)/2,0).add(podRoot.position).project(camera);const d=camera.position.distanceTo(podRoot.position);return {x:(tmp.x*.5+.5)*innerWidth,y:(-tmp.y*.5+.5)*innerHeight,k:innerHeight/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)))/d};},
  get silent(){return silent;},
  useModel(model){
   if(tapT!==null||glbMode||!parts)return;
   if(tier.holo){const h=holoMaterials(THREE,uniforms.uTime),shells=[];model.traverse(o=>{if(o.isMesh){o.material=h.body;o.renderOrder=7;const s=new THREE.Mesh(o.geometry,h.glow);s.scale.setScalar(1.025);s.renderOrder=8;shells.push([o,s]);}});for(const [o,s] of shells)o.add(s);}
   else{const m=tierMaterial(THREE,tierName);model.traverse(o=>{if(o.isMesh)o.material=m;});}
   const core=parts.core;glbMode=true;podVisual.remove(fallback);podVisual.add(model);
   // Faked hatch: a small glowing disc sunk into the top (the light, beam and sprite sell the opening).
   const c=core.clone();c.material=core.material.clone();model.add(c);hatchY=model.userData.top*.96;coreScale=clamp(model.userData.radius*.45/.42,.25,.8);c.position.y=hatchY;c.rotation.x=-Math.PI/2;
   parts={core:c,glow:null,nozzle:null,hinge:null};
   // A mesh/node named "lid" or "hatch" is the real lid: hinge it on its lower -x edge; otherwise the glowing disc fakes the opening.
   let lid=null;model.traverse(o=>{if(!lid&&/^(lid|hatch)/i.test(o.name))lid=o;});
   if(lid){
    podRoot.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(lid).applyMatrix4(podVisual.matrixWorld.clone().invert());
    if(!box.isEmpty()){const hinge=new THREE.Group();hinge.position.set(box.min.x,box.min.y,(box.min.z+box.max.z)/2);podVisual.add(hinge);hinge.updateMatrixWorld(true);hinge.attach(lid);parts.hinge=hinge;c.position.set((box.min.x+box.max.x)/2,box.min.y,(box.min.z+box.max.z)/2);}
   }
  },
  dispose(){
   scene.traverse(o=>{o.geometry?.dispose();const m=o.material;if(m)for(const x of Array.isArray(m)?m:[m]){x.map?.dispose();x.dispose();}});
   for(const o of owned)o.dispose?.();for(const l of stars)l.pts.geometry.dispose();
   scene.environment=null;scene.background=null;
  }
 };
 return world;
}

// Plays one pack's sequence full screen. open() runs the pack at the moment the pod is tapped and resolves to the
// reveal items [{title,detail,colors}] (or null when it could not be saved: the pod stays closed, tap to retry).
// hasNext is a boolean or a function; onNext() may return the next {tier,open,hasNext,onNext}; the sequence restarts from the sky with it.
export async function playDropPod(config){
 let {tier,open,hasNext,onNext}=config;const onExit=config.onExit;
 const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
 const style=document.createElement('style');style.textContent=CSS;document.head.append(style);
 const dlg=document.createElement('dialog');dlg.className='drop-pod';dlg.setAttribute('aria-label','Opening reward pack');
 dlg.innerHTML=`<canvas aria-hidden="true"></canvas><div class="drop-pod-flash"></div><p class="drop-pod-caption" aria-hidden="true">Incoming drop pod</p>
<button type="button" class="drop-pod-skip" data-skip>Skip</button>
<button type="button" class="drop-pod-hit" data-hit aria-label="Open the drop pod"></button>
<p class="drop-pod-prompt" aria-hidden="true">Tap the pod<small data-error></small></p>
<section class="drop-pod-card" aria-live="polite" aria-atomic="true"><p class="eyebrow" data-eyebrow></p><div data-items></div></section>
<div class="drop-pod-actions"><button type="button" class="secondary" data-exit>Exit</button><button type="button" data-next>Open another</button></div>`;
 document.body.append(dlg);
 const $=sel=>dlg.querySelector(sel),flash=$('.drop-pod-flash');
 let phase=startPhase({reduced}),world=null,renderer=null,raf=0,disposed=false,gen=0,fullscreenTried=false,items=null,pending=null,THREE=null;
 const go=event=>{phase=advance(phase,event);dlg.dataset.phase=phase;};
 const setTier=name=>{const t=TIERS[name]?name:'uncommon';dlg.dataset.tier=t;dlg.style.setProperty('--pack',TIERS[t].color);$('.drop-pod-caption').textContent=t==='secret'?'Secret transmission':'Incoming drop pod';};
 setTier(tier);dlg.dataset.phase=phase;
 dlg.tabIndex=-1;dlg.showModal();dlg.focus({preventScroll:true});
 // Fullscreen where allowed (not iOS Safari); the fixed 100vw x 100dvh dialog is the fallback.
 if(!fullscreenTried){fullscreenTried=true;try{dlg.requestFullscreen?.({navigationUI:'hide'})?.catch?.(()=>{});}catch{}}
 const leaveFullscreen=()=>{try{if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});}catch{}};

 function exit(){
  if(disposed)return;disposed=true;cancelAnimationFrame(raf);removeEventListener('resize',onResize);
  world?.dispose();renderer?.dispose();renderer?.forceContextLoss?.();leaveFullscreen();dlg.close();dlg.remove();style.remove();
  try{onExit?.();}catch(error){console.error(error);}
 }
 const onResize=()=>world?.resize();addEventListener('resize',onResize);
 dlg.addEventListener('cancel',event=>{event.preventDefault();exit();});

 function showItems(list){
  const wrap=$('[data-items]');wrap.replaceChildren();$('[data-eyebrow]').textContent=dlg.dataset.tier==='secret'?'SECRET':`${dlg.dataset.tier} pack opened`;
  if(!list.length){const s=document.createElement('strong');s.textContent='Collection complete';const d=document.createElement('small');d.textContent='All cosmetics for your unlocked coaches are collected.';const item=document.createElement('div');item.className='drop-pod-item';item.append(s,d);wrap.append(item);}
  for(const entry of list){
   const item=document.createElement('div');item.className='drop-pod-item';const s=document.createElement('strong');s.textContent=`${entry.title} unlocked!`;const d=document.createElement('small');d.textContent=entry.detail||'';item.append(s,d);
   if(entry.colors?.length){const sw=document.createElement('div');sw.className='drop-pod-swatches';for(const c of entry.colors){const i=document.createElement('i');i.style.background=c;sw.append(i);}item.append(sw);}
   wrap.append(item);
  }
 }
 function afterReveal(){
  if(disposed||phase!=='reveal')return;
  const next=$('[data-next]'),more=typeof hasNext==='function'?hasNext():!!hasNext;next.hidden=!more;
  setTimeout(()=>{if(!disposed)(more?next:$('[data-exit]')).focus();},900);
 }

 async function tap(){
  if(phase!=='landed'||!world||world.tapped)return;
  const mine=gen;go('tap');dlg.classList.remove('ready');$('[data-error]').textContent='';world.tap();
  let result=null;try{result=await open();}catch(error){console.error(error);}
  if(disposed||mine!==gen)return;
  if(!result){go('fail');world.cancelTap();dlg.classList.add('ready');$('[data-error]').textContent='Could not save this pack. Tap the pod to try again.';$('[data-hit]').focus();return;}
  items=result;world.release();
 }
 $('[data-hit]').onclick=tap;
 $('[data-exit]').onclick=exit;
 $('[data-next]').onclick=async()=>{
  const nextConfig=await onNext?.();if(!nextConfig||disposed)return;
  ({tier,open,hasNext,onNext}=nextConfig);go('restart');await begin();
 };
 // Skip: straight to the reveal. The pack still opens (once) through open().
 $('[data-skip]').onclick=async()=>{
  if(!world||phase==='reveal')return;
  if(phase==='opened'){world.skipToOpen();return;}
  world.skipToPrompt();flash.classList.remove('go');
  if(phase==='sky'||phase==='drop'){go('land');}
  dlg.classList.remove('ready');await tap();
  if(world&&!world.tapped)return;
  world?.skipToOpen();
 };

 function frame(){
  if(disposed)return;raf=requestAnimationFrame(frame);
  world.update();
  {const ps=world.podScreen(),hit=$('[data-hit]');hit.style.left=ps.x+'px';hit.style.top=ps.y+'px';hit.style.width=Math.min(innerWidth*.8,2.5*ps.k)+'px';hit.style.height=Math.min(innerHeight*.5,2.6*ps.k)+'px';}
  if(phase==='sky'&&world.t>=world.tier.sky)go('fall');
  if(world.landed&&(phase==='sky'||phase==='drop'))go('land');
  if(phase==='landed'&&world.promptReady&&!dlg.classList.contains('ready')){dlg.classList.add('ready');$('[data-hit]').focus({preventScroll:true});}
  if(phase==='opened'&&items&&worldRevealed){
   showItems(items);items=null;go('revealed');afterReveal();
  }
 }
 let worldRevealed=false;

 async function begin(){
  const mine=++gen;dlg.classList.remove('ready');worldRevealed=false;items=null;setTier(tier);dlg.dataset.phase=phase;$('[data-error]').textContent='';
  world?.dispose();world=null;
  if(!THREE){
   try{THREE=await import('three');}catch(error){console.error(error);}
   if(disposed)return;
  }
  if(mine!==gen)return;
  if(!THREE){await fallbackReveal();return;}
  if(!renderer){
   try{renderer=new THREE.WebGLRenderer({canvas:$('canvas'),antialias:true,alpha:false,powerPreference:'high-performance'});}catch(error){console.error(error);renderer=null;}
   if(!renderer){await fallbackReveal();return;}
   renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  }
  world=createWorld(THREE,renderer,tier,{reduced,onEvent:event=>{
   if(event==='impact'&&!reduced){flash.classList.remove('go','pop');void flash.offsetWidth;flash.classList.add('go');}
   if(event==='pop'&&!reduced&&!world.silent){flash.classList.remove('go','pop');void flash.offsetWidth;flash.classList.add('pop');}
   if(event==='revealed')worldRevealed=true;
  }});
  if(reduced){world.skipToPrompt();}
  loadGlb(THREE,TIERS[tier]?tier:'uncommon').then(model=>{if(model&&!disposed&&mine===gen&&world)world.useModel(model);});
  cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);
 }
 // No WebGL: skip the 3D and still open the pack, so a pack is never stuck.
 async function fallbackReveal(){
  dlg.dataset.phase='landed';phase='landed';let result=null;try{result=await open();}catch(error){console.error(error);}
  if(disposed)return;showItems(result||[]);phase='opened';go('revealed');afterReveal();
 }
 await begin();
 return {exit,state:()=>phase,get world(){return world;}};
}

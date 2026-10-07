// Achievement Vault atomic hall: purple screen -> shrink -> a straight hall of coach statues, one per goal
// (easy -> hard). Walk/inspect feel ported from play/lilboyfriend (eased route, drag/wheel/keys/held arrows,
// nearest-exhibit inspect). Lazy: loaded only by the vault door. AGPL-3.0-or-later.
export const GAP=6, ROOT='/creature/models/roster/', TOP=1.55;
// One statue per goal. Coaches are chosen by unlock level, highest first, working down (only as many as there are
// goals); the hall then runs low -> high so the last goal ('unlocked-everything') wears the highest-level coach.
const RANK={easy:0,medium:1,hard:2,expert:3};
export const pickCoaches=(n,reqs)=>{const top=[...reqs].sort((a,b)=>(RANK[b.difficulty]??0)-(RANK[a.difficulty]??0)).slice(0,n);return top.reverse().map(c=>c.id);};
export const coachPath=id=>ROOT+String(id).replace(/^roster\//,'')+'.glb';
export const statueZ=i=>-GAP*(i+1),STOP=4.8; // route value at which you stand in front of statue i
export const stopAt=i=>-statueZ(i)-STOP;
export const nearestStatue=(route,n,max=1.6)=>{let b=-1,d=max;for(let i=0;i<n;i++){const e=Math.abs(stopAt(i)-route);if(e<d){b=i;d=e;}}return b;};
// <=5 resident: 1 behind, current, 3 ahead.
export const residentWindow=(cur,n)=>{const o=[];for(let i=Math.max(0,cur-1);i<=Math.min(n-1,cur+3);i++)o.push(i);return o;};
const safe=(f,d)=>{try{return f()??d;}catch{return d;}};
export const isEarned=(g,state)=>!!(safe(()=>g.test(state),false)||state?.earned?.[g.id]);
export const firstUnearned=(goals,state)=>goals.findIndex(g=>!isEarned(g,state));
export function cardModel(g,state,packs=[]){
 const e=isEarned(g,state),at=state?.earned?.[g.id],t=at&&(at.at??at.ts??at),p=safe(()=>g.progress(state),null);
 return {earned:e,tier:g.tier,clue:g.clue,title:e?g.title:'???',date:e&&t&&!isNaN(new Date(t))?new Date(t).toLocaleDateString():'',
  progress:!e&&p&&p.need>1?{have:Math.max(0,Math.min(p.have|0,p.need)),need:p.need}:null,
  pack:e&&packs.find(id=>String(id).endsWith(':vault-'+g.id))||null};
}
let live=null;
export function exitHall(){const l=live;live=null;if(!l)return;l.stop();window.dispatchEvent(new CustomEvent('myr5:vault-hall-exit'));}
const CSS=`.vh{position:fixed;inset:0;z-index:7000;background:#08030f;overflow:hidden;touch-action:none;font:500 15px/1.4 system-ui;color:#fff4d6;user-select:none}
.vh canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.vh-pur{position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,#b56bff,#7a2fc4 55%,#3a0f66);pointer-events:none}
.vh-x{position:absolute;left:12px;top:calc(12px + env(safe-area-inset-top,0px));min-height:44px;padding:0 16px;border:2px solid #ffd36e;border-radius:22px;background:#171020cc;color:#ffd36e;font:800 14px system-ui;z-index:3}
.vh-pos{position:absolute;right:14px;top:calc(22px + env(safe-area-inset-top,0px));font:800 13px ui-monospace,monospace;color:#ff9c36;letter-spacing:.1em;z-index:3}
.vh-arr{position:absolute;right:14px;bottom:calc(24px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:10px;z-index:3}
.vh-arr button{width:56px;height:56px;border-radius:28px;border:2px solid #ffd36e;background:#171020cc;color:#ffd36e;font-size:22px;touch-action:none}
.vh-card{position:absolute;left:12px;right:84px;bottom:calc(20px + env(safe-area-inset-bottom,0px));padding:14px 16px;border:2px solid #7a2fc4;border-radius:16px;background:#171020ee;box-shadow:0 0 30px #7a2fc488;z-index:3;transition:opacity .25s,transform .25s}
.vh-card[hidden]{display:block;opacity:0;transform:translateY(16px);pointer-events:none}
.vh-card h3{margin:2px 0 6px;font:900 19px/1.15 system-ui;color:#ffd36e}.vh-card .t{font:800 11px ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase;color:#b56bff}.vh-card .t.legendary{color:#ff9c36}
.vh-card .c{font:600 16px/1.35 ui-monospace,monospace;color:#ff9c36;text-shadow:0 0 8px #ff9c3688;margin:6px 0}
.vh-bar{height:10px;border-radius:5px;background:#3a2358;overflow:hidden}.vh-bar i{display:block;height:100%;background:linear-gradient(90deg,#ff9c36,#ffd36e)}.vh-card small{display:block;margin-top:4px;color:#d8c8ee}
.vh-card button{margin-top:8px;min-height:44px;padding:0 18px;border:0;border-radius:12px;background:#ffd36e;color:#15101c;font:800 15px system-ui}`;
const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const HOLO_V=`uniform float uT;varying vec3 vN,vV;varying float vH,vY;
float h1(float n){return fract(sin(n*91.7)*43758.5);}
void main(){vec4 w=modelMatrix*vec4(position,1.);float g=step(.975,h1(floor(uT*7.)+floor(w.y*9.)))*.05;w.x+=g*(h1(floor(uT*7.))-.5)*2.;vY=w.y;vH=(w.y-.5)/${TOP.toFixed(2)};vN=normalize(normalMatrix*normal);vec4 mv=viewMatrix*w;vV=-mv.xyz;gl_Position=projectionMatrix*mv;}`;
const HOLO_F=`uniform float uT,uEarn,uBoost,uSeed;uniform vec3 uP,uPr,uO,uOr;varying vec3 vN,vV;varying float vH,vY;
float h1(float n){return fract(sin(n*91.7)*43758.5);}
void main(){float f=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.2);
 float front=uEarn*1.25-.1,on=1.-smoothstep(front-.04,front+.04,vH),band=exp(-pow((vH-front)*9.,2.))*step(.001,uEarn)*step(uEarn,.999);
 vec3 base=mix(mix(uP,uPr,f),mix(uO,uOr,f),on);
 float scan=.55+.45*sin(vY*95.-uT*3.2),fine=.85+.15*sin(vY*420.+uT*9.);
 float fl=.88+.12*sin(uT*37.+uSeed)*step(.9,h1(floor(uT*6.)+uSeed));
 float a=(.2+f*.95)*scan*fine*fl*uBoost*(1.+on*1.2)+band*.9; // earned orange reads brighter than the purple locked ghost
 gl_FragColor=vec4(base*(1.+band*2.)*a*1.4,a);}`;
const BEAM_F=`uniform vec3 uC;uniform float uT;varying vec2 vU;void main(){float a=pow(1.-vU.y,2.2)*.05*(.8+.2*sin(vU.y*30.-uT*4.));gl_FragColor=vec4(uC,a);}`;
const BEAM_V=`varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
// Inside of a fibre-optic data cable: strands along the walk direction, data packets, glyph flecks.
const CABLE_V=`varying vec2 vU;varying float vD;void main(){vU=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vD=-mv.z;gl_Position=projectionMatrix*mv;}`;
const CABLE_F=`uniform float uT,uLen;varying vec2 vU;varying float vD;
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}
void main(){float S=64.,cx=vU.x*S,id=floor(cx),fx=fract(cx)-.5,hs=h2(vec2(id,1.));
 float line=(1.-smoothstep(0.,.09,abs(fx)))*step(.35,hs);float z=vU.y*uLen;
 float pk=(1.-smoothstep(0.,.16,fract(z*(.02+hs*.03)-uT*(.35+hs*.9)+hs*7.)))*step(.35,hs);
 vec3 c1=mix(vec3(.48,.18,.77),vec3(1.,.82,.43),step(.8,h2(vec2(id,2.))));
 vec3 col=c1*(line*.9+pk*line*3.5+(1.-smoothstep(.1,.45,abs(fx)))*.05);
 vec2 cell=vec2(id,floor(z*1.7));float fl=step(.975,h2(cell))*(.5+.5*sin(uT*3.+h2(cell)*40.))*(1.-smoothstep(.1,.3,abs(fx)));
 col+=vec3(1.,.85,.5)*fl*.6;float a=clamp(max(max(col.r,col.g),col.b),0.,1.)*(1.-smoothstep(12.,70.,vD));
 gl_FragColor=vec4(col,a);}`;
export async function enterHall(arg=document.body){
 const host=arg?.host||(arg instanceof Element?arg:document.body); // the door passes {host,door,goals,read}
 exitHall();
 const THREE=await import('three'),{GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js'),{MeshoptDecoder}=await import('three/addons/libs/meshopt_decoder.module.js');
 const goalsMod=await import('./vault-goals.mjs'),{GOALS}=goalsMod,store=await import('./vault-store.mjs').catch(()=>({}));
 const rewardPacks=await import('../../reward-packs.mjs').catch(()=>null),{COACH_REQUIREMENTS}=await import('../../performance-catalog.mjs');
 const N=GOALS.length,limit=stopAt(N-1)+2,state=()=>safe(()=>store.state(),{});
 // L0's statueCoaches(goals) wins when present (ids or {id}); otherwise highest-unlock-level coaches, working down.
 const FILES=(safe(()=>goalsMod.statueCoaches(GOALS),null)||pickCoaches(N,COACH_REQUIREMENTS)).map(c=>coachPath(c.coachId||c.id||c));
 const el=document.createElement('div');el.className='vh';
 el.innerHTML=`<style>${CSS}</style><canvas></canvas><div class="vh-pur"></div><button class="vh-x" aria-label="Leave the hall">&larr; Exit</button><div class="vh-pos"></div><div class="vh-arr"><button data-d="-1" aria-label="Walk forward">&#9650;</button><button data-d="1" aria-label="Walk back">&#9660;</button></div><div class="vh-card" hidden></div>`;
 host.append(el);const $=s=>el.querySelector(s),canvas=$('canvas'),card=$('.vh-card'),pur=$('.vh-pur'),pos=$('.vh-pos');
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
 const scene=new THREE.Scene();scene.background=new THREE.Color('#050210');
 const camera=new THREE.PerspectiveCamera(60,1,.1,140);
 const own=[],glow=(c,o=1)=>{const m=new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o,blending:THREE.AdditiveBlending,depthWrite:false});own.push(m);return m;};
 const uT={value:0},len=limit+34,zMid=-len/2+10;
 // Cable tube (transparent so stars/atoms show through the gaps), floor plate, gold cable rings.
 const tubeG=new THREE.CylinderGeometry(4.2,4.2,len,64,1,true),tubeM=new THREE.ShaderMaterial({uniforms:{uT,uLen:{value:len}},vertexShader:CABLE_V,fragmentShader:CABLE_F,transparent:true,side:THREE.BackSide,depthWrite:false,blending:THREE.AdditiveBlending});own.push(tubeG,tubeM);
 const tube=new THREE.Mesh(tubeG,tubeM);tube.rotation.x=Math.PI/2;tube.position.set(0,1.4,zMid);scene.add(tube);
 const fl=new THREE.MeshStandardMaterial({color:'#0c0818',metalness:.85,roughness:.35,emissive:'#1a0a33'}),floorG=new THREE.PlaneGeometry(7.2,len);own.push(fl,floorG);
 const floor=new THREE.Mesh(floorG,fl);floor.rotation.x=-Math.PI/2;floor.position.set(0,-.01,zMid);scene.add(floor);
 scene.add(new THREE.HemisphereLight('#b07cff','#120824',.5));
 const ringG=new THREE.TorusGeometry(4.15,.07,8,72),ringM=new THREE.MeshStandardMaterial({color:'#ffd36e',metalness:1,roughness:.3,emissive:'#7a5a10',emissiveIntensity:.6}),ringHalo=glow('#ffd36e',.18),haloG=new THREE.TorusGeometry(4.15,.3,6,72);own.push(ringG,ringM,haloG);
 const sun=new THREE.DirectionalLight('#ffe2b0',1.2);sun.position.set(2,5,3);scene.add(sun);
 for(let i=0;i<=N+4;i++){const z=-GAP*i+GAP/2,r=new THREE.Mesh(ringG,ringM),h=new THREE.Mesh(haloG,ringHalo);r.position.set(0,1.4,z);h.position.copy(r.position);scene.add(r,h);}
 // Space beyond the cable: stars + a few atoms (nucleus particle clusters with electron rings).
 const stN=500,st=new Float32Array(stN*3);for(let i=0;i<stN;i++)st.set([(Math.random()-.5)*70,(Math.random()-.5)*40+1,-Math.random()*len+10],i*3);
 const stG=new THREE.BufferGeometry();stG.setAttribute('position',new THREE.BufferAttribute(st,3));const stM=new THREE.PointsMaterial({color:'#e6d8ff',size:.14,transparent:true,opacity:.8,depthWrite:false});own.push(stG,stM);scene.add(new THREE.Points(stG,stM));
 const atoms=[],elecG=new THREE.SphereGeometry(.09,8,8),thin=new THREE.TorusGeometry(1,.012,6,72),pal=['#7a2fc4','#ff9c36','#ffd36e'],white=glow('#fff4d6');own.push(elecG,thin);
 for(let k=0;k<Math.ceil(limit/14)+2;k++){
  const side=k%2?1:-1,g=new THREE.Group();g.position.set(side*(8+(k*37%6)),(k*53%9)-1,-k*14-3);
  const pts=new Float32Array(90);for(let j=0;j<30;j++){const a=Math.random()*6.28,b=Math.acos(2*Math.random()-1),r=.5*Math.cbrt(Math.random());pts.set([r*Math.sin(b)*Math.cos(a),r*Math.sin(b)*Math.sin(a),r*Math.cos(b)],j*3);}
  const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pts,3));const pm=new THREE.PointsMaterial({color:pal[k%3],size:.16,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});own.push(pg,pm);g.add(new THREE.Points(pg,pm));
  const rm=glow(pal[(k+1)%3],.5),rings=[];
  for(let j=0;j<3;j++){const rg=new THREE.Group(),rr=1.3+j*.6,ring=new THREE.Mesh(thin,rm),e=new THREE.Mesh(elecG,white);ring.scale.setScalar(rr);rg.add(ring,e);rg.rotation.set(j*1.05,j*.7+k,0);rg.userData={e,rr,sp:.6+j*.35,ph:k+j};g.add(rg);rings.push(rg);}
  scene.add(g);atoms.push({g,rings});
 }
 // Warp streaks for the entry shrink.
 const sN=320,sp=new Float32Array(sN*6);for(let i=0;i<sN;i++){const a=Math.random()*6.28,r=.6+Math.random()*3.4,z=-Math.random()*40;sp.set([Math.cos(a)*r,Math.sin(a)*r+1.4,z,Math.cos(a)*r,Math.sin(a)*r+1.4,z-1.5],i*6);}
 const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(sp,3));const sm=new THREE.LineBasicMaterial({color:'#ffe9c0',transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});const streaks=new THREE.LineSegments(sg,sm);streaks.frustumCulled=false;scene.add(streaks);own.push(sg,sm);
 // USB drop: two rows of gold contact pins streak past (dashed lines along z) before the cable strands resolve.
 const pinP=[];for(let k=0;k<10;k++)for(const y of[.95,1.85])for(let d=0;d<14;d++){const x=(k-4.5)*.4,z=-d*4.2;pinP.push(x,y,z,x,y,z-2.6);}
 const pg2=new THREE.BufferGeometry();pg2.setAttribute('position',new THREE.Float32BufferAttribute(pinP,3));const pinM=new THREE.LineBasicMaterial({color:'#ffd36e',transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});const pins=new THREE.LineSegments(pg2,pinM);pins.frustumCulled=false;scene.add(pins);own.push(pg2,pinM);
 // Hologram statues: one ShaderMaterial program (cloned per statue for its own earn state), purple locked -> orange earned.
 const col=h=>new THREE.Color(h),holo=new THREE.ShaderMaterial({uniforms:{uT,uEarn:{value:0},uBoost:{value:1},uSeed:{value:0},uP:{value:col('#7a2fc4')},uPr:{value:col('#b07cff')},uO:{value:col('#ff9a2e')},uOr:{value:col('#ffd08a')}},vertexShader:HOLO_V,fragmentShader:HOLO_F,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});own.push(holo);
 const pedG=new THREE.CylinderGeometry(.7,.85,.5,24),pedM=new THREE.MeshStandardMaterial({color:'#15101f',metalness:.9,roughness:.3}),capG=new THREE.TorusGeometry(.72,.035,6,32),capM=new THREE.MeshStandardMaterial({color:'#ffd36e',metalness:1,roughness:.25,emissive:'#8a6a18',emissiveIntensity:.8}),haloG2=new THREE.CircleGeometry(1.1,32),nextM=glow('#b07cff',.5),beamG=new THREE.CylinderGeometry(.5,.72,2.1,24,1,true);own.push(pedG,pedM,capG,capM,haloG2,beamG);
 const pulseM=glow('#ffd36e',.9),pulseG=new THREE.TorusGeometry(.85,.05,8,48),pulse=new THREE.Mesh(pulseG,pulseM);own.push(pulseG);pulse.rotation.x=Math.PI/2;pulse.visible=false;scene.add(pulse);
 const nextLight=new THREE.PointLight('#b07cff',0,8,2);scene.add(nextLight);
 const statues=GOALS.map((g,i)=>{const grp=new THREE.Group(),x=i%2?1.7:-1.7;grp.position.set(x,0,statueZ(i));grp.rotation.y=i%2?-.5:.5;
  const ped=new THREE.Mesh(pedG,pedM);ped.position.y=.25;const cap=new THREE.Mesh(capG,capM);cap.rotation.x=Math.PI/2;cap.position.y=.5;
  const halo=new THREE.Mesh(haloG2,nextM);halo.rotation.x=-Math.PI/2;halo.position.y=.02;halo.visible=false;
  const mat=holo.clone();mat.uniforms={...holo.uniforms,uEarn:{value:0},uBoost:{value:1},uSeed:{value:i*3.7}};own.push(mat);
  const bm=new THREE.ShaderMaterial({uniforms:{uC:{value:col('#7a2fc4')},uT},vertexShader:BEAM_V,fragmentShader:BEAM_F,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});own.push(bm);
  const beam=new THREE.Mesh(beamG,bm);beam.position.y=.5+1.05;beam.scale.y=-1;
  grp.add(ped,cap,halo,beam);scene.add(grp);return {g,i,grp,halo,mat,bm,model:null,loading:0,tk:0,earned:false,anim:-1};});
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
 // Earn state: instant on load/refresh, 0.6 s sweep up the statue when newly earned while the hall is open.
 function setEarn(s,animate){const e=!!(s.g&&isEarned(s.g,state()));if(e===s.earned)return;s.earned=e;if(e&&animate&&s.model)s.anim=0;else{s.anim=-1;s.mat.uniforms.uEarn.value=e?1:0;}s.bm.uniforms.uC.value.set(e?'#ff9a2e':'#7a2fc4');}
 function freeModel(m){m.traverse(o=>{if(o.isMesh)o.geometry.dispose();});}
 function drop(s){if(!s.model)return;s.grp.remove(s.model);freeModel(s.model);s.model=null;}
 async function load(s){if(s.model||s.loading)return;const tk=s.loading=++s.tk;try{const m=(await loader.loadAsync(FILES[s.i])).scene;
  // Original materials are never shown: free them right away, wear the hologram.
  m.traverse(o=>{if(!o.isMesh)return;for(const mm of[].concat(o.material)){for(const v of Object.values(mm))if(v?.isTexture)v.dispose();mm.dispose();}o.material=s.mat;});
  if(s.loading!==tk||s.model||!live||!want.includes(s.i)){freeModel(m);return;}
  const box=new THREE.Box3().setFromObject(m),sz=box.getSize(new THREE.Vector3()),k=TOP/Math.max(sz.y,.001),c=box.getCenter(new THREE.Vector3());m.scale.setScalar(k);m.position.set(-c.x*k,.5-box.min.y*k,-c.z*k);
  s.model=m;s.grp.add(m);}catch(e){console.warn('vault statue',e);}finally{if(s.loading===tk)s.loading=0;}}
 let want=[];function stream(c){want=residentWindow(c,N);statues.forEach(s=>{if(want.includes(s.i))load(s);else{s.loading=0;drop(s);}});}
 // Walk state (ported from lilboyfriend).
 let fixT=-1,route=0,target=0,vel=0,held=0,cur=-1,insp=-1,blend=0,nextI=-1,started=performance.now(),last=started,raf=0,reached=false;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),move=d=>{target=clamp(target+d,0,limit);};
 const packId=g=>`reward-pack:${g.tier}:vault-${g.id}`;
 let rsum=null;import('../../reward-pack-ui.mjs').then(m=>{rsum=m.rewardSummary;if(insp>=0)showCard(insp);},()=>{});
 const showCard=i=>{const g=GOALS[i],m=cardModel(g,state(),safe(()=>rewardPacks.unopenedPacks(),[]));card.hidden=false;const got=m.earned&&safe(()=>rewardPacks.openedPack(packId(g)),null),list=got&&rsum?got.rewards.map(r=>{const q=rsum({reward:r,category:r.category});return `<div class="c">${esc(q.title)} <small style="display:inline">${esc(q.detail)}</small></div>`;}).join(''):'';
  card.innerHTML=`<div class="t ${m.tier}">${m.tier} &middot; ${m.earned?'unlocked':'locked'}${i===nextI?' &middot; next':''}</div>`+(m.earned?`<h3>${esc(m.title)}</h3>${m.date?`<small>Earned ${m.date}</small>`:''}${list||(m.pack?'<button data-pack>Open pack</button>':'')}`:`<div class="c">${esc(m.clue)}</div>`+(m.progress?`<div class="vh-bar"><i style="width:${100*m.progress.have/m.progress.need}%"></i></div><small>${m.progress.have} / ${m.progress.need}</small>`:''));};
 const refresh=()=>{nextI=firstUnearned(GOALS,state());statues.forEach(s=>{setEarn(s,true);s.halo.visible=s.i===nextI;});const n=statues[nextI];pulse.visible=!!n;nextLight.intensity=n?6:0;if(n){nextLight.position.set(n.grp.position.x*.6,1.8,n.grp.position.z+1.4);pulse.position.set(n.grp.position.x,.06,n.grp.position.z);}if(insp>=0)showCard(insp);};
 card.addEventListener('click',async e=>{const b=e.target.closest?.('[data-pack]');if(!b||!rewardPacks)return;const g=GOALS[insp];if(!g)return;b.disabled=true;
  const opened=await rewardPacks.openRewardPackExclusive(rewardPacks.packItem(g.tier,packId(g)));if(!opened){b.disabled=false;b.textContent='Try again';return;}showCard(insp);});
 // Input: drag up/down walks, wheel, keys, held arrows, tap a statue to walk to it.
 let drag=null;const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
 canvas.addEventListener('pointerdown',e=>{drag={id:e.pointerId,y:e.clientY,x:e.clientX,moved:0};canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const dy=e.clientY-drag.y;drag.moved+=Math.abs(dy)+Math.abs(e.clientX-drag.x);drag.y=e.clientY;drag.x=e.clientX;move(dy*.012);});
 const up=e=>{if(!drag||e.pointerId!==drag.id)return;const d=drag;drag=null;if(e.type==='pointerup'&&d.moved<10)tap(e);};
 canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
 function tap(e){const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(ndc,camera);
  for(const s of statues)if(s.model&&ray.intersectObject(s.grp,true).length){target=clamp(stopAt(s.i),0,limit);return;}}
 canvas.addEventListener('wheel',e=>{e.preventDefault();move(clamp(e.deltaY*.008,-1.5,1.5));},{passive:false});
 const kd=e=>{const k=e.key;if(k==='ArrowUp'||k==='w')held=-1;else if(k==='ArrowDown'||k==='s')held=1;else if(k==='Escape')exitHall();},ku=()=>{held=0;};addEventListener('keydown',kd);addEventListener('keyup',ku);
 for(const b of el.querySelectorAll('.vh-arr button')){const d=+b.dataset.d;b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);held=-d;});b.addEventListener('pointerup',ku);b.addEventListener('pointercancel',ku);}
 $('.vh-x').onclick=exitHall;
 window.addEventListener('myr5:vault-earned',refresh);
 const resize=()=>{const w=el.clientWidth||innerWidth,h=el.clientHeight||innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
 addEventListener('resize',resize);resize();
 const look=new THREE.Vector3();
 function frame(now){raf=0;if(!live||document.hidden)return;const dt=Math.min(.05,(now-last)/1000);last=now;const t=fixT>=0?fixT:(now-started)/1000;uT.value=t;
  // Entry: purple fades out, camera starts high + far and shrinks down into the hall with an FOV warp; streaks fade.
  const e=clamp((t-.3)/2.6,0,1),ease=1-Math.pow(1-e,3),inv=1-ease;pur.style.opacity=String(1-clamp((t-.7)/1.7,0,1));
  sm.opacity=Math.min(1,(1-e)*1.4);streaks.position.z=(t*40)%40;streaks.visible=e<1;pins.position.z=(t*46)%4.2*1+camera.position.z*0;pinM.opacity=Math.min(1,(1-e)*1.8);pins.visible=e<1;
  if(e>=1)move(held*dt*3);
  const gap=target-route;vel+=(clamp(gap*7,-3.3,3.3)-vel)*(1-Math.exp(-dt*14));const step=Math.abs(vel*dt)<Math.abs(gap)?vel*dt:gap;route+=Math.sign(step)===Math.sign(gap)?step:0;if(Math.abs(gap)<.001)vel=0;
  const near=e>=1&&Math.abs(vel)<.25?nearestStatue(route,N):-1;
  if(near!==insp){insp=near;if(insp>=0)showCard(insp);else card.hidden=true;}
  blend+=((insp>=0?1:0)-blend)*(1-Math.exp(-dt*6));
  const c=Math.max(0,Math.round((route+STOP-GAP)/GAP));if(c!==cur){cur=c;stream(clamp(cur,0,N-1));}
  pos.textContent=`${clamp(Math.floor((route+STOP+.01)/GAP),0,N)} / ${N}`;
  if(!reached&&route>=limit-2.2){reached=true;window.dispatchEvent(new CustomEvent('myr5:vault-hall-end'));store.bump?.('hall-end');}
  camera.fov=60+inv*60;camera.updateProjectionMatrix();
  camera.position.set(0,1.55+inv*7,-route+inv*18);look.set(0,1.55-inv*6,camera.position.z-20);
  if(insp>=0&&blend>.01){const s=statues[insp].grp.position;camera.position.x=s.x*.35*blend;look.lerp(new THREE.Vector3(s.x,.65,s.z),blend);}
  camera.lookAt(look);
  for(const s of statues){if(s.model)s.model.rotation.y=Math.sin(t*.6+s.i)*.2;
   if(s.anim>=0){s.anim+=dt/.6;s.mat.uniforms.uEarn.value=Math.min(1,s.anim);if(s.anim>=1)s.anim=-1;}
   s.mat.uniforms.uBoost.value=(s.earned?1:1.5)+(s.i===nextI?1+.7*Math.sin(t*3.2):0);}
  for(const a of atoms){a.g.rotation.y+=dt*.15;for(const r of a.rings){const u=r.userData,p=t*u.sp+u.ph;u.e.position.set(Math.cos(p)*u.rr,Math.sin(p)*u.rr,0);}}
  if(nextI>=0){nextLight.intensity=5+Math.sin(t*3)*2;nextM.opacity=.45+.25*Math.sin(t*3);const ph=(t%1.4)/1.4;pulse.scale.setScalar(1+ph*.9);pulseM.opacity=(1-ph)*.95;}
  renderer.render(scene,camera);raf=requestAnimationFrame(frame);}
 const vis=()=>{if(!document.hidden&&live&&!raf){last=performance.now();raf=requestAnimationFrame(frame);}};document.addEventListener('visibilitychange',vis);
 live={stop(){cancelAnimationFrame(raf);raf=0;removeEventListener('resize',resize);removeEventListener('keydown',kd);removeEventListener('keyup',ku);document.removeEventListener('visibilitychange',vis);window.removeEventListener('myr5:vault-earned',refresh);
  statues.forEach(s=>{s.loading=0;drop(s);});own.forEach(o=>o.dispose?.());renderer.dispose();el.remove();delete window.myr5Hall;}};
 // Debug/test hooks.
 if(/[?&]debug/.test(location.search)||localStorage.myr5Debug)window.myr5Hall={debug:()=>({route,target,insp,cur,nextI,n:N,resident:statues.filter(s=>s.model).map(s=>s.i),earned:statues.filter(s=>s.earned).map(s=>s.i)}),go:r=>{target=clamp(r,0,limit);},jump:r=>{route=target=clamp(r,0,limit);vel=0;},skip:()=>{started-=4000;},at:x=>{fixT=x;},refresh};
 statues.forEach(s=>setEarn(s,false));stream(0);refresh();raf=requestAnimationFrame(frame);
 return {exit:exitHall};
}

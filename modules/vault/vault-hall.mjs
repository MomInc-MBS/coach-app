// Achievement Vault atomic hall: purple screen -> shrink -> a straight hall of coach statues, one per goal
// (easy -> hard). Walk/inspect feel ported from play/lilboyfriend (eased route, drag/wheel/keys/held arrows,
// nearest-exhibit inspect). Lazy: loaded only by the vault door. AGPL-3.0-or-later.
export const GAP=6, ROOT='/creature/models/roster/', TOP=1.55;
// Smaller GLB of each coach group (01..23). Goal i wears coach i % 23.
export const COACH_FILES=['01-seed-pearo--blank_toy_figure_3d_model','02-taper-tallstalk--humanoid_robot_3d_model1','03-pearl-orb-ring--robot_3d_model','04-crest-wedge--stylized_3d_character','05-slope-bobble--clay_humanoid_figure_3d_model','06-ridge-triad--geometric_robot_3d_model1','07-bulb-sphereling--cute_robot_3d_model','08-shard-asym--fantasy_creature_3d_model2','09-monolith-tanka--robot_3d_model3','10-petal-wisp--ghost_character_3d_model','11-anvil-cask--clay-style_robot_3d_model','12-seedpod-snailslug--stylized_worm_3d_model','13-fan-split--stylized_toy_3d_model','14-chisel-spire--cone_head_3d_model','15-orbital-coili--robot_character_3d_model','16-spade-arch--stylized_humanoid_3d_model','17-shellcap-manyarm--mushroom_creature_3d_model','18-quad-all--dragon_creature_3d_model','19-genie-multi--multi-armed_humanoid_3d_model','20-lume--robotic_figure_3d_model','21-flyer--winged_humanoid_3d_model','22-curve--stylized_cartoon_figure_3d_model','23-blob-texture-bodies--cute_blob_creature_3d_model'];
export const coachFile=i=>ROOT+COACH_FILES[i%COACH_FILES.length]+'.glb';
export const statueZ=i=>-GAP*(i+1),STOP=3.2; // route value at which you stand in front of statue i
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
export async function enterHall(host=document.body){
 exitHall();
 const THREE=await import('three'),{GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js'),{MeshoptDecoder}=await import('three/addons/libs/meshopt_decoder.module.js');
 const {GOALS}=await import('./vault-goals.mjs'),store=await import('./vault-store.mjs').catch(()=>({}));
 const rewardPacks=await import('../../reward-packs.mjs').catch(()=>null);
 const N=GOALS.length,limit=stopAt(N-1)+2,state=()=>safe(()=>store.read(),{});
 const el=document.createElement('div');el.className='vh';
 el.innerHTML=`<style>${CSS}</style><canvas></canvas><div class="vh-pur"></div><button class="vh-x" aria-label="Leave the hall">&larr; Exit</button><div class="vh-pos"></div><div class="vh-arr"><button data-d="-1" aria-label="Walk forward">&#9650;</button><button data-d="1" aria-label="Walk back">&#9660;</button></div><div class="vh-card" hidden></div>`;
 host.append(el);const $=s=>el.querySelector(s),canvas=$('canvas'),card=$('.vh-card'),pur=$('.vh-pur'),pos=$('.vh-pos');
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
 const scene=new THREE.Scene();scene.background=new THREE.Color('#08030f');scene.fog=new THREE.Fog('#08030f',14,60);
 const camera=new THREE.PerspectiveCamera(60,1,.1,120);
 scene.add(new THREE.HemisphereLight('#b56bff','#1a0a2a',1.1));const key=new THREE.DirectionalLight('#ffe2b0',1.6);key.position.set(2,5,3);scene.add(key);
 const own=[],track=[],glow=(c,o=1)=>{const m=new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o,blending:THREE.AdditiveBlending,depthWrite:false});own.push(m);return m;};
 // Hall: gold edge lines, floor glass strip, an orbital ring-gate at every statue.
 const len=limit+30,gm=glow('#ffd36e',.55),fl=new THREE.MeshStandardMaterial({color:'#1a0f2e',metalness:.7,roughness:.35,emissive:'#2a0f4a'});own.push(fl);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(5,len),fl);floor.rotation.x=-Math.PI/2;floor.position.z=-len/2+8;scene.add(floor);own.push(floor.geometry);
 for(const x of[-2.5,2.5]){const g=new THREE.BoxGeometry(.05,.05,len),m=new THREE.Mesh(g,gm);m.position.set(x,.03,-len/2+8);scene.add(m);own.push(g);}
 const ringG=new THREE.TorusGeometry(3.3,.035,8,64),ringM=[glow('#7a2fc4',.8),glow('#ff9c36',.6)];own.push(ringG);
 for(let i=0;i<=N;i++){const r=new THREE.Mesh(ringG,ringM[i%2]);r.position.set(0,1.4,-GAP*i-GAP/2);r.rotation.y=i%2?.25:-.25;scene.add(r);track.push(r);}
 // Atoms in the void: nucleus particle clusters + tilted electron rings with orbiting electrons.
 const atoms=[],elecG=new THREE.SphereGeometry(.09,8,8),thin=new THREE.TorusGeometry(1,.012,6,72),pal=['#7a2fc4','#ff9c36','#ffd36e'],white=glow('#fff4d6');own.push(elecG,thin);
 for(let k=0;k<Math.ceil(limit/9)+3;k++){
  const side=k%2?1:-1,g=new THREE.Group();g.position.set(side*(7+(k*37%7)),(k*53%9)-1,-k*9-3);
  const pts=new Float32Array(90);for(let j=0;j<30;j++){const a=Math.random()*6.28,b=Math.acos(2*Math.random()-1),r=.5*Math.cbrt(Math.random());pts.set([r*Math.sin(b)*Math.cos(a),r*Math.sin(b)*Math.sin(a),r*Math.cos(b)],j*3);}
  const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pts,3));const pm=new THREE.PointsMaterial({color:pal[k%3],size:.16,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});own.push(pg,pm);g.add(new THREE.Points(pg,pm));
  const rm=glow(pal[(k+1)%3],.5),rings=[];
  for(let j=0;j<3;j++){const rg=new THREE.Group(),rr=1.3+j*.6,ring=new THREE.Mesh(thin,rm),e=new THREE.Mesh(elecG,white);ring.scale.setScalar(rr);rg.add(ring,e);rg.rotation.set(j*1.05,j*.7+k,0);rg.userData={e,rr,sp:.6+j*.35,ph:k+j};g.add(rg);rings.push(rg);}
  scene.add(g);atoms.push({g,rings});
 }
 // Warp streaks for the entry shrink.
 const sN=140,sp=new Float32Array(sN*6);for(let i=0;i<sN;i++){const a=Math.random()*6.28,r=.6+Math.random()*5,z=-Math.random()*40;sp.set([Math.cos(a)*r,Math.sin(a)*r+1.4,z,Math.cos(a)*r,Math.sin(a)*r+1.4,z-1.5],i*6);}
 const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(sp,3));const sm=new THREE.LineBasicMaterial({color:'#e7c8ff',transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});const streaks=new THREE.LineSegments(sg,sm);streaks.frustumCulled=false;scene.add(streaks);own.push(sg,sm);
 // Statues.
 const dark=new THREE.MeshStandardMaterial({color:'#2a1450',metalness:.9,roughness:.15,transparent:true,opacity:.6,emissive:'#5a22a8',emissiveIntensity:.7});own.push(dark);
 const pedG=new THREE.CylinderGeometry(.7,.85,.5,24),pedM=new THREE.MeshStandardMaterial({color:'#2a1446',metalness:.6,roughness:.4}),capG=new THREE.TorusGeometry(.72,.03,6,32),haloG=new THREE.CircleGeometry(1.1,32),capM=glow('#ffd36e',.9),nextM=glow('#ffd36e',.5);own.push(pedG,pedM,capG,haloG);
 const nextLight=new THREE.PointLight('#ffd36e',0,6);scene.add(nextLight);
 const statues=GOALS.map((g,i)=>{const grp=new THREE.Group(),x=i%2?1.7:-1.7;grp.position.set(x,0,statueZ(i));grp.rotation.y=i%2?-.5:.5;
  const ped=new THREE.Mesh(pedG,pedM);ped.position.y=.25;const cap=new THREE.Mesh(capG,capM);cap.rotation.x=Math.PI/2;cap.position.y=.5;
  const halo=new THREE.Mesh(haloG,nextM);halo.rotation.x=-Math.PI/2;halo.position.y=.02;halo.visible=false;
  grp.add(ped,cap,halo);scene.add(grp);return {g,i,grp,halo,model:null,loading:0,tk:0};});
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
 function skin(s){if(!s.model)return;const e=isEarned(s.g,state());s.model.traverse(o=>{if(o.isMesh){if(!o.userData.orig)o.userData.orig=o.material;o.material=e?o.userData.orig:dark;}});}
 function freeModel(m){m.traverse(o=>{if(!o.isMesh)return;o.geometry.dispose();for(const mm of[].concat(o.userData.orig||o.material)){for(const v of Object.values(mm))if(v?.isTexture)v.dispose();mm.dispose();}});}
 function drop(s){if(!s.model)return;s.grp.remove(s.model);freeModel(s.model);s.model=null;}
 async function load(s){if(s.model||s.loading)return;const tk=s.loading=++s.tk;try{const m=(await loader.loadAsync(coachFile(s.i))).scene;
  if(s.loading!==tk||s.model||!live||!want.includes(s.i)){freeModel(m);return;}
  const box=new THREE.Box3().setFromObject(m),sz=box.getSize(new THREE.Vector3()),k=TOP/Math.max(sz.y,.001),c=box.getCenter(new THREE.Vector3());m.scale.setScalar(k);m.position.set(-c.x*k,.5-box.min.y*k,-c.z*k);
  s.model=m;s.grp.add(m);skin(s);}catch(e){console.warn('vault statue',e);}finally{if(s.loading===tk)s.loading=0;}}
 let want=[];function stream(c){want=residentWindow(c,N);statues.forEach(s=>{if(want.includes(s.i))load(s);else{s.loading=0;drop(s);}});}
 // Walk state (ported from lilboyfriend).
 let route=0,target=0,vel=0,held=0,cur=-1,insp=-1,blend=0,nextI=-1,started=performance.now(),last=started,raf=0,reached=false;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),move=d=>{target=clamp(target+d,0,limit);};
 const showCard=i=>{const g=GOALS[i],m=cardModel(g,state(),safe(()=>rewardPacks.unopenedPacks(),[]));card.hidden=false;
  card.innerHTML=`<div class="t ${m.tier}">${m.tier} &middot; ${m.earned?'unlocked':'locked'}${i===nextI?' &middot; next':''}</div>`+(m.earned?`<h3>${esc(m.title)}</h3>${m.date?`<small>Earned ${m.date}</small>`:''}${m.pack?'<button data-pack>Open pack</button>':''}`:`<div class="c">${esc(m.clue)}</div>`+(m.progress?`<div class="vh-bar"><i style="width:${100*m.progress.have/m.progress.need}%"></i></div><small>${m.progress.have} / ${m.progress.need}</small>`:''));};
 const refresh=()=>{nextI=firstUnearned(GOALS,state());statues.forEach(s=>{skin(s);s.halo.visible=s.i===nextI;});const n=statues[nextI];nextLight.intensity=n?2.2:0;if(n)nextLight.position.set(n.grp.position.x,2.2,n.grp.position.z+.8);if(insp>=0)showCard(insp);};
 card.addEventListener('click',e=>{if(e.target.matches('[data-pack]'))document.querySelector('.reward-pack-launch')?.click();});
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
 function frame(now){raf=0;if(!live||document.hidden)return;const dt=Math.min(.05,(now-last)/1000);last=now;const t=(now-started)/1000;
  // Entry: purple fades out, camera starts high + far and shrinks down into the hall with an FOV warp; streaks fade.
  const e=clamp((t-.3)/2.6,0,1),ease=1-Math.pow(1-e,3),inv=1-ease;pur.style.opacity=String(1-clamp((t-.5)/1.6,0,1));
  sm.opacity=(1-e)*.9;streaks.position.z=(t*40)%40;streaks.visible=e<1;
  if(e>=1)move(held*dt*3);
  const gap=target-route;vel+=(clamp(gap*7,-3.3,3.3)-vel)*(1-Math.exp(-dt*14));const step=Math.abs(vel*dt)<Math.abs(gap)?vel*dt:gap;route+=Math.sign(step)===Math.sign(gap)?step:0;if(Math.abs(gap)<.001)vel=0;
  const near=e>=1&&Math.abs(vel)<.25?nearestStatue(route,N):-1;
  if(near!==insp){insp=near;if(insp>=0)showCard(insp);else card.hidden=true;}
  blend+=((insp>=0?1:0)-blend)*(1-Math.exp(-dt*6));
  const c=Math.max(0,Math.round((route+STOP-GAP)/GAP));if(c!==cur){cur=c;stream(clamp(cur,0,N-1));}
  pos.textContent=`${clamp(Math.floor((route+STOP+.01)/GAP),0,N)} / ${N}`;
  if(!reached&&route>=limit-2.2){reached=true;window.dispatchEvent(new CustomEvent('myr5:vault-hall-end'));}
  camera.fov=60+inv*60;camera.updateProjectionMatrix();
  camera.position.set(0,1.55+inv*7,-route+inv*18);look.set(0,1.55-inv*6,camera.position.z-20);
  if(insp>=0&&blend>.01){const s=statues[insp].grp.position;camera.position.x=s.x*.35*blend;look.lerp(new THREE.Vector3(s.x,1.1,s.z),blend);}
  camera.lookAt(look);
  for(const s of statues)if(s.model)s.model.rotation.y=Math.sin(t*.6+s.i)*.25+(s.i===insp?t*.5:0);
  for(const a of atoms){a.g.rotation.y+=dt*.15;for(const r of a.rings){const u=r.userData,p=t*u.sp+u.ph;u.e.position.set(Math.cos(p)*u.rr,Math.sin(p)*u.rr,0);}}
  track.forEach((r,i)=>r.rotation.z=t*.25*(i%2?1:-1));
  if(nextI>=0){nextLight.intensity=1.6+Math.sin(t*3)*.6;nextM.opacity=.35+.2*Math.sin(t*3);}
  renderer.render(scene,camera);raf=requestAnimationFrame(frame);}
 const vis=()=>{if(!document.hidden&&live&&!raf){last=performance.now();raf=requestAnimationFrame(frame);}};document.addEventListener('visibilitychange',vis);
 live={stop(){cancelAnimationFrame(raf);raf=0;removeEventListener('resize',resize);removeEventListener('keydown',kd);removeEventListener('keyup',ku);document.removeEventListener('visibilitychange',vis);window.removeEventListener('myr5:vault-earned',refresh);
  statues.forEach(s=>{s.loading=0;drop(s);});own.forEach(o=>o.dispose?.());renderer.dispose();el.remove();delete window.myr5Hall;}};
 // Debug/test hooks.
 window.myr5Hall={debug:()=>({route,target,insp,cur,nextI,n:N,resident:statues.filter(s=>s.model).map(s=>s.i),locked:statues.filter(s=>s.model&&s.model.children.length&&!isEarned(s.g,state())).length}),go:r=>{target=clamp(r,0,limit);},jump:r=>{route=target=clamp(r,0,limit);vel=0;},skip:()=>{started-=4000;},refresh};
 stream(0);refresh();raf=requestAnimationFrame(frame);
 return {exit:exitHall};
}

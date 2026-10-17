// Phase 2: the coach stands at the far end of the hall and throws asteroids and junk straight back down the corridor.
// They grow toward the camera; a fast limb through one punches it (explode) or slices it (cut), using the slice
// engine's pathKind and the camera-slice wrist-speed gate, hit-tested where the runner camera draws them.
// Each hit is a small bonus through pod.flow.workout.bonusXp (the XP lane caps the share), as slice does.
// Rate and speed ramp with course level; one that reaches the runner unhit is a stumble (emitted as 'miss').
import {pathKind,distPointSeg,rng,TYPES,TYPE_IDS} from '../slice/core.mjs';
export const THROW={every:[2.4,3.8],from:22,speed:[4.5,6.5],ramp:{every:.06,speed:.35,minEvery:.4,maxSpeed:5},reach:7.5,near:.6,xp:1,fast:.9,seen:.4,pad:.02};
export const throwEvery=level=>Math.max(THROW.ramp.minEvery,1-THROW.ramp.every*level);
export const throwSpeed=level=>Math.min(THROW.ramp.maxSpeed,THROW.ramp.speed*level);
const LIMBS=[13,14,15,16,25,26,27,28]; // elbows, wrists, knees, ankles (same as camera-slice)
// Pure state: objects at distance d ahead of the runner, lateral x and height y in corridor space.
export function createThrows({seed=1,onEvent=()=>{}}={}){
  const r=rng(seed),T={objects:[],t:0,spawnIn:1.5,hits:0,xp:0,thrown:0,throwing:0};
  let level=0;
  T.spawn=()=>{const type=TYPE_IDS[Math.floor(r()*TYPE_IDS.length)],o={id:++T.thrown,type,d:THROW.from,x:(r()*2-1)*1.1,y:1.1+r()*.9,r:.32+r()*.18,speed:THROW.speed[0]+r()*(THROW.speed[1]-THROW.speed[0])+throwSpeed(level),spin:(r()-.5)*6,alive:true};T.objects.push(o);T.throwing=.5;onEvent('throw',o);return o;};
  T.step=(dt,runner=0,active=true,lvl=0)=>{
    T.t+=dt;T.throwing=Math.max(0,T.throwing-dt);level=lvl;
    if(active){T.spawnIn-=dt;if(T.spawnIn<=0){T.spawn();T.spawnIn=(THROW.every[0]+r()*(THROW.every[1]-THROW.every[0]))*throwEvery(level);}}
    for(const o of T.objects){o.d-=(o.speed+runner)*dt;if(o.d<THROW.near){o.alive=false;onEvent('miss',o);}}
    T.objects=T.objects.filter(o=>o.alive);
  };
  T.clear=()=>{T.objects=[];};
  // a,b: limb segment in screen units (x scaled by aspect, y 0..1); screen(o) -> {x,y,r} or null when not drawn.
  T.strike=(a,b,kind,screen)=>{let n=0;for(const o of T.objects){if(!o.alive||o.d>THROW.reach)continue;const s=screen(o);if(!s)continue;
    if(distPointSeg(s,a,b)<=s.r+THROW.pad){o.alive=false;o.kind=kind;T.hits++;T.xp+=THROW.xp;n++;onEvent('hit',{...o,kind,cut:Math.atan2(b.y-a.y,b.x-a.x)});onEvent('bonus',{xp:THROW.xp});}}
    T.objects=T.objects.filter(o=>o.alive);return n;};
  return T;
}
// Limb tracker: the same speed gate and screen mapping as camera-slice (the body as if the video filled the stage).
export function createStriker(){
  const hist=new Map();
  return (detail,view)=>{
    const {points,now,width,height,mirrored}=detail;if(!points)return [];
    const sw=view.width,sh=view.height,k=Math.min(sw/width,sh/height),ox=(sw-width*k)/2,oy=(sh-height*k)/2,t=(now??performance.now())/1000,out=[];
    for(const i of LIMBS){const p=points[i];if(!p||(p.visibility??0)<THROW.seen){hist.delete(i);continue;}
      const px=mirrored?1-p.x:p.x,q={x:(ox+px*width*k)/sh,y:(oy+p.y*height*k)/sh,t},h=hist.get(i)||[];h.push(q);if(h.length>6)h.shift();hist.set(i,h);
      if(h.length<2)continue;const a=h[h.length-2],dt=t-a.t;
      if(dt<=0||dt>.5||Math.hypot(q.x-a.x,q.y-a.y)/dt<THROW.fast)continue;
      out.push({a,b:q,kind:pathKind(h)});}
    return out;
  };
}
// Three view: the coach at the far end, junk meshes, explode bursts and cut halves. pos(o) -> world Vector3.
export function mountThrowsView(THREE,scene,{showCoach=true}={}){
  const root=new THREE.Group();scene.add(root);
  const geo=new THREE.DodecahedronGeometry(1,0),junk=new THREE.BoxGeometry(1.4,.8,.9),bit=new THREE.BoxGeometry(.08,.08,.08);
  const mats=Object.fromEntries(Object.entries(TYPES).map(([k,[main,,light]])=>[k,new THREE.MeshStandardMaterial({color:main,emissive:light,emissiveIntensity:.35,roughness:.8,flatShading:true})]));
  const meshes=new Map(),fx=[],holder=new THREE.Group();root.add(holder);holder.visible=showCoach;let coach=null;
  // The 3D clay coach from the site, stood up with the eyes toward the runner (as coach-3d coachElement does);
  // a purple clay capsule until (or if never) the GLB loads.
  const fallback=new THREE.Mesh(new THREE.CapsuleGeometry(.35,.9,4,8),new THREE.MeshStandardMaterial({color:'#8e5b99',roughness:.9,emissive:'#3a1a4a'}));holder.add(fallback);
  const key=new THREE.PointLight('#f3dcff',8,7,1.4);key.position.set(0,.4,1.4);holder.add(key);
  if(showCoach)import('./coach-3d.mjs').then(m=>m.loadCoach(THREE)).then(c=>{coach=c;const pivot=new THREE.Group(),stand=new THREE.Group();pivot.rotation.x=Math.PI/2;pivot.add(c.group);stand.rotation.set(0,0,Math.PI/2);stand.add(pivot);stand.scale.setScalar(1.7);holder.add(stand);fallback.visible=false;}).catch(()=>{});
  const make=o=>{const m=new THREE.Mesh(o.type==='satellite-junk'?junk:geo,mats[o.type]);m.scale.setScalar(o.r);meshes.set(o.id,m);root.add(m);return m;};
  return {
    hit(o,pos){const m=meshes.get(o.id);if(!m)return;meshes.delete(o.id);
      if(o.kind==='slice'){for(const side of [-1,1]){const h=m.clone();h.scale.set(o.r,o.r*.5,o.r);h.position.copy(pos);root.add(h);fx.push({m:h,v:new THREE.Vector3(Math.cos(o.cut+Math.PI/2)*side*3,Math.sin(o.cut+Math.PI/2)*-side*3,1),spin:side*8,life:.8});}root.remove(m);}
      else{root.remove(m);for(let i=0;i<14;i++){const b=new THREE.Mesh(bit,mats[o.type]);b.position.copy(pos);root.add(b);fx.push({m:b,v:new THREE.Vector3(Math.random()-.5,Math.random()-.3,Math.random()-.5).multiplyScalar(9),spin:10,life:.6});}}},
    update(T,pos,coachPos,camera,dt,now){
      for(const o of T.objects){const m=meshes.get(o.id)||make(o);m.position.copy(pos(o));m.rotation.set(T.t*o.spin,T.t*o.spin*.7,0);}
      for(const [id,m] of meshes)if(!T.objects.some(o=>o.id===id)){root.remove(m);meshes.delete(id);}
      for(const f of fx){f.life-=dt;f.m.position.addScaledVector(f.v,dt);f.m.rotation.x+=f.spin*dt;f.m.scale.multiplyScalar(f.life>0?.97:0);if(f.life<=0)root.remove(f.m);}
      for(let i=fx.length-1;i>=0;i--)if(fx[i].life<=0)fx.splice(i,1);
      holder.position.copy(coachPos);holder.lookAt(camera.position.x,coachPos.y,camera.position.z);
      // Wind-up: a quick rear-back as each throw leaves his hand.
      holder.rotateX(-T.throwing*.9);coach?.tick(now,{pressure:.5+T.throwing});
    },
    clear(){for(const m of meshes.values())root.remove(m);meshes.clear();},
    dispose(){scene.remove(root);}};
}

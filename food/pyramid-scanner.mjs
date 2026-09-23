// Food pyramid 3D scanner: lazy three.js scene mounted in the Food panel above
// the existing camera/nutrition controls. Three.js is imported only when the
// panel opens (same pattern as hologram.mjs); the GLB is fetched at that point too.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {pyramidTiles} from './pyramid-tiles.mjs';
export {pyramidTiles} from './pyramid-tiles.mjs';

// Reuse the lightweight striped wall + paper notices from
// C:/Users/ianmy/Documents/Codex/2026-09-22/co/work/mominc-girlfriend-fix/tv/channels/girlfriend.html.
// These are the original game's CSS/DOM treatment; no raster art or external request is needed.
const ROOM_STYLE_ID='pyramidScannerRoomStyle';
const ROOM_CSS=`
#pyramidScanner{isolation:isolate;background:#bba16e!important}
#pyramidScanner .pyramid-room{position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none}
#pyramidScanner .dg-paper-wall{position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 139px,#604c4133 140px 142px),repeating-linear-gradient(0deg,#b8a477 0 79px,#c3b181 80px 82px);border:14px solid #665044}
#pyramidScanner .dg-paper-wall:after{content:'';position:absolute;inset:0;opacity:.22;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Cpath fill='%23fff' filter='url(%23p)' opacity='.7' d='M0 0h180v180H0z'/%3E%3C/svg%3E")}
#pyramidScanner .paper-poster{position:absolute;z-index:1;top:18%;left:7%;width:23%;padding:17px 13px;background:#e5d4a2;border:2px solid #ad9769;box-shadow:5px 5px #76614955;text-align:center;transform:rotate(-3deg);color:#4c3255;font:700 clamp(12px,1.5vw,22px)/1.25 Georgia,serif}
#pyramidScanner .paper-poster:before{content:'';position:absolute;width:45%;height:15px;left:27%;top:-9px;background:#e2c388bb;transform:rotate(3deg)}
#pyramidScanner .paper-poster small{display:block;font:9px monospace;letter-spacing:.1em;margin-top:12px}
#pyramidScanner .paper-note{position:absolute;z-index:1;left:35%;top:18%;background:#dbc68a;color:#463149;border-left:5px solid #79558a;padding:12px;font:11px monospace;transform:rotate(3deg)}
#pyramidScanner canvas{position:absolute;inset:0;z-index:2}
`;
let roomStyle=null,roomStyleUsers=0;
function acquireRoomStyle(){
 if(!roomStyle){roomStyle=document.getElementById(ROOM_STYLE_ID)||document.createElement('style');roomStyle.id=ROOM_STYLE_ID;roomStyle.textContent=ROOM_CSS;if(!roomStyle.isConnected)document.head.append(roomStyle);}
 roomStyleUsers++;
 return ()=>{roomStyleUsers=Math.max(0,roomStyleUsers-1);if(!roomStyleUsers){roomStyle?.remove();roomStyle=null;}};
}

const TILES=[ // [mesh name, tileState key, small label, tile background]
 ['screen_name','name','FOOD','#7fcf5a'],
 ['screen_calories','calories','CALORIES','#f4d35e'],
 ['screen_protein','protein','PROTEIN','#4fd1c5'],
 ['screen_fat','fat','FAT','#f4978e'],
 ['screen_carbs','carbs','CARBS','#7fcf5a'],
 ['screen_vitamins','vitamins','VITAMINS','#c9a7eb'],
];

function roundedRectPath(ctx,w,h,r){
 if(ctx.roundRect){ctx.beginPath();ctx.roundRect(0,0,w,h,r);return;}
 ctx.beginPath();ctx.moveTo(r,0);ctx.arcTo(w,0,w,h,r);ctx.arcTo(w,h,0,h,r);ctx.arcTo(0,h,0,0,r);ctx.arcTo(0,0,w,0,r);ctx.closePath();
}
function paintTile(canvas,bg,label,value){
 const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
 ctx.clearRect(0,0,w,h);ctx.fillStyle=bg;roundedRectPath(ctx,w,h,Math.min(w,h)*0.16);ctx.fill();
 ctx.fillStyle='#2a2320';ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.font=`700 ${Math.round(h*0.15)}px system-ui,-apple-system,sans-serif`;ctx.fillText(label,w/2,h*0.24);
 let size=h*0.33;
 for(;;){ctx.font=`800 ${Math.round(size)}px system-ui,-apple-system,sans-serif`;if(ctx.measureText(value).width<=w*0.86||size<=h*0.13)break;size-=2;}
 ctx.fillText(value,w/2,h*0.65);
}
// UV (0,0)=bottom-left, (1,1)=top-right per the asset contract: find corners by UV,
// not by buffer index order, since glTF export may reindex/triangulate the quad.
function quadCorners(mesh){
 const pos=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv;
 const pick=(ux,uy)=>{let best=0,bestD=Infinity;for(let i=0;i<uv.count;i++){const d=(uv.getX(i)-ux)**2+(uv.getY(i)-uy)**2;if(d<bestD){bestD=d;best=i;}}return new THREE.Vector3().fromBufferAttribute(pos,best);};
 return {bl:pick(0,0),br:pick(1,0),tl:pick(0,1)};
}
function softDotTexture(tint=1){
 const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');
 const g=ctx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,`rgba(255,255,255,${tint})`);g.addColorStop(1,'rgba(255,255,255,0)');
 ctx.fillStyle=g;ctx.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);
}

// anchor: an element already in the (core, always-loaded) food panel markup that
// this lazy-loaded scanner mounts itself just before. Building the host div and its
// styling here, instead of shipping them in launch-shell.mjs/food-live.css, keeps
// three.js and its container fully out of the core offline bundle.
export async function mountPyramidScanner(anchor,{getNutrition=()=>({name:null,nutrients:null}),signal}={}){
 const cancelled=()=>new DOMException('Pyramid scanner closed.','AbortError');
 if(signal?.aborted)throw cancelled();
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let disposed=false,raf=0,observer,timer,tileState=pyramidTiles(null,null);
 const download=new AbortController();
 const releaseRoomStyle=acquireRoomStyle();
 const host=document.createElement('div');host.id='pyramidScanner';host.setAttribute('aria-hidden','true');
 host.style.cssText='position:relative;width:100%;height:230px;border-radius:10px;overflow:hidden;margin-bottom:12px;background:#bba16e;touch-action:none';
 host.innerHTML='<div class="pyramid-room" aria-hidden="true"><div class="dg-paper-wall"></div><div class="paper-poster">CARED FOR.<br>CORRECTED.<br>PROVIDED FOR.<small>A MOM INC. WORKPLACE</small></div><div class="paper-note">READ THE SOURCE.<br>KEEP THE LABEL.</div></div>';
 anchor.before(host);
 const scene=new THREE.Scene(),stage=new THREE.Group(),pivot=new THREE.Group();
 scene.add(stage);stage.add(pivot);
 scene.add(new THREE.AmbientLight(0xffffff,0.95));
 const key=new THREE.DirectionalLight(0xffffff,0.75);key.position.set(0.6,1.4,1.2);scene.add(key);
 let renderer;
 try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}
 catch(error){host.remove();releaseRoomStyle();throw error;}
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.setClearColor(0x000000,0);
 renderer.domElement.style.cssText='display:block;width:100%;height:100%;touch-action:none';host.append(renderer.domElement);
 const camera=new THREE.PerspectiveCamera(35,1,0.01,20);camera.position.set(0,0.05,2.2);camera.lookAt(0,0.05,0);
 const raycaster=new THREE.Raycaster();

 const screens={},knobs=[];let lens=null,lensHalo=null,lensFlashT=-10,lensRadius=0.03;
 const steamTex=softDotTexture(0.9);
 const steamPool=Array.from({length:24},()=>({sprite:new THREE.Sprite(new THREE.SpriteMaterial({map:steamTex,transparent:true,opacity:0,depthWrite:false,color:0xf3ece8})),age:0,life:0,vel:new THREE.Vector3(),pos:new THREE.Vector3()}));
 for(const p of steamPool){p.sprite.visible=false;p.sprite.scale.setScalar(0.012);}

 function disposeMat(mat){for(const m of [mat].flat())if(m){for(const v of Object.values(m))if(v?.isTexture)v.dispose();m.dispose();}}
 function disposeTree(root){root.traverse(node=>{node.geometry?.dispose();if(node.material)disposeMat(node.material);});}
 function dispose(){
  if(disposed)return;disposed=true;cancelAnimationFrame(raf);observer?.disconnect();
  releaseRoomStyle();
  signal?.removeEventListener('abort',dispose);download.abort();clearTimeout(timer);
  window.removeEventListener('myr5:meal-nutrition',onNutrition);
  const dom=renderer.domElement;dom.removeEventListener('pointerdown',onDown);dom.removeEventListener('pointermove',onMove);dom.removeEventListener('pointerup',onUp);dom.removeEventListener('pointercancel',onUp);
  disposeTree(scene);
  for(const p of steamPool)if(!p.sprite.parent)p.sprite.material.dispose();
  steamTex.dispose();renderer.dispose();renderer.forceContextLoss();host.remove();
 }

 function repaint(){for(const [meshName,key,label,bg] of TILES){const s=screens[meshName];if(!s)continue;paintTile(s.canvas,bg,label,tileState[key]);s.tex.needsUpdate=true;}}
 function onNutrition(e){if(disposed)return;const current=e?.detail||getNutrition();tileState=pyramidTiles(current.name,current.nutrients);repaint();}
 window.addEventListener('myr5:meal-nutrition',onNutrition);

 function spawnSteam(k){
  if(reduced)return;
  for(let n=0;n<5;n++){
   const p=steamPool.shift();steamPool.push(p);
   p.pos.copy(k.basePos).addScaledVector(k.axis,0.01);
   p.vel.copy(k.axis).multiplyScalar(0.055).add(new THREE.Vector3((Math.random()-0.5)*0.018,(Math.random()-0.5)*0.018,(Math.random()-0.5)*0.018));
   p.age=0;p.life=0.85+Math.random()*0.3;p.sprite.visible=true;p.sprite.scale.setScalar(0.012);p.sprite.material.opacity=0.55;p.sprite.position.copy(p.pos);
  }
 }
 function updateSteam(dt){
  for(const p of steamPool){
   if(!p.sprite.visible)continue;
   p.age+=dt;if(p.age>p.life){p.sprite.visible=false;continue;}
   p.vel.y+=dt*0.05;p.pos.addScaledVector(p.vel,dt);p.sprite.position.copy(p.pos);
   const f=p.age/p.life;p.sprite.material.opacity=0.55*(1-f);p.sprite.scale.setScalar(0.012+f*0.02);
  }
 }
 function toggleKnob(k){k.on=!k.on;k.tapT=performance.now();spawnSteam(k);}
 function animateKnob(k,now){
  const dt=(now-k.tapT)/1000;
  if(!reduced&&k.tapT>0&&dt<1.1){const decay=Math.exp(-dt*4),ang=decay*Math.sin(dt*26)*0.5,pop=decay*Math.sin(dt*26)*0.002;
   k.mesh.quaternion.setFromAxisAngle(k.axis,ang);k.mesh.position.copy(k.basePos).addScaledVector(k.axis,pop);
  }else{k.mesh.quaternion.identity();k.mesh.position.copy(k.basePos);}
 }
 function pulseGlow(now){
  const t=now/1000;
  for(const k of knobs){
   const mat=k.mesh.material;if(!mat.emissive)continue;
   const idle=(k.on?0.32:0.12)+(reduced?0:Math.sin(t*2+k.mesh.id)*0.08),flashDt=(now-k.tapT)/1000,flash=!reduced&&flashDt>=0&&flashDt<0.3?(1-flashDt/0.3)*1.6:0;
   mat.emissive.set(k.on?0x7fe6ff:0x3fb6d8);mat.emissiveIntensity=Math.max(0.05,idle)+flash;
  }
  if(lensHalo){const idle=0.3+(reduced?0:Math.sin(t*2.4)*0.12),flashDt=(now-lensFlashT)/1000,flash=!reduced&&flashDt>=0&&flashDt<0.3?(1-flashDt/0.3)*0.9:0;lensHalo.material.opacity=Math.min(1,idle+flash);}
 }

 let dragging=false,downX=0,downY=0,downT=0,lastX=0,moved=false,velocity=0;
 function onDown(e){renderer.domElement.setPointerCapture?.(e.pointerId);dragging=true;moved=false;downX=lastX=e.clientX;downY=e.clientY;downT=performance.now();velocity=0;}
 function onMove(e){
  if(!dragging)return;
  const dx=e.clientX-lastX;lastX=e.clientX;
  if(Math.abs(e.clientX-downX)>6||Math.abs(e.clientY-downY)>6)moved=true;
  if(moved){pivot.rotation.y+=dx*0.009;velocity=reduced?0:dx*0.009;}
 }
 function lensWorldSphere(){const p=new THREE.Vector3();lens.getWorldPosition(p);const s=new THREE.Vector3();lens.getWorldScale(s);return new THREE.Sphere(p,lensRadius*s.x);}
 function handleTap(cx,cy){
  const rect=renderer.domElement.getBoundingClientRect();
  const ndc=new THREE.Vector2(((cx-rect.left)/rect.width)*2-1,-((cy-rect.top)/rect.height)*2+1);
  camera.updateMatrixWorld();raycaster.setFromCamera(ndc,camera);
  if(lens&&raycaster.ray.intersectSphere(lensWorldSphere(),new THREE.Vector3())){lensFlashT=performance.now();document.getElementById('foodCamera')?.click();return;}
  const hits=raycaster.intersectObjects(knobs.map(k=>k.mesh));
  if(hits.length)toggleKnob(knobs.find(k=>k.mesh===hits[0].object));
 }
 function onUp(e){
  if(!dragging)return;dragging=false;
  const dt=performance.now()-downT,dist=Math.hypot(e.clientX-downX,e.clientY-downY);
  if(!moved&&dist<6&&dt<400)handleTap(e.clientX,e.clientY);
 }
 const dom=renderer.domElement;
 dom.addEventListener('pointerdown',onDown);dom.addEventListener('pointermove',onMove);dom.addEventListener('pointerup',onUp);dom.addEventListener('pointercancel',onUp);

 function resize(){const r=host.getBoundingClientRect();renderer.setSize(Math.max(r.width,1),Math.max(r.height,1),false);camera.aspect=r.width/Math.max(r.height,1);camera.updateProjectionMatrix();}

 signal?.addEventListener('abort',dispose,{once:true});
 try{
  timer=setTimeout(()=>download.abort(),20000);let bytes;
  try{const response=await fetch('/food/pyramid-scanner.glb',{signal:download.signal});if(!response.ok)throw new Error('Pyramid model unavailable.');bytes=await response.arrayBuffer();}finally{clearTimeout(timer);}
  if(disposed)throw cancelled();
  const gltf=await new GLTFLoader().parseAsync(bytes,'');const model=gltf.scene;
  // GLTF texture decoding cannot be aborted. Discard a late result without
  // mounting anything or reviving the closed renderer/listeners.
  if(disposed){disposeTree(model);throw cancelled();}
  const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),scale=1.6/Math.max(size.x,size.y,size.z);
  const offset=new THREE.Group();offset.position.copy(center).multiplyScalar(-1);offset.add(model);
  const normalized=new THREE.Group();normalized.scale.setScalar(scale);normalized.add(offset);pivot.add(normalized);
  // Knob coordinates and their steam share the model's local coordinate space.
  // Add effects only after measuring the actual model for its camera framing.
  for(const p of steamPool)model.add(p.sprite);

  for(const [meshName] of TILES){
   const mesh=model.getObjectByName(meshName);if(!mesh)continue;
   const {bl,br,tl}=quadCorners(mesh),w=bl.distanceTo(br)||1,h=bl.distanceTo(tl)||1,targetH=220;
   const canvas=document.createElement('canvas');canvas.height=targetH;canvas.width=Math.max(64,Math.round(targetH*(w/h)));
   const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
   mesh.material=new THREE.MeshBasicMaterial({map:tex,side:THREE.FrontSide});
   screens[meshName]={canvas,tex};
  }
  repaint();

  for(let i=0;i<3;i++){
   const knob=model.getObjectByName(`knob_${i}`);if(!knob)continue;
   knob.material=Array.isArray(knob.material)?knob.material.map(m=>m.clone()):knob.material.clone();
   const axis=new THREE.Vector3(...(knob.userData.axis||[0,0,1])).normalize();
   knobs.push({mesh:knob,axis,basePos:knob.position.clone(),tapT:-10,on:false});
  }

  lens=model.getObjectByName('lens');
  if(lens){
   lensRadius=lens.userData.radius||0.03;
   lensHalo=new THREE.Sprite(new THREE.SpriteMaterial({map:steamTex,color:0x8ef2ff,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:0.3}));
   lensHalo.scale.setScalar(lensRadius*2.6);lens.add(lensHalo);
  }

  onNutrition();

  observer=new ResizeObserver(resize);observer.observe(host);resize();
  let last=performance.now();
  function animate(now){
   if(disposed)return;
   const dt=Math.min((now-last)/1000,0.05);last=now;
   if(!dragging){pivot.rotation.y+=velocity;velocity*=0.94;if(Math.abs(velocity)<1e-4)velocity=0;}
   if(!reduced){const t=now/1000;stage.position.y=Math.sin(t*1.1)*0.035;stage.rotation.z=Math.sin(t*0.7)*0.035;stage.rotation.x=Math.sin(t*0.5)*0.02;}
   for(const k of knobs)animateKnob(k,now);
   updateSteam(dt);pulseGlow(now);
   renderer.render(scene,camera);raf=requestAnimationFrame(animate);
  }
  raf=requestAnimationFrame(animate);
  return {dispose};
 }catch(error){dispose();throw error;}
}

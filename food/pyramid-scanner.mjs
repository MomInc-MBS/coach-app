// Food pyramid 3D scanner. #3: the floating pyramid IS the Food menu — this lazy three.js scene fills the
// Food dialog (launch.mjs puts it in .pyramid-mode; a WebGL or model failure falls back to the plain panel).
// The lens is the camera (#31); tap a screen to zoom it (#32, #13); the dials are Log by hand / Water / Today
// (D36); a half-turn spin or a clear swipe flips the screens between the last meal and today's totals (#35).
// Three.js is imported only when the panel opens (same pattern as hologram.mjs); the GLB is fetched then too.
// Served unbundled (external in scripts/build.mjs): no .ts imports and no build-time defines here.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {pyramidTiles,mealNutrients,todayTiles} from './pyramid-tiles.mjs';
import {offAxis} from '../modules/portal/peer.mjs'; // #135: tilt looks round the pyramid through the portal window
export {pyramidTiles} from './pyramid-tiles.mjs';

// Reuse the lightweight striped wall + paper notices from
// C:/Users/ianmy/Documents/Codex/2026-09-22/co/work/mominc-girlfriend-fix/tv/channels/girlfriend.html.
// These are the original game's CSS/DOM treatment; no raster art or external request is needed.
// #38: the poster and note sit in the top corners, sized to stay whole at 375x812 beside the pyramid's tip.
const ROOM_STYLE_ID='pyramidScannerRoomStyle';
const ROOM_CSS=`
#pyramidScanner{position:relative;width:100%;height:230px;border-radius:10px;overflow:hidden;margin-bottom:12px;touch-action:none;isolation:isolate;background:#bba16e!important}
#pyramidScanner [hidden]{display:none!important}
#pyramidScanner .pyramid-room{position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none}
#pyramidScanner .dg-paper-wall{position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 139px,#604c4133 140px 142px),repeating-linear-gradient(0deg,#b8a477 0 79px,#c3b181 80px 82px);border:14px solid #665044}
#pyramidScanner .dg-paper-wall:after{content:'';position:absolute;inset:0;opacity:.22;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Cpath fill='%23fff' filter='url(%23p)' opacity='.7' d='M0 0h180v180H0z'/%3E%3C/svg%3E")}
#pyramidScanner .paper-poster{position:absolute;z-index:1;top:clamp(74px,10%,120px);left:5%;width:min(33%,220px);box-sizing:border-box;padding:13px 9px;background:#e5d4a2;border:2px solid #ad9769;box-shadow:5px 5px #76614955;text-align:center;transform:rotate(-3deg);color:#4c3255;font:700 clamp(12px,3.3vw,20px)/1.25 Georgia,serif}
#pyramidScanner .paper-poster:before{content:'';position:absolute;width:45%;height:15px;left:27%;top:-9px;background:#e2c388bb;transform:rotate(3deg)}
#pyramidScanner .paper-poster small{display:block;font:9px monospace;letter-spacing:.1em;margin-top:10px}
#pyramidScanner .paper-note{position:absolute;z-index:1;right:5%;top:calc(clamp(74px,10%,120px) + 14px);max-width:34%;box-sizing:border-box;background:#dbc68a;color:#463149;border-left:5px solid #79558a;padding:10px;font:11px/1.45 monospace;transform:rotate(3deg)}
#pyramidScanner[data-loading] .pyramid-room:after{content:'Loading the pyramid…';position:absolute;left:0;right:0;top:50%;text-align:center;color:#463149;font:700 14px monospace}
#pyramidScanner canvas{position:absolute;inset:0;z-index:2}
#pyramidScanner .pyramid-ui{position:absolute;inset:0;z-index:3;pointer-events:none;overflow:hidden}
#pyramidScanner :where(.pyramid-ui>button){position:absolute;left:0;top:0;margin:0;pointer-events:auto;cursor:pointer;font:700 13px/1 system-ui,-apple-system,sans-serif;letter-spacing:.04em}
#pyramidScanner .pyramid-tag{min-height:40px;padding:0 13px;border:1px solid #fff9;border-radius:999px;background:#1d1428e0;color:#fff4dc;white-space:nowrap;box-shadow:0 2px 8px #0006}
#pyramidScanner .pyramid-tag[data-on]{background:#7fe6ff;color:#10121a;border-color:#dff9ff}
#pyramidScanner .pyramid-tag[data-away]:not(:focus-visible){opacity:0;pointer-events:none}
#pyramidScanner .pyramid-screen-key{min-height:0;padding:0;border:0;border-radius:6px;background:none;opacity:0;pointer-events:none!important}
#pyramidScanner .pyramid-screen-key:focus-visible{opacity:1;outline:3px solid #ffb24d;outline-offset:2px}
#pyramidScanner .pyramid-flip{left:50%;top:auto;bottom:14px;translate:-50% 0;display:flex;white-space:nowrap;align-items:center;gap:9px;min-height:40px;padding:0 15px;border:1px solid #fff8;border-radius:999px;background:#1d1428e0;color:#b9a9c6;box-shadow:0 2px 8px #0006}
#pyramidScanner .pyramid-flip span[data-on]{color:#fff4dc}
#pyramidScanner .pyramid-flip i{position:relative;width:30px;height:14px;border-radius:7px;background:#ffffff38}
#pyramidScanner .pyramid-flip i:after{content:'';position:absolute;top:2px;left:2px;width:10px;height:10px;border-radius:50%;background:#7fe6ff;transition:transform .25s}
#pyramidScanner .pyramid-flip[data-mode=today] i:after{transform:translateX(16px)}
#pyramidScanner .pyramid-zoom{left:12px;right:12px;top:var(--zoom-y,50%);translate:0 -50%;display:grid;justify-items:center;gap:10px;padding:26px 14px;border:3px solid #2a2320;border-radius:22px;color:#2a2320;text-align:center;box-shadow:0 14px 44px #000b}
#pyramidScanner .pyramid-zoom small{font:800 clamp(18px,5.5vw,28px)/1 system-ui,-apple-system,sans-serif;letter-spacing:.14em}
#pyramidScanner .pyramid-zoom strong{max-width:100%;font:900 clamp(46px,16vw,110px)/1.05 system-ui,-apple-system,sans-serif;overflow-wrap:anywhere}
#pyramidScanner .pyramid-zoom[data-key=name] strong{font-size:clamp(30px,10vw,64px)}
#pyramidScanner .pyramid-zoom em{font:600 13px/1 system-ui,-apple-system,sans-serif;font-style:normal;opacity:.7}
#pyramidScanner .pyramid-fly{position:absolute;left:0;top:0;padding:5px 9px;border:2px solid #2a2320;border-radius:9px;color:#2a2320;font:800 15px/1 system-ui,-apple-system,sans-serif;white-space:nowrap;pointer-events:none;box-shadow:0 3px 12px #0006}
@media (prefers-reduced-motion:reduce){#pyramidScanner .pyramid-flip i:after{transition:none}}
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
const DIALS=['Log by hand','Water','Today']; // D36: knob_0..2
const TAU=Math.PI*2,FOV=35,TAN=Math.tan(FOV*Math.PI/360);
const FLIP_SPACE=64; // px kept under the pyramid for the meal/today indicator
const INERTIA=0.94;  // per-frame spin decay after release
const FOCUS=0.7;     // top share of the model holding the lens, screens and dials (the base may hang behind the sheet)
const FLY_MS=700;    // one number's flight from the lens to its screen

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
 return {bl:pick(0,0),br:pick(1,0),tl:pick(0,1),tr:pick(1,1)};
}
function softDotTexture(tint=1){
 const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');
 const g=ctx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,`rgba(255,255,255,${tint})`);g.addColorStop(1,'rgba(255,255,255,0)');
 ctx.fillStyle=g;ctx.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);
}

// anchor: an element already in the (core, always-loaded) food panel markup that this lazy-loaded scanner
// mounts itself just before. Building the host, its overlay controls and their styling here, instead of
// shipping them in launch-shell.mjs/food-live.css, keeps three.js and its container out of the core bundle.
// getMeals: the saved /api/meals rows (newest first) or null; onDial(index,on): a dial was pressed;
// frame(): {top,bottom} px of the host the pyramid should fit between (the Food header and bottom sheet).
export async function mountPyramidScanner(anchor,{getNutrition=()=>({name:null,nutrients:null}),getMeals=()=>null,onDial=()=>{},frame=null,signal}={}){
 const cancelled=()=>new DOMException('Pyramid scanner closed.','AbortError');
 if(signal?.aborted)throw cancelled();
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let disposed=false,raf=0,observer,timer;
 let meal=pyramidTiles(null,null),today=todayTiles(null),mode=0,dial=-1,typing=false;
 let zoomKey=null,zoomReturn=null,flyArmed=false,flyTimer=0,spin=null;
 const flights=[]; // numbers flying from the lens to the screens
 const pending=new Set(); // tile keys blank while their number is flying in
 const download=new AbortController();
 const releaseRoomStyle=acquireRoomStyle();
 const host=document.createElement('div');host.id='pyramidScanner';host.dataset.loading='';
 host.innerHTML='<div class="pyramid-room" aria-hidden="true"><div class="dg-paper-wall"></div><div class="paper-poster">CARED FOR.<br>CORRECTED.<br>PROVIDED FOR.<small>A MOM INC. WORKPLACE</small></div><div class="paper-note">READ THE SOURCE.<br>KEEP THE LABEL.</div></div><div class="pyramid-ui" hidden></div>';
 const ui=host.querySelector('.pyramid-ui');
 const control=(className,text)=>{const b=document.createElement('button');b.type='button';b.className=className;if(text)b.textContent=text;ui.append(b);return b;};
 // Labels ride the lens and dials (projected every frame) and are their keyboard/touch targets too.
 const lensTag=control('pyramid-tag','Scan food');lensTag.setAttribute('aria-label','Scan food: take a food photo');
 const dialTags=DIALS.map(text=>control('pyramid-tag',text));
 for(const tag of dialTags.slice(1))tag.setAttribute('aria-pressed','false');
 // Invisible keys over the six screens so a keyboard can zoom them too (pointer taps use the raycast).
 const screenKeys=Object.fromEntries(TILES.map(([meshName])=>[meshName,control('pyramid-screen-key')]));
 const flip=control('pyramid-flip');flip.innerHTML='<span>LAST MEAL</span><i></i><span>TODAY</span>';
 const zoom=control('pyramid-zoom');zoom.hidden=true;
 anchor.before(host);
 const scene=new THREE.Scene(),stage=new THREE.Group(),pivot=new THREE.Group();
 scene.add(stage);stage.add(pivot);
 scene.add(new THREE.AmbientLight(0xffffff,0.95));
 const key=new THREE.DirectionalLight(0xffffff,0.75);key.position.set(0.6,1.4,1.2);scene.add(key);
 let renderer;
 try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}
 catch(error){host.remove();releaseRoomStyle();throw error;}
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.setClearColor(0x000000,0);
 renderer.domElement.style.cssText='display:block;width:100%;height:100%;touch-action:none';renderer.domElement.setAttribute('aria-hidden','true');host.append(renderer.domElement);
 // Looks straight down -z; reframe() slides it back and down/up so the pyramid fills the free space.
 const camera=new THREE.PerspectiveCamera(FOV,1,0.01,40);camera.position.set(0,0.05,2.2);scene.add(camera);
 const raycaster=new THREE.Raycaster();
 const dialogEl=host.closest('dialog');

 const screens={},knobs=[];let lens=null,lensHalo=null,lensFlashT=-10,lensRadius=0.03,body=null,modelSize=null;
 const steamTex=softDotTexture(0.9);
 const steamPool=Array.from({length:24},()=>({sprite:new THREE.Sprite(new THREE.SpriteMaterial({map:steamTex,transparent:true,opacity:0,depthWrite:false,color:0xf3ece8})),age:0,life:0,vel:new THREE.Vector3(),pos:new THREE.Vector3()}));
 for(const p of steamPool){p.sprite.visible=false;p.sprite.scale.setScalar(0.012);}

 function disposeMat(mat){for(const m of [mat].flat())if(m){for(const v of Object.values(m))if(v?.isTexture)v.dispose();m.dispose();}}
 function disposeTree(root){root.traverse(node=>{node.geometry?.dispose();if(node.material)disposeMat(node.material);});}
 function dispose(){
  if(disposed)return;disposed=true;cancelAnimationFrame(raf);observer?.disconnect();
  releaseRoomStyle();
  signal?.removeEventListener('abort',dispose);download.abort();clearTimeout(timer);clearTimeout(flyTimer);
  window.removeEventListener('myr5:meal-nutrition',onNutrition);window.removeEventListener('myr5:food-selected',onSelected);window.removeEventListener('myr5:food-reset',onReset);
  dialogEl?.removeEventListener('cancel',onCancel);
  const dom=renderer.domElement;dom.removeEventListener('pointerdown',onDown);dom.removeEventListener('pointermove',onMove);dom.removeEventListener('pointerup',onUp);dom.removeEventListener('pointercancel',onUp);dom.removeEventListener('click',onClick);
  disposeTree(scene);
  for(const p of steamPool)if(!p.sprite.parent)p.sprite.material.dispose();
  steamTex.dispose();renderer.dispose();renderer.forceContextLoss();host.remove();
 }

 // ---- Screens: "last meal" face (the meal being logged, else the newest saved one) or today's totals.
 function faces(){
  const current=getNutrition(),items=getMeals(),last=items?.[0];
  meal=current?.name!=null?pyramidTiles(current.name===''&&typing?'TYPE YOUR FOOD':current.name,current.nutrients)
   :last?pyramidTiles(last.name,mealNutrients(last)):pyramidTiles(null,null);
  today=todayTiles(items);
 }
 const tileText=key=>mode?today[key]:pending.has(key)?'':meal[key];
 function paint([meshName,key,label,bg]){
  const s=screens[meshName],value=tileText(key);
  screenKeys[meshName].setAttribute('aria-label',`${label}: ${value||'arriving'}. Zoom in`);
  if(!s)return;paintTile(s.canvas,bg,label,value);s.tex.needsUpdate=true;
 }
 function repaint(){for(const tile of TILES)paint(tile);if(zoomKey)fillZoom();}
 function onNutrition(){if(disposed)return;if(dial===0&&getNutrition()?.name==null)setDial(-1);faces();if(!flyArmed)repaint();else if(meal.calories!=='—')fly();}
 // #31: a scan result (or a picked suggestion) blanks the screens, then its numbers fly out of the lens onto them.
 function onSelected(e){
  if(disposed)return;
  if(!e?.detail?.name){return;}
  typing=false;flyArmed=true;clearFlights();for(const [,k] of TILES)pending.add(k);
  if(mode){spin=null;velocity=0;setRotation(pivot.rotation.y+TAU);} // same pose, other face: the result lands on "last meal"
  faces();repaint();clearTimeout(flyTimer);flyTimer=setTimeout(fly,2500); // no nutrition match: fly the name anyway
 }
 function onReset(){if(disposed)return;typing=false;flyArmed=false;clearFlights();clearTimeout(flyTimer);pending.clear();faces();repaint();}
 window.addEventListener('myr5:meal-nutrition',onNutrition);window.addEventListener('myr5:food-selected',onSelected);window.addEventListener('myr5:food-reset',onReset);

 const tmp=new THREE.Vector3(),tmp2=new THREE.Vector3(),toCam=new THREE.Vector3();
 let W=1,H=1;
 function toScreen(world){tmp.copy(world).project(camera);return {x:(tmp.x+1)/2*W,y:(1-tmp.y)/2*H};}
 function screenRect(meshName){
  const s=screens[meshName];if(!s)return null;
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  for(const c of s.corners){const p=toScreen(tmp2.copy(c).applyMatrix4(s.mesh.matrixWorld));x0=Math.min(x0,p.x);y0=Math.min(y0,p.y);x1=Math.max(x1,p.x);y1=Math.max(y1,p.y);}
  return {x:x0,y:y0,w:x1-x0,h:y1-y0};
 }

 function fly(){
  if(disposed||!flyArmed)return;flyArmed=false;clearTimeout(flyTimer);
  if(reduced||!lens){pending.clear();repaint();return;}
  clearFlights();const now=performance.now();
  TILES.forEach((tile,i)=>{
   const chip=document.createElement('span');chip.className='pyramid-fly';chip.textContent=meal[tile[1]];chip.style.background=tile[3];chip.style.opacity='0';chip.setAttribute('aria-hidden','true');ui.append(chip);
   flights.push({chip,tile,start:now+i*110});
  });
 }
 // Each frame: chips arc from the lens to their screen's current spot (the pyramid may be reframing), then land.
 function moveFlights(now){
  if(!flights.length)return;
  const from=lens&&toScreen(lens.getWorldPosition(tmp2));
  for(let i=flights.length-1;i>=0;i--){
   const f=flights[i],t=(now-f.start)/FLY_MS;if(t<0)continue;
   const to=screenRect(f.tile[0]);
   if(t>=1||!to||!from){f.chip.remove();flights.splice(i,1);pending.delete(f.tile[1]);paint(f.tile);continue;}
   const e=t<.5?2*t*t:1-(-2*t+2)**2/2,x=from.x+(to.x+to.w/2-from.x)*e,y=from.y+(to.y+to.h/2-from.y)*e-Math.sin(t*Math.PI)*70;
   f.chip.style.opacity=String(Math.min(1,t*6));f.chip.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px) translate(-50%,-50%) scale(${(1.15-.55*e).toFixed(3)})`;
  }
 }
 function clearFlights(){for(const f of flights)f.chip.remove();flights.length=0;}

 // ---- #32/#13: tap a screen to zoom it across the width; tap again (or Escape) to return.
 function fillZoom(){
  const [,key,label,bg]=TILES.find(t=>t[0]===zoomKey),small=document.createElement('small'),strong=document.createElement('strong'),hint=document.createElement('em');
  small.textContent=label;strong.textContent=tileText(key)||'…';hint.textContent='Tap to return';
  zoom.dataset.key=key;zoom.style.background=bg;zoom.replaceChildren(small,strong,hint);
 }
 function openZoom(meshName){
  const from=screenRect(meshName);zoomKey=meshName;fillZoom();zoom.hidden=false;
  zoomReturn=ui.contains(document.activeElement)?document.activeElement:null;zoom.focus({preventScroll:true});
  if(reduced||!from)return;
  const z=zoom.getBoundingClientRect(),h=host.getBoundingClientRect(),dx=h.left+from.x+from.w/2-(z.left+z.width/2),dy=h.top+from.y+from.h/2-(z.top+z.height/2);
  zoom.animate([{transform:`translate(${dx}px,${dy}px) scale(${Math.max(.05,from.w/z.width)})`,opacity:.6},{transform:'none',opacity:1}],{duration:280,easing:'cubic-bezier(.2,0,.2,1)'});
 }
 function closeZoom(){if(!zoomKey)return;zoomKey=null;zoom.hidden=true;zoomReturn?.focus({preventScroll:true});zoomReturn=null;}
 function onCancel(e){if(zoomKey){e.preventDefault();closeZoom();}}
 dialogEl?.addEventListener('cancel',onCancel);
 zoom.onclick=closeZoom;
 for(const [meshName] of TILES)screenKeys[meshName].onclick=()=>openZoom(meshName);

 // ---- #35: the pose picks the face. Each half-turn past the back flips it (the swap happens out of sight),
 // so a full spin shows the other face; a spin that crosses the back or a clear swipe glides on to the front.
 function syncMode(){
  const m=Math.round(pivot.rotation.y/TAU)&1;if(m===mode)return;
  mode=m;repaint();flip.dataset.mode=mode?'today':'meal';
  const [a,b]=flip.querySelectorAll('span');a.toggleAttribute('data-on',!mode);b.toggleAttribute('data-on',!!mode);
  flip.setAttribute('aria-label',mode?'Screens show today’s totals. Switch to the last meal':'Screens show the last meal. Switch to today’s totals');
 }
 function setRotation(y){pivot.rotation.y=y;syncMode();}
 function spinTo(to){velocity=0;if(reduced){spin=null;setRotation(to);return;}const from=pivot.rotation.y;spin={from,to,t0:performance.now(),ms:Math.min(1100,380+Math.abs(to-from)*110)};}
 flip.onclick=()=>spinTo(Math.round(pivot.rotation.y/TAU)*TAU+TAU);
 mode=1;syncMode(); // initialise the indicator's labels (mode 0 = last meal)

 // ---- Knobs: glow, wiggle and steam feedback (unchanged), now each with a job (D36).
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
 // One dial lit at a time (launch.mjs also calls this when a dial's panel closes).
 function setDial(i){dial=i;for(const k of knobs)k.on=k.index===i;dialTags.forEach((tag,n)=>{tag.toggleAttribute('data-on',n===i);if(n)tag.setAttribute('aria-pressed',String(n===i));});}
 function pressDial(i){
  // Log by hand always opens; Water and Today toggle their cards.
  const on=i===0||dial!==i,k=knobs.find(k=>k.index===i);setDial(on?i:-1);
  if(k){k.tapT=performance.now();spawnSteam(k);}
  if(i===0&&on)typing=true;
  onDial(i,on);
 }
 dialTags.forEach((tag,i)=>tag.onclick=()=>pressDial(i));
 function scan(){lensFlashT=performance.now();document.getElementById('foodCamera')?.click();}
 lensTag.onclick=scan;
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

 // ---- Pointer: drag spins (as before), a tap hits the lens, a screen or a dial.
 let dragging=false,downX=0,downY=0,downT=0,downRot=0,lastX=0,lastT=0,speed=0,moved=false,velocity=0,tapAt=null;
 function onDown(e){renderer.domElement.setPointerCapture?.(e.pointerId);dragging=true;tapAt=null;moved=false;spin=null;downX=lastX=e.clientX;downY=e.clientY;downT=lastT=performance.now();downRot=pivot.rotation.y;velocity=0;speed=0;}
 function onMove(e){
  if(!dragging)return;
  const now=performance.now(),dx=e.clientX-lastX;speed=dx/Math.max(1,now-lastT);lastX=e.clientX;lastT=now;
  if(Math.abs(e.clientX-downX)>6||Math.abs(e.clientY-downY)>6)moved=true;
  if(moved){setRotation(pivot.rotation.y+dx*0.009);velocity=reduced?0:dx*0.009;}
 }
 function lensWorldSphere(){const p=new THREE.Vector3();lens.getWorldPosition(p);const s=new THREE.Vector3();lens.getWorldScale(s);return new THREE.Sphere(p,lensRadius*s.x);}
 function handleTap(cx,cy){
  if(zoomKey){closeZoom();return;}
  const rect=renderer.domElement.getBoundingClientRect();
  const ndc=new THREE.Vector2(((cx-rect.left)/rect.width)*2-1,-((cy-rect.top)/rect.height)*2+1);
  camera.updateMatrixWorld();raycaster.setFromCamera(ndc,camera);
  if(lens&&raycaster.ray.intersectSphere(lensWorldSphere(),new THREE.Vector3())){scan();return;}
  // The body only blocks what is clearly behind it (a dial or screen on the far side), not a knob set into its skin.
  const hits=raycaster.intersectObjects([body,...knobs.map(k=>k.mesh),...Object.values(screens).map(s=>s.mesh)].filter(Boolean),false),near=hits.find(h=>h.object!==body);
  if(!near||hits[0].object===body&&near.distance-hits[0].distance>0.06)return;
  const hit=near.object;
  const knob=knobs.find(k=>k.mesh===hit);if(knob){pressDial(knob.index);return;}
  const screen=Object.keys(screens).find(n=>screens[n].mesh===hit);if(screen)openZoom(screen);
 }
 function onUp(e){
  if(!dragging)return;dragging=false;
  const dt=performance.now()-downT,dx=e.clientX-downX,dist=Math.hypot(dx,e.clientY-downY);
  // A tap acts on the click that follows: acting on pointerup would let a touch's click land on what the tap opened
  // (the zoom card under the finger would close at once).
  if(!moved&&dist<6&&dt<400&&e.type==='pointerup'){tapAt={x:e.clientX,y:e.clientY};return;}
  if(!moved)return;
  const swipe=Math.abs(dx)>50&&Math.abs(dx)>2*Math.abs(e.clientY-downY)&&Math.abs(speed)>0.5&&performance.now()-lastT<80;
  const coast=pivot.rotation.y+velocity/(1-INERTIA),crossed=Math.round(coast/TAU)!==Math.round(downRot/TAU);
  if(!swipe&&!crossed)return;
  const dir=Math.sign(swipe?dx:coast-downRot)||1,turns=pivot.rotation.y/TAU;
  spinTo((dir>0?Math.ceil(turns+1e-6):Math.floor(turns-1e-6))*TAU);
 }
 const dom=renderer.domElement;
 function onClick(){if(!tapAt)return;const {x,y}=tapAt;tapAt=null;handleTap(x,y);}
 dom.addEventListener('pointerdown',onDown);dom.addEventListener('pointermove',onMove);dom.addEventListener('pointerup',onUp);dom.addEventListener('pointercancel',onUp);dom.addEventListener('click',onClick);

 // ---- Framing: fit the pyramid between the Food header and its bottom sheet (portrait phones included).
 let fitGoal=null,fitNow=null,frameTop=6;
 function reframe(){
  if(disposed)return;
  W=Math.max(host.clientWidth,1);H=Math.max(host.clientHeight,1); // layout size: the portal's arrival scale must not shrink the canvas
  renderer.setSize(W,H,false);camera.aspect=W/H;camera.updateProjectionMatrix();
  for(const tag of [lensTag,...dialTags])tag.labelWidth=tag.offsetWidth;
  const f=frame?.()||{top:0,bottom:H},top=frameTop=Math.max(0,f.top)+6,base=Math.min(H,f.bottom),bottom=base-FLIP_SPACE,middle=(top+bottom)/2;
  flip.style.bottom=`${Math.max(8,H-base+12)}px`;zoom.style.setProperty('--zoom-y',`${Math.max(top,middle)}px`);
  if(!modelSize)return;
  // px per world unit: the whole model at full width when it fits; when the sheet is up, keep the lens, screens
  // and dials whole at that size and let the base hang behind the sheet.
  const space=Math.max(60,bottom-top),ppuW=W/(modelSize.x*1.3);let ppu=Math.min(ppuW,space/(modelSize.y*1.08)),aim=0;
  if(ppu<ppuW){ppu=Math.min(ppuW,space/(modelSize.y*FOCUS*1.08));aim=modelSize.y*(0.5-FOCUS/2);}
  fitGoal={dist:H/(2*TAN*ppu),y:aim+(middle-H/2)/ppu};
  if(reduced||!fitNow)fitNow={...fitGoal};
 }
 // Labels follow the lens and knobs; a knob turned to the back hides its label (focus still shows it).
 function place(tag,x,y){const w=tag.labelWidth||0;tag.style.transform=`translate(${Math.round(Math.min(Math.max(x-w/2,6),W-w-6))}px,${Math.round(Math.max(frameTop,Math.min(y,H-46)))}px)`;}
 function placeUI(){
  if(lens){const p=toScreen(lens.getWorldPosition(tmp2));place(lensTag,p.x,p.y-58);}
  for(const k of knobs){
   k.mesh.getWorldPosition(tmp2);const p=toScreen(tmp2);
   const axis=toCam.copy(k.axis).transformDirection(k.mesh.parent.matrixWorld),facing=axis.dot(tmp.copy(camera.position).sub(tmp2).normalize());
   dialTags[k.index].toggleAttribute('data-away',facing<-0.1);place(dialTags[k.index],p.x,p.y+14);
  }
  for(const [meshName] of TILES){const r=screenRect(meshName),keyEl=screenKeys[meshName];if(!r){keyEl.hidden=true;continue;}keyEl.style.transform=`translate(${Math.round(r.x)}px,${Math.round(r.y)}px)`;keyEl.style.width=`${Math.round(r.w)}px`;keyEl.style.height=`${Math.round(r.h)}px`;}
 }

 signal?.addEventListener('abort',dispose,{once:true});
 try{
  timer=setTimeout(()=>download.abort(),20000);let bytes;
  try{const response=await fetch('/food/pyramid-scanner.glb',{signal:download.signal});if(!response.ok)throw new Error('Pyramid model unavailable.');bytes=await response.arrayBuffer();}finally{clearTimeout(timer);}
  if(disposed)throw cancelled();
  const loader=new GLTFLoader();loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf=await loader.parseAsync(bytes,'');const model=gltf.scene;
  // GLTF texture decoding cannot be aborted. Discard a late result without
  // mounting anything or reviving the closed renderer/listeners.
  if(disposed){disposeTree(model);throw cancelled();}
  const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),scale=1.6/Math.max(size.x,size.y,size.z);
  const offset=new THREE.Group();offset.position.copy(center).multiplyScalar(-1);offset.add(model);
  const normalized=new THREE.Group();normalized.scale.setScalar(scale);normalized.add(offset);pivot.add(normalized);
  modelSize=size.multiplyScalar(scale);
  // Knob coordinates and their steam share the model's local coordinate space.
  // Add effects only after measuring the actual model for its camera framing.
  for(const p of steamPool)model.add(p.sprite);
  body=model.getObjectByName('body')||null;

  for(const [meshName] of TILES){
   const mesh=model.getObjectByName(meshName);if(!mesh)continue;
   const {bl,br,tl,tr}=quadCorners(mesh),w=bl.distanceTo(br)||1,h=bl.distanceTo(tl)||1,targetH=220;
   const canvas=document.createElement('canvas');canvas.height=targetH;canvas.width=Math.max(64,Math.round(targetH*(w/h)));
   // glTF UVs start at the image's top-left (GLTFLoader never flips), so the canvas must not be flipped either.
   const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.flipY=false;
   mesh.material=new THREE.MeshBasicMaterial({map:tex,side:THREE.FrontSide});
   screens[meshName]={canvas,tex,mesh,corners:[bl,br,tl,tr]};
  }

  for(let i=0;i<3;i++){
   const knob=model.getObjectByName(`knob_${i}`);if(!knob){dialTags[i].dataset.away='';continue;}
   knob.material=Array.isArray(knob.material)?knob.material.map(m=>m.clone()):knob.material.clone();
   const axis=new THREE.Vector3(...(knob.userData.axis||[0,0,1])).normalize();
   knobs.push({index:i,mesh:knob,axis,basePos:knob.position.clone(),tapT:-10,on:false});
  }

  lens=model.getObjectByName('lens');
  if(lens){
   lensRadius=lens.userData.radius||0.03;
   lensHalo=new THREE.Sprite(new THREE.SpriteMaterial({map:steamTex,color:0x8ef2ff,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:0.3}));
   lensHalo.scale.setScalar(lensRadius*2.6);lens.add(lensHalo);
  }else lensTag.hidden=true;

  faces();repaint();
  delete host.dataset.loading;ui.hidden=false;
  observer=new ResizeObserver(reframe);observer.observe(host);reframe();
  let last=performance.now();
  function animate(now){
   if(disposed)return;
   const dt=Math.min((now-last)/1000,0.05);last=now;
   if(spin){const t=Math.min(1,(now-spin.t0)/spin.ms);setRotation(spin.from+(spin.to-spin.from)*(1-(1-t)**3));if(t>=1)spin=null;}
   else if(!dragging&&velocity){setRotation(pivot.rotation.y+velocity);velocity*=INERTIA;if(Math.abs(velocity)<1e-4)velocity=0;}
   if(!reduced){const t=now/1000;stage.position.y=Math.sin(t*1.1)*0.035;stage.rotation.z=Math.sin(t*0.7)*0.035;stage.rotation.x=Math.sin(t*0.5)*0.02;}
   if(fitNow){const ease=reduced?1:0.2;fitNow.dist+=(fitGoal.dist-fitNow.dist)*ease;fitNow.y+=(fitGoal.y-fitNow.y)*ease;camera.position.set(0,fitNow.y,fitNow.dist);offAxis(camera,fitNow.dist);}
   for(const k of knobs)animateKnob(k,now);
   updateSteam(dt);pulseGlow(now);
   renderer.render(scene,camera);placeUI();moveFlights(now);raf=requestAnimationFrame(animate);
  }
  raf=requestAnimationFrame(animate);
  return {dispose,reframe,setDial,refresh(){if(!disposed){faces();repaint();}}};
 }catch(error){dispose();throw error;}
}

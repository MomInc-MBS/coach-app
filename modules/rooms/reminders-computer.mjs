import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const MODEL='/pod/rooms/console.glb',STYLE='/modules/rooms/reminders-computer.css';
const MAX_SPIN=10,KEY_STEP=2,DRAG_DEG_PER_PX=.16,DRAG_SLOP=8;
const INTERACTIVE='button,input,select,textarea,a,label,summary,[contenteditable]';
const SCREEN={left:-.185,right:.185,bottom:.39,top:.66,z:.115};
const MODEL_CENTER=new THREE.Vector3(0,.515,.10668);
const MODEL_SIZE=new THREE.Vector3(.527069,.9804382,.481444);
const REDUCED=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;

export const spinBy=(spin,delta)=>Math.max(-MAX_SPIN,Math.min(MAX_SPIN,spin+delta));

const current=(panel,token,epoch)=>!token.disposed&&token.epoch===epoch&&panel.open&&panel.isConnected;
async function cachedRoomAssets(isCurrent){
 const storage=globalThis.caches;
 if(!storage?.keys||!storage?.open)throw new Error('The optional Reminders room is not downloaded.');
 const names=await storage.keys();if(!isCurrent())return null;
 // CacheStorage returns names in creation order. Search newest first so an old retained shell cannot
 // shadow the complete packet installed later; model and stylesheet must come from the same store.
 for(const name of names.reverse()){
  const store=await storage.open(name);if(!isCurrent())return null;
  const model=await store.match(MODEL);if(!isCurrent())return null;
  if(!model?.ok)continue;
  let style=await store.match(STYLE);if(!isCurrent())return null;
  let styleText=style?.ok?await style.clone().text():'';if(!isCurrent())return null;
  if(!styleText.includes('reminders-computer:glb-v2')){
   // A previous release may already have the large model. Refresh only the small stylesheet
   // from the current release and place it beside that model; never redownload the GLB here.
   try{
    const response=await fetch(STYLE,{cache:'no-store'});if(!isCurrent())return null;
    if(response.ok){const updated=response.clone(),candidate=await response.text();if(!isCurrent())return null;
     if(candidate.includes('reminders-computer:glb-v2')){await store.put(STYLE,updated);if(!isCurrent())return null;styleText=candidate;}
    }
   }catch{}
  }
  if(!styleText.includes('reminders-computer:glb-v2'))continue;
  return {model,styleText};
 }
 throw new Error('The optional Reminders room is not downloaded.');
}

function useStyle(text,token){
 let style=document.getElementById('remindersComputerStyle');
 if(!style){style=document.createElement('style');style.id='remindersComputerStyle';document.head.append(style);}
 style.textContent=text;token.style=style;
}
function loadingManager(){
 const manager=new THREE.LoadingManager();
 manager.setURLModifier(url=>{
  if(/^(?:data:|blob:)/i.test(url))return url;
  throw new Error('The Reminders model contains an external dependency.');
 });
 return manager;
}

function releaseObject(root){
 const geometries=new Set(),materials=new Set(),textures=new Set(),images=new Set();
 root?.traverse?.(node=>{
  if(node.geometry)geometries.add(node.geometry);
  for(const material of [].concat(node.material||[]))if(material){materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value);}
 });
 for(const texture of textures){const image=texture.source?.data??texture.image;if(image&&typeof image.close==='function')images.add(image);texture.dispose();}
 for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();
 for(const image of images)try{image.close();}catch{}
}
function releaseView(view){
 if(!view||view.disposed)return;view.disposed=true;cancelAnimationFrame(view.raf);view.resize?.disconnect();
 for(const [target,name,fn] of view.listeners)target.removeEventListener(name,fn);
 releaseObject(view.scene);view.renderer?.dispose();view.renderer?.forceContextLoss();
 view.canvas?.remove();view.screen?.remove();
}

export function makeCords(scene){
 const colors=[0x52e4ff,0xff45d5,0xffc95c,0x9d78ff,0x52e4ff,0xff45d5,0xffc95c,0x4cc9e8,0xff6eac,0xa38aff,0xf3a765,0x53dfca,0x8cd6ff];
 const paths=[
  [[-.22,1.02,-.28],[-.35,.92,-.32],[-.4,.75,-.34],[-.31,.65,-.32],[-.29,.55,-.31],[-.39,.47,-.34],[-.37,.3,-.32],[-.29,.12,-.31]],
  [[.22,1,-.27],[.34,.9,-.32],[.4,.73,-.34],[.31,.63,-.32],[.29,.52,-.31],[.4,.43,-.34],[.37,.27,-.32],[.3,.08,-.31]],
  [[-.2,.83,-.32],[-.34,.78,-.35],[-.41,.67,-.36],[-.36,.59,-.34],[-.29,.64,-.32],[-.36,.72,-.34],[-.43,.63,-.36],[-.39,.48,-.34],[-.34,.23,-.31]],
  [[.2,.78,-.32],[.34,.73,-.35],[.42,.64,-.36],[.36,.55,-.34],[.29,.6,-.32],[.37,.69,-.34],[.44,.59,-.36],[.4,.42,-.34],[.34,.19,-.31]],
  [[-.3,.98,-.36],[-.43,.88,-.38],[-.42,.79,-.38],[-.32,.84,-.36],[-.26,.77,-.34],[-.42,.69,-.38],[-.44,.56,-.38],[-.33,.5,-.35]],
  [[.3,.96,-.36],[.43,.86,-.38],[.42,.77,-.38],[.32,.82,-.36],[.26,.74,-.34],[.43,.65,-.38],[.45,.51,-.38],[.34,.45,-.35]],
  [[-.48,1.08,-.42],[-.25,1.12,-.43],[0,1.06,-.44],[.24,1.12,-.43],[.48,1.04,-.42],[.4,.94,-.42],[.18,.98,-.43],[-.05,.93,-.43],[-.3,.99,-.42],[-.48,.9,-.42]],
  [[-.49,-.08,-.42],[-.28,-.14,-.43],[-.05,-.07,-.44],[.19,-.14,-.43],[.46,-.05,-.42],[.4,.05,-.42],[.16,-.01,-.43],[-.1,.06,-.43],[-.35,.01,-.42],[-.49,.12,-.42]],
  [[-.5,.74,-.45],[-.42,.98,-.46],[-.26,1.07,-.47],[-.15,.98,-.46],[-.3,.83,-.45],[-.45,.61,-.46],[-.43,.42,-.47],[-.25,.34,-.46],[-.14,.43,-.45],[-.35,.64,-.46],[-.5,.74,-.45]],
  [[.5,.71,-.45],[.42,.95,-.46],[.26,1.04,-.47],[.15,.95,-.46],[.3,.8,-.45],[.45,.58,-.46],[.43,.39,-.47],[.25,.31,-.46],[.14,.4,-.45],[.35,.61,-.46],[.5,.71,-.45]],
  [[-.48,1.03,-.5],[-.34,.94,-.51],[-.18,.82,-.52],[0,.66,-.52],[.18,.49,-.51],[.34,.31,-.51],[.49,.12,-.5]],
  [[.48,1.02,-.5],[.34,.91,-.51],[.18,.78,-.52],[0,.63,-.52],[-.18,.46,-.51],[-.34,.28,-.51],[-.49,.1,-.5]],
  [[-.52,.28,-.48],[-.36,.39,-.49],[-.18,.47,-.5],[0,.53,-.51],[.2,.61,-.5],[.38,.72,-.49],[.52,.86,-.48]]
 ];
 const radii=[.0032,.0038,.0028,.0034,.0026,.003,.0035,.0028,.0042,.003,.0028,.0036,.0034];
 if(paths.length!==colors.length||paths.length!==radii.length||radii.some(radius=>!Number.isFinite(radius)||radius<=0||radius>.01))throw new Error('Invalid Reminders cable layout.');
 for(let i=0;i<paths.length;i++){
  const points=paths[i].map(point=>new THREE.Vector3(...point));
  const curve=new THREE.CatmullRomCurve3(points,false,'centripetal');
  const radius=radii[i];
  const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,48,radius,5,false),new THREE.MeshBasicMaterial({color:colors[i],transparent:true,opacity:.72,depthWrite:false}));
  mesh.renderOrder=-1;scene.add(mesh);
 }
}

export function mountRemindersComputer(panel=document.getElementById('remindersPanel')){
 if(!panel)return null;
 let disposed=false,epoch=0,pendingEpoch=-1,style=null,active=null,wrapped=null,restoreChildren=null;
 const token={get disposed(){return disposed;},get epoch(){return epoch;},view:null,style:null,fail:null};
 const offer=document.createElement('div');offer.className='reminders-computer-offer';
 const button=document.createElement('button');button.type='button';button.textContent='Download Reminders computer';
 const note=document.createElement('span');note.setAttribute('role','status');offer.append(button,note);
 const hint=document.createElement('span');hint.id='remindersComputerHint';hint.textContent='Drag the computer sideways, or press Left and Right arrow keys, to turn it.';
 Object.assign(hint.style,{position:'absolute',width:'1px',height:'1px',padding:'0',margin:'-1px',overflow:'hidden',clip:'rect(0,0,0,0)',whiteSpace:'nowrap',border:'0'});
 const setFallback=message=>{
  panel.dataset.reminderRoom='offer';panel.tabIndex=-1;note.textContent=message;offer.hidden=false;offer.style.removeProperty('display');
 };
 const buttonClick=()=>{if(!window.myr5Packs?.open?.('room-reminders'))note.textContent='Open Downloads from Settings to add this room.';};
 button.addEventListener('click',buttonClick);
 panel.querySelector('header')?.after(offer);
 const unwrap=()=>{
  if(!restoreChildren)return;
  const {screen,host,children,originalNext}=restoreChildren;
  for(let index=children.length-1;index>=0;index--){
   const node=children[index];if(node.parentNode!==screen)continue;
   const original=originalNext.get(node);
   const anchor=original?.parentNode===panel?original:children.slice(index+1).find(next=>next.parentNode===panel)||screen;
   panel.insertBefore(node,anchor);
  }
  screen.remove();host.remove();offer.hidden=false;offer.style.removeProperty('display');restoreChildren=null;
 };
 const tearDown=()=>{
  if(wrapped){unwrap();wrapped=null;}
  if(active){releaseView(active);active=null;}
  panel.removeAttribute('aria-describedby');panel.removeAttribute('aria-keyshortcuts');panel.removeAttribute('tabindex');
  delete panel.dataset.reminderRoom;
  if(style){style.remove();style=null;token.style=null;}
 };
 token.fail=error=>{if(disposed)return;epoch++;tearDown();setFallback('The 3D computer is unavailable here; reminders still work.');};
 async function check(){
  if(disposed||!panel.open||panel.dataset.reminderRoom==='ready'||pendingEpoch===epoch)return;
  const mine=++epoch;pendingEpoch=mine;let parsed=null;
  try{
   const assets=await cachedRoomAssets(()=>current(panel,token,mine));
   if(!assets||!current(panel,token,mine))return;
   const modelBytes=await assets.model.arrayBuffer();
   if(!current(panel,token,mine))return;
   const styleText=assets.styleText;
   useStyle(styleText,token);style=token.style;
   const manager=loadingManager(),loader=new GLTFLoader(manager),gltf=await loader.parseAsync(modelBytes,'');parsed=gltf.scene;
   if(!current(panel,token,mine)){releaseObject(parsed);return;}
   const host=document.createElement('div');host.className='reminders-computer-stage';
   const children=[...panel.children].filter(node=>node!==offer&&node!==hint&&node.id!=='coachDock'&&!node.classList.contains('portal-peer-ui'));
   const originalNext=new Map(children.map(node=>[node,node.nextSibling]));
   const screen=document.createElement('div');screen.className='reminders-computer-screen';screen.dataset.computerScreen='';screen.append(...children);
   panel.prepend(host);host.append(document.createElement('canvas'));const canvas=host.firstElementChild;canvas.className='reminders-computer-canvas';canvas.setAttribute('aria-hidden','true');
   panel.append(screen);restoreChildren={screen,host,children,originalNext};wrapped=restoreChildren;
   const scene=new THREE.Scene();const model=new THREE.Group();model.position.copy(MODEL_CENTER);gltf.scene.position.sub(MODEL_CENTER);model.add(gltf.scene);scene.add(model);makeCords(scene);
   const view={canvas,screen,renderer:null,scene,camera:null,model,resize:null,raf:0,listeners:[],disposed:false};active=view;token.view=view;parsed=null;
   const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});view.renderer=renderer;
   renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setClearColor(0x000000,0);
   scene.add(new THREE.HemisphereLight(0xe8f8ff,0x241532,2.1));const keyLight=new THREE.DirectionalLight(0xffedcf,2.5);keyLight.position.set(-1.5,2,2.5);scene.add(keyLight);
   const camera=new THREE.PerspectiveCamera(31,1,.05,12);view.camera=camera;let width=0,height=0,yaw=0,turn=0,lastFrame=0,start=performance.now();
   function listen(target,name,fn){target.addEventListener(name,fn);view.listeners.push([target,name,fn]);}
   function project(x,y,z){const point=new THREE.Vector3(x,y,z).sub(MODEL_CENTER);point.applyAxisAngle(new THREE.Vector3(0,1,0),turn).add(MODEL_CENTER).project(camera);return [(point.x+1)*width/2,(1-point.y)*height/2];}
   function screenRect(){const points=[[SCREEN.left,SCREEN.bottom,SCREEN.z],[SCREEN.right,SCREEN.bottom,SCREEN.z],[SCREEN.right,SCREEN.top,SCREEN.z],[SCREEN.left,SCREEN.top,SCREEN.z]].map(p=>project(...p));const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);const left=Math.min(...xs),top=Math.min(...ys);Object.assign(screen.style,{left:left+'px',top:top+'px',width:Math.max(...xs)-left+'px',height:Math.max(...ys)-top+'px'});}
   function render(now=performance.now()){if(view.disposed||!panel.open||!panel.isConnected)return;if(width&&height){model.rotation.y=turn=yaw+(REDUCED()?0:Math.sin((now-start)/3300)*.012);renderer.render(scene,camera);screenRect();}}
   function resize(){if(view.disposed)return;
    // getBoundingClientRect() includes portal arrival transforms (scale(.05) -> scale(1)) and
    // portal-inset zoom. Those are visual transforms, not layout changes; using them as the
    // renderer's coordinate system permanently shrinks the projected screen after arrival.
    width=host.clientWidth;height=host.clientHeight;if(!width||!height)return;
    renderer.setSize(width,height,false);camera.aspect=width/height;const vfov=THREE.MathUtils.degToRad(camera.fov),distance=Math.max(MODEL_SIZE.y*.53/Math.tan(vfov/2),MODEL_SIZE.x*.53/Math.tan(vfov/2)/camera.aspect)*1.08;camera.position.set(0,.515,.10668+distance);camera.lookAt(MODEL_CENTER);camera.zoom=1.5;camera.updateProjectionMatrix();render();}
   let drag=null;const down=event=>{if(event.target.closest?.(INTERACTIVE)||(event.pointerType==='mouse'&&event.button!==0))return;drag={id:event.pointerId,x:event.clientX,y:event.clientY,yaw,moving:false};};
   const move=event=>{if(!drag||drag.id!==event.pointerId)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(!drag.moving){if(Math.abs(dy)>DRAG_SLOP&&Math.abs(dy)>Math.abs(dx)){drag=null;return;}if(Math.abs(dx)<DRAG_SLOP)return;drag.moving=true;panel.setPointerCapture?.(drag.id);}yaw=THREE.MathUtils.degToRad(spinBy(THREE.MathUtils.radToDeg(drag.yaw),dx*DRAG_DEG_PER_PX));render();window.dispatchEvent(new Event('myr5:reminders-turn'));};
   const end=event=>{if(drag?.id===event.pointerId){if(drag.moving)panel.releasePointerCapture?.(drag.id);drag=null;}};
   const key=event=>{if(event.target!==panel||!/^Arrow(Left|Right)$/.test(event.key))return;event.preventDefault();yaw=THREE.MathUtils.degToRad(spinBy(THREE.MathUtils.radToDeg(yaw),event.key==='ArrowLeft'?-KEY_STEP:KEY_STEP));render();window.dispatchEvent(new Event('myr5:reminders-turn'));};
   listen(panel,'pointerdown',down);listen(panel,'pointermove',move);listen(panel,'pointerup',end);listen(panel,'pointercancel',end);listen(panel,'lostpointercapture',end);listen(panel,'keydown',key);
   listen(canvas,'webglcontextlost',event=>{event.preventDefault();if(current(panel,token,mine))token.fail(new Error('WebGL context lost'));});
   // Activate the stage/screen layout before measuring it. In the portal the dialog is
   // already clipped to a small face; measuring while the ready rules are inactive can
   // produce a zero-sized stage and leave the wrapped controls with no projected screen.
   panel.dataset.reminderRoom='ready';panel.tabIndex=0;panel.setAttribute('aria-keyshortcuts','ArrowLeft ArrowRight');panel.setAttribute('aria-describedby',hint.id);
   view.resize=new ResizeObserver(resize);view.resize.observe(host);resize();
   const media=matchMedia('(prefers-reduced-motion: reduce)');
   const tick=now=>{if(view.disposed||!current(panel,token,mine)||document.visibilityState!=='visible'||media.matches){view.raf=0;return;}if(now-lastFrame>=1000/24){lastFrame=now;render(now);}view.raf=requestAnimationFrame(tick);};
   const startLoop=()=>{if(!view.disposed&&current(panel,token,mine)&&document.visibilityState==='visible'&&!media.matches&&!view.raf)view.raf=requestAnimationFrame(tick);};
   listen(document,'visibilitychange',()=>{if(document.visibilityState!=='visible'&&view.raf){cancelAnimationFrame(view.raf);view.raf=0;}else startLoop();});
   listen(media,'change',()=>{if(media.matches){if(view.raf){cancelAnimationFrame(view.raf);view.raf=0;}render();}else startLoop();});startLoop();
   offer.hidden=true;offer.style.display='none';
  }catch(error){if(parsed)releaseObject(parsed);if(!current(panel,token,mine))return;tearDown();setFallback('The computer room is an optional download. Reminders still work.');}
  finally{if(pendingEpoch===mine)pendingEpoch=-1;}
 }
 const observer=new MutationObserver(()=>{if(panel.open){window.dispatchEvent(new Event('myr5:reminders-open'));void check();}else{epoch++;tearDown();}});observer.observe(panel,{attributes:true,attributeFilter:['open']});
 const onFocus=()=>{if(panel.open)void check();};const onPageHide=()=>{epoch++;tearDown();};const onPageShow=()=>{if(panel.open)void check();};
 window.addEventListener('focus',onFocus);window.addEventListener('pagehide',onPageHide);window.addEventListener('pageshow',onPageShow);
 const onAccountTransition=()=>{if(pendingEpoch<0)return;epoch++;pendingEpoch=-1;if(panel.open)queueMicrotask(()=>void check());};
 window.addEventListener('myr5:account-ready',onAccountTransition);window.addEventListener('myr5:account-cleared',onAccountTransition);
 panel.append(hint);
 if(panel.open)void check();
 return()=>{if(disposed)return;disposed=true;epoch++;observer.disconnect();window.removeEventListener('focus',onFocus);window.removeEventListener('pagehide',onPageHide);window.removeEventListener('pageshow',onPageShow);window.removeEventListener('myr5:account-ready',onAccountTransition);window.removeEventListener('myr5:account-cleared',onAccountTransition);tearDown();button.removeEventListener('click',buttonClick);offer.remove();hint.remove();};
}

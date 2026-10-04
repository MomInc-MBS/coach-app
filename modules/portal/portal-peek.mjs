// PORTAL-PEEK (Ian 1 Oct 2026): a see-through portal. While the cut is open, the destination scene is rendered
// offscreen into one reused render target and blended into the wormhole's centre (portal.mjs keeps the wormhole at
// the rim). Technique from Wormhole by AidanHT (src/render/PortalRenderer.ts): RT scaled per quality (RT_SCALE),
// capped at MAX_RT_DIM. Our destinations are their own scenes, so there is no portal-pair camera and nothing in
// front of a portal plane to clip (no oblique near plane needed). On by default (R17); localStorage.myr5PortalPeek = "0" turns it off.
// Served unbundled (dynamic import from portal.mjs on the first peek): plain JS, no .ts, no __MYR5_* defines.
import * as THREE from 'three';
import {recipeShipTint,applyShipTint,SHIP_ANCHOR_Y,SHIP_FACING,SHIP_REST_Z,shipPoseAbove,measureShip} from '../ships/ship-scene-domain.mjs';
import {STARTER_WONDERS,backgroundForDay,starterWonderUrl} from '../../meditation-backgrounds.mjs';

export const RT_SCALE=Object.freeze({high:1,medium:.55,low:.35});
export const MAX_RT_DIM=2048,MAX_DPR=1.5;
const FLAG='myr5PortalPeek';

// "0" = off (kill switch); "low"/"medium"/"high" force one (for measuring); anything else is auto: a 4-core-or-less
// phone is low quality and gets no peek (plain wormhole, the tunnel's own coarse hint); everything else medium.
export function peekQuality(){
 let v=null;try{v=localStorage.getItem(FLAG);}catch{}
 if(v==='0')return null;
 if(RT_SCALE[v])return v;
 return (navigator.hardwareConcurrency||8)<=4?null:'medium';
}

/** One render target, reused; resize() reallocates only when the size changes, render() never allocates. */
export function createPortalPeek({renderer,quality='medium'}){
 const rt=new THREE.WebGLRenderTarget(16,16,{depthBuffer:true}),scale=RT_SCALE[quality]||RT_SCALE.medium;
 let source=null,pixels=new Uint8Array(16*16*4);
 const peek={
  target:rt,texture:rt.texture,width:16,height:16,
  setSource(next){source=typeof next==='function'?{render:next}:next;if(source?.camera)peek.resize(peek.cssW||16,peek.cssH||16);},
  // w,h: CSS px of the window the peek fills.
  resize(w,h){
   peek.cssW=w;peek.cssH=h;
   const k=Math.min(devicePixelRatio||1,MAX_DPR)*scale,rw=Math.min(MAX_RT_DIM,Math.max(16,Math.round(w*k))),rh=Math.min(MAX_RT_DIM,Math.max(16,Math.round(h*k)));
   if(source?.camera){source.camera.aspect=w/Math.max(1,h);source.camera.updateProjectionMatrix();}
   if(rw===peek.width&&rh===peek.height)return;
   rt.setSize(rw,rh);peek.width=rw;peek.height=rh;pixels=new Uint8Array(rw*rh*4);
  },
  render(now=performance.now()){
   if(!source)return false;
   const prev=renderer.getRenderTarget();renderer.setRenderTarget(rt);
   if(source.render)source.render(renderer,now);else{source.update?.(now);renderer.render(source.scene,source.camera);}
   renderer.setRenderTarget(prev);return true;
  },
  // The wormhole draws in its own WebGL2 context, so the frame crosses over as pixels (bottom row first, linear RGB).
  lost:()=>renderer.getContext().isContextLost(),
  read(){renderer.readRenderTargetPixels(rt,0,0,peek.width,peek.height,pixels);return pixels;},
  dispose(){source?.dispose?.();source=null;rt.dispose();},
 };
 return peek;
}

// One three.js context for the page's life (like the tunnel's), created on the first peek.
let shared=null;
export function peekRenderer(){
 if(shared&&!shared.getContext().isContextLost())return shared;
 const canvas=document.createElement('canvas');
 try{shared=new THREE.WebGLRenderer({canvas,alpha:false,antialias:false,powerPreference:'low-power'});}catch{return shared=null;}
 canvas.addEventListener('webglcontextlost',()=>{if(shared?.domElement===canvas)shared=null;});
 return shared;
}

// scene.background with CSS "cover" (three stretches a background texture to the viewport otherwise).
function cover(texture,aspect){
 const img=texture.image,ia=img?(img.width/img.height):1,r=aspect/ia;
 texture.matrixAutoUpdate=true;
 if(r>1){texture.repeat.set(1,1/r);texture.offset.set(0,(1-1/r)/2);}else{texture.repeat.set(r,1);texture.offset.set((1-r)/2,0);}
}
const textures=new THREE.TextureLoader();
async function wonder(){
 const t=await textures.loadAsync(starterWonderUrl(backgroundForDay(STARTER_WONDERS)));
 t.colorSpace=THREE.SRGBColorSpace;
 return t;
}
function disposeTree(root){root.traverse(n=>{n.geometry?.dispose();for(const m of [].concat(n.material||[])){for(const v of Object.values(m))if(v?.isTexture)v.dispose();m.dispose();}});}

// Parsed once per page; dispose() frees the GPU copies and the next peek re-uploads them.
let starterShip=null;
// Ship pod: the starter ship hovering over today's starter wonder, as the ship view shows it without the Ships pack.
// ponytail: always the starter ship; an owned pack ship needs app.mjs's bridge, which this unbundled module can't reach.
async function shipSource(){
 const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
 starterShip??=new GLTFLoader().loadAsync('/pod/worlds/starter/supportive.glb').catch(e=>{starterShip=null;throw e;});
 const [gltf,bg]=await Promise.all([starterShip,wonder()]);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.1,100);
 camera.position.set(0,.45,7);camera.lookAt(0,.9,0);
 scene.background=bg;
 scene.add(new THREE.HemisphereLight(0xe9d9ff,0x23162d,2.5));
 const key=new THREE.DirectionalLight(0xffefca,4.2);key.position.set(-3,5,4);scene.add(key);
 const rim=new THREE.DirectionalLight(0xb58cff,3.2);rim.position.set(4,2,-3);scene.add(rim);
 const model=gltf.scene.clone(true),box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());
 model.position.sub(box.getCenter(new THREE.Vector3()));
 try{applyShipTint(model,recipeShipTint(JSON.parse(localStorage.getItem('myr5-recipe-v1')||'{}')));}catch{} // the coach's saved ship colour (the ship itself stays the starter, see above)
 const turn=new THREE.Group(),group=new THREE.Group(),fit=2.25/(Math.max(size.x,size.y,size.z)||1);
 turn.rotation.y=SHIP_FACING;turn.add(model);group.add(turn);group.scale.setScalar(fit);
 group.position.set(0,SHIP_ANCHOR_Y,SHIP_REST_Z);group.rotation.set(.08,-.32,0);scene.add(group);
 let pose=null,aspect=0;const t0=performance.now();
 return {scene,camera,
  update(now){
   if(camera.aspect!==aspect){aspect=camera.aspect;cover(bg,aspect);group.scale.setScalar(fit);group.position.y=SHIP_ANCHOR_Y;pose=shipPoseAbove({top:.4,bottom:-.4,aspect},measureShip(THREE,group,camera));group.scale.setScalar(fit*pose.scale);}
   group.position.y=pose.y+Math.sin((now-t0)/820)*.07*pose.scale;group.rotation.y=-.32+Math.sin((now-t0)/1700)*.055;
  },
  dispose(){disposeTree(group);bg.dispose();}};
}
// Meditation: the still room's far layer, today's wonder (the glass is greyscale on this route).
// ponytail: the sleeping coach and your character are DOM/creature-viewer layers, not offscreen-renderable here.
async function meditationSource(){
 const bg=await wonder(),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();
 scene.background=bg;let aspect=0;
 return {scene,camera,update(){if(camera.aspect!==aspect){aspect=camera.aspect;cover(bg,aspect);}},dispose(){bg.dispose();}};
}
// Customizer creature: no traced shape leads there (it opens from the ship), so it has no peek.
export const PEEK_SOURCES=Object.freeze({select:shipSource,meditate:meditationSource});

/** For portal.mjs: a peek for `route` sized to a w x h CSS px window, or null (switched off, low end, no source, no WebGL). */
export async function openPeek(route,w,h){
 const quality=peekQuality(),load=PEEK_SOURCES[route];
 if(!quality||!load)return null;
 const renderer=peekRenderer();if(!renderer)return null;
 const peek=createPortalPeek({renderer,quality});
 try{peek.resize(w,h);peek.setSource(await load());}catch(error){peek.dispose();console.warn('Portal peek unavailable',error);return null;}
 return peek;
}

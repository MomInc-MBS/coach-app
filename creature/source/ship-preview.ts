// Ship tab preview: the chosen owned ship, turning slowly in its tint. Models come only from the verified local
// bridge (signed, owned, already-downloaded "Ships and worlds" bytes as blob: URLs); nothing here downloads.
// Its own small renderer draws only while the panel is on screen.
import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {SHIP_FACING,applyShipTint} from '../../modules/ships/ship-scene-domain.mjs';
import {shipDetails} from '../../modules/ships/ship-catalog.mjs';

export type ShipBridge={ownedShipIds():string[];getShipUrl(id:string):string;dispose?():void};

function disposeModel(root:T.Object3D){root.traverse(node=>{const mesh=node as T.Mesh;mesh.geometry?.dispose();for(const m of ([] as T.Material[]).concat(mesh.material||[])){for(const value of Object.values(m))if((value as T.Texture)?.isTexture)(value as T.Texture).dispose();m.dispose();}});}

export function mountShipPreview(host:HTMLElement,bridge:ShipBridge){
 const canvas=document.createElement('canvas');canvas.className='ship-preview';canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%';canvas.setAttribute('role','img');host.prepend(canvas);
 let renderer:T.WebGLRenderer;
 try{renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true});}catch(error){canvas.remove();bridge.dispose?.();throw error;}
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.setPixelRatio(Math.min(devicePixelRatio,2));
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.1,100),turn=new T.Group();
 camera.position.set(0,1.4,7);camera.lookAt(0,0,0);scene.add(turn,new T.HemisphereLight(0xe9d9ff,0x23162d,2.5));
 const key=new T.DirectionalLight(0xffefca,4.2);key.position.set(-3,5,4);const rim=new T.DirectionalLight(0xb58cff,3.2);rim.position.set(4,2,-3);scene.add(key,rim);
 const loader=new GLTFLoader(),models=new Map<string,Promise<T.Object3D>>();
 let shown:T.Object3D|null=null,epoch=0,raf=0,disposed=false;
 // Same normalization as the arrival scene: centred, longest side 2.25, stern to the viewer then a quarter turn.
 function load(id:string){
  let model=models.get(id);
  if(!model){model=loader.loadAsync(bridge.getShipUrl(id)).then(gltf=>{
   const box=new T.Box3().setFromObject(gltf.scene),size=box.getSize(new T.Vector3());gltf.scene.position.sub(box.getCenter(new T.Vector3()));
   const root=new T.Group();root.add(gltf.scene);root.rotation.y=SHIP_FACING;root.scale.setScalar(2.25/(Math.max(size.x,size.y,size.z)||1));
   if(disposed)disposeModel(root);return root;
  });model.catch(()=>models.delete(id));models.set(id,model);}
  return model;
 }
 function tint(color:string){if(shown)applyShipTint(shown,color==='#ffffff'?null:color);}
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 function tick(now:number){
  raf=0;if(disposed||document.hidden)return;
  const w=canvas.clientWidth,h=canvas.clientHeight;
  if(w&&h&&shown){
   if(canvas.width!==Math.round(w*renderer.getPixelRatio())||canvas.height!==Math.round(h*renderer.getPixelRatio())){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
   turn.rotation.y=reduced()?-.32:now/2400;renderer.render(scene,camera);
  }
  raf=requestAnimationFrame(tick);
 }
 const resume=()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;return;}if(!disposed&&!raf)raf=requestAnimationFrame(tick);};
 document.addEventListener('visibilitychange',resume);resume();
 return {
  /** Resolves true once `id` is on screen; false if a later show() or dispose() overtook it. Throws if its bytes fail. */
  async show(id:string,color='#ffffff'){
   const run=++epoch,model=await load(id);if(disposed||run!==epoch)return false;
   if(shown)turn.remove(shown);shown=model;turn.add(model);tint(/^#[0-9a-f]{6}$/i.test(color)?color:'#ffffff');canvas.dataset.ship=id;canvas.setAttribute('aria-label',`${shipDetails(id).name}: ${shipDetails(id).description}`);return true;
  },
  tint:(color:string)=>tint(/^#[0-9a-f]{6}$/i.test(color)?color:'#ffffff'),
  ids:()=>bridge.ownedShipIds(),
  dispose(){if(disposed)return;disposed=true;++epoch;document.removeEventListener('visibilitychange',resume);cancelAnimationFrame(raf);for(const model of models.values())model.then(disposeModel,()=>{});models.clear();renderer.dispose();renderer.forceContextLoss();canvas.remove();bridge.dispose?.();},
 };
}

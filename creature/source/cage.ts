// W4-4E (#116, D45/D47): the customizer cage. futuristic-weapons.glb, decimated to one optional download packet
// ('room-cage', scripts/offline-assets.mjs), shown around the live coach only once this phone has downloaded it.
// It adds meshes to the editor's own CreatureViewer scene, so there is no second renderer or render loop; the
// viewer already skips frames while the page is hidden or the stage is off screen. Any failure (no packet,
// decoder, asset) removes the cage and leaves the flat customizer exactly as it was.
import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js';
import {battlePassState} from '../../battle-pass.mjs';
import type {CreatureViewer} from './viewer';

export const CAGE_BASE='/pod/rooms/cage/';
export const CAGE_FILES=['cage.glb','draco_wasm_wrapper.js','draco_decoder.wasm'].map(file=>CAGE_BASE+file);
export type CageSection='overview'|'pedestal'|'pets'|'weapons'|'mirror'|'clothing';
// The supplied cage is one Tripo mesh with no named bays, so each section is an explicit hit volume measured
// from the decimated model (glTF units, y up): centre x,y,z · size x,y,z · yaw. Scale 8 turns the pedestal
// (radius .18, top y .17) into the viewer's own 1.45 floor disc, with the coach's feet on its top.
type Volume=readonly [number,number,number,number,number,number,number];
const SCALE=8,PEDESTAL=[.02,.17,-.01] as const;
const VOLUMES:Record<Exclude<CageSection,'overview'>,Volume[]>={
 pedestal:[[.02,.42,-.01,.3,.5,.3,0]],
 pets:[[-.31,.15,.075,.1,.16,.1,0],[-.22,.15,.23,.1,.16,.1,0],[-.04,.15,.33,.1,.16,.1,0],[.16,.15,.3,.1,.16,.1,0],[.245,.15,.17,.1,.16,.1,0]],
 weapons:[[-.27,.48,-.24,.47,.45,.05,.54]],
 mirror:[[.345,.39,-.21,.39,.64,.05,-.88]],
 clothing:[[.06,.32,-.31,.16,.5,.1,0]],
};
// Where each view looks from (a direction from the section toward the camera) and what it keeps in frame.
const VIEWS:Record<CageSection,{from:[number,number,number];coach:boolean;pad:number}>={
 overview:{from:[0,.5,1],coach:true,pad:.92},
 pedestal:{from:[0,.18,1],coach:true,pad:1.02},
 pets:{from:[.1,.95,1],coach:false,pad:1},
 weapons:{from:[-.1,.2,1],coach:false,pad:1},
 mirror:{from:[-.7,.2,.7],coach:true,pad:1},
 clothing:{from:[0,.45,1],coach:true,pad:1},
};
export const SECTIONS:{id:CageSection;label:string;name:string}[]=[
 {id:'overview',label:'Cage',name:'Whole cage'},
 {id:'pedestal',label:'Coach',name:'Coach pedestal: species'},
 {id:'pets',label:'Pets',name:'Pet cages'},
 {id:'weapons',label:'Weapons',name:'Weapon wall'},
 {id:'mirror',label:'Mirror',name:'Mirror: colours'},
 {id:'clothing',label:'Clothes',name:'Clothing bay'},
];

// Only this release's downloaded package counts ("the 2D editor works until the packet is downloaded"); an
// on-demand fetch never pulls a megabyte into the customizer. Opening only names that exist creates nothing.
export async function cagePacketReady(){
 try{
  if(!globalThis.caches)return false;
  const names=(await caches.keys()).filter(name=>name.startsWith('myr5-package-'));
  for(const url of CAGE_FILES){let found=false;for(const name of names)if(await(await caches.open(name)).match(url)){found=true;break;}if(!found)return false;}
  return true;
 }catch{return false;}
}

const CSS='.cage-bays{position:absolute;left:6px;right:6px;bottom:6px;z-index:2;display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;padding:2px}.cage-bays button{flex:1 1 auto;min-height:36px;min-width:44px;padding:4px 2px;font-size:.75rem;border-radius:7px;background:linear-gradient(#3b4f58,#22303a);border-color:#6fd6e3;color:#dff9ff;box-shadow:inset 0 1px #bff4ff33,0 2px 0 #0b1216}.cage-bays button[aria-pressed=true]{background:linear-gradient(#9ff2ff,#46b6c6);color:#07252b;border-color:#dffcff}.cage-offer{position:absolute;right:8px;bottom:8px;z-index:2;min-height:32px;padding:4px 10px;font-size:.75rem}#panel-bay ul{margin:8px 0;padding-left:20px}#panel-bay li+li{margin-top:4px}#panel-bay .bay-locked{color:var(--muted)}@media(max-width:700px){.editor-shell[data-cage=ready] .editor-workspace{grid-template-rows:minmax(220px,48%) minmax(0,1fr)}}';

let styled:HTMLStyleElement|null=null;
export function cageStyle(){if(!styled?.isConnected){styled=document.createElement('style');styled.textContent=CSS;document.head.append(styled);}}
export type CageHooks={openTab:(menu:'body'|'materials')=>boolean;showBay:(title:string,kicker:string,body:Node)=>void;tell:(text:string)=>void};
type Owned={name:string;boss:string;level:number;granted:boolean};
function rewards(kind:'pet'|'weapon'):Owned[]{
 const seen=new Map<string,Owned>();
 for(const boss of battlePassState().bosses)for(const reward of boss.rewards)for(const item of reward.items)if(item.kind===kind){
  const prior=seen.get(item.id);if(!prior||item.granted&&!prior.granted)seen.set(item.id,{name:item.name,boss:boss.name,level:reward.level,granted:!!item.granted});
 }
 return [...seen.values()];
}
function list(items:Owned[],empty:string){
 const wrap=document.createElement('div'),owned=items.filter(i=>i.granted),locked=items.filter(i=>!i.granted),p=document.createElement('p');
 p.textContent=owned.length?`You own ${owned.length} of ${items.length}.`:empty;wrap.append(p);
 const ul=(rows:Owned[],cls:string,text:(i:Owned)=>string)=>{if(!rows.length)return;const ul=document.createElement('ul');ul.className=cls;for(const row of rows){const li=document.createElement('li');li.textContent=text(row);ul.append(li);}wrap.append(ul);};
 ul(owned,'bay-owned',i=>`${i.name} · owned`);
 ul(locked,'bay-locked',i=>`🔒 ${i.name} · ${i.boss} level ${i.level}`);
 return wrap;
}
const help=(text:string)=>{const p=document.createElement('p');p.className='help';p.textContent=text;return p;};
// Pets and weapons are account rewards, shown as they are. Nothing here writes the coach recipe, and the War
// Room loadout (PUT /api/war-room/loadout, Coach Army only) is never read or saved from the cage.
export function sectionBay(section:'pets'|'weapons'|'clothing'):[string,string,Node]{
 const body=document.createElement('div');
 if(section==='pets'){body.append(list(rewards('pet'),'No pets yet. Each workout path’s first boss gives one at level 4.'),help('Pets you own live in these cages. Choosing a pet to follow your coach isn’t available yet.'));return ['Pet cages','PETS',body];}
 if(section==='weapons'){body.append(list(rewards('weapon'),'No weapons yet. Workout path bosses give them at levels 1 and 3.'),help('Your War Room loadout is chosen and saved in the War Room. The cage shows your rewards and never changes it.'));return ['Weapon wall','WEAPONS',body];}
 body.append(help('Nothing to wear yet. This empty bay is kept for coach clothing when it arrives.'));return ['Clothing bay','CLOTHING',body];
}

export function mountCage(viewer:CreatureViewer,hooks:CageHooks){
 const stage=viewer.mount,shell=stage.closest('.editor-shell') as HTMLElement|null;cageStyle();
 const bays=document.createElement('div');bays.className='cage-bays';bays.setAttribute('role','group');bays.setAttribute('aria-label','Cage sections');bays.hidden=true;stage.append(bays);
 const buttons=new Map<CageSection,HTMLButtonElement>();
 for(const s of SECTIONS){const b=document.createElement('button');b.type='button';b.textContent=s.label;b.setAttribute('aria-label',s.name);b.dataset.cageSection=s.id;b.setAttribute('aria-pressed','false');b.onclick=()=>select(s.id);bays.append(b);buttons.set(s.id,b);}
 let root:T.Group|null=null,disposed=false,current:CageSection|null=null,tween=0;const hits:T.Mesh[]=[],outlines=new Map<CageSection,T.LineSegments[]>();
 const set=(state:string)=>{if(shell)shell.dataset.cage=state;};
 const world=(x:number,y:number,z:number)=>new T.Vector3((x-PEDESTAL[0])*SCALE,(y-PEDESTAL[1])*SCALE,(z-PEDESTAL[2])*SCALE);
 function boxOf(section:CageSection){
  const box=new T.Box3();
  if(section==='overview'&&root)box.setFromObject(root);
  for(const mesh of hits)if(mesh.userData.section===section)box.expandByObject(mesh);
  if(VIEWS[section].coach&&!viewer.bodyBounds.isEmpty())box.union(viewer.bodyBounds);
  return box;
 }
 function frame(section:CageSection){
  const box=boxOf(section),center=box.getCenter(new T.Vector3()),radius=box.getSize(new T.Vector3()).length()/2,camera=viewer.camera;
  const v=T.MathUtils.degToRad(camera.fov/2),h=Math.atan(Math.tan(v)*camera.aspect),distance=radius*VIEWS[section].pad/Math.sin(Math.min(v,h));
  // Lift the framed bay above the button row that sits over the bottom of the stage.
  center.y-=distance*Math.tan(v)*(bays.offsetHeight+6)/Math.max(1,stage.clientHeight);
  return {target:center,position:center.clone().addScaledVector(new T.Vector3(...VIEWS[section].from).normalize(),distance)};
 }
 // A short camera glide (none with reduced or Still motion). It only moves the camera; the viewer draws.
 function move(section:CageSection){
  cancelAnimationFrame(tween);tween=0;viewer.focused=null;
  const to=frame(section),camera=viewer.camera,orbit=viewer.orbit;
  if(viewer.settings.reduced){camera.position.copy(to.position);orbit.target.copy(to.target);orbit.update();return;}
  const p0=camera.position.clone(),t0=orbit.target.clone(),start=performance.now();
  const step=(now:number)=>{if(disposed)return;const k=Math.min(1,(now-start)/650),e=k<.5?2*k*k:1-(-2*k+2)**2/2;camera.position.lerpVectors(p0,to.position,e);orbit.target.lerpVectors(t0,to.target,e);orbit.update();tween=k<1?requestAnimationFrame(step):0;};
  tween=requestAnimationFrame(step);
 }
 function select(section:CageSection){
  if(!root||disposed)return;current=section;
  for(const [id,b] of buttons)b.setAttribute('aria-pressed',String(id===section));
  for(const [id,lines] of outlines)for(const line of lines)line.visible=id===section;
  move(section);
  if(section==='pedestal')hooks.openTab('body');
  else if(section==='mirror')hooks.openTab('materials');
  else if(section!=='overview')hooks.showBay(...sectionBay(section));
 }
 // Tap (not drag) a bay in the scene: the same action as its button.
 const raycaster=new T.Raycaster(),canvas=viewer.renderer.domElement;let down:{x:number;y:number;t:number}|null=null;
 function pick(clientX:number,clientY:number):CageSection|null{
  const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return null;
  raycaster.setFromCamera(new T.Vector2((clientX-r.left)/r.width*2-1,-(clientY-r.top)/r.height*2+1),viewer.camera);
  return raycaster.intersectObjects(hits,false)[0]?.object.userData.section??null;
 }
 const onDown=(e:PointerEvent)=>{down={x:e.clientX,y:e.clientY,t:performance.now()};};
 const onUp=(e:PointerEvent)=>{const d=down;down=null;if(!d||!root||Math.hypot(e.clientX-d.x,e.clientY-d.y)>8||performance.now()-d.t>500)return;const section=pick(e.clientX,e.clientY);if(section)select(section);};
 canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointerup',onUp);
 function teardown(){
  cancelAnimationFrame(tween);tween=0;
  if(root){viewer.scene.remove(root);root.traverse(node=>{const mesh=node as T.Mesh;mesh.geometry?.dispose();for(const m of ([] as T.Material[]).concat(mesh.material||[])){for(const value of Object.values(m))if((value as T.Texture)?.isTexture)(value as T.Texture).dispose();m.dispose();}});root=null;}
  hits.length=0;outlines.clear();viewer.floorObjects.forEach(o=>o.visible=true);bays.hidden=true;
 }
 function dispose(){if(disposed)return;disposed=true;teardown();canvas.removeEventListener('pointerdown',onDown);canvas.removeEventListener('pointerup',onUp);bays.remove();}
 set('loading');
 const ready=(async()=>{
  const draco=new DRACOLoader();
  try{
   draco.setDecoderPath(CAGE_BASE);draco.setDecoderConfig({type:'wasm'});
   const loader=new GLTFLoader();loader.setDRACOLoader(draco);
   const gltf=await loader.loadAsync(CAGE_BASE+'cage.glb');
   if(disposed){gltf.scene.traverse(node=>{(node as T.Mesh).geometry?.dispose();});return false;}
   root=new T.Group();root.name='customizer-cage';
   gltf.scene.scale.setScalar(SCALE);gltf.scene.position.copy(world(0,0,0));root.add(gltf.scene);
   const hidden=new T.MeshBasicMaterial({visible:false}),edge=new T.LineBasicMaterial({color:0x7eeaff,transparent:true,opacity:.85});
   for(const [section,volumes] of Object.entries(VOLUMES) as [CageSection,Volume[]][])for(const [x,y,z,sx,sy,sz,yaw] of volumes){
    const geometry=new T.BoxGeometry(sx*SCALE,sy*SCALE,sz*SCALE),mesh=new T.Mesh(geometry,hidden);
    mesh.position.copy(world(x,y,z));mesh.rotation.y=yaw;mesh.userData.section=section;mesh.name='cage-'+section;
    const line=new T.LineSegments(new T.EdgesGeometry(geometry),edge);line.visible=false;mesh.add(line);
    hits.push(mesh);(outlines.get(section)??outlines.set(section,[]).get(section)!).push(line);root.add(mesh);
   }
   root.updateMatrixWorld(true);viewer.scene.add(root);viewer.floorObjects.forEach(o=>o.visible=false);
   bays.hidden=false;set('ready');select('overview');
   return true;
  }catch(error){
   if(disposed)return false;
   teardown();bays.remove();set('failed');hooks.tell('The 3D cage could not load on this device. The customizer works as usual.');console.warn('Customizer cage unavailable',error);
   return false;
  }finally{draco.dispose();}
 })();
 return {ready,select,dispose,pick,get section(){return current;},
  // Tests and the phone frame check: where a section's hit volume lands on screen right now.
  project(section:CageSection){const mesh=hits.find(m=>m.userData.section===section);if(!mesh)return null;const p=mesh.getWorldPosition(new T.Vector3()).project(viewer.camera),r=canvas.getBoundingClientRect();return {x:r.left+(p.x+1)/2*r.width,y:r.top+(1-p.y)/2*r.height};}};
}

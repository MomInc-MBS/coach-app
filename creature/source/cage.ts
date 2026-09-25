// W4-4E (#116, D45/D47): the customizer cage. futuristic-weapons.glb, decimated to one optional download packet
// ('room-cage', scripts/offline-assets.mjs), shown around the live coach only once this phone has downloaded it.
// It adds meshes to the editor's own CreatureViewer scene, so there is no second renderer or render loop; the
// viewer already skips frames while the page is hidden or the stage is off screen. Any failure (no packet,
// decoder, asset) removes the cage and leaves the flat customizer exactly as it was.
import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js';
import {battlePassState} from '../../battle-pass.mjs';
import {availablePetChoices,selectedPetChoice,selectPetChoice,PET_CHOICE_SCOPE_LABEL} from '../../pet-choice.mjs';
import {mountWeaponWall} from './weapon-wall.mjs';
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

const CSS='.cage-bays{position:absolute;left:6px;right:6px;bottom:6px;z-index:2;display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;padding:2px}.cage-bays button{flex:1 1 auto;min-height:36px;min-width:44px;padding:4px 2px;font-size:.75rem;border-radius:7px;background:linear-gradient(#3b4f58,#22303a);border-color:#6fd6e3;color:#dff9ff;box-shadow:inset 0 1px #bff4ff33,0 2px 0 #0b1216}.cage-bays button[aria-pressed=true]{background:linear-gradient(#9ff2ff,#46b6c6);color:#07252b;border-color:#dffcff}.cage-offer{position:absolute;right:8px;bottom:8px;z-index:2;min-height:32px;padding:4px 10px;font-size:.75rem}#panel-bay ul{margin:8px 0;padding-left:20px}#panel-bay li+li{margin-top:4px}#panel-bay h3{margin:12px 0 4px;font-size:.95rem}.pet-choices{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.pet-choices button{min-height:44px;min-width:44px}.pet-choices button[aria-pressed=true]{outline:2px solid #6fd6e3}#panel-bay .bay-error{color:#ffb4a8}.gala-loadout{margin-top:14px;padding-top:8px;border-top:1px solid #6fd6e3}.gala-loadout .cage-weapon-wall{display:grid;gap:8px}.gala-loadout .cage-weapon-wall h2{display:none}.gala-loadout .cage-weapon-wall :is(select,input,button){min-height:44px}#panel-bay .bay-locked{color:var(--muted)}@media(max-width:700px){.editor-shell[data-cage=ready] .editor-workspace{grid-template-rows:minmax(220px,48%) minmax(0,1fr)}}';

let styled:HTMLStyleElement|null=null;
export function cageStyle(){if(!styled?.isConnected){styled=document.createElement('style');styled.textContent=CSS;document.head.append(styled);}}
// onClose runs when the bay stops being shown (another bay, a console tab, or the cage going away).
export type CageHooks={openTab:(menu:'body'|'materials')=>boolean;showBay:(title:string,kicker:string,body:Node,onClose?:()=>void)=>void;closeBay?:()=>void;tell:(text:string)=>void};
type Owned={id:string;name:string;boss:string;level:number;granted:boolean};
function rewards(kind:'pet'|'weapon'):Owned[]{
 const seen=new Map<string,Owned>();
 for(const boss of battlePassState().bosses)for(const reward of boss.rewards)for(const item of reward.items)if(item.kind===kind){
  const prior=seen.get(item.id);if(!prior||item.granted&&!prior.granted)seen.set(item.id,{id:item.id,name:item.name,boss:boss.name,level:reward.level,granted:!!item.granted});
 }
 return [...seen.values()];
}
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',cls='')=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
const ul=(rows:Owned[],cls:string,text:(i:Owned)=>string)=>{if(!rows.length)return null;const list=el('ul','',cls);for(const row of rows)list.append(el('li',text(row)));return list;};
const lockedList=(rows:Owned[])=>ul(rows,'bay-locked',i=>`🔒 ${i.name} · ${i.boss} level ${i.level}`);
const help=(text:string)=>el('p',text,'help');
// Pet cages: a device-local preference over the pets this device has been granted (pet-choice.mjs). Every
// render re-reads it, so a pet that is no longer granted drops back to None. Nothing is granted or saved to the coach.
function petBay(body:HTMLElement,focusId?:string|null){
 const choices=availablePetChoices(),chosen=selectedPetChoice().petId,ids=new Set(choices.map(c=>c.id));
 const status=el('p',`${choices.find(c=>c.id===chosen)?.name??'None'}: ${PET_CHOICE_SCOPE_LABEL}`);status.setAttribute('role','status');status.dataset.petStatus='';
 const group=el('div','','pet-choices');group.setAttribute('role','group');group.setAttribute('aria-label','Pet choice');
 for(const choice of choices){
  const b=el('button',choice.name+(choice.id===chosen?` · ${PET_CHOICE_SCOPE_LABEL}`:''));b.type='button';b.dataset.petChoice=choice.id??'';
  b.setAttribute('aria-pressed',String(choice.id===chosen));
  b.onclick=()=>{const saved=selectPetChoice(choice.id);petBay(body,choice.id);if(!saved){const e=el('p','This choice could not be saved. Storage is unavailable on this device.','bay-error');e.setAttribute('role','alert');body.prepend(e);}};
  group.append(b);
 }
 const held=rewards('pet'),parts:(Node|null)[]=[status,group,lockedList(held.filter(p=>!ids.has(p.id))),
  help('Only pets you have earned appear as choices. Your choice is kept on this device only; it grants nothing and does not change your coach. No pet appears with your coach yet.')];
 if(!held.length)parts.splice(2,0,help('No pets yet. Each workout path’s first boss gives one at level 4.'));
 body.replaceChildren(...parts.filter(Boolean) as Node[]);
 if(focusId!==undefined)(body.querySelector(`[data-pet-choice="${focusId??''}"]`) as HTMLElement|null)?.focus();
}
// Battle-pass weapons are device rewards, shown as earned or locked. The Gala War Room loadout is a different,
// account-owned thing: its form is the adapter's, saves only on its own button, and is disposed with the bay.
function weaponBay(body:HTMLElement){
 const items=rewards('weapon'),owned=items.filter(i=>i.granted),reward=el('section');
 reward.append(el('h3','Battle-pass weapons'),el('p',owned.length?`You have earned ${owned.length} of ${items.length} on this device.`:'No weapons yet. Workout path bosses give them at levels 1 and 3.'));
 for(const list of [ul(owned,'bay-owned',i=>`${i.name} · earned`),lockedList(items.filter(i=>!i.granted))])if(list)reward.append(list);
 reward.append(help('These rewards are not Gala weapons and are never sent to the War Room.'));
 const gala=el('section','','gala-loadout');gala.dataset.galaLoadout='';gala.append(el('h3','Gala War Room loadout'),help('A separate, account-owned loadout for Coach Army members. It saves only when you press Save loadout, and needs a connection.'));
 const host=el('div');gala.append(host);body.append(reward,gala);
 let wall:ReturnType<typeof mountWeaponWall>|null=null;
 try{wall=mountWeaponWall({host});}catch{host.append(help('The Gala loadout is unavailable right now.'));}
 return ()=>{wall?.dispose();wall=null;};
}
// Pets and weapons here are device rewards; the pet choice is a device preference. Nothing writes the coach recipe,
// and the only War Room call is the weapon form's own read and Save.
export function sectionBay(section:'pets'|'weapons'|'clothing'):[string,string,Node,(()=>void)?]{
 const body=el('div');
 if(section==='pets'){petBay(body);return ['Pet cages','PETS',body];}
 if(section==='weapons')return ['Weapon wall','WEAPONS',body,weaponBay(body)];
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
  else if(section!=='overview'){const [title,kicker,body,onClose]=sectionBay(section);hooks.showBay(title,kicker,body,onClose);}
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
  hooks.closeBay?.();hits.length=0;outlines.clear();viewer.floorObjects.forEach(o=>o.visible=true);bays.hidden=true;
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
   // The phone layout gives the stage more room once the cage is up; size the camera to it before framing.
   bays.hidden=false;set('ready');viewer.resize();select('overview');
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

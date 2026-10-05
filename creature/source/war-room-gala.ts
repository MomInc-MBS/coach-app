// The War Room's 3D character bay: the player's own 64-bit Gala character (the saved mominc-avatar-v1 look,
// drawn by the shared Gala renderer and performer) stands on the cage room's pedestal. Coach sprites share
// the saved coach's colours and body ownership; no coach models or customizer are loaded. The room's bays open the Gala menus: the weapon
// rack picks the weapon, the animal cages the pet, the mirror the alien features, the centre station the clothes.
// Choices save to this device like every other Gala look change; tiers stay behind the training that earned them.
import * as T from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {mountCage,cagePacketReady,cageStyle,SECTIONS,type CageSection,type CageViewer} from './cage';
import {GALA_KEY,loadGala} from '../../pod/identity.mjs';
import {loadWarRoomCoaches} from './war-room-coaches';

type Look={schema:string;version:number;name:string;dye:number;parts:Record<string,number>;weapon?:{type:string;tier:number}};
type Section={id:string;label:string;note:string;names:string[];choices:number[]};
type Bay=Exclude<CageSection,'overview'>;
const G=globalThis as any;
export const MIRROR=['body','skin','face','hair','facial'];
export const CLOTHES=['headwear','neck','torso','shoulders','arms','hands','legs','feet','held','back'];
export const IDLE_WALK_MS=10000;
export const LABELS:Record<CageSection,{label:string;name:string}>={ pets:{label:'Pets',name:'Animal cages: pet'}, weapons:{label:'Weapons',name:'Weapon rack: weapon'}, mirror:{label:'Mirror',name:'Mirror: alien features'}, clothing:{label:'Clothes',name:'Centre station: clothes'}, overview:{label:'Room',name:'Whole War Room'}, pedestal:{label:'Gala',name:'Your Gala character: face'}};
// Which performer scene plays: idle loops, a face tap zooms in once, and ten idle seconds send the character walking off and back.
export function sceneClock(mode:{name:'idle'|'face'|'walk';since:number},now:number,idleSince:number,scenes:{name:string;duration:number}[]){
 const start=(name:string)=>{let t=0;for(const s of scenes){if(s.name===name)return {t,duration:s.duration};t+=s.duration;}return null;};
 const idle=scenes[0].duration;
 if(mode.name!=='idle'){const s=start(mode.name)!,elapsed=now-mode.since;if(elapsed<s.duration)return {mode,time:s.t+elapsed};if(mode.name==='walk')idleSince=now;mode={name:'idle',since:now};}
 if(now-idleSince>=IDLE_WALK_MS){mode={name:'walk',since:now};return {mode,time:start('walk')!.t,idleSince:now};}
 return {mode,time:(now-mode.since)%idle,idleSince};
}

class GalaStage implements CageViewer{
 scene=new T.Scene();camera=new T.PerspectiveCamera(36,1,.1,80);renderer:T.WebGLRenderer;orbit:OrbitControls;bodyBounds=new T.Box3();floorObjects:T.Object3D[]=[];focused=null;
 settings={amount:1,ambient:true,reduced:false};
 constructor(public mount:HTMLElement){
  this.renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;
  const environment=new RoomEnvironment(),pmrem=new T.PMREMGenerator(this.renderer);this.scene.environment=pmrem.fromScene(environment,.04).texture;environment.dispose();pmrem.dispose();
  this.renderer.domElement.setAttribute('role','img');mount.append(this.renderer.domElement);
  this.camera.position.set(0,2.65,8.9);this.orbit=new OrbitControls(this.camera,this.renderer.domElement);this.orbit.target.set(0,1.95,0);this.orbit.enableDamping=true;this.orbit.enablePan=false;this.orbit.enableZoom=false;this.orbit.maxPolarAngle=Math.PI*.85;
  this.scene.add(new T.HemisphereLight(0xe5d5ff,0x23152e,2));const key=new T.DirectionalLight(0xffeedc,3);key.position.set(-3,5,5);this.scene.add(key);
  const floor=new T.Mesh(new T.CylinderGeometry(1.45,1.55,.08,64),new T.MeshStandardMaterial({color:0x241e31,roughness:.5,metalness:.4}));floor.position.y=-.05;this.scene.add(floor);this.floorObjects=[floor];
 }
 resize(){const width=this.mount.clientWidth,height=this.mount.clientHeight;if(width&&height){this.renderer.setSize(width,height,false);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();}}
}

export function mountGalaBay(host:HTMLElement,{tell}:{tell:(text:string)=>void}){
 const A=G.GalaAvatar,W=G.GalaWeapons,P=G.GalaPerformance;
 if(!A||!W||!P)throw Error('The Gala character renderer is missing.');
 cageStyle();
 const doc=host.ownerDocument,el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',cls='')=>{const e=doc.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
 const stageEl=el('div','','gala-bay-stage'),panel=el('section','','gala-bay-panel'),heading=el('h3'),body=el('div');
 panel.hidden=true;panel.append(heading,body);host.append(stageEl,panel);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const stage=new GalaStage(stageEl);stage.settings.reduced=reduced.matches;
 // The character: the performer's 160×168 canvas on a billboard, feet on the pedestal top (y 0).
 const canvas=doc.createElement('canvas'),texture=new T.CanvasTexture(canvas);canvas.width=160;canvas.height=168;
 texture.magFilter=texture.minFilter=T.NearestFilter;texture.generateMipmaps=false;texture.colorSpace=T.SRGBColorSpace;
 const H=4.2,Wd=H*160/168,sprite=new T.Mesh(new T.PlaneGeometry(Wd,H),new T.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.1,side:T.DoubleSide}));
 sprite.position.y=H/2-H*11/168;sprite.name='gala-character';stage.scene.add(sprite);
 stage.bodyBounds.set(new T.Vector3(-Wd*.3,0,-.3),new T.Vector3(Wd*.3,H*144/168,.3));
 let saved:Look,look:Look,performer:any,mode:{name:'idle'|'face'|'walk';since:number}={name:'idle',since:performance.now()},idleSince=performance.now(),frame=0,last=0,disposed=false,open:Bay|null=null;
 let coaches:Awaited<ReturnType<typeof loadWarRoomCoaches>>|null=null;
 void loadWarRoomCoaches(doc).then(value=>{if(!disposed){coaches=value;load();}}).catch(()=>{if(!disposed)tell('Coach sprites could not load. Reopen the War Room to retry.');});
 function load(){
  let storage:Storage|undefined;try{storage=localStorage;}catch{}
  saved=loadGala(storage,A).look;look=structuredClone(saved);
  const chosen=look.weapon||{type:'rapier',tier:0};look.weapon=W.unlocked(chosen)?chosen:{type:chosen.type,tier:0};
  performer=P.create(look,coaches?{draw:(canvas:any,value:any,options:any)=>coaches!.draw(A.draw,canvas,value,options),hasPet:coaches.hasPet}:{});stage.renderer.domElement.setAttribute('aria-label',`${look.name||'Your Gala character'} with ${W.name(look.weapon)} in the War Room`);
  stage.mount.querySelectorAll<HTMLElement>('[data-cage-section=clothing]').forEach(control=>{control.hidden=!!coaches?.hasBody;});
  if(open)showBay(open);
 }
 const touch=()=>{idleSince=performance.now();if(mode.name==='walk')mode={name:'idle',since:idleSince};};
 function save(next:Look,message:string){
  try{localStorage.setItem(GALA_KEY,JSON.stringify(A.normalize(next)));dispatchEvent(new Event('mominc-avatar-change'));tell(message+' Saved on this device.');}
  catch{tell('This choice could not be saved. Storage is unavailable on this device.');}
 }
 function picker(section:Section){
  const label=el('label',section.label),select=el('select'),current=saved.parts[section.id];
  const values=section.choices.includes(current)?section.choices:[current,...section.choices];
  for(const value of values){const option=el('option',section.names[value]);option.value=String(value);select.append(option);}
  select.value=String(current);select.dataset.galaPart=section.id;
  select.onchange=()=>{touch();save({...saved,parts:{...saved.parts,[section.id]:Number(select.value)}},`${section.label}: ${section.names[Number(select.value)]}.`);};
  label.append(select);return label;
 }
 const sections=(ids:string[])=>ids.map(id=>(A.sections as Section[]).find(s=>s.id===id)!).filter(Boolean).map(picker);
 function weaponForm(){
  const form=el('div','','gala-weapon'),type=el('select'),tier=el('select'),selected=saved.weapon||{type:'rapier',tier:0};
  type.setAttribute('aria-label','Gala weapon');tier.setAttribute('aria-label','Weapon upgrade');type.dataset.galaWeapon='type';tier.dataset.galaWeapon='tier';
  for(const item of W.types){const option=el('option',item.name);option.value=item.id;type.append(option);}
  type.value=selected.type;
  for(let i=0;i<W.tiers.length;i++){const item={type:selected.type,tier:i},option=el('option'),locked=!W.unlocked(item);option.value=String(i);option.disabled=locked;option.textContent=W.tiers[i]+(locked?` · 🔒 ${W.requirements(item).label}`:'');tier.append(option);}
  tier.value=String(selected.tier);
  // The weapon already saved is kept as it is (an earned tier survives a guest or offline visit); anything else must be earned.
  const equip=(next:{type:string;tier:number})=>{touch();const kept=next.type===selected.type&&next.tier===selected.tier;if(!kept&&!W.unlocked(next))next={type:next.type,tier:0};save({...saved,weapon:next},W.name(next)+'.');};
  type.onchange=()=>equip({type:type.value,tier:type.value===selected.type?selected.tier:0});tier.onchange=()=>equip({type:type.value,tier:Number(tier.value)});
  const typeLabel=el('label','Weapon'),tierLabel=el('label','Upgrade');typeLabel.append(type);tierLabel.append(tier);
  form.append(typeLabel,tierLabel,el('p','Workout performance earns weapon upgrades.','help'));
  return form;
 }
 function showBay(section:Bay){
  touch();
  if(section==='pedestal'){if(!reduced.matches)mode={name:'face',since:performance.now()};closeBay();return;}
  // A save re-renders the open menu; keep the control the player was using focused.
  const active=doc.activeElement as HTMLElement|null,keep=panel.contains(active)?active!.dataset:null;
  open=section;panel.hidden=false;panel.dataset.galaBay=section;
  const title={pets:'Animal cages · Pet',weapons:'Weapon rack · Weapon',mirror:'Mirror · Alien features',clothing:'Centre station · Clothes'}[section];
  heading.textContent=title;
  if(section==='pets')body.replaceChildren(...sections(['pet']),...(coaches?[coaches.picker('pet',load)]:[]));
  else if(section==='weapons')body.replaceChildren(weaponForm());
  else if(section==='mirror')body.replaceChildren(...sections(coaches?.hasBody?['skin']:MIRROR),...(coaches?[coaches.picker('body',load)]:[]));
  else if(coaches?.hasBody){
   body.replaceChildren(el('p','Coach characters do not wear Gala clothes. Change their colour at the mirror.','help'));
  }
  else{
   const dye=el('label','Silk colour'),select=el('select');select.dataset.galaPart='dye';
   A.dyes.forEach((_:string,i:number)=>{const option=el('option',`Silk ${i+1}`);option.value=String(i);select.append(option);});select.value=String(saved.dye);
   select.onchange=()=>{touch();save({...saved,dye:Number(select.value)},`Silk ${Number(select.value)+1}.`);};dye.append(select);
   body.replaceChildren(...sections(CLOTHES),dye);
  }
  if(keep?.galaPart)(body.querySelector(`[data-gala-part="${keep.galaPart}"]`) as HTMLElement|null)?.focus();
  if(keep?.galaWeapon)(body.querySelector(`[data-gala-weapon="${keep.galaWeapon}"]`) as HTMLElement|null)?.focus();
 }
 function closeBay(){open=null;panel.hidden=true;body.replaceChildren();}
 // Without the downloaded room (or if it fails), the same menus sit under the character on the plain floor disc.
 let cage:ReturnType<typeof mountCage>|null=null;
 function flatBays(){
  const row=el('div','','cage-bays');row.setAttribute('role','group');row.setAttribute('aria-label','War Room sections');
  for(const s of SECTIONS){if(s.id==='overview'||s.id==='pedestal')continue;const b=el('button',LABELS[s.id].label);b.type='button';b.setAttribute('aria-label',LABELS[s.id].name);b.dataset.cageSection=s.id;b.classList.add('bay-terminal-line');b.onclick=()=>{for(const x of row.children)x.setAttribute('aria-pressed',String(x===b));if(s.id==='overview')closeBay();else showBay(s.id);};row.append(b);}
  stageEl.append(row);row.querySelectorAll<HTMLElement>('[data-cage-section=clothing]').forEach(control=>{control.hidden=!!coaches?.hasBody;});
 }
 void cagePacketReady().then(have=>{
  if(disposed)return;
  if(!have){flatBays();tell('Download the 3D cage: Install → Downloads.');return;}
  cage=mountCage(stage,{openTab:()=>false,showBay:()=>{},closeBay,tell,bay:showBay,labels:LABELS,volumes:{pedestal:[[.02,.64,-.01,.22,.20,.24,0]],clothing:[[.06,.3,-.31,.18,.12,.1,0]]}});
  stage.mount.querySelectorAll('[data-cage-section=overview],[data-cage-section=pedestal]').forEach(el=>el.remove());
  void cage.ready.then(ok=>{if(!disposed){if(!ok)flatBays();load();}});
 });
 const tick=(now:number)=>{
  if(disposed)return;frame=requestAnimationFrame(tick);if(now-last<32||doc.hidden)return;last=now;
  sprite.rotation.y=Math.atan2(stage.camera.position.x-sprite.position.x,stage.camera.position.z-sprite.position.z);
  if(reduced.matches)performer.paint(canvas,0,true);
  else{const clock=sceneClock(mode,now,idleSince,performer.scenes);mode=clock.mode;idleSince=clock.idleSince??idleSince;performer.paint(canvas,clock.time,false);}
  texture.needsUpdate=true;stage.orbit.update();stage.renderer.render(stage.scene,stage.camera);
 };
 const resize=new ResizeObserver(()=>stage.resize());resize.observe(stageEl);stage.resize();
 const onStorage=(event:StorageEvent)=>{if(event.key===GALA_KEY)load();},onReduced=()=>{stage.settings.reduced=reduced.matches;};
 stage.renderer.domElement.addEventListener('pointerdown',touch);
 addEventListener('mominc-avatar-change',load);addEventListener('storage',onStorage);reduced.addEventListener('change',onReduced);
 load();frame=requestAnimationFrame(tick);
 return {stage,get cage(){return cage;},get mode(){return mode.name;},showBay,closeBay,
  dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);cage?.dispose();resize.disconnect();removeEventListener('mominc-avatar-change',load);removeEventListener('storage',onStorage);reduced.removeEventListener('change',onReduced);
   texture.dispose();sprite.geometry.dispose();(sprite.material as T.Material).dispose();stage.orbit.dispose();stage.scene.environment?.dispose();stage.renderer.dispose();host.replaceChildren();}};
}

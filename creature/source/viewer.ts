import * as T from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {GLTFExporter} from 'three/examples/jsm/exporters/GLTFExporter.js';
import {clone as cloneSkinned} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {assembleCreature,type InstalledSkinResolver} from './creator/assemble';
import {createRig,disposeObject,type CreatureRig} from './rig';
import {MotionController,type Gesture} from './motion';
import {importCreature,motionSettings} from './profile';
import {sampleShot,SHOTS,type Cinematic} from './cinematic-shots';
import {regionBounds,frameRegion,regionFrame} from './creator/camera-focus';
import {REGIONS,type Region,type Design} from './creator/design';
import {podCameraFrame} from './pod-camera';
import {createCoachPreviewSpace} from '../../coach-preview-space.mjs';
import {createCharacterPhysics} from '../../character-phone-physics.mjs';
import {subscribePhoneMotion} from './phone-motion';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {SHIP_FACING,applyShipTint} from '../../modules/ships/ship-scene-domain.mjs';
import {localVerifiedBridge} from '../../modules/ships/verified-ship-assets.mjs';
import {ownedShipIds,SHIP_IDS} from '../../modules/ships/ship-access.mjs';

export const ZOOM_MIN=0,ZOOM_MAX=1;
export class CreatureViewer {
 regionBoxes=new Map<Region,T.Box3>();focused:Region|null=null;
 // #9: 'body' frames the whole creature (every region) plus a little headroom for raised arms and hops;
 // side 1 is the front view, -1 the back (kept for later part focus so Back stays Back).
  side=1;zoom=0;
  applyZoom(){if(!this.bodyBounds||this.bodyBounds.isEmpty())return;const bb=this.bodyBounds.clone();bb.max.y+=(bb.max.y-bb.min.y)*.08;const full=regionFrame(this.camera,bb,1.15,this.side);if(!full)return;let box:T.Box3|undefined;for(const b of[this.regionBoxes.get('head'),this.regionBoxes.get('eye')])if(b&&!b.isEmpty())box=box?box.union(b):b.clone();const h=box?regionFrame(this.camera,box,1.45,this.side):null,head=h??full,t=this.zoom,target=full.target.clone().lerp(head.target,t),distance=full.distance+(head.distance*.9-full.distance)*t,dir=this.camera.position.clone().sub(this.orbit.target);dir.length()<1e-6?dir.set(0,0,this.side):dir.normalize();this.orbit.minDistance=Math.min(.7,head.distance*.5);this.orbit.maxDistance=Math.max(14,full.distance*2);this.orbit.target.copy(target);this.camera.position.copy(target).addScaledVector(dir,distance);this.orbit.update();}
  setZoom(z:number){this.zoom=Math.min(ZOOM_MAX,Math.max(ZOOM_MIN,Number.isFinite(z)?z:1));this.applyZoom();return this.zoom;}
  focusRegion(region:Region){this.focused=region;if(region==='body'){const ok=!!this.bodyBounds&&!this.bodyBounds.isEmpty();if(ok){this.camera.position.copy(this.orbit.target).add(new T.Vector3(0,0,this.side));this.applyZoom();}return ok;}const box=this.regionBoxes.get(region);if(!box)return false;return frameRegion(this.camera,this.orbit,box,1.2,this.side);}
 homeElapsed=0;homeMoving=false;bodyBounds=new T.Box3();
 setHomeMotion(moving:boolean){this.homeMoving=moving;}
 homeView(){
  if(this.interactive||this.stage!=='pod')return;
  const head=this.regionBoxes.get('head');if(!head)return;
  const frame=podCameraFrame(this.camera,head,this.bodyBounds,this.homeElapsed);if(!frame)return;
  this.orbit.minDistance=.3;this.orbit.maxDistance=frame.maxDistance;this.orbit.target.copy(frame.target);this.camera.position.copy(frame.position);this.orbit.update();
 }
 cinematicKind:Cinematic|null=null;
 cinematic(kind:Cinematic|null,elapsed=0){
  if(!kind){if(!this.cinematicKind)return;this.cinematicKind=null;this.resetStageView();this.play('idle');return;}
  if(!Object.hasOwn(SHOTS,kind)||this.settings.reduced)return;
  if(this.cinematicKind!==kind){this.cinematicKind=kind;this.play(SHOTS[kind].gesture);}
  const [x,y,z,target]=sampleShot(kind,elapsed);this.camera.position.set(x,y,z);this.orbit.target.set(0,target,0);this.camera.fov=36;this.camera.updateProjectionMatrix();this.orbit.update();
 }
 scene=new T.Scene();camera=new T.PerspectiveCamera(36,1,.1,50);renderer:T.WebGLRenderer;orbit:OrbitControls;rig:CreatureRig|null=null;motion:MotionController|null=null;generation=0;disposed=false;frame=0;last=0;visible=true;settings=motionSettings(null);resizeObserver:ResizeObserver;visibilityObserver:IntersectionObserver;gesture:Gesture='idle';paused=false;tick:FrameRequestCallback=()=>{};stage:'pod'|'encounter'|'overlay'='pod';floorObjects:T.Object3D[]=[];previewSpaceDispose:(()=>void)|null=null;skinResolver?:InstalledSkinResolver;skinTextures=new Set<T.Texture>();maxFps:number|null=null;renders=0;
 phonePhysics=createCharacterPhysics({width:1,height:1,bodyWidth:1,bodyHeight:1,buffer:0,contain:true,ship:false});phoneMotionDispose:(()=>void)|null=null;phoneElapsed=0;phonePose='idle';phoneTransientHoldFrames=0;
 phoneFloorContact=0;phoneWallBlend=0;phoneWaveLookBlend=0;phoneWalkBlend=0;
 phoneShipEpoch=0;phoneShipLoadId:string|null=null;phoneShipUnavailableId:string|null=null;phoneShipBaseScale=1;phoneShipSelectedId:string|null=null;phoneShipTint='#ffffff';phoneShipBridge:{ownedShipIds():string[];getShipUrl(id:string):string;dispose?():void}|null=null;phoneShipRoot:T.Group|null=null;phoneShipModel:T.Object3D|null=null;phoneShipLoader=new GLTFLoader();phoneProjectionCorners=Array.from({length:8},()=>new T.Vector3());
 phoneCameraChange=()=>this.phoneScreenSize();
 phoneAccountChange=()=>{if(!this.interactive||!this.rig)return;this.resetPhonePhysics();this.disposePhoneShip();this.selectPhoneShip(this.rig.recipe);this.phoneScreenSize();};
 constructor(public mount:HTMLElement,public assetBase:string,public interactive=true,skinResolver?:InstalledSkinResolver){this.skinResolver=skinResolver;
  this.renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true,powerPreference:'low-power'});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;
  const environment=new RoomEnvironment(),pmrem=new T.PMREMGenerator(this.renderer);this.scene.environment=pmrem.fromScene(environment,.04).texture;environment.dispose();pmrem.dispose();
  this.renderer.domElement.setAttribute('aria-label','Your animated MYR5 creature');this.renderer.domElement.setAttribute('role','img');mount.append(this.renderer.domElement);
  this.camera.position.set(0,2.65,8.9);this.orbit=new OrbitControls(this.camera,this.renderer.domElement);this.orbit.target.set(0,1.95,0);this.orbit.enableDamping=true;this.orbit.enablePan=false;this.orbit.enableZoom=false;this.orbit.minDistance=6;this.orbit.maxDistance=13;this.orbit.enabled=interactive;this.orbit.maxPolarAngle=Math.PI*.85;this.orbit.addEventListener('change',this.phoneCameraChange);
  this.scene.add(new T.HemisphereLight(0xe5d5ff,0x23152e,interactive?1.65:2));
  const key=new T.DirectionalLight(0xffeedc,interactive?2.8:3);key.position.set(-3,5,5);this.scene.add(key);
  const rim=new T.DirectionalLight(0xb997ff,interactive?1.5:2);rim.position.set(3,4,-3);this.scene.add(rim);
  if(interactive){
   const space=createCoachPreviewSpace(T,{pixelRatio:this.renderer.getPixelRatio()});
   this.scene.add(space.group);this.scene.background=space.background;this.scene.fog=space.fog;
   this.scene.add(this.camera);
   this.previewSpaceDispose=()=>{if(this.scene.background===space.background)this.scene.background=null;if(this.scene.fog===space.fog)this.scene.fog=null;space.dispose();};
   this.camera.far=400;this.camera.updateProjectionMatrix();
   // Fill the side hidden from the key and add a restrained cool edge. Neither casts shadows.
   const fill=new T.DirectionalLight(0xffc78f,1.05);fill.position.set(4,2,4);this.scene.add(fill);
   const edge=new T.DirectionalLight(0x9ac9ec,.75);edge.position.set(-4,3,-4);this.scene.add(edge);
  }
  const floor=new T.Mesh(new T.CylinderGeometry(1.45,1.55,.08,64),new T.MeshStandardMaterial({color:0x241e31,roughness:.5,metalness:.4}));floor.position.y=-.05;this.scene.add(floor);
  const ring=new T.Mesh(new T.TorusGeometry(1.4,.014,6,64),new T.MeshBasicMaterial({color:0xd3b86d}));ring.rotation.x=Math.PI/2;ring.position.y=.005;this.scene.add(ring);
  this.floorObjects=[floor,ring];
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(mount);this.resize();
  this.visibilityObserver=new IntersectionObserver(entries=>{this.visible=entries[0].isIntersecting;});this.visibilityObserver.observe(mount);
  if(interactive){this.startPhoneMotion();window.addEventListener('myr5:account-ready',this.phoneAccountChange);window.addEventListener('myr5:account-cleared',this.phoneAccountChange);}
  // D43.5: coach-overlay can cap this below the native ~31fps (setMaxFps) while a counted set is
  // tracking slowly, so this WebGL render competes less with MediaPipe on the main thread. Ongoing
  // falls/climbs use the real frame gap; the brief flip and look-down beats advance per rendered frame
  // so a busy renderer still shows both poses before continuing the fall.
  const tick=(now:number)=>{if(this.disposed)return;this.frame=requestAnimationFrame(tick);const gate=this.maxFps?1000/this.maxFps:32,frameGap=Math.max(0,(now-this.last)/1000);if(now-this.last<gate)return;this.last=now;if(!this.visible||document.hidden)return;const motionDt=Math.min(this.maxFps?gate/1000:.05,frameGap);this.motion?.update(motionDt);this.updatePhonePhysics(Math.min(.5,frameGap));if(!this.interactive&&this.stage==='pod'&&!this.cinematicKind&&!this.paused&&!this.settings.reduced&&this.settings.amount>0&&this.homeMoving){this.homeElapsed+=motionDt;this.homeView();}this.orbit.update();this.renderer.render(this.scene,this.camera);this.renders++;};this.tick=tick;this.frame=requestAnimationFrame(this.tick);
 }
 // Layout size, not getBoundingClientRect(): a portal destination arrives scaled from the wormhole's core (2N), and a
 // resize read mid-arrival would keep a thumbnail-sized canvas once it lands (the meditation room's borrowed coach).
 resize(){const width=this.mount.clientWidth,height=this.mount.clientHeight;if(width&&height){this.renderer.setSize(width,height,false);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();if(!this.cinematicKind){if(this.stage==='overlay')this.fitBody();else if(this.focused&&this.interactive)this.focusRegion(this.focused);else this.homeView();}this.phoneScreenSize();}}
 private resetPhonePhysics(){if(!this.interactive)return;this.phonePhysics.reset();this.phoneElapsed=0;this.phonePose='idle';this.phoneTransientHoldFrames=0;this.phoneFloorContact=0;this.phoneWallBlend=0;this.phoneWaveLookBlend=0;this.phoneWalkBlend=0;this.renderer.domElement.dataset.phonePhase='idle';this.mount.dataset.phoneMotionPhase='idle';this.motion?.play(this.gesture);if(this.rig){this.rig.root.position.set(0,0,0);this.rig.root.quaternion.identity();this.rig.root.visible=true;}if(this.phoneShipRoot)this.phoneShipRoot.visible=false;this.renderer.domElement.dataset.phoneShipReady='false';}
 private selectPhoneShip(recipe:Design){
  const account=(globalThis as any).myr5AuthenticatedAccount,owner=typeof account==='string'?account:account?.user?.id;
  let saved:{ship?:string;tint?:string}|null=null;
  if(owner)try{saved=JSON.parse(localStorage.getItem(`myr5-ship-customization-v1/${owner}`)||'null');}catch{}
  const available=ownedShipIds(),valid=(id:unknown):id is string=>typeof id==='string'&&SHIP_IDS.includes(id)&&(id==='supportive'||available.includes(id));
  const id=valid(saved?.ship)?saved!.ship:valid(recipe.shipId)?recipe.shipId:valid(recipe.coach)?recipe.coach:null;
  const tint=id&&saved?.ship===id&&/^#[0-9a-f]{6}$/i.test(saved.tint||'')?saved.tint!:id&&recipe.shipId===id&&/^#[0-9a-f]{6}$/i.test(recipe.shipColor||'')?recipe.shipColor!:'#ffffff';
  this.phoneShipSelectedId=id;this.phoneShipTint=tint;
  const width=this.mount.clientWidth||1,height=this.mount.clientHeight||1;
  this.phonePhysics=createCharacterPhysics({width,height,bodyWidth:1,bodyHeight:1,buffer:0,contain:true,ship:false});
  this.renderer.domElement.dataset.phoneShip=id||'';this.renderer.domElement.dataset.phoneShipReady='false';
  return id;
 }
 private phonePhysicsAllowed(){return this.interactive&&this.stage==='pod'&&this.visible&&!document.hidden&&!this.paused&&!this.settings.reduced&&this.settings.amount>0;}
 private phoneScreenSize(){
  if(!this.rig)return;
  const width=this.mount.clientWidth,height=this.mount.clientHeight;if(!width||!height)return;
  this.camera.updateMatrixWorld(true);
  const min=this.bodyBounds.min,max=this.bodyBounds.max;let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
  for(let i=0;i<8;i++){const point=this.phoneProjectionCorners[i]!.set(i&1?max.x:min.x,i&2?max.y:min.y,i&4?max.z:min.z).project(this.camera);const x=(point.x*.5+.5)*width,y=(-point.y*.5+.5)*height;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  this.phonePhysics.resize(width,height,Math.max(1,right-left),Math.max(1,bottom-top));(this.phonePhysics as any).setRestCenter?.((left+right)/2,(top+bottom)/2);
 }
 private updatePhonePhysics(dt:number){
  if(!this.interactive||!this.rig||!this.motion)return;
  const active=this.phonePhysicsAllowed();
  this.renderer.domElement.dataset.phonePhase=active?(this.phonePhysics.state.phase||'idle'):'idle';this.mount.dataset.phoneMotionPhase=this.renderer.domElement.dataset.phonePhase;
  if(!active){
   if(this.phonePose!=='idle'||this.phonePhysics.state.phase!=='idle'){this.resetPhonePhysics();}
   this.rig.root.position.set(0,0,0);this.rig.root.quaternion.identity();return;
  }
  const transient=['air-run','look-down'].includes(this.phonePhysics.state.phase);
  const phaseDt=transient?Math.min(.05,dt):dt;
  const holdTransientFrame=transient&&this.phoneTransientHoldFrames>0;
  if(holdTransientFrame)this.phoneTransientHoldFrames--;else this.phonePhysics.step(phaseDt);
  this.phoneElapsed+=holdTransientFrame?0:phaseDt;
  const state=this.phonePhysics.state;
  this.renderer.domElement.dataset.phonePhase=state.phase;this.mount.dataset.phoneMotionPhase=state.phase;
  const contactTarget=['slide','climb','wave','climb-out','recover'].includes(state.phase)?1:0;if(state.phase==='recover')this.phoneFloorContact=1;else this.phoneFloorContact+=(contactTarget-this.phoneFloorContact)*Math.min(1,Math.min(.05,dt)*5);
  if(['climb','wave','climb-out','ship','gone'].includes(state.phase))void this.loadPhoneShip();
  const pose=String(state.pose);
  if(pose!==this.phonePose){
   this.phonePose=pose;const gesture:Gesture=['wiggle','air-run','bounce'].includes(pose)?'wiggle':['walk','slide','recover','climb','ship'].includes(pose)?'walk':['greet','wave'].includes(pose)?'greet':'idle';this.motion.play(gesture);this.motion.update(.05);if(state.phase==='slide')this.motion.action.setEffectiveTimeScale(.55);
  }
  const viewDirection=this.camera.getWorldDirection(new T.Vector3()),right=new T.Vector3(1,0,0).applyQuaternion(this.camera.quaternion),up=new T.Vector3(0,1,0).applyQuaternion(this.camera.quaternion);
  const pivot=this.bodyBounds.getCenter(new T.Vector3()),cameraPosition=this.camera.getWorldPosition(new T.Vector3()),depth=pivot.clone().sub(cameraPosition).dot(viewDirection),unitsPerPixel=2*depth*Math.tan(T.MathUtils.degToRad(this.camera.fov/2))/Math.max(1,this.mount.clientHeight);
  let actorX=state.x,actorY=state.y;
  if(state.phase==='ship'&&state.shipProgress<.36){const t=state.shipProgress/.36;actorX*=1-t;actorY*=1-t;}
  const offset=right.clone().multiplyScalar(actorX*unitsPerPixel).addScaledVector(up,-actorY*unitsPerPixel),rotation=new T.Quaternion().setFromAxisAngle(viewDirection.negate(),state.angle);
  const wallTarget=['climb','wave','climb-out'].includes(state.phase)?1:0,wallEase=1-Math.exp(-Math.min(.05,dt)*5);if(state.phase==='recover')this.phoneWallBlend=0;else this.phoneWallBlend+=(wallTarget-this.phoneWallBlend)*wallEase;
  const waveTarget=state.phase==='wave'?1:0;this.phoneWaveLookBlend+=(waveTarget-this.phoneWaveLookBlend)*wallEase;
  if(this.phoneWallBlend>.001){const platform=this.floorObjects[0]?.getWorldPosition(new T.Vector3())??new T.Vector3(0,-.05,0),towardWall=platform.sub(pivot).normalize(),wallFacing=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),towardWall),wallRoll=wallFacing.clone().multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),state.angle));rotation.slerp(wallRoll,this.phoneWallBlend);}
  const walkDistance=Math.abs(state.x),walkTarget=state.phase==='recover'?T.MathUtils.smoothstep(walkDistance,0,Math.max(32,this.bodyBounds.getSize(new T.Vector3()).x*.45)):0;this.phoneWalkBlend+=(walkTarget-this.phoneWalkBlend)*wallEase;
  if(this.phoneWalkBlend>.001){const walkDirection=right.clone().multiplyScalar(state.x>0?-1:1);walkDirection.y=0;if(walkDirection.lengthSq()>.001){walkDirection.normalize();const walkFacing=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.atan2(walkDirection.x,walkDirection.z));rotation.slerp(walkFacing,this.phoneWalkBlend);}}
  const pivotShift=pivot.clone().sub(pivot.clone().applyQuaternion(rotation));this.rig.root.position.copy(offset).add(pivotShift);this.rig.root.quaternion.copy(rotation);this.rig.root.updateMatrixWorld(true);
  if(this.phoneFloorContact>.001){let lowest=Infinity;for(let i=0;i<8;i++){const point=this.phoneProjectionCorners[i]!.set(i&1?this.bodyBounds.max.x:this.bodyBounds.min.x,i&2?this.bodyBounds.max.y:this.bodyBounds.min.y,i&4?this.bodyBounds.max.z:this.bodyBounds.min.z).applyMatrix4(this.rig.root.matrixWorld);lowest=Math.min(lowest,point.y);}const floor=this.floorObjects[0] as T.Mesh|undefined,floorY=floor?floor.position.y+.04:-.01;this.rig.root.position.y+=(floorY-lowest)*this.phoneFloorContact;this.rig.root.updateMatrixWorld(true);}
  this.rig.root.visible=state.phase!=='gone'&&!(state.phase==='ship'&&state.shipProgress>=.36);
  this.updatePhoneShip(state.phase,state.shipProgress,state,pivot,right,up,unitsPerPixel);
  if(pose==='climb'){
   // Turn toward the floor-wall. Braced forelimbs and alternating pulls keep the quadruped climbing.
   const phase=this.phoneElapsed*8,armL=this.rig.nodes.ArmLeft,armR=this.rig.nodes.ArmRight,footL=this.rig.nodes.FootLeft,footR=this.rig.nodes.FootRight;
   this.rig.nodes.BodyMotion?.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(-.2,0,.035*Math.sin(phase))));
   if(this.rig.nodes.BodyMotion)this.rig.nodes.BodyMotion.position.y-=.055;
   this.rig.nodes.HeadMotion?.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(.09,0,0)));
   armL?.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(-.52-.12*Math.sin(phase),0,-.18)));
   armR?.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(-.52+.12*Math.sin(phase),0,.18)));
   footL?.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(.22,0,-.1)));
   footR?.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(.22,0,.1)));
  }else if(pose==='look-down'){
   this.rig.nodes.HeadMotion?.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(.38,0,0)));
   for(const node of Object.keys(this.rig.nodes).filter(name=>name.startsWith('EyeBlink')))this.rig.nodes[node]!.scale.y=.06;
  }else if(pose==='fall'){
   const roll=.14*Math.sin(this.phoneElapsed*5);this.rig.nodes.BodyMotion?.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(.12,0,roll)));
   this.rig.nodes.ArmLeft?.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(-.22,0,-.62)));
   this.rig.nodes.ArmRight?.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(-.22,0,.62)));
   this.rig.nodes.FootLeft?.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(.4,0,-.18)));
   this.rig.nodes.FootRight?.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(-.28,0,.18)));
  }
  if(this.phoneWaveLookBlend>.001){const head=this.rig.nodes.HeadMotion;if(head?.parent){this.rig.root.updateMatrixWorld(true);const parentWorld=head.parent.getWorldQuaternion(new T.Quaternion()).invert(),towardCamera=this.camera.getWorldPosition(new T.Vector3()).sub(head.getWorldPosition(new T.Vector3())).normalize().applyQuaternion(parentWorld),lookAtCamera=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),towardCamera);head.quaternion.slerp(lookAtCamera,this.phoneWaveLookBlend);}}
 }
 private startPhoneMotion(){if(!this.interactive||this.phoneMotionDispose)return;this.phoneMotionDispose=subscribePhoneMotion(sample=>{if(!this.phonePhysicsAllowed())return;const before=this.phonePhysics.state.phase;this.phonePhysics.sample(sample,sample.timeSeconds);const after=this.phonePhysics.state.phase;if(['air-run','look-down'].includes(after)&&!['air-run','look-down'].includes(before))this.phoneTransientHoldFrames=1;});}
 private disposePhoneShip(){++this.phoneShipEpoch;this.phoneShipLoadId=null;this.phoneShipUnavailableId=null;this.phonePhysics.setShipAvailable(false);if(this.phoneShipRoot){this.scene.remove(this.phoneShipRoot);this.disposeShipTree(this.phoneShipRoot);}this.phoneShipRoot=null;this.phoneShipModel=null;this.phoneShipBridge?.dispose?.();this.phoneShipBridge=null;this.renderer.domElement.dataset.phoneShipReady='false';}
 private disposeShipTree(root:T.Object3D){const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>();root.traverse(node=>{const mesh=node as T.Mesh;if(mesh.geometry)geometries.add(mesh.geometry);for(const material of(Array.isArray(mesh.material)?mesh.material:[mesh.material]))if(material){materials.add(material);for(const value of Object.values(material))if((value as T.Texture)?.isTexture)textures.add(value as T.Texture);}});textures.forEach(texture=>texture.dispose());materials.forEach(material=>material.dispose());geometries.forEach(geometry=>geometry.dispose());}
 private async loadPhoneShip(){
  const ship=this.phoneShipSelectedId;if(!ship||this.phoneShipLoadId===ship||this.phoneShipUnavailableId===ship||this.phoneShipModel)return;
  if(ship!=='supportive'&&!ownedShipIds().includes(ship))return;
  const epoch=++this.phoneShipEpoch;this.phoneShipLoadId=ship;
  let bridge:{ownedShipIds():string[];getShipUrl(id:string):string;dispose?():void}|null=null;
  try{
   bridge=ship==='supportive'?null:await localVerifiedBridge();
   if(this.disposed||epoch!==this.phoneShipEpoch){bridge?.dispose?.();return;}
   if(ship!=='supportive'&&(!bridge||!bridge.ownedShipIds().includes(ship))){bridge?.dispose?.();this.phoneShipLoadId=null;this.phoneShipUnavailableId=ship;return;}
   const url=bridge?bridge.getShipUrl(ship):new URL('/pod/worlds/starter/supportive.glb',location.href).href;
   const gltf=await this.phoneShipLoader.loadAsync(url);
   if(this.disposed||epoch!==this.phoneShipEpoch){this.disposeShipTree(gltf.scene);bridge?.dispose?.();return;}
   if(ship!=='supportive'&&!ownedShipIds().includes(ship)){this.disposeShipTree(gltf.scene);bridge?.dispose?.();this.phoneShipLoadId=null;this.phoneShipUnavailableId=ship;this.phonePhysics.setShipAvailable(false);return;}
   const box=new T.Box3().setFromObject(gltf.scene),size=box.getSize(new T.Vector3()),max=Math.max(size.x,size.y,size.z)||1;
   gltf.scene.position.sub(box.getCenter(new T.Vector3()));
   const root=new T.Group();root.name='verified-phone-coach-ship';root.add(gltf.scene);root.rotation.y=SHIP_FACING;
   const body=this.bodyBounds.getSize(new T.Vector3());this.phoneShipBaseScale=Math.max(.7,body.y*1.5)/max;root.scale.setScalar(this.phoneShipBaseScale);
   if(this.phoneShipTint!=='#ffffff')applyShipTint(root,this.phoneShipTint);
   this.phoneShipBridge=bridge;this.phoneShipModel=gltf.scene;this.phoneShipRoot=root;this.scene.add(root);this.phonePhysics.setShipAvailable(true);
  }catch{if(epoch!==this.phoneShipEpoch){bridge?.dispose?.();return;}this.phoneShipLoadId=null;this.phoneShipUnavailableId=ship;bridge?.dispose?.();this.phoneShipBridge?.dispose?.();this.phoneShipBridge=null;}
 }
 private updatePhoneShip(phase:string,progress:number,state:{x:number;y:number;angle:number},pivot:T.Vector3,right:T.Vector3,up:T.Vector3,unitsPerPixel:number){
  const selected=this.phoneShipSelectedId;if(selected&&selected!=='supportive'&&!ownedShipIds().includes(selected)){if(this.phoneShipRoot)this.disposePhoneShip();return;}
  const root=this.phoneShipRoot,id=selected;this.renderer.domElement.dataset.phoneShip=id||'';const visible=phase==='ship';this.renderer.domElement.dataset.phoneShipReady=String(!!root&&visible);if(!root)return;root.visible=visible;if(!visible)return;
  const start=this.bodyBounds.getCenter(new T.Vector3()).applyMatrix4(this.rig!.root.matrixWorld),finish=pivot.clone();
  const p=T.MathUtils.clamp(Number.isFinite(progress)?progress:0,0,1),approach=T.MathUtils.clamp(p/.36,0,1),outbound=T.MathUtils.clamp((p-.36)/.64,0,1);
  const gravityX=Math.sin(state.angle),gravityY=Math.cos(state.angle),width=this.mount.clientWidth,height=this.mount.clientHeight;
  const departure=finish.clone().addScaledVector(right,-gravityX*(width*.65)*unitsPerPixel).addScaledVector(up,gravityY*(height*.65)*unitsPerPixel);
  if(p<.36)root.position.copy(start).lerp(finish,approach);else root.position.copy(finish).lerp(departure,outbound);
  const scale=Math.max(.12,1-outbound*.78);root.scale.setScalar(this.phoneShipBaseScale*scale);
  root.rotation.y=SHIP_FACING+Math.sin(outbound*Math.PI)*.28;
 }
 async setRecipe(raw:unknown,preview=false){
  this.resetPhonePhysics();
  this.disposePhoneShip();
  const recipe=importCreature(JSON.stringify(raw)),generation=++this.generation;
  const assembly=await assembleCreature(recipe,this.assetBase,this.skinResolver,preview);let rig:CreatureRig|undefined;
  try{if(this.disposed||generation!==this.generation){assembly.skinTextures.forEach(texture=>texture.dispose());return false;}this.regionBoxes=new Map(REGIONS.map(region=>[region,regionBounds(assembly.root,region)]));if(this.regionBoxes.get('eye')!.isEmpty())this.regionBoxes.set('eye',this.regionBoxes.get('head')!.clone());this.bodyBounds.makeEmpty();for(const box of this.regionBoxes.values())this.bodyBounds.union(box);rig=createRig(assembly.root,recipe);}catch(error){assembly.skinTextures.forEach(texture=>texture.dispose());throw error;}finally{assembly.dispose();}
  if(this.disposed||generation!==this.generation){assembly.skinTextures.forEach(texture=>texture.dispose());return false;}
  if(this.rig){this.motion?.dispose();this.scene.remove(this.rig.root);disposeObject(this.rig.root);}
  this.skinTextures.forEach(texture=>texture.dispose());this.skinTextures=assembly.skinTextures;
  this.rig=rig!;this.motion=new MotionController(rig!);Object.assign(this.motion,this.settings,{paused:this.paused});this.scene.add(rig!.root);this.motion.play(this.gesture);this.selectPhoneShip(recipe);this.phoneScreenSize();if(!this.cinematicKind){if(this.stage==='overlay')this.fitBody();else if(this.interactive&&this.focused)this.focusRegion(this.focused);else this.homeView();}return true;
 }
 setSkinResolver(resolver?:InstalledSkinResolver){this.skinResolver=resolver;}
 clearSkinState(){this.generation++;this.resetPhonePhysics();if(this.rig){this.motion?.dispose();this.scene.remove(this.rig.root);disposeObject(this.rig.root);this.rig=null;this.motion=null;}this.skinTextures.forEach(texture=>texture.dispose());this.skinTextures.clear();this.regionBoxes.clear();this.bodyBounds.makeEmpty();}
 play(id:Gesture){this.gesture=id;this.motion?.play(id);}
 // Workout overlay: turn to face where the coach walks (0 = the camera, π/2 = screen right).
 face(yaw:number){if(this.rig)this.rig.root.rotation.y=yaw;}
 setSettings(settings:ReturnType<typeof motionSettings>){this.settings=settings;if(this.motion)Object.assign(this.motion,settings);if(settings.reduced||settings.amount===0){this.resetPhonePhysics();this.homeElapsed=0;if(!this.cinematicKind)this.homeView();}}
 setPaused(paused:boolean){this.paused=paused;if(this.motion)this.motion.paused=paused;if(paused)this.resetPhonePhysics();}
 // D43.5: null/0 restores the native ~31fps gate (see tick()).
 setMaxFps(fps:number|null){this.maxFps=fps&&fps>0?fps:null;}
 // W2-2Q: asleep, no frame is scheduled at all (the ship view puts the parked app capsule to sleep once it closes).
 setAwake(awake:boolean){if(this.disposed||awake===!!this.frame)return;if(awake)this.frame=requestAnimationFrame(this.tick);else{cancelAnimationFrame(this.frame);this.frame=0;}}
 resetStageView(){if(this.stage==='overlay'){this.fitBody();return;}const giant=this.stage==='encounter';this.orbit.minDistance=giant?4:6;this.orbit.maxDistance=14;this.camera.fov=giant?32:36;this.camera.position.set(0,giant?2.1:2.65,giant?5.8:8.9);this.orbit.target.set(0,giant?2.25:1.95,0);this.camera.updateProjectionMatrix();this.orbit.update();this.homeView();}
 // Workout overlay: the whole body fills the canvas with the feet on its bottom edge (the user's knee line).
 fitBody(){const box=this.bodyBounds;if(box.isEmpty())return;const size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),half=T.MathUtils.degToRad(this.camera.fov/2),distance=Math.max(size.y/2/Math.tan(half),size.x/2/(Math.tan(half)*this.camera.aspect))+size.z/2;this.orbit.minDistance=.1;this.orbit.maxDistance=distance*2;this.orbit.target.copy(center);this.camera.position.set(center.x,center.y,center.z+distance);this.orbit.update();}
 setStage(stage:'pod'|'encounter'|'overlay'){if(stage!=='pod')this.resetPhonePhysics();this.stage=stage;this.focused=null;this.homeElapsed=0;this.floorObjects.forEach(o=>o.visible=stage==='pod');if(!this.cinematicKind)this.resetStageView();this.resize();if(stage==='overlay')this.warm();}
 // The workout coach waits offstage (display:none, so tick() skips it) until the first rep counts. Its first real frame
 // compiled every shader and uploaded every texture and buffer right then, a 1.3-3.4 s main-thread stall in the middle
 // of the set that cost the next rep (tests/camera-counting). Draw one hidden frame as soon as it is staged and loaded
 // (phone.ts re-stages it after every load), while the set is still starting, so the walk-in only draws.
 warm(){if(!this.rig||this.disposed)return;this.renderer.compile(this.scene,this.camera);this.renderer.render(this.scene,this.camera);}
 resetView(side=1){this.side=side;return this.focusRegion('body');}
 async exportGLB(){
  if(!this.rig||!this.motion)throw Error('Wait for your creature to load.');
  // Export a clean neutral clone and the same reusable clips used in the app.
  const clone=cloneSkinned(this.rig.root);if(this.interactive){clone.position.set(0,0,0);clone.quaternion.identity();}for(const [name,rest] of Object.entries(this.rig.rest)){const node=clone.getObjectByName(name)!;node.position.copy(rest.position);node.quaternion.copy(rest.quaternion);node.scale.copy(rest.scale);}clone.updateMatrixWorld(true);
  const result=await new GLTFExporter().parseAsync(clone,{binary:true,animations:this.motion.clips});return new Blob([result as ArrayBuffer],{type:'model/gltf-binary'});
 }
 // renders is a cumulative count of actual renderer.render() calls (D43.5's setMaxFps skips both the render
 // and this increment) — tests diff two readings over a real wall-clock window to get an actual renders/s.
 stats(){return {awake:!!this.frame,gesture:this.motion?.current,phonePhase:this.phonePhysics.state.phase,phoneMotionPhase:this.phonePhysics.state.phase,phoneShip:this.renderer.domElement.dataset.phoneShip,phoneShipReady:this.renderer.domElement.dataset.phoneShipReady==='true',drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,visible:this.visible,paused:this.paused,renders:this.renders,maxFps:this.maxFps,programs:this.renderer.info.programs?.length??0,contextLost:this.renderer.getContext().isContextLost(),canvas:{width:this.renderer.domElement.width,height:this.renderer.domElement.height},rigVersion:1,recipe:this.rig?.recipe};}
 dispose(){if(this.disposed)return;this.disposed=true;this.generation++;this.phoneMotionDispose?.();this.phoneMotionDispose=null;window.removeEventListener('myr5:account-ready',this.phoneAccountChange);window.removeEventListener('myr5:account-cleared',this.phoneAccountChange);this.disposePhoneShip();cancelAnimationFrame(this.frame);this.resizeObserver.disconnect();this.visibilityObserver.disconnect();this.orbit.removeEventListener('change',this.phoneCameraChange);this.orbit.dispose();this.motion?.dispose();this.skinTextures.forEach(texture=>texture.dispose());this.skinTextures.clear();this.previewSpaceDispose?.();this.previewSpaceDispose=null;disposeObject(this.scene);if(this.scene.background instanceof T.Texture)this.scene.background.dispose();this.scene.environment?.dispose();this.renderer.dispose();this.renderer.domElement.remove();delete this.mount.dataset.phoneMotionPhase;}
}

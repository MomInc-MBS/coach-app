import * as T from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {GLTFExporter} from 'three/examples/jsm/exporters/GLTFExporter.js';
import {assembleCreature,type InstalledSkinResolver} from './creator/assemble';
import {createRig,disposeObject,type CreatureRig} from './rig';
import {MotionController,type Gesture} from './motion';
import {importCreature,motionSettings} from './profile';
import {sampleShot,SHOTS,type Cinematic} from './cinematic-shots';
import {regionBounds,frameRegion} from './creator/camera-focus';
import {REGIONS,type Region} from './creator/design';
import {podCameraFrame} from './pod-camera';

export class CreatureViewer {
 regionBoxes=new Map<Region,T.Box3>();focused:Region|null=null;
 // #9: 'body' frames the whole creature (every region) plus a little headroom for raised arms and hops;
 // side 1 is the front view, -1 the back (kept for later part focus so Back stays Back).
 side=1;
 focusRegion(region:Region){this.focused=region;const box=region==='body'?this.bodyBounds.clone():this.regionBoxes.get(region);if(region==='body'&&box&&!box.isEmpty())box.max.y+=(box.max.y-box.min.y)*.08;return box?frameRegion(this.camera,this.orbit,box,1.2,this.side):false;}
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
 scene=new T.Scene();camera=new T.PerspectiveCamera(36,1,.1,50);renderer:T.WebGLRenderer;orbit:OrbitControls;rig:CreatureRig|null=null;motion:MotionController|null=null;generation=0;disposed=false;frame=0;last=0;visible=true;settings=motionSettings(null);resizeObserver:ResizeObserver;visibilityObserver:IntersectionObserver;gesture:Gesture='idle';paused=false;stage:'pod'|'encounter'|'overlay'='pod';floorObjects:T.Object3D[]=[];skinResolver?:InstalledSkinResolver;skinTextures=new Set<T.Texture>();
 constructor(public mount:HTMLElement,public assetBase:string,public interactive=true,skinResolver?:InstalledSkinResolver){this.skinResolver=skinResolver;
  this.renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true,powerPreference:'low-power'});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;
  const environment=new RoomEnvironment(),pmrem=new T.PMREMGenerator(this.renderer);this.scene.environment=pmrem.fromScene(environment,.04).texture;environment.dispose();pmrem.dispose();
  this.renderer.domElement.setAttribute('aria-label','Your animated MYR5 creature');this.renderer.domElement.setAttribute('role','img');mount.append(this.renderer.domElement);
  this.camera.position.set(0,2.65,8.9);this.orbit=new OrbitControls(this.camera,this.renderer.domElement);this.orbit.target.set(0,1.95,0);this.orbit.enableDamping=true;this.orbit.enablePan=false;this.orbit.minDistance=6;this.orbit.maxDistance=13;this.orbit.enabled=interactive;this.orbit.maxPolarAngle=Math.PI*.85;
  this.scene.add(new T.HemisphereLight(0xe5d5ff,0x23152e,2));const key=new T.DirectionalLight(0xffeedc,3);key.position.set(-3,5,5);this.scene.add(key);const rim=new T.DirectionalLight(0xb997ff,2);rim.position.set(3,4,-3);this.scene.add(rim);
  const floor=new T.Mesh(new T.CylinderGeometry(1.45,1.55,.08,64),new T.MeshStandardMaterial({color:0x241e31,roughness:.5,metalness:.4}));floor.position.y=-.05;this.scene.add(floor);
  const ring=new T.Mesh(new T.TorusGeometry(1.4,.014,6,64),new T.MeshBasicMaterial({color:0xd3b86d}));ring.rotation.x=Math.PI/2;ring.position.y=.005;this.scene.add(ring);
  this.floorObjects=[floor,ring];
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(mount);this.resize();
  this.visibilityObserver=new IntersectionObserver(entries=>{this.visible=entries[0].isIntersecting;});this.visibilityObserver.observe(mount);
  const tick=(now:number)=>{if(this.disposed)return;this.frame=requestAnimationFrame(tick);const dt=Math.min(.05,(now-this.last)/1000);if(now-this.last<32)return;this.last=now;if(!this.visible||document.hidden)return;this.motion?.update(dt);if(!this.interactive&&this.stage==='pod'&&!this.cinematicKind&&!this.paused&&!this.settings.reduced&&this.settings.amount>0&&this.homeMoving){this.homeElapsed+=dt;this.homeView();}this.orbit.update();this.renderer.render(this.scene,this.camera);};this.frame=requestAnimationFrame(tick);
 }
 resize(){const {width,height}=this.mount.getBoundingClientRect();if(width&&height){this.renderer.setSize(width,height,false);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();if(!this.cinematicKind){if(this.stage==='overlay')this.fitBody();else if(this.focused&&this.interactive)this.focusRegion(this.focused);else this.homeView();}}}
 async setRecipe(raw:unknown,preview=false){
  const recipe=importCreature(JSON.stringify(raw)),generation=++this.generation;
  const assembly=await assembleCreature(recipe,this.assetBase,this.skinResolver,preview);let rig:CreatureRig|undefined;
  try{if(this.disposed||generation!==this.generation){assembly.skinTextures.forEach(texture=>texture.dispose());return false;}this.regionBoxes=new Map(REGIONS.map(region=>[region,regionBounds(assembly.root,region)]));if(this.regionBoxes.get('eye')!.isEmpty())this.regionBoxes.set('eye',this.regionBoxes.get('head')!.clone());this.bodyBounds.makeEmpty();for(const box of this.regionBoxes.values())this.bodyBounds.union(box);rig=createRig(assembly.root,recipe);}catch(error){assembly.skinTextures.forEach(texture=>texture.dispose());throw error;}finally{assembly.dispose();}
  if(this.disposed||generation!==this.generation){assembly.skinTextures.forEach(texture=>texture.dispose());return false;}
  if(this.rig){this.motion?.dispose();this.scene.remove(this.rig.root);disposeObject(this.rig.root);}
  this.skinTextures.forEach(texture=>texture.dispose());this.skinTextures=assembly.skinTextures;
  this.rig=rig!;this.motion=new MotionController(rig!);Object.assign(this.motion,this.settings,{paused:this.paused});this.scene.add(rig!.root);this.motion.play(this.gesture);if(!this.cinematicKind){if(this.stage==='overlay')this.fitBody();else if(this.interactive&&this.focused)this.focusRegion(this.focused);else this.homeView();}return true;
 }
 setSkinResolver(resolver?:InstalledSkinResolver){this.skinResolver=resolver;}
 clearSkinState(){this.generation++;if(this.rig){this.motion?.dispose();this.scene.remove(this.rig.root);disposeObject(this.rig.root);this.rig=null;this.motion=null;}this.skinTextures.forEach(texture=>texture.dispose());this.skinTextures.clear();this.regionBoxes.clear();this.bodyBounds.makeEmpty();}
 play(id:Gesture){this.gesture=id;this.motion?.play(id);}
 // Workout overlay: turn to face where the coach walks (0 = the camera, π/2 = screen right).
 face(yaw:number){if(this.rig)this.rig.root.rotation.y=yaw;}
 setSettings(settings:ReturnType<typeof motionSettings>){this.settings=settings;if(this.motion)Object.assign(this.motion,settings);if(settings.reduced||settings.amount===0){this.homeElapsed=0;if(!this.cinematicKind)this.homeView();}}
 setPaused(paused:boolean){this.paused=paused;if(this.motion)this.motion.paused=paused;}
 resetStageView(){if(this.stage==='overlay'){this.fitBody();return;}const giant=this.stage==='encounter';this.orbit.minDistance=giant?4:6;this.orbit.maxDistance=14;this.camera.fov=giant?32:36;this.camera.position.set(0,giant?2.1:2.65,giant?5.8:8.9);this.orbit.target.set(0,giant?2.25:1.95,0);this.camera.updateProjectionMatrix();this.orbit.update();this.homeView();}
 // Workout overlay: the whole body fills the canvas with the feet on its bottom edge (the user's knee line).
 fitBody(){const box=this.bodyBounds;if(box.isEmpty())return;const size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),half=T.MathUtils.degToRad(this.camera.fov/2),distance=Math.max(size.y/2/Math.tan(half),size.x/2/(Math.tan(half)*this.camera.aspect))+size.z/2;this.orbit.minDistance=.1;this.orbit.maxDistance=distance*2;this.orbit.target.copy(center);this.camera.position.set(center.x,center.y,center.z+distance);this.orbit.update();}
 setStage(stage:'pod'|'encounter'|'overlay'){this.stage=stage;this.focused=null;this.homeElapsed=0;this.floorObjects.forEach(o=>o.visible=stage==='pod');if(!this.cinematicKind)this.resetStageView();this.resize();}
 resetView(side=1){this.side=side;return this.focusRegion('body');}
 async exportGLB(){
  if(!this.rig||!this.motion)throw Error('Wait for your creature to load.');
  // Export a clean neutral clone and the same reusable clips used in the app.
  const clone=this.rig.root.clone(true);for(const [name,rest] of Object.entries(this.rig.rest)){const node=clone.getObjectByName(name)!;node.position.copy(rest.position);node.quaternion.copy(rest.quaternion);node.scale.copy(rest.scale);}clone.updateMatrixWorld(true);
  const result=await new GLTFExporter().parseAsync(clone,{binary:true,animations:this.motion.clips});return new Blob([result as ArrayBuffer],{type:'model/gltf-binary'});
 }
 stats(){return {gesture:this.motion?.current,drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,visible:this.visible,paused:this.paused,contextLost:this.renderer.getContext().isContextLost(),canvas:{width:this.renderer.domElement.width,height:this.renderer.domElement.height},rigVersion:1,recipe:this.rig?.recipe};}
 dispose(){this.disposed=true;this.generation++;cancelAnimationFrame(this.frame);this.resizeObserver.disconnect();this.visibilityObserver.disconnect();this.orbit.dispose();this.motion?.dispose();this.skinTextures.forEach(texture=>texture.dispose());this.skinTextures.clear();disposeObject(this.scene);this.scene.environment?.dispose();this.renderer.dispose();this.renderer.domElement.remove();}
}

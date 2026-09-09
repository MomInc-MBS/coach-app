// Three.js is imported only on opening a model. AGPL-3.0-or-later app wrapper.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {demoPose,DEMO_BONES} from './demo-poses.mjs';
export async function createHologram(host,name){
  let renderer,controls,frame=0,observer,mixer,model,animateDemo=null,demoTime=0,disposed=false,playing=true;
  const scene=new THREE.Scene(),pivot=new THREE.Group();scene.add(pivot);
  function disposeObject(object){object.traverse(node=>{node.geometry?.dispose();if(node.material)for(const mat of [node.material].flat()){for(const value of Object.values(mat))if(value?.isTexture)value.dispose();mat.dispose();}});}
  function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);observer?.disconnect();controls?.dispose();mixer?.stopAllAction();if(model)mixer?.uncacheRoot(model);disposeObject(scene);renderer?.dispose();renderer?.forceContextLoss();renderer?.domElement.remove();}
  try{
    renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.setClearColor(0x000000,0);host.append(renderer.domElement);
    const camera=new THREE.PerspectiveCamera(38,1,.01,100);controls=new OrbitControls(camera,renderer.domElement);controls.enablePan=false;controls.enableDamping=true;controls.minDistance=1.5;controls.maxDistance=7;controls.minPolarAngle=.15;controls.maxPolarAngle=Math.PI-.15;
    if(['squat','pushup'].includes(name)){
    const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),20000);let bytes;
    try{const response=await fetch('/models/'+name+'.glb',{signal:abort.signal});if(!response.ok)throw new Error('Model file unavailable.');bytes=await response.arrayBuffer();}finally{clearTimeout(timer);}
    const gltf=await new GLTFLoader().parseAsync(bytes,'');model=gltf.scene;
    // Fit using the first animation pose, not the rig's rest pose.
    mixer=new THREE.AnimationMixer(model);gltf.animations.forEach(clip=>mixer.clipAction(clip).play());mixer.update(0);model.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),scale=2/Math.max(size.x,size.y,size.z);
    const offset=new THREE.Group();offset.position.copy(center).multiplyScalar(-1);offset.add(model);const normalized=new THREE.Group();normalized.scale.setScalar(scale);normalized.add(offset);pivot.add(normalized);
    model.traverse(node=>{if(node.isMesh){const old=[node.material].flat();node.material=new THREE.MeshBasicMaterial({color:0x9afae4,wireframe:true,transparent:true,opacity:.72});for(const mat of old){for(const value of Object.values(mat))if(value?.isTexture)value.dispose();mat.dispose();}node.frustumCulled=false;}});
    }else{
      model=new THREE.Group();pivot.add(model);
      const material=new THREE.MeshBasicMaterial({color:0x9afae4,wireframe:true,transparent:true,opacity:.8});
      const joints=Object.fromEntries(Object.keys(demoPose(name)).map(key=>{const joint=new THREE.Mesh(new THREE.SphereGeometry(key==='head'?.13:.047,12,8),material);model.add(joint);return [key,joint];}));
      const bones=DEMO_BONES.map(()=>{const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,1,8,4),material);model.add(mesh);return mesh;});
      const up=new THREE.Vector3(0,1,0),a=new THREE.Vector3(),b=new THREE.Vector3(),direction=new THREE.Vector3();
      animateDemo=t=>{const points=demoPose(name,t);for(const [key,joint] of Object.entries(joints))joint.position.fromArray(points[key]);DEMO_BONES.forEach(([from,to],i)=>{a.fromArray(points[from]);b.fromArray(points[to]);const mesh=bones[i];direction.subVectors(b,a);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.y=direction.length();mesh.quaternion.setFromUnitVectors(up,direction.normalize());});};animateDemo(0);
    }
    const ring=new THREE.Mesh(new THREE.RingGeometry(1.02,1.035,64),new THREE.MeshBasicMaterial({color:0x8cf6e0,transparent:true,opacity:.35,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=-1.05;scene.add(ring);
    function reset(){pivot.rotation.set(0,['boxing','jogging'].includes(name)?-.45:0,0);camera.position.set(0,.15,4.2);controls.target.set(0,0,0);controls.update();}
    function resize(){const r=host.getBoundingClientRect();renderer.setSize(Math.max(r.width,1),Math.max(r.height,1),false);camera.aspect=r.width/Math.max(r.height,1);camera.updateProjectionMatrix();}
    observer=new ResizeObserver(resize);observer.observe(host);reset();resize();let last=performance.now();
    function draw(now){if(disposed)return;const dt=Math.min((now-last)/1000,.06);last=now;if(playing){mixer?.update(dt);demoTime+=dt;animateDemo?.(demoTime);}controls.update();renderer.render(scene,camera);frame=requestAnimationFrame(draw);}frame=requestAnimationFrame(draw);
    return {dispose,reset,toggle:()=>playing=!playing,zoom:factor=>{camera.position.sub(controls.target).multiplyScalar(factor).clampLength(controls.minDistance,controls.maxDistance).add(controls.target);controls.update();},rotate:(x,y)=>{pivot.rotation.y+=x;pivot.rotation.x=THREE.MathUtils.clamp(pivot.rotation.x+y,-1.2,1.2);}};
  }catch(error){dispose();throw error;}
}

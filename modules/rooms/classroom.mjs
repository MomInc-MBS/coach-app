// Optional scoreboard classroom. Mounted only while the scoreboard dialog is open.
const CLASS={fov:40,eye:[0,.5,1.6],look:[0,.5,0],desks:{at:[0,0,.14],scale:.86},board:{min:[-.29,.52,-.42],max:[.29,.83,-.42]},heads:[[-.235,.5,.28],[.235,.5,.28]]};
let stylesheet;
function loadStyle(){return stylesheet??=new Promise(resolve=>{const link=document.createElement('link');link.rel='stylesheet';link.href='/modules/rooms/classroom.css';link.onload=link.onerror=resolve;document.head.append(link);});}
export function mountClassroom(panel,{host=panel.querySelector('[data-room-host]')}={}){
 if(!host){host=document.createElement('div');host.dataset.roomHost='';panel.querySelector('header')?.after(host);}
 host.classList.add('classroom-host');host.innerHTML='<div class="classroom-stage room-stage"><div class="classroom-fallback" data-peer-depth="far" aria-hidden="true"></div><div class="classroom-desks" data-peer-depth="mid"></div><div class="classroom-ui" data-peer-depth="near"><button type="button" class="classroom-board" data-room-board aria-label="Open the scoreboard whiteboard"><span>Tap the board</span></button></div><p class="classroom-note" role="status">Entering classroom…</p></div>';
 panel.dataset.room='loading';delete panel.dataset.roomView;
 const stage=host.querySelector('.classroom-stage'),desksLayer=host.querySelector('.classroom-desks'),boardButton=host.querySelector('.classroom-board'),note=host.querySelector('.classroom-note');
 let disposed=false,renderer=null,scene=null,camera=null,resizeObserver=null,raf=0,slots=[],three=null;
 function showBoard(){if(disposed||panel.dataset.roomView==='board')return;panel.dispatchEvent(new CustomEvent('myr5:classroom-board',{bubbles:true}));panel.dataset.roomView='board';panel.scrollTop=0;(panel.querySelector('#accountContent:not([hidden]) h3, #signIn')||panel).focus?.({preventScroll:true});}
 function setDesks(nodes){if(disposed)return;desksLayer.replaceChildren();slots=[];for(const node of nodes.slice(0,2)){const slot=document.createElement('div');slot.className='classroom-desk';slot.append(node);desksLayer.append(slot);slots.push(slot);}place();}
 function place(){if(!camera||!stage.isConnected)return;const rect=stage.getBoundingClientRect();if(!rect.width||!rect.height)return;const project=(x,y,z)=>{const p=new three.Vector3(x,y,z).project(camera);return [(p.x+1)*rect.width/2,(1-p.y)*rect.height/2];};const [x0,y0]=project(CLASS.board.min[0],CLASS.board.max[1],CLASS.board.min[2]),[x1,y1]=project(CLASS.board.max[0],CLASS.board.min[1],CLASS.board.max[2]);Object.assign(boardButton.style,{left:x0+'px',top:y0+'px',width:Math.max(44,x1-x0)+'px',height:Math.max(44,y1-y0)+'px'});slots.forEach((slot,i)=>{const [x,y]=project(...CLASS.heads[i]);slot.style.left=x+'px';slot.style.top=y+'px';});}
 function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);resizeObserver?.disconnect();if(scene){scene.traverse(node=>{node.geometry?.dispose();for(const material of [].concat(node.material||[])){if(!material)continue;for(const value of Object.values(material))if(value?.isTexture)value.dispose();material.dispose();}});}renderer?.dispose();renderer?.forceContextLoss();host.replaceChildren();delete panel.dataset.room;delete panel.dataset.roomView;panel.dispatchEvent(new CustomEvent('room-gone',{bubbles:true}));}
 boardButton.onclick=showBoard;
 const controller={setDesks,showBoard,dispose};
 const ready=(async()=>{
  await loadStyle();if(disposed)return;
  try{
   const [THREE,{GLTFLoader}]=await Promise.all([import('three'),import('three/addons/loaders/GLTFLoader.js')]);
   const loader=new GLTFLoader();const [wall,desks]=await Promise.all(['/pod/rooms/classroom-wall.glb','/pod/rooms/classroom-desks.glb'].map(url=>loader.loadAsync(url).then(g=>g.scene)));
   if(disposed){for(const root of [wall,desks])root.traverse(n=>{n.geometry?.dispose();for(const m of [].concat(n.material||[]))m?.dispose();});return;}
   const canvas=document.createElement('canvas');canvas.className='classroom-canvas';canvas.dataset.peerDepth='far';canvas.setAttribute('aria-hidden','true');stage.prepend(canvas);
   renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
   scene=new THREE.Scene();scene.background=new THREE.Color('#d9c9b0');scene.add(new THREE.HemisphereLight(0xfff4e6,0x8a7a66,2.2));const sun=new THREE.DirectionalLight(0xffe2bd,2.4);sun.position.set(-1,2,2.5);scene.add(sun);desks.position.set(...CLASS.desks.at);desks.scale.setScalar(CLASS.desks.scale);scene.add(wall,desks);
   const floor=new THREE.Mesh(new THREE.PlaneGeometry(3,3),new THREE.MeshStandardMaterial({color:'#c3b6a3',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.z=.9;scene.add(floor);
   camera=new THREE.PerspectiveCamera(CLASS.fov,1,.05,20);camera.position.set(...CLASS.eye);camera.lookAt(...CLASS.look);three=THREE;
   function resize(){if(disposed)return;const r=stage.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();place();renderer.render(scene,camera);}
   resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);resize();panel.dataset.room='ready';note.hidden=true;stage.querySelector('.classroom-fallback').hidden=true;
   panel.dispatchEvent(new CustomEvent('room-ready',{bubbles:true,detail:controller}));
  }catch(error){if(disposed)return;panel.dataset.room='ready';note.textContent='Classroom art is unavailable on this device.';const download=document.createElement('button');download.type='button';download.textContent='Download classroom';download.onclick=()=>window.myr5Packs?.open?.('room-scoreboard');note.append(' ',download);panel.dispatchEvent(new CustomEvent('room-ready',{bubbles:true,detail:controller}));console.warn('Classroom art unavailable',error);}
 })();
 return {...controller,ready};
}

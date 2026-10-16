import * as T from 'three';
import {Pipeline} from './sakura/post.js';
import {createSurfaceTexture} from './textures.mjs';
import {METRO_BUSES,courseCoins,coursePickups,courseHazards,jumpHeight} from './course.mjs';
import {powerModel} from './power-art.mjs';

// The same depth-ink/grade/FXAA pipeline used by Little Boyfriend; one renderer for runner and coach.
export function createWorldScene(canvas,{beforeRender=()=>{},coachFactory=null}={}){
  const renderer=new T.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
  const scene=new T.Scene(), camera=new T.PerspectiveCamera(65,1,.25,210);
  const pipeline=new Pipeline(renderer,scene,camera,{pixelBudget:1.5e6});
  scene.add(new T.HemisphereLight(0xf6e7ff,0x51416b,1.9));
  const sun=new T.DirectionalLight(0xffe3b1,2.6);sun.position.set(-14,28,8);scene.add(sun);
  const root=new T.Group();scene.add(root);
  const mats=new Map(),geos=[],textures=new Map();let surface='metal';
  function mat(c,kind=surface){
    if([0xe5ba65,0xd6c893,0xe6b65f,0xffd269].includes(c))kind='gold';
    if([0x4e8a6a,0x79a57b,0x5a8b69,0x4f8866,0x467860].includes(c))kind='moss';
    if([0x776c73,0x786648,0x725242].includes(c))kind='wood';
    const key=kind+':'+c;if(!textures.has(kind))textures.set(kind,createSurfaceTexture(T,kind));
    if(!mats.has(key))mats.set(key,new T.MeshToonMaterial({color:c,map:textures.get(kind)}));return mats.get(key);
  }
  function mesh(g,c,x,y,z,parent=root,kind){geos.push(g);const m=new T.Mesh(g,mat(c,kind));m.position.set(x,y,z);parent.add(m);return m;}
  function box(x,y,z,w,h,d,c,p,kind){const g=new T.BoxGeometry(w,h,d),pos=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
    for(let i=0;i<uv.count;i++){const a=Math.abs(n.getX(i))>.5?pos.getZ(i):pos.getX(i),b=Math.abs(n.getY(i))>.5?pos.getZ(i):pos.getY(i);uv.setXY(i,a*.45,b*.45);}return mesh(g,c,x,y,z,p,kind);}
  const sphere=(x,y,z,r,c,p)=>mesh(new T.SphereGeometry(r,10,7),c,x,y,z,p);
  const cylinder=(x,y,z,r,h,c,p,kind)=>mesh(new T.CylinderGeometry(r,r,h,12),c,x,y,z,p,kind);
  function branch(a,b,r,c,p,kind='wood'){const av=new T.Vector3(...a),bv=new T.Vector3(...b),m=cylinder(...av.clone().add(bv).multiplyScalar(.5).toArray(),r,av.distanceTo(bv),c,p,kind);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),bv.sub(av).normalize());return m;}
  let segments=[],coins=[],obstacles=[],pickups=[],portal,coach,powerRig,world=-1,loop=-1;let routeVehicles=[],vfx={},coinInstances,coinStamps;const coinTransform=new T.Object3D();
  const extras=[];
  const palettes=[{sky:0x8f80b1,fog:0xc2accc,ground:0x4d365d,wall:0x80668e,trim:0xe5ba65},{sky:0xb9d6ba,fog:0xc4d4b4,ground:0x9b9675,wall:0xb6a47f,trim:0xd6c893},{sky:0xa5bcdc,fog:0xcfc9de,ground:0x777485,wall:0xf0c7bc,trim:0xe6b65f}];
  function disposeWorld(){for(const resource of extras.splice(0))resource.dispose();root.clear();geos.splice(0).forEach(g=>g.dispose());coins=[];obstacles=[];pickups=[];segments=[];routeVehicles=[];vfx={};}
  function arch(z,p,group){
    box(-5,3,z,1.1,6,1.3,p.wall,group);box(5,3,z,1.1,6,1.3,p.wall,group);box(0,6,z,11.3,1,1.4,p.trim,group);
    for(const x of [-4.9,4.9]){box(x,1,z,1.35,.35,1.6,p.trim,group);box(x,5.2,z,1.35,.35,1.6,p.trim,group);}
  }
  function train(x,z,group){
    box(x,1.6,z,2.55,3.2,13,0x75a9bc,group);box(x,.35,z,2.7,.5,13.2,0x393750,group);box(x,3.25,z,2.6,.15,13.2,0xf2d8b5,group);
    for(let k=-4;k<=4;k+=2.6){box(x-1.29,2,z+k,.04,1,1.7,0x3b547a,group);box(x+1.29,2,z+k,.04,1,1.7,0x3b547a,group);}
    box(x,2,z+6.53,1.8,.9,.05,0x364363,group);box(x,1,z+6.6,2.2,.22,.07,0xf8ce67,group);
  }
  function buildBus(b,g){
    const length=b.roofEnd-b.rampEnd,half=length/2,color=b.lane===0?0xe0aa60:b.lane===1?0x75adad:0xb19acb;
    shadow(0,0,4,length+4,g);
    box(0,1.55,0,2.5,3.1,length,color,g,'metal');box(0,.38,0,2.6,.5,length+.2,0x393750,g,'rubber');
    box(0,b.height-.08,0,2.55,.16,length+.2,0xe7d5b3,g,'metal');
    for(const side of [-1,1]){
      for(let z=-half+2;z<half-1;z+=2.2){box(side*1.26,2.05,z,.055,.9,1.65,0x3d526e,g,'metal');box(side*1.3,1.46,z,.04,.04,1.9,0xffddb0,g,'gold');}
      for(const z of [-half+2,half-2]){const tyre=cylinder(side*1.25,.55,z,.52,.23,0x302e42,g,'rubber');tyre.rotation.z=Math.PI/2;const hub=cylinder(side*1.39,.55,z,.24,.025,0xc3bdc5,g,'metal');hub.rotation.z=Math.PI/2;}
      box(side*1.28,2.8,0,.08,.08,length-.4,0xffd269,g,'gold');
      box(side*1.29,1.48,half-2.4,.08,2.15,1.15,0x47536b,g,'metal');
    }
    for(const z of [-half-.03,half+.03]){
      box(0,2.05,z,2.08,.95,.05,0x3d526e,g,'metal');box(0,.7,z,1.5,.4,.08,0x393750,g,'rubber');
      for(const x of [-.8,.8])sphere(x,1.15,z,.14,z>0?0xffe7aa:0xde8d98,g);
      box(0,2.85,z,1.2,.22,.07,0xf3d18e,g,'gold');
    }
    // Flat marked roof lane remains unobstructed; vents sit outside the running strip.
    for(let z=-half+1;z<half;z+=3){box(0,b.height+.015,z,.12,.02,1,0xffd269,g,'gold');for(const side of [-1,1])box(side*1.05,b.height+.12,z,.26,.22,.8,0x8c91a0,g,'metal');}
    ramp(half,half+(b.rampEnd-b.start),b.height,0,g);
    ramp(-half-(b.end-b.roofEnd),-half,0,b.height,g);
  }
  function ramp(z0,z1,y0,y1,parent){
    const w=1.3,geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute([-w,0,z0,w,0,z0,-w,0,z1,w,0,z1,-w,y0,z0,w,y0,z0,-w,y1,z1,w,y1,z1],3));
    geometry.setIndex([4,6,5,5,6,7,0,4,1,1,4,5,2,3,6,3,7,6,0,2,4,2,6,4,1,5,3,3,5,7]);geometry.computeVertexNormals();geometry.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,0,4,1,4,0,0,1,0,0,4,1,4],2));mesh(geometry,0xbba8c2,0,0,0,parent,'metal');
    for(const side of [-1,1])branch([side*1.28,y0+.06,z0],[side*1.28,y1+.06,z1],.065,0xffd269,parent,'gold');
    for(let t=.08;t<1;t+=.12){const y=y0+(y1-y0)*t,z=z0+(z1-z0)*t;box(0,y+.025,z,2.3,.025,.11,0x514565,parent,'rubber');}
  }
  function shadow(x,z,w,d,parent=root){
    const art=document.createElement('canvas');art.width=64;art.height=64;const ctx=art.getContext('2d'),gradient=ctx.createRadialGradient(32,32,2,32,32,32);gradient.addColorStop(0,'#241d3d80');gradient.addColorStop(1,'#241d3d00');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
    const texture=new T.CanvasTexture(art),material=new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false});extras.push(texture,material);const m=new T.Mesh(new T.PlaneGeometry(w,d),material);geos.push(m.geometry);m.rotation.x=-Math.PI/2;m.position.set(x,.035,z);parent.add(m);
  }
  // Static scenery retains its geometry detail but shares one draw call per material/section.
  function batchStatic(group){
    group.updateMatrixWorld(true);const inverse=group.matrixWorld.clone().invert(),batches=new Map();
    group.traverse(o=>{if(!o.isMesh||o.material.transparent||Array.isArray(o.material))return;const g=o.geometry.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,o.matrixWorld)),key=o.material.uuid;
      if(!batches.has(key))batches.set(key,{material:o.material,position:[],normal:[],uv:[],index:[],objects:[]});
      const b=batches.get(key),offset=b.position.length/3,position=g.attributes.position,normal=g.attributes.normal,uv=g.attributes.uv;
      for(let i=0;i<position.count;i++){b.position.push(position.getX(i),position.getY(i),position.getZ(i));b.normal.push(normal?.getX(i)||0,normal?.getY(i)||0,normal?.getZ(i)||0);b.uv.push(uv?.getX(i)||0,uv?.getY(i)||0);}
      if(g.index)for(let i=0;i<g.index.count;i++)b.index.push(offset+g.index.getX(i));else for(let i=0;i<position.count;i++)b.index.push(offset+i);
      b.objects.push(o);g.dispose();
    });
    for(const b of batches.values()){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(b.position,3));g.setAttribute('normal',new T.Float32BufferAttribute(b.normal,3));g.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));g.setIndex(b.index);geos.push(g);for(const o of b.objects)o.removeFromParent();group.add(new T.Mesh(g,b.material));}
  }
  function build(index,round=0){
    world=index;loop=round;disposeWorld();surface=['metal','stone','plaster'][index];const p=palettes[index];const sky=document.createElement('canvas');sky.width=4;sky.height=256;const sc=sky.getContext('2d'),sg=sc.createLinearGradient(0,0,0,256);sg.addColorStop(0,['#8272a5','#91b7ab','#91adcb'][index]);sg.addColorStop(.6,['#c4a7c3','#d2d8ad','#d8c7cf'][index]);sg.addColorStop(1,'#f7dbc2');sc.fillStyle=sg;sc.fillRect(0,0,4,256);const skyMap=new T.CanvasTexture(sky);skyMap.colorSpace=T.SRGBColorSpace;extras.push(skyMap);scene.background=skyMap;scene.fog=new T.Fog(p.fog,35,155);
    // Three different spatial languages: cylindrical foundry, open ravine ruins, asymmetric rail yard.
    if(index===1){box(0,-9,-65,200,.5,220,0x365f60,root,'moss');}
    else if(index===2)box(0,-.55,-65,200,.7,220,0x8b8295,root,'ballast');
    for(let s=0;s<10;s++){
      const g=new T.Group();g.position.z=-s*18;root.add(g);segments.push(g);
      if(index===0){
        box(0,-.25,0,8.6,.5,18,p.ground,g,'metal');
        const hoop=mesh(new T.TorusGeometry(7,.22,7,36,Math.PI),p.trim,0,0,-5,g,'gold');
        for(const side of [-1,1]){
          box(side*4.5,.25,0,.3,.5,18,p.trim,g,'gold');
          branch([side*4.8,0,-7],[side*6.6,5,-7],.22,p.trim,g,'gold');
          const drum=cylinder(side*8,2,-4,2.4,8,0x80668e,g,'metal');drum.rotation.x=Math.PI/2;
          for(let q=0;q<3;q++){const pipe=cylinder(side*(5.6+q*.45),1+q*.65,0,.16,18,q===1?p.trim:0x6b5a82,g,'metal');pipe.rotation.x=Math.PI/2;}
          const gear=mesh(new T.CylinderGeometry(2.4,2.4,.55,12),p.trim,side*8.4,4,-6,g,'gold');gear.rotation.x=Math.PI/2;
          for(let q=0;q<12;q++){const a=q/12*Math.PI*2,tooth=box(side*8.4+Math.cos(a)*2.5,4+Math.sin(a)*2.5,-5.7,.75,.6,.8,p.trim,g,'gold');tooth.rotation.z=a;}
          sphere(side*8.4,4,-5.1,.65,0x372c54,g);
          box(side*11,-3,0,4,12,9,0x49325f,g,'metal');
        }
        shadow(0,-4,10,8,g);
        for(const side of [-1,1]){for(let q=0;q<4;q++){box(side*4.1,.03,-7+q*4,.3,.05,1.4,0xffd269,g,'gold');}const gauge=cylinder(side*6.1,2.8,-1,.5,.12,0xe7d5b3,g,'metal');gauge.rotation.x=Math.PI/2;branch([side*6.1,2.8,-.9],[side*6.35,3.05,-.9],.025,0x49325f,g,'metal');}
        for(let q=0;q<5;q++){box(0,.02,-8+q*4,8.3,.04,.12,0xb098aa,g,'metal');box(0,-1.3,-8+q*4,8.3,1.9,.4,0x443451,g,'metal');}
      }else if(index===1){
        // Independent irregular paving on a high bridge, with exposed edges and no corridor walls.
        for(let q=0;q<5;q++)for(let j=0;j<3;j++){
          const slab=box((j-1)*2.9,-.22+Math.sin(s+q+j)*.04,-7.3+q*3.6,2.78,.5,3.5,q%3?0xb6a47f:0x91886b,g,'stone');slab.rotation.y=Math.sin(s*4+q+j)*.025;
        }
        for(const side of [-1,1]){
          const rock=mesh(new T.DodecahedronGeometry(3.3,0),0x8e8770,side*8,-.8,-4,g,'stone');rock.scale.set(1.2,1.4,1.7);rock.rotation.z=side*.3;
          shadow(side*4,-4,4,7,g);
          if(s%2===0){
            // Stepped pyramids and leaning carved guardian heads, unlike the foundry arches.
            for(let q=0;q<4;q++)box(side*11,q*.85-1,-1,7-q*1.35,.9,7-q*1.35,0xa89976,g,'stone');
            const head=mesh(new T.DodecahedronGeometry(1.8),0xb6a47f,side*6.2,2.3,-7,g,'stone');head.scale.set(.85,1.3,.65);head.rotation.z=side*.2;
            for(const eye of [-1,1])box(side*6.2+eye*.5,2.65,-5.9,.5,.22,.13,0x4c5b4f,g,'moss');
            for(let row=0;row<3;row++)for(const tooth of [-1,1])box(side*6.2+tooth*.65,1.4+row*.4,-5.85,.12,.15,.2,0x4f8866,g,'moss');
            box(side*6.2,1.8,-5.8,1.05,.15,.15,0x4c5b4f,g,'moss');
          }
          branch([side*7,-2,3],[side*8,7,-3],.6,0x725242,g);
          for(let q=0;q<4;q++){
            const end=[side*(5.2+q*.8),8+Math.sin(q+s)*1.2,-5+q*2];branch([side*8,6,-3],end,.14,0x725242,g);
            const leaf=sphere(...end,2.1,q%2?0x4e8a6a:0x79a57b,g);leaf.scale.set(1.5,.35,1);
          }
          for(let q=0;q<3;q++)branch([side*5,0,-6+q*3],[side*(5.6+q*.2),4+q,-7+q*3],.11,0x4f8866,g,'moss');
          for(let q=0;q<6;q++){const fern=mesh(new T.ConeGeometry(.45,1.3,5),0x4e8a6a,side*(4.8+q*.25),.6,-7+q*2.6,g,'moss');fern.rotation.z=side*(.2+q*.12);}
          // Hanging rope rails follow the open ravine edge.
          branch([side*4.6,.6,-8],[side*4.6,.3,0],.05,0x786648,g);branch([side*4.6,.3,0],[side*4.6,.6,8],.05,0x786648,g);
        }
      }else{
        box(0,-.18,0,10,.3,18,0x908894,g,'ballast');
        for(const lane of [-2.8,0,2.8])for(const side of [-1,1])box(lane+side*.8,.03,0,.1,.18,18,0xc6bfbe,g,'metal');
        for(let j=0;j<10;j++)box(0,-.08,-8+j*1.8,9.3,.14,.3,0x725242,g,'wood');
        // One raised platform, open train storage on the opposite side, city skyline beyond.
        box(-6,.35,0,2.5,.7,18,0xd5c2b1,g,'stone');box(-4.9,.74,0,.32,.06,18,p.trim,g,'gold');
        const canopy=mesh(new T.CylinderGeometry(2.5,2.5,15,16,1,true,Math.PI/2,Math.PI),0x8fa9b7,-6.5,4.5,0,g,'metal');canopy.rotation.x=Math.PI/2;
        for(const z of [-6,6]){cylinder(-6.3,2.3,z,.12,4.6,0x5a506c,g,'metal');box(-6.3,3.8,z,1.5,.5,.15,s%2?0xe8b77e:0x86ceca,g,'metal');}
        if(s%2===1)train(5.7,-4,g);
        // Playable lanes are reserved for authored, collidable route geometry.
        for(const side of [-1,1]){
          const h=7+(s*7+(side+1)*3)%13,x=side*(11+(s%2)*3);
          box(x,h/2-1,-3,4,h,12,s%3===0?0xe9ccbd:0xb3b6d0,g,'plaster');
          for(let q=0;q<3;q++)for(let row=0;row<3;row++)box(x-side*2.03,2+row*2.3,-7+q*3.5,.06,1.4,1.6,0x688097,g,'metal');
          for(let q=0;q<3;q++){box(x-side*2.1,1.05,-7+q*4,.4,.3,2.2,q%2?0xb8809c:0x75adad,g,'metal');box(x-side*2.13,3.7,-7+q*4,.12,.15,1.8,0xe7d5b3,g,'stone');}
          cylinder(x,h+.3,-3,.45,1,0x8b8799,g,'metal');box(x+.7,h+.3,-5,1,.55,1.2,0x8b8799,g,'metal');
          box(x,h-.6,-3,4.4,.25,12.4,0x62526e,g,'stone');
        }
        if(s%3===0){branch([-5,0,-6],[-5,7,-6],.14,0x62526e,g,'metal');branch([5,0,-6],[5,7,-6],.14,0x62526e,g,'metal');box(0,7,-6,10,.2,.2,0x62526e,g,'metal');}
      }
    }
    if(index===2)for(const b of METRO_BUSES){const g=new T.Group();root.add(g);g.userData.route=b;routeVehicles.push(g);g.position.set(b.lane*2.8,0,-(b.rampEnd+b.roofEnd)/2);buildBus(b,g);}
    for(const item of courseCoins(index)){
      const c=mesh(new T.CylinderGeometry(.22,.22,.075,16),0xffd269,item.lane*2.8,item.height,-item.distance);c.rotation.x=Math.PI/2;c.userData=item;coins.push(c);
      const stamp=mesh(new T.TorusGeometry(.13,.025,4,12),0xf6e5aa,0,.045,0,c,'gold');stamp.rotation.x=Math.PI/2;
    }
    if(coins.length){
      coinInstances=new T.InstancedMesh(coins[0].geometry,coins[0].material,coins.length);coinStamps=new T.InstancedMesh(coins[0].children[0].geometry,coins[0].children[0].material,coins.length);coinInstances.frustumCulled=coinStamps.frustumCulled=false;root.add(coinInstances,coinStamps);for(const c of coins)c.removeFromParent();
    }
    for(const [i,item] of courseHazards(index,round).entries()){
      const g=new T.Group();root.add(g);g.position.set(item.lane*2.8,item.elevation||0,-item.distance);g.userData=item;
      if(index===0){
        if(item.type==='slide'){const rotor=cylinder(0,1.5,0,.45,2.6,p.trim,g,'gold');rotor.rotation.z=Math.PI/2;branch([-1.1,0,0],[-1.1,1.5,0],.09,0x80668e,g,'metal');}
        else{const spool=cylinder(0,.4,0,.4,2.5,0x8c6ba8,g,'metal');spool.rotation.z=Math.PI/2;for(const x of [-1.1,1.1]){const cap=cylinder(x,.4,0,.45,.12,p.trim,g,'gold');cap.rotation.z=Math.PI/2;}}
      }else if(index===1){
        if(item.type==='slide'){branch([-1.5,1.4,-.4],[1.5,1.4,.4],.35,0x725242,g);branch([.7,1.4,0],[1.1,2.1,-.1],.12,0x725242,g);}
        else{const rock=mesh(new T.DodecahedronGeometry(.85),0x8e8770,0,.25,0,g,'stone');rock.scale.set(1.5,.7,.8);rock.rotation.z=i*.4;}
      }else{
        if(item.type==='slide'){box(0,1.3,0,2.5,.5,.25,0x86ceca,g,'metal');branch([-1.1,0,0],[-1.1,1.5,0],.08,0x62526e,g,'metal');}
        else{box(0,.425,0,2.5,.85,.3,0xd48288,g,'metal');for(let q=0;q<4;q++){const stripe=box(-.9+q*.6,.425,.18,.18,.75,.03,0xffdf9d,g,'gold');stripe.rotation.z=-.4;}}
      }
      batchStatic(g);obstacles.push(g);
    }
    const labels={headstart:'HEAD START',magnet:'MAGNET',shield:'SHIELD',boost:'DASH',superJump:'JUMP SHOES',recovery:'WINGS',phase:'PHASE',doubleCoins:'COIN x2',coinTier:'COIN x3',jetpack:'JETPACK',board:'BOARD',scoreBoost:'SCORE x2',pogo:'POGO'};
    for(const item of coursePickups(index)){
      const m=new T.Group();root.add(m);m.position.set(item.lane*2.8,item.height,-item.distance);m.userData=item;pickups.push(m);
      powerModel(T,item.kind,{mesh,box,cylinder,sphere},m);
      const halo=mesh(new T.TorusGeometry(.62,.035,5,24),0xfff1b8,0,0,-.1,m,'gold');halo.rotation.x=.2;
      const art=document.createElement('canvas');art.width=256;art.height=64;const ctx=art.getContext('2d');ctx.fillStyle='#30213ee8';ctx.fillRect(0,0,256,64);ctx.fillStyle='#fff0c2';ctx.font='bold 26px sans-serif';ctx.textAlign='center';ctx.fillText(labels[item.kind],128,42);
      const texture=new T.CanvasTexture(art);texture.colorSpace=T.SRGBColorSpace;const material=new T.SpriteMaterial({map:texture,depthTest:false});extras.push(texture,material);const badge=new T.Sprite(material);badge.scale.set(1.65,.41,1);badge.position.y=.9;m.add(badge);
    }
    for(const g of segments)batchStatic(g);for(const g of routeVehicles)batchStatic(g);
    powerRig=new T.Group();root.add(powerRig);
    for(const id of ['shield','board','superJump','magnet','boost','phase','jetpack','recovery']){const group=new T.Group();powerRig.add(group);vfx[id]=group;}
    for(const id of ['shield','phase','recovery']){const r=mesh(new T.TorusGeometry(.95,.025,5,40),id==='phase'?0xc39afa:0xffd269,0,0,-1.2,vfx[id],'gold');r.scale.y=.8;}
    box(0,-.8,-1.4,1.1,.08,.45,0x84ead9,vfx.board,'metal');
    for(const side of [-1,1]){
      mesh(new T.TorusGeometry(.4,.04,5,20,Math.PI),0x84ead9,side*.8,-.15,-1.4,vfx.magnet,'metal');
      box(side*.34,-.7,-1.2,.23,.1,.35,0xffd269,vfx.superJump,'gold');
      mesh(new T.ConeGeometry(.09,.7,8),0xffc773,side*.65,-.6,-1.1,vfx.jetpack,'gold').rotation.x=.3;
      for(let q=0;q<3;q++)box(side*(.7+q*.2),.4-q*.4,-1.2,.015,.02,1,0xc39afa,vfx.boost,'metal');
    }
    portal=new T.Group();root.add(portal);portal.position.set(0,2.6,-50);
    const ring=mesh(new T.TorusGeometry(2.7,.3,10,60),0xb17aee,0,0,0,portal);
    mesh(new T.TorusGeometry(3.2,.08,5,60),0xf1c4ff,0,0,0,portal);
    const disk=mesh(new T.CircleGeometry(2.6,60),0x6a3d99,0,0,-.1,portal);disk.material=new T.MeshBasicMaterial({color:0x8651d5,transparent:true,opacity:.78,side:T.DoubleSide});extras.push(disk.material);
    for(let i=0;i<12;i++){const a=i/12*Math.PI*2;mesh(new T.OctahedronGeometry(.13),0xffe6b6,Math.cos(a)*3.2,Math.sin(a)*3.2,0,portal);}
    coach=new T.Group();root.add(coach);coach.visible=false;
    // Production supplies the existing Coach Armie asset; there is no substitute character.
    if(coachFactory){const target=coach;coachFactory(T).then(model=>{if(target.parent!==root){model.group.traverse(o=>{if(o.isMesh){o.geometry.dispose();const mm=Array.isArray(o.material)?o.material:[o.material];mm.forEach(m=>{m.map?.dispose();m.dispose();});}});return;}target.add(model.group);model.group.scale.setScalar(3);model.group.rotation.z=-Math.PI/2;model.group.position.y=1.8;target.userData.tick=model.tick;model.group.traverse(o=>{if(o.isMesh){geos.push(o.geometry);const mm=Array.isArray(o.material)?o.material:[o.material];mm.forEach(m=>{extras.push(m);if(m.map)extras.push(m.map);});}});}).catch(()=>{});}

  }
  let coachMode=false;
  function render(run,time,active){
    if(world!==run.world||loop!==(run.loop||0))build(run.world,run.loop||0);const d=run.distance;
    for(let i=0;i<segments.length;i++)segments[i].position.z=-i*18+(d%18);
    const quiet=matchMedia('(prefers-reduced-motion:reduce)').matches;
    const flight=run.powers?.jetpack>0;
    camera.position.lerp(new T.Vector3(coachMode?0:run.lane*2.8,coachMode?2.7:1.8+(run.elevation||0)+(flight?3:jumpHeight(run))-(run.slide>0?.85:0),coachMode?6:3),.18);
    camera.lookAt(coachMode?0:camera.position.x*.7,coachMode?1.5:camera.position.y-.08,coachMode?-3:-40);
    if(!quiet&&active&&!coachMode)camera.rotation.z=Math.sin(time*9)*.008;
    coach.visible=coachMode;coach.position.set(0,0,-2);coach.rotation.y=Math.sin(time*.5)*.25;coach.userData.tick?.(time*1000,{pressure:.3});
    portal.visible=run.distance>470&&!coachMode;portal.position.z=-Math.max(3,600-d);portal.rotation.z=quiet?0:time*.2;
    portal.children[0].scale.setScalar(1+Math.sin(time*3)*.025);
    for(const g of routeVehicles)g.position.z=d-(g.userData.route.rampEnd+g.userData.route.roofEnd)/2;
    powerRig.visible=!coachMode;powerRig.position.copy(camera.position);powerRig.quaternion.copy(camera.quaternion);
    for(const [id,fx] of Object.entries(vfx)){fx.visible=!!run.powers[id];if(!quiet)fx.rotation.z=Math.sin(time*2)*.03;}
    for(let i=0;i<coins.length;i++){
      const c=coins[i],z=d-c.userData.distance,visible=!coachMode&&!run.collected[c.userData.id]&&z<4&&z>-160;
      coinTransform.position.set(c.userData.lane*2.8,c.userData.height,z);coinTransform.rotation.set(Math.PI/2,time*2,0);coinTransform.scale.setScalar(visible?1:0);coinTransform.updateMatrix();coinInstances.setMatrixAt(i,coinTransform.matrix);
      coinTransform.rotation.set(Math.PI,time*2,0);coinTransform.position.z+=.045;coinTransform.updateMatrix();coinStamps.setMatrixAt(i,coinTransform.matrix);
    }
    if(coinInstances){coinInstances.instanceMatrix.needsUpdate=true;coinStamps.instanceMatrix.needsUpdate=true;}
    for(const o of obstacles){o.position.z=d-o.userData.distance;o.visible=!coachMode&&o.position.z<4&&o.position.z>-160;}
    for(const p of pickups){p.position.z=d-p.userData.distance;p.rotation.y=quiet?0:Math.sin(time)*.3;p.position.y=p.userData.height+(quiet?0:Math.sin(time*2)*.12);p.visible=!coachMode&&!run.collected[p.userData.id]&&p.position.z<4&&p.position.z>-160;}
    beforeRender(scene,camera);pipeline.render();
  }
  function resize(){const {width,height}=canvas.parentElement.getBoundingClientRect();camera.aspect=width/height;camera.updateProjectionMatrix();pipeline.setSize(width,height);}
  const observer=new ResizeObserver(resize);observer.observe(canvas.parentElement);resize();
  return {scene,camera,stats:()=>({...pipeline.sceneStats}),render,setCoach(value){coachMode=value;},dispose(){observer.disconnect();disposeWorld();for(const m of mats.values())m.dispose();for(const t of textures.values())t.dispose();pipeline.dispose();renderer.dispose();renderer.forceContextLoss();}};
}



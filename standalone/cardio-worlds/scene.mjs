import * as T from './vendor/three.module.js';
import {Pipeline} from './sakura/post.js';
import {createSurfaceTexture} from './textures.mjs';

// The same depth-ink/grade/FXAA pipeline used by Little Boyfriend; one renderer for runner and coach.
export function createWorldScene(canvas){
  const renderer=new T.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
  const scene=new T.Scene(), camera=new T.PerspectiveCamera(65,1,.25,210);
  const pipeline=new Pipeline(renderer,scene,camera,{pixelBudget:1.5e6});
  scene.add(new T.HemisphereLight(0xf6e7ff,0x51416b,2.5));
  const sun=new T.DirectionalLight(0xffe3b1,3.2);sun.position.set(-14,28,8);scene.add(sun);
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
  let segments=[],coins=[],obstacles=[],pickups=[],portal,coach,world=-1;
  const extras=[];
  const palettes=[{sky:0x8f80b1,fog:0xc2accc,ground:0x4d365d,wall:0x80668e,trim:0xe5ba65},{sky:0xb9d6ba,fog:0xc4d4b4,ground:0x9b9675,wall:0xb6a47f,trim:0xd6c893},{sky:0xa5bcdc,fog:0xcfc9de,ground:0x777485,wall:0xf0c7bc,trim:0xe6b65f}];
  function disposeWorld(){for(const resource of extras.splice(0))resource.dispose();root.clear();geos.splice(0).forEach(g=>g.dispose());coins=[];obstacles=[];pickups=[];segments=[];}
  function arch(z,p,group){
    box(-5,3,z,1.1,6,1.3,p.wall,group);box(5,3,z,1.1,6,1.3,p.wall,group);box(0,6,z,11.3,1,1.4,p.trim,group);
    for(const x of [-4.9,4.9]){box(x,1,z,1.35,.35,1.6,p.trim,group);box(x,5.2,z,1.35,.35,1.6,p.trim,group);}
  }
  function train(x,z,group){
    box(x,1.6,z,2.55,3.2,13,0x75a9bc,group);box(x,.35,z,2.7,.5,13.2,0x393750,group);box(x,3.25,z,2.6,.15,13.2,0xf2d8b5,group);
    for(let k=-4;k<=4;k+=2.6){box(x-1.29,2,z+k,.04,1,1.7,0x3b547a,group);box(x+1.29,2,z+k,.04,1,1.7,0x3b547a,group);}
    box(x,2,z+6.53,1.8,.9,.05,0x364363,group);box(x,1,z+6.6,2.2,.22,.07,0xf8ce67,group);
  }
  function build(index){
    world=index;disposeWorld();surface=['metal','stone','plaster'][index];const p=palettes[index];scene.background=new T.Color(p.sky);scene.fog=new T.Fog(p.fog,35,155);
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
        for(let q=0;q<5;q++){box(0,.02,-8+q*4,8.3,.04,.12,0xb098aa,g,'metal');box(0,-1.3,-8+q*4,8.3,1.9,.4,0x443451,g,'metal');}
      }else if(index===1){
        // Independent irregular paving on a high bridge, with exposed edges and no corridor walls.
        for(let q=0;q<5;q++)for(let j=0;j<3;j++){
          const slab=box((j-1)*2.9,-.22+Math.sin(s+q+j)*.04,-7.3+q*3.6,2.78,.5,3.5,q%3?0xb6a47f:0x91886b,g,'stone');slab.rotation.y=Math.sin(s*4+q+j)*.025;
        }
        for(const side of [-1,1]){
          const rock=mesh(new T.DodecahedronGeometry(3.3,0),0x8e8770,side*8,-.8,-4,g,'stone');rock.scale.set(1.2,1.4,1.7);rock.rotation.z=side*.3;
          if(s%2===0){
            // Stepped pyramids and leaning carved guardian heads, unlike the foundry arches.
            for(let q=0;q<4;q++)box(side*11,q*.85-1,-1,7-q*1.35,.9,7-q*1.35,0xa89976,g,'stone');
            const head=mesh(new T.DodecahedronGeometry(1.8),0xb6a47f,side*6.2,2.3,-7,g,'stone');head.scale.set(.85,1.3,.65);head.rotation.z=side*.2;
            for(const eye of [-1,1])box(side*6.2+eye*.5,2.65,-5.9,.5,.22,.13,0x4c5b4f,g,'moss');
            box(side*6.2,1.8,-5.8,1.05,.15,.15,0x4c5b4f,g,'moss');
          }
          branch([side*7,-2,3],[side*8,7,-3],.6,0x725242,g);
          for(let q=0;q<4;q++){
            const end=[side*(5.2+q*.8),8+Math.sin(q+s)*1.2,-5+q*2];branch([side*8,6,-3],end,.14,0x725242,g);
            const leaf=sphere(...end,2.1,q%2?0x4e8a6a:0x79a57b,g);leaf.scale.set(1.5,.35,1);
          }
          for(let q=0;q<3;q++)branch([side*5,0,-6+q*3],[side*(5.6+q*.2),4+q,-7+q*3],.11,0x4f8866,g,'moss');
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
        if(s%3===1)train(-2.8,-4,g);
        for(const side of [-1,1]){
          const h=7+(s*7+(side+1)*3)%13,x=side*(11+(s%2)*3);
          box(x,h/2-1,-3,4,h,12,s%3===0?0xe9ccbd:0xb3b6d0,g,'plaster');
          for(let q=0;q<3;q++)for(let row=0;row<3;row++)box(x-side*2.03,2+row*2.3,-7+q*3.5,.06,1.4,1.6,0x688097,g,'metal');
          box(x,h-.6,-3,4.4,.25,12.4,0x62526e,g,'stone');
        }
        if(s%3===0){branch([-5,0,-6],[-5,7,-6],.14,0x62526e,g,'metal');branch([5,0,-6],[5,7,-6],.14,0x62526e,g,'metal');box(0,7,-6,10,.2,.2,0x62526e,g,'metal');}
      }
    }
    for(let i=0;i<42;i++){
      const c=mesh(new T.CylinderGeometry(.28,.28,.09,12),0xffd269,0,1.15,-10-i*3.7);c.rotation.z=Math.PI/2;c.userData={lane:(Math.floor(i/7)%3)-1,offset:10+i*3.7};coins.push(c);
    }
    for(let i=0;i<12;i++){
      const lane=(i*7%3)-1,z=-22-i*13;const g=new T.Group();root.add(g);g.position.set(lane*2.8,0,z);g.userData={lane,offset:22+i*13,type:i%3===1?'slide':'jump',serial:-1};
      if(index===0){
        if(i%3===1){const rotor=cylinder(0,2.55,0,.45,2.6,p.trim,g,'gold');rotor.rotation.z=Math.PI/2;branch([-1.1,0,0],[-1.1,2.6,0],.09,0x80668e,g,'metal');}
        else{const spool=cylinder(0,.55,0,.55,2.5,0x8c6ba8,g,'metal');spool.rotation.z=Math.PI/2;for(const x of [-1.1,1.1]){const cap=cylinder(x,.55,0,.75,.12,p.trim,g,'gold');cap.rotation.z=Math.PI/2;}}
      }else if(index===1){
        if(i%3===1){branch([-1.5,2.4,-.4],[1.5,2.7,.4],.35,0x725242,g);branch([.7,2.6,0],[1.1,3.25,-.1],.12,0x725242,g);}
        else{const rock=mesh(new T.DodecahedronGeometry(.85),0x8e8770,0,.45,0,g,'stone');rock.scale.set(1.5,.7,.8);rock.rotation.z=i*.4;}
      }else{
        if(i%3===1){box(0,2.5,0,2.5,.5,.25,0x86ceca,g,'metal');branch([-1.1,0,0],[-1.1,2.6,0],.08,0x62526e,g,'metal');}
        else{box(0,.5,0,2.5,1,.3,0xd48288,g,'metal');for(let q=0;q<4;q++){const stripe=box(-.9+q*.6,.5,.18,.18,.85,.03,0xffdf9d,g,'gold');stripe.rotation.z=-.4;}}
      }
      obstacles.push(g);
    }
    const kits=[['magnet','shield','boost','superJump','recovery'],['magnet','phase','doubleCoins','coinTier','recovery','shield'],['jetpack','superJump','magnet','board','scoreBoost','pogo']];
    const labels={magnet:'MAGNET',shield:'SHIELD',boost:'DASH',superJump:'JUMP',recovery:'WINGS',phase:'PHASE',doubleCoins:'COIN x2',coinTier:'COIN x3',jetpack:'FLIGHT',board:'BOARD',scoreBoost:'SCORE x2',pogo:'POGO'};
    for(let i=0;i<kits[index].length;i++){
      const id=kits[index][i],m=mesh(new T.OctahedronGeometry(.45),[0x84ead9,0xc39afa,0xffce75,0xa1d4ff,0xf7a7c3][i%5],(i%3-1)*2.8,1.4,-35-i*22);
      m.userData={offset:35+i*22,lane:i%3-1,id};pickups.push(m);
      const art=document.createElement('canvas');art.width=256;art.height=64;const ctx=art.getContext('2d');ctx.fillStyle='#30213edb';ctx.fillRect(0,0,256,64);ctx.fillStyle='#fff0c2';ctx.font='bold 29px sans-serif';ctx.textAlign='center';ctx.fillText(labels[id],128,43);
      const texture=new T.CanvasTexture(art);texture.colorSpace=T.SRGBColorSpace;const material=new T.SpriteMaterial({map:texture,depthTest:false});extras.push(texture,material);const badge=new T.Sprite(material);badge.scale.set(1.8,.45,1);badge.position.y=.9;m.add(badge);
    }
    portal=new T.Group();root.add(portal);portal.position.set(0,2.6,-50);
    const ring=mesh(new T.TorusGeometry(2.7,.3,10,60),0xb17aee,0,0,0,portal);
    mesh(new T.TorusGeometry(3.2,.08,5,60),0xf1c4ff,0,0,0,portal);
    const disk=mesh(new T.CircleGeometry(2.6,60),0x6a3d99,0,0,-.1,portal);disk.material=new T.MeshBasicMaterial({color:0x8651d5,transparent:true,opacity:.78,side:T.DoubleSide});extras.push(disk.material);
    for(let i=0;i<12;i++){const a=i/12*Math.PI*2;mesh(new T.OctahedronGeometry(.13),0xffe6b6,Math.cos(a)*3.2,Math.sin(a)*3.2,0,portal);}
    coach=new T.Group();root.add(coach);coach.visible=false;
    // A toy-like coach study: all body pieces receive the Sakura pipeline, no extra context.
    sphere(0,2.35,0,.65,0xead3ba,coach);box(0,1.35,0,1.25,1.2,.65,0x9a75b5,coach);
    for(const side of [-1,1]){box(side*.36,.35,0,.4,.8,.45,0x675072,coach);sphere(side*.83,1.5,0,.24,0xead3ba,coach);box(side*.75,1.8,0,.32,.65,.38,0x9a75b5,coach);sphere(side*.23,2.45,.57,.085,0x39324f,coach);}
    box(0,2.06,.62,.27,.06,.03,0x8c5269,coach);box(0,2.94,0,1.15,.2,.8,0xd8b166,coach);
  }
  let coachMode=false;
  function render(run,time,active){
    if(world!==run.world)build(run.world);const d=run.distance;
    for(let i=0;i<segments.length;i++)segments[i].position.z=-i*18+(d%18);
    const quiet=matchMedia('(prefers-reduced-motion:reduce)').matches;
    const flight=run.powers?.jetpack>0;
    camera.position.lerp(new T.Vector3(coachMode?0:run.lane*2.8,coachMode?2.7:1.8+(flight?3:run.jump>0?Math.sin(Math.min(1,run.jump/(run.jumpDuration||1.4))*Math.PI)*1.7:0)-(run.slide>0?.85:0),coachMode?6:3),.18);
    camera.lookAt(coachMode?0:camera.position.x*.7,coachMode?1.5:camera.position.y-.08,coachMode?-3:-40);
    if(!quiet&&active&&!coachMode)camera.rotation.z=Math.sin(time*9)*.008;
    coach.visible=coachMode;coach.position.set(0,0,-2);coach.rotation.y=Math.sin(time*.5)*.25;
    portal.visible=run.distance>470&&!coachMode;portal.position.z=-Math.max(3,600-d);portal.rotation.z=quiet?0:time*.2;
    portal.children[0].scale.setScalar(1+Math.sin(time*3)*.025);
    for(const c of coins){const z=-((c.userData.offset-d)%160+160)%160;c.position.set(c.userData.lane*2.8,1.15+(flight?3:0),z);c.rotation.y=time*2;const serial=Math.floor((d-c.userData.offset)/160);c.visible=!coachMode&&c.userData.collected!==serial;if(active&&z>-1&&z<2&&c.visible&&(run.lane===c.userData.lane||run.powers?.magnet>0||flight)){c.userData.collected=serial;canvas.dispatchEvent(new CustomEvent('coin'));}}
    for(const o of obstacles){const z=-((o.userData.offset-d)%160+160)%160;o.position.z=z;o.visible=!coachMode&&d<555;const serial=Math.floor((d-o.userData.offset)/160);if(active&&z>-1&&z<1&&run.lane===o.userData.lane&&o.userData.serial!==serial&&o.visible){o.userData.serial=serial;if(!flight&&!run.powers?.boost&&!run.powers?.phase&&!(o.userData.type==='jump'?run.jump>0:run.slide>0))canvas.dispatchEvent(new CustomEvent('hit'));}}
    for(const p of pickups){const z=-((p.userData.offset-d)%160+160)%160,serial=Math.floor((d-p.userData.offset)/160);p.position.z=z;p.rotation.y=time;p.rotation.z=time*.4;p.visible=!coachMode&&d<555&&p.userData.collected!==serial;if(active&&z>-1&&z<1&&run.lane===p.userData.lane&&p.visible){p.userData.collected=serial;canvas.dispatchEvent(new CustomEvent('power',{detail:p.userData.id}));}}
    pipeline.render();
  }
  function resize(){const {width,height}=canvas.parentElement.getBoundingClientRect();camera.aspect=width/height;camera.updateProjectionMatrix();pipeline.setSize(width,height);}
  const observer=new ResizeObserver(resize);observer.observe(canvas.parentElement);resize();
  return {render,setCoach(value){coachMode=value;},dispose(){observer.disconnect();disposeWorld();for(const m of mats.values())m.dispose();for(const t of textures.values())t.dispose();pipeline.dispose();renderer.dispose();renderer.forceContextLoss();}};
}



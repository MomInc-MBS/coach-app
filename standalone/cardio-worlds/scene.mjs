import * as T from './vendor/three.module.js';
import {Pipeline} from './sakura/post.js';

// The same depth-ink/grade/FXAA pipeline used by Little Boyfriend; one renderer for runner and coach.
export function createWorldScene(canvas){
  const renderer=new T.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
  const scene=new T.Scene(), camera=new T.PerspectiveCamera(65,1,.25,210);
  const pipeline=new Pipeline(renderer,scene,camera,{pixelBudget:1.5e6});
  scene.add(new T.HemisphereLight(0xf6e7ff,0x51416b,2.5));
  const sun=new T.DirectionalLight(0xffe3b1,3.2);sun.position.set(-14,28,8);scene.add(sun);
  const root=new T.Group();scene.add(root);
  const mats=new Map(),geos=[];
  const mat=c=>{if(!mats.has(c))mats.set(c,new T.MeshToonMaterial({color:c}));return mats.get(c);};
  function mesh(g,c,x,y,z,parent=root){geos.push(g);const m=new T.Mesh(g,mat(c));m.position.set(x,y,z);parent.add(m);return m;}
  const box=(x,y,z,w,h,d,c,p)=>mesh(new T.BoxGeometry(w,h,d),c,x,y,z,p);
  const sphere=(x,y,z,r,c,p)=>mesh(new T.SphereGeometry(r,10,7),c,x,y,z,p);
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
    world=index;disposeWorld();const p=palettes[index];scene.background=new T.Color(p.sky);scene.fog=new T.Fog(p.fog,35,155);
    box(0,-.4,-65,250,.5,220,index===1?0x638d78:0x90889e);
    for(let s=0;s<10;s++){
      const g=new T.Group();g.position.z=-s*18;root.add(g);segments.push(g);
      box(0,-.12,0,10,.24,18,p.ground,g);
      if(index===0){
        for(const x of [-5.5,5.5]){
          box(x,2,0,1,4,18,p.wall,g);box(x,4.2,0,1.3,.25,18,p.trim,g);
          box(x,1,0,1.08,.12,18,p.trim,g);
          for(let j=0;j<3;j++){box(x,2.6,-6+j*6,1.03,2,3.5,0x372c54,g);box(x,2.6,-6+j*6,1.08,.12,3.7,p.trim,g);}
          box(x*1.7,5.5,0,2,11,6,0x6b5a82,g);
        }
        arch(-5,p,g);for(const x of [-3.4,3.4])box(x,.02,0,.08,.05,18,p.trim,g);
        for(let j=0;j<6;j++)box(0,.02,-8+j*3,9.5,.04,.04,0x9d809d,g);
      }else if(index===1){
        for(let j=0;j<6;j++){box(0,.02,-8+j*3,9.6,.08,.08,0x776e65,g);box(j%2?1.7:-1.7,.03,-8+j*3,.08,.1,3,0x776e65,g);}
        arch(-6,p,g);
        for(const side of [-1,1]){
          box(side*6,1.2,0,2,2.5,18,p.wall,g);
          for(let j=0;j<3;j++){
            const x=side*(8+(s+j)%3),z=-7+j*6;
            box(x,4,z,.8,8,.8,0x776c73,g);
            for(let k=0;k<3;k++){const leaf=sphere(x+(k-1)*1.7,7.5+k*.6,z,2.5,k%2?0x4e8a6a:0x79a57b,g);leaf.scale.set(1,.55,1);}
            sphere(side*5.5,2.6,z,1.3,0x5a8b69,g).scale.y=.4;
          }
          const vine=box(side*4.4,4.8,-6,.16,3,.2,0x4f8866,g);vine.rotation.z=side*.2;
        }
      }else{
        for(const x of [-3.1,-.9,.9,3.1])box(x,.06,0,.12,.12,18,0xc6bfbe,g);
        for(let j=0;j<12;j++)box(0,-.02,-8+j*1.5,8,.15,.28,0x4b455b,g);
        for(const side of [-1,1]){
          box(side*8,4.5,0,4,9,17,s%2?0xe9ccbd:0xb3b6d0,g);box(side*5.6,.2,0,1.5,.4,18,0xe4d0c4,g);
          for(let j=0;j<3;j++){box(side*5.96,4.8,-6+j*5,.05,2,2.6,0x688097,g);box(side*5.9,2.4,-6+j*5,.1,.5,2,side>0?0xef93a5:0x86ceca,g);}
          box(side*5.5,4,-5,.18,8,.18,0x5a506c,g);
        }
        box(0,7.2,-5,11.3,.18,.25,0x62526e,g);
        if(s%3===1)train(s%2?3.1:-3.1,-7,g);
      }
    }
    for(let i=0;i<42;i++){
      const c=mesh(new T.CylinderGeometry(.28,.28,.09,12),0xffd269,0,1.15,-10-i*3.7);c.rotation.z=Math.PI/2;c.userData={lane:(Math.floor(i/7)%3)-1,offset:10+i*3.7};coins.push(c);
    }
    for(let i=0;i<12;i++){
      const lane=(i*7%3)-1,z=-22-i*13;const g=new T.Group();root.add(g);g.position.set(lane*2.8,0,z);g.userData={lane,offset:22+i*13,type:i%3===1?'slide':'jump',serial:-1};
      if(i%3===1){box(0,2.5,0,2.5,.55,.5,index===1?0x786648:0xeab279,g);box(-1.1,1.4,0,.12,2.8,.3,p.trim,g);box(1.1,1.4,0,.12,2.8,.3,p.trim,g);}
      else{box(0,.45,0,2.5,.9,.6,index===1?0x8e8770:0xd48288,g);for(let q=0;q<4;q++){const stripe=box(-.9+q*.6,.46,.32,.18,.75,.03,0xffdf9d,g);stripe.rotation.z=-.4;}}
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
  return {render,setCoach(value){coachMode=value;},dispose(){observer.disconnect();disposeWorld();for(const m of mats.values())m.dispose();pipeline.dispose();renderer.dispose();renderer.forceContextLoss();}};
}



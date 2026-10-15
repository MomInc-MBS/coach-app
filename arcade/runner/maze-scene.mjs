// Runner corridor, copied from the site's Coach Armie maze (tv/assets/armie-intro/maze-scene.js) on the app's vendored three r169.
// Changes: endless courses (no junction bay or doors), variable length and turn point, and a theme per course
// (wall texture style, neon colours, the view out of the windows). Gore/bone props only in the horror theme.
import {pathAt,LANES,runSpeed} from './maze-run.mjs';
import {themeFor} from './themes.mjs';

// MOM Inc propaganda for trap boards: never instructions, never arrows.
const SIGNS=[['MOM INC','LOVES YOU'],['REST HERE','MOM IS PROUD'],['NO ONE','LEAVES MOM'],['COME HOME','BABY'],['MOM SEES','EVERYTHING'],['YOU ARE','ALREADY HERS'],['OBEY','MOM INC']];
const R=2.4,CY=1.55,SEG=16,TAU=Math.PI*2; // tube radius, axis height, radial segments
const rgba=(rgb,a)=>`rgba(${rgb},${a})`;
// Hull tile painters: the site's gunmetal plate plus rust, clean lab panels and hex panels.
function paintWall(g,w,h,s){
  const base=g.createLinearGradient(0,0,w,h);base.addColorStop(0,s.from);base.addColorStop(1,s.to);g.fillStyle=base;g.fillRect(0,0,w,h);
  const rivets=(fill,shine)=>{for(const x of [18,w/2,w-14])for(const y of [18,h/2-10,h/2+12,h-14]){g.fillStyle=fill;g.beginPath();g.arc(x,y,5,0,TAU);g.fill();g.fillStyle=shine;g.beginPath();g.arc(x-1,y-1,3,0,TAU);g.fill();}};
  const seams=(dark,light)=>{g.fillStyle=dark;g.fillRect(0,0,w,5);g.fillRect(0,0,5,h);g.fillStyle=light;g.fillRect(0,5,w,2);g.fillRect(5,0,2,h);};
  const grime=a=>{const r=g.createRadialGradient(w*.7,h*.8,10,w*.7,h*.8,w*.6);r.addColorStop(0,rgba(s.grime,a));r.addColorStop(1,rgba(s.grime,0));g.fillStyle=r;g.fillRect(0,0,w,h);};
  const streaks=(n,a)=>{for(let i=0;i<n;i++){const x=Math.random()*w,y=Math.random()*h*.6,len=30+Math.random()*120;const gr=g.createLinearGradient(0,y,0,y+len);gr.addColorStop(0,rgba(s.grime,a));gr.addColorStop(1,rgba(s.grime,0));g.fillStyle=gr;g.fillRect(x,y,3+Math.random()*10,len);}};
  if(s.style==='lab'){
    g.strokeStyle='rgba(120,135,160,.55)';g.lineWidth=2;g.strokeRect(1,1,w-2,h-2);g.beginPath();g.moveTo(w/2,0);g.lineTo(w/2,h);g.moveTo(0,h/2);g.lineTo(w,h/2);g.stroke();
    g.fillStyle='rgba(255,255,255,.6)';g.fillRect(4,4,w/2-8,3);g.fillRect(w/2+4,h/2+4,w/2-8,3);
    for(const [x,y] of [[w*.25,h*.75],[w*.75,h*.25]]){g.fillStyle='#2a3448';g.fillRect(x-14,y-5,28,10);g.fillStyle='#3cf2d8';g.fillRect(x-11,y-2,8,4);}
    streaks(4,.08);grime(.12);return;
  }
  if(s.style==='hex'){
    const r=22,hh=Math.sqrt(3)*r;
    for(let row=-1;row*hh<h+hh;row++)for(let col=-1;col*r*1.5<w+r;col++){
      const cx=col*r*1.5,cy=row*hh+(col%2?hh/2:0);g.beginPath();for(let k=0;k<6;k++){const a=k*Math.PI/3;g[k?'lineTo':'moveTo'](cx+Math.cos(a)*(r-2),cy+Math.sin(a)*(r-2));}g.closePath();
      g.fillStyle=Math.random()<.12?'rgba(255,255,255,.08)':'rgba(0,0,0,.18)';g.fill();g.strokeStyle='rgba(0,0,0,.6)';g.lineWidth=3;g.stroke();g.strokeStyle='rgba(255,255,255,.12)';g.lineWidth=1;g.stroke();
    }
    grime(.35);return;
  }
  for(let i=0;i<900;i++){g.fillStyle='rgba('+(Math.random()<.5?'255,255,255':'0,0,0')+','+(Math.random()*.05)+')';g.fillRect(Math.random()*w,Math.random()*h,2+Math.random()*6,1);}
  if(s.style==='rust')for(let i=0;i<70;i++){g.fillStyle=`rgba(${150+Math.random()*80|0},${60+Math.random()*40|0},${10+Math.random()*20|0},${.15+Math.random()*.3})`;g.beginPath();g.ellipse(Math.random()*w,Math.random()*h,3+Math.random()*16,2+Math.random()*9,Math.random()*3,0,TAU);g.fill();}
  streaks(s.style==='rust'?26:14,.35);
  g.strokeStyle='rgba(230,225,240,.18)';g.lineWidth=1;for(let i=0;i<10;i++){g.beginPath();const x=Math.random()*w,y=Math.random()*h;g.moveTo(x,y);g.lineTo(x+Math.random()*40-20,y+Math.random()*12);g.stroke();}
  seams('#16121b','rgba(220,210,235,.35)');g.fillStyle='rgba(16,10,20,.55)';g.fillRect(0,h/2-1,w,2);
  rivets(s.style==='rust'?'#2a1408':'#2a2430',s.style==='rust'?'#a0603a':'#b9b2c4');grime(.35);
}

export function createMazeScene(THREE,theme=themeFor){
  const themeAt=typeof theme==='function'?theme:()=>theme;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#040208');scene.fog=new THREE.Fog('#0c0712',14,48);
  const hemi=new THREE.HemisphereLight('#a898c0','#1c1222',.6);scene.add(hemi);
  const lamp=new THREE.PointLight('#ffd49a',9,12,1.6),ahead=new THREE.PointLight('#ffc77a',14,18,1.6),alarm=new THREE.PointLight('#ff2030',0,16,1.4),pitLight=new THREE.PointLight('#ff3a14',0,9,1.4),fill=new THREE.PointLight('#b9a8e8',2.2,22,1.2);
  scene.add(lamp,ahead,alarm,pitLight,fill);
  const camera=new THREE.PerspectiveCamera(72,1,.06,160);
  const material=(color,metalness=.4,roughness=.5)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
  const canvasTex=(w,h,draw)=>{const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;};
  // One hull tile, repainted per theme. Every clone shares its canvas, so each is flagged for upload on a repaint.
  const plateTex=canvasTex(256,256,()=>{});
  plateTex.wrapS=plateTex.wrapT=THREE.RepeatWrapping;plateTex.anisotropy=4;
  const metals=[];
  const metal=(rx,ry,opts={})=>{const map=plateTex.clone();map.repeat.set(rx,ry);map.needsUpdate=true;const {shade,...own}=opts,m=new THREE.MeshStandardMaterial({map,color:'#aaa2b6',metalness:.75,roughness:.4,...own});metals.push({m,opts});return m;};
  const hull=metal(16,1,{side:THREE.BackSide}),hullArc=metal(6,1,{side:THREE.BackSide}),hullPit=metal(12,1,{side:THREE.BackSide});
  const plate=metal(1,1,{side:THREE.DoubleSide});
  const wall=metal(6,4.6),deck=metal(4,1,{shade:.92,metalness:.6,roughness:.22}),ledge=metal(1.5,4,{shade:.92,metalness:.6,roughness:.3});
  const inset=material('#1a1620',.7,.4),gold=material('#bb9354',.8,.3),black=material('#0b080e',.3,.6),bone=material('#d4a017',.55,.35),gore=material('#4a0a34',.1,.32);
  const glow=color=>new THREE.MeshBasicMaterial({color,toneMapped:false});
  const warm=glow('#ffe6b0'),cyan=glow('#79e8ff'),red=glow('#ff593e'),amber=glow('#ffb44a');
  // Animated materials (shared, so batching keeps working): two strobing light banks, emergency strips, lasers, blades.
  const strobeA=glow('#ffe6b0'),strobeB=glow('#ffe6b0'),emergency=glow('#ff1e2e'),laser=glow('#ff4fd8'),blade=glow('#ff5a1e');blade.side=THREE.DoubleSide;const pitFloor=glow('#6a0e06');
  const steel=new THREE.MeshStandardMaterial({color:'#3a2a2e',metalness:.85,roughness:.3,emissive:'#ff2a00',emissiveIntensity:.35,side:THREE.DoubleSide});
  const hum=new THREE.MeshBasicMaterial({color:'#ff3fc8',transparent:true,opacity:.18,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,side:THREE.DoubleSide});
  const haze=new THREE.MeshBasicMaterial({color:'#ff2a1a',transparent:true,opacity:.28,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,side:THREE.DoubleSide});
  const hazardTex=canvasTex(256,64,(g,w,h)=>{g.fillStyle='#120c08';g.fillRect(0,0,w,h);g.fillStyle='#d4a017';for(let x=-h;x<w+h;x+=48){g.beginPath();g.moveTo(x,h);g.lineTo(x+24,h);g.lineTo(x+24+h,0);g.lineTo(x+h,0);g.fill();}});
  hazardTex.wrapS=THREE.RepeatWrapping;hazardTex.repeat.set(3,1);const hazard=new THREE.MeshStandardMaterial({map:hazardTex,metalness:.4,roughness:.5});
  const splatTex=canvasTex(256,256,(g)=>{for(let i=0;i<46;i++){const a=Math.random()*TAU,r=Math.random()**2*96,s=6+Math.random()*(34-r/4);g.fillStyle=i%5?'rgba(102,0,68,.92)':'rgba(58,0,38,.95)';g.beginPath();g.ellipse(128+Math.cos(a)*r,128+Math.sin(a)*r,s,s*(.5+Math.random()*.5),a,0,TAU);g.fill();}});
  const splat=new THREE.MeshStandardMaterial({map:splatTex,transparent:true,depthWrite:false,roughness:.18,metalness:.1,polygonOffset:true,polygonOffsetFactor:-2});
  // Space outside the windows: a drifting star shell plus the theme's set piece, all following the camera so they read as infinitely far.
  const sky=new THREE.Group();scene.add(sky);const vista=new THREE.Group();sky.add(vista);
  const starGeo=new THREE.BufferGeometry(),starPos=new Float32Array(1600*3);
  for(let i=0;i<1600;i++){const u=Math.random()*2-1,a=Math.random()*TAU,s=Math.sqrt(1-u*u);starPos.set([Math.cos(a)*s*110,u*110,Math.sin(a)*s*110],i*3);}
  starGeo.setAttribute('position',new THREE.BufferAttribute(starPos,3));
  const stars=new THREE.Points(starGeo,new THREE.PointsMaterial({color:'#e8e2ff',size:1.6,sizeAttenuation:false,fog:false,toneMapped:false}));sky.add(stars);
  const billboard=(tex,size,x,y,z,additive=false)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(size,size*tex.image.height/tex.image.width),new THREE.MeshBasicMaterial({map:tex,transparent:true,fog:false,depthWrite:false,toneMapped:false,...(additive?{blending:THREE.AdditiveBlending}:{})}));m.position.set(x,y,z);m.lookAt(0,0,0);vista.add(m);return m;};
  const ball=(g,cx,cy,r,[c0,c1,c2])=>{const q=g.createRadialGradient(cx-r*.25,cy-r*.3,r*.06,cx,cy,r);q.addColorStop(0,c0);q.addColorStop(.45,c1);q.addColorStop(.85,c2);q.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=q;g.beginPath();g.arc(cx,cy,r,0,TAU);g.fill();};
  const blob=(color,size=128)=>canvasTex(size,size,(g)=>{const q=g.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);q.addColorStop(0,color);q.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=q;g.fillRect(0,0,size,size);});
  const VISTAS={
    planet(s){billboard(canvasTex(256,256,(g)=>{ball(g,128,128,128,s.colors);g.globalAlpha=.25;g.fillStyle=s.bands;for(let y=70;y<200;y+=22)g.fillRect(20,y,216,5);}),48,-24,2,-92);
      billboard(canvasTex(64,64,(g)=>ball(g,32,32,32,['#ffffff','#9a96a8','#2a2830'])),12,22,-4,-94);},
    nebula(s){s.colors.forEach((c,i)=>{const a=[-.3,.26,-.18,.34][i%4]-Math.PI/2;billboard(blob(c),50+i*10,Math.cos(a)*95,(i%2?8:-8),Math.sin(a)*95,true).material.opacity=.6;});
      s.colors.forEach((c,i)=>{billboard(blob(c,64),20,[-26,20,-16,30][i%4],i*5-8,-90,true).material.opacity=.75;});},
    rings(s){billboard(canvasTex(512,256,(g)=>{const ring=(start,end)=>{g.strokeStyle=s.ring;g.globalAlpha=.75;g.lineWidth=14;g.beginPath();g.ellipse(256,128,230,46,-.18,start,end);g.stroke();g.globalAlpha=.35;g.lineWidth=6;g.beginPath();g.ellipse(256,128,200,38,-.18,start,end);g.stroke();g.globalAlpha=1;};
      ring(Math.PI,TAU);ball(g,256,128,96,s.colors);g.globalAlpha=.2;g.fillStyle=s.colors[2];for(let y=64;y<200;y+=16)g.fillRect(170,y,172,5);g.globalAlpha=1;ring(0,Math.PI);}),70,-26,0,-92);},
    asteroids(s){const geo=new THREE.DodecahedronGeometry(1,0),mat=new THREE.MeshStandardMaterial({color:s.rock,emissive:s.rock,emissiveIntensity:.35,roughness:.95,flatShading:true,fog:false});
      for(let i=0;i<70;i++){const a=-Math.PI/2+((i*.618)%1-.5)*.9,r=30+(i*37%50),m=new THREE.Mesh(geo,mat);m.position.set(Math.cos(a)*r,(((i*53)%30)-15)*r/60,Math.sin(a)*r);m.scale.set(.5+(i%5)*.5,.4+(i%3)*.4,.5+(i%4)*.4);m.rotation.set(i,i*.7,i*.3);m.userData.spin=.1+(i%7)*.05;vista.add(m);}
      billboard(blob('#ff9a4a'),50,-24,4,-92,true).material.opacity=.45;},
    earth(){billboard(canvasTex(512,512,(g)=>{const glowG=g.createRadialGradient(256,256,180,256,256,256);glowG.addColorStop(0,'rgba(120,190,255,.9)');glowG.addColorStop(1,'rgba(60,120,255,0)');g.fillStyle=glowG;g.fillRect(0,0,512,512);
      g.save();g.beginPath();g.arc(256,256,200,0,TAU);g.clip();const sea=g.createRadialGradient(200,190,20,256,256,200);sea.addColorStop(0,'#3a8ad8');sea.addColorStop(1,'#08204a');g.fillStyle=sea;g.fillRect(0,0,512,512);
      for(let i=0;i<26;i++){g.fillStyle=i%3?'#3a7a3a':'#8a7a4a';g.beginPath();g.ellipse(80+(i*97%360),80+(i*61%360),18+(i*13%40),10+(i*7%26),i,0,TAU);g.fill();}
      g.fillStyle='rgba(255,255,255,.55)';for(let i=0;i<40;i++){g.beginPath();g.ellipse(60+(i*71%400),60+(i*113%400),20+(i*11%40),5+(i*3%8),i*.4,0,TAU);g.fill();}
      const night=g.createLinearGradient(120,0,440,0);night.addColorStop(0,'rgba(0,0,10,0)');night.addColorStop(1,'rgba(0,0,10,.85)');g.fillStyle=night;g.fillRect(0,0,512,512);g.restore();}),90,-26,-10,-90);
      billboard(canvasTex(64,64,(g)=>ball(g,32,32,32,['#ffffff','#b0b0b8','#3a3a40'])),9,22,6,-94);},
    redstar(s){billboard(canvasTex(256,256,(g)=>{const q=g.createRadialGradient(128,128,8,128,128,128);q.addColorStop(0,s.colors[0]);q.addColorStop(.25,s.colors[1]);q.addColorStop(.6,s.colors[2]);q.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=q;g.fillRect(0,0,256,256);
      g.globalAlpha=.25;g.strokeStyle=s.colors[1];for(let i=0;i<24;i++){const a=i/24*TAU;g.lineWidth=2+i%3;g.beginPath();g.moveTo(128+Math.cos(a)*40,128+Math.sin(a)*40);g.lineTo(128+Math.cos(a)*(90+i%5*8),128+Math.sin(a)*(90+i%5*8));g.stroke();}}),80,24,2,-92,true);
      billboard(blob('#ff3a1a'),70,-26,-4,-90,true).material.opacity=.5;},
  };
  // Dust and sparks: 300 motes respawned ahead along the path.
  const DUST=300,dustGeo=new THREE.BufferGeometry(),dustPos=new Float32Array(DUST*3),dust=[];
  dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPos,3));
  const motes=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:'#ffcf8a',size:.022,map:canvasTex(32,32,(g)=>{const r=g.createRadialGradient(16,16,0,16,16,16);r.addColorStop(0,'#fff');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,32,32);}),transparent:true,opacity:.75,blending:THREE.AdditiveBlending,depthWrite:false}));motes.frustumCulled=false;scene.add(motes);
  // Tube pieces: unit-length open cylinders. Window pieces drop two side panels, pit pieces drop the bottom arc.
  const arc=(start,count)=>new THREE.CylinderGeometry(R,R,1,count,1,true,start*TAU/SEG,count*TAU/SEG).rotateX(Math.PI/2);
  const tubeGeo={solid:arc(0,SEG),window:[arc(-3,6),arc(5,6)],pit:arc(2,12)};
  const ribGeo=new THREE.TorusGeometry(R-.04,.07,4,24);
  let group=null,course=null,look=null,cameraLane=LANES[1],yaw=0,rotors=[],pitSpots=[],envLook=null;
  const E=new THREE.Color(),LZ=new THREE.Color(),W=new THREE.Color();
  function applyTheme(t){
    if(look===t)return;look=t;
    scene.background.set(t.bg);scene.fog.color.set(t.fog);hemi.color.set(t.hemi[0]);hemi.groundColor.set(t.hemi[1]);lamp.color.set(t.light);ahead.color.set(t.light);fill.color.set(t.light);
    paintWall(plateTex.image.getContext('2d'),256,256,t.wall);
    for(const {m,opts} of metals){m.map.needsUpdate=true;m.color.set(t.wall.tint).multiplyScalar(opts.shade??1);m.metalness=opts.metalness??t.wall.metalness;m.roughness=opts.roughness??t.wall.roughness;}
    const n=t.neon;cyan.color.set(n.rail);warm.color.set(n.warm);red.color.set(n.red);amber.color.set(n.amber);blade.color.set(n.blade);
    E.set(n.emergency);LZ.set(n.laser);W.set(n.warm);alarm.color.set(n.emergency);
    for(const o of [...vista.children]){o.removeFromParent();o.geometry.dispose();o.material.map?.dispose();o.material.dispose();}
    stars.material.color.set(t.sky.stars);VISTAS[t.sky.kind]?.(t.sky);
  }
  function box(w,h,d,mat,x,y,z,parent=group){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
  function label(lines,escape=false,w=2.25,h=.88){
    const c=document.createElement('canvas');c.width=768;c.height=288;const g=c.getContext('2d');
    const color=escape?'#ff7954':look?.neon.sign||'#ff85e5';g.fillStyle=escape?'#24110e':'#230d30';g.fillRect(0,0,c.width,c.height);
    g.strokeStyle=color;g.lineWidth=5;g.shadowColor=color;g.shadowBlur=18;g.strokeRect(10,10,748,268);g.textAlign='center';g.fillStyle=color;
    g.textBaseline='middle';
    lines.forEach((text,i)=>{let size=i===0?80:62;g.font=`bold ${size}px monospace`;while(g.measureText(text).width>708){size--;g.font=`bold ${size}px monospace`;}g.fillText(text,384,144+(i-(lines.length-1)/2)*84);});
    const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map,toneMapped:false}));mesh.userData.sign=lines.join(' / ');return mesh;
  }
  // A bulkhead plate with a round hatch cut where the tube meets a room.
  function bulkhead(w,h,parent,x,z,rotation=0){
    const s=new THREE.Shape();s.moveTo(-w/2,-.3);s.lineTo(w/2,-.3);s.lineTo(w/2,h);s.lineTo(-w/2,h);s.lineTo(-w/2,-.3);
    const hole=new THREE.Path();hole.absarc(0,CY,R-.02,0,TAU,true);s.holes.push(hole);
    const mesh=new THREE.Mesh(new THREE.ShapeGeometry(s,16),plate);mesh.position.set(x,0,z);mesh.rotation.y=rotation;parent.add(mesh);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(R-.02,.09,4,32),gold);ring.position.set(x,CY,z);ring.rotation.y=rotation;parent.add(ring);
  }
  // Local along-path placement that also works behind the start line.
  const place=(d)=>d<0?{x:0,z:-d,yaw:0}:pathAt(d,course);
  function onPath(d,parent=group){const p=place(d),part=new THREE.Group();part.position.set(p.x,0,p.z);part.rotation.y=p.yaw;parent.add(part);return part;}
  function batchStaticBoxes(){
    group.updateMatrixWorld(true);const batches=new Map();
    group.traverse(mesh=>{
      if(mesh.geometry?.type!=='BoxGeometry')return;
      for(let p=mesh;p&&p!==group;p=p.parent)if(p.userData.dynamic)return;
      if(!batches.has(mesh.material))batches.set(mesh.material,[]);batches.get(mesh.material).push(mesh);
    });
    for(const [mat,meshes] of batches){
      const instances=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),mat,meshes.length);
      meshes.forEach((mesh,i)=>{const {width,height,depth}=mesh.geometry.parameters;instances.setMatrixAt(i,mesh.matrixWorld.clone().multiply(new THREE.Matrix4().makeScale(width,height,depth)));mesh.removeFromParent();mesh.geometry.dispose();});
      instances.computeBoundingSphere();group.add(instances);
    }
  }
  // Instanced tube: one InstancedMesh per piece geometry, so the whole hull costs a handful of draw calls.
  function instance(geo,mat,matrices){if(!matrices.length)return;const m=new THREE.InstancedMesh(geo,mat,matrices.length);matrices.forEach((x,i)=>m.setMatrixAt(i,x));m.computeBoundingSphere();group.add(m);}
  function build(next,t){
    if(group){group.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry&&!Object.values(tubeGeo).flat().includes(o.geometry)&&o.geometry!==ribGeo)o.geometry.dispose();if(o.userData.sign){o.material.map.dispose();o.material.dispose();}});scene.remove(group);}
    course=next;applyTheme(t);group=new THREE.Group();scene.add(group);rotors=[];pitSpots=[];
    const TURN=course.turnAt,sign=course.direction==='right'?1:-1,pits=course.events.filter(e=>e.type==='pit'),END=course.length+26,CORNER=3;
    const inPit=d=>pits.some(e=>d>=e.at&&d<e.at+e.length),tube={solid:[],window:[],pit:[],rib:[]},nearTurn=d=>TURN!=null&&d+1>TURN-CORNER&&d<TURN+CORNER;
    const mat=(p,y=CY)=>new THREE.Matrix4().compose(new THREE.Vector3(p.x,y,p.z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),p.yaw),new THREE.Vector3(1,1,1));
    for(let d=-4;d<END;d++){
      if(nearTurn(d))continue;
      const p=place(d+.5),m=mat(p),cell=((d%8)+8)%8,win=cell>=2&&cell<=4&&!inPit(d);
      (inPit(d)?tube.pit:win?tube.window:tube.solid).push(m);
      if(d%4===0)tube.rib.push(mat(place(d)));
      const part=onPath(d+.5);
      // Deck strip, lane seams, cyan rails, wall-foot running lights.
      if(!inPit(d)){box(4.2,.25,1.02,deck,0,-.14,0,part);for(const x of [-.625,.625])box(.03,.012,1.02,black,x,.003,0,part);}
      for(const side of [-1,1]){box(.04,.035,1.02,cyan,side*1.72,.03,0,part);if(d%2===0)box(.07,.07,.07,amber,side*1.86,.36,0,part);}
      // Red emergency strips high on both walls, square ceiling lights every 4 units (some strobe).
      for(const side of [-1,1]){const a=side*Math.PI*.3,strip=box(.05,.05,1.02,emergency,Math.sin(a)*(R-.06),CY+Math.cos(a)*(R-.06),0,part);strip.rotation.z=-a;}
      if(d%4===2)box(.9,.04,.9,[warm,strobeA,warm,strobeB][Math.abs(d/4|0)%4],0,CY+R-.12,0,part);
      if(win)for(const side of [-1,1])for(const y of [-.94,.94]){const a=Math.PI/2+y*.42;box(.06,.06,1.02,cyan,side*Math.sin(a)*(R-.03),CY-Math.cos(a)*(R-.03),0,part);}
      if(win&&cell===2)for(const side of [-1,1])for(const z of [.5,-2.5])box(.06,1.9,.08,gold,side*(R-.08),CY,z,part);
    }
    instance(tubeGeo.solid,hull,tube.solid);instance(tubeGeo.pit,hullPit,tube.pit);instance(ribGeo,gold,tube.rib);
    for(const g of tubeGeo.window)instance(g,hullArc,tube.window);
    const cap=new THREE.Mesh(new THREE.CircleGeometry(R,SEG),plate);cap.position.set(0,CY,4);group.add(cap);
    if(TURN!=null){
    // Corner room at the 90 degree turn: two hatches, a sealed end wall and a propaganda board.
    const room=new THREE.Group();room.position.set(0,0,-TURN);group.add(room);const W=CORNER*2;
    box(W,.25,W,deck,0,-.14,0,room);box(W,.2,W,wall,0,4.3,0,room);box(.2,4.6,W,wall,-sign*CORNER,2,0,room);
    // Far wall is plated metal with a real window onto space.
    const fw=new THREE.Shape();fw.moveTo(-CORNER,-.3);fw.lineTo(CORNER,-.3);fw.lineTo(CORNER,4.3);fw.lineTo(-CORNER,4.3);fw.lineTo(-CORNER,-.3);
    const pane=new THREE.Path();pane.moveTo(-1.4,.9);pane.lineTo(-1.4,2.5);pane.lineTo(1.4,2.5);pane.lineTo(1.4,.9);pane.lineTo(-1.4,.9);fw.holes.push(pane);
    const far=new THREE.Mesh(new THREE.ShapeGeometry(fw),plate);far.position.z=-CORNER;room.add(far);
    for(const y of [.9,2.5])box(2.9,.07,.12,cyan,0,y,-CORNER+.02,room);for(const x of [-1.42,1.42])box(.07,1.67,.12,cyan,x,1.7,-CORNER+.02,room);
    // Gold ribs framing the room like the tube ribs, red strip, and a steady ceiling light.
    for(const x of [-1.6,1.6,-(CORNER-.08),CORNER-.08])box(.14,4.3,.14,gold,x,2,-CORNER+.08,room);
    box(W,.14,.14,gold,0,4.15,-CORNER+.08,room);box(.14,.14,W,gold,-sign*(CORNER-.08),4.15,0,room);
    for(const z of [-1.5,1.5])box(.14,4.3,.14,gold,-sign*(CORNER-.08),2,z,room);
    box(.05,.05,W,emergency,-sign*(CORNER-.12),3.6,0,room);
    box(1.3,.04,1.3,warm,0,4.18,0,room);
    bulkhead(W,4.4,room,0,CORNER);bulkhead(W,4.4,room,sign*CORNER,0,Math.PI/2);
    const turnBoard=label(['ALL HALLS','LEAD TO MOM'],false,2.3,.8);turnBoard.position.set(0,3.3,-CORNER+.12);room.add(turnBoard);
    }
    // Horror deck only: dark magenta splats, clay chunks, a couple of gold bones.
    if(t.gore){const splatGeo=new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2);
    for(let i=0,d=6.3;d<course.length-2;i++,d+=5.3+(i*7%5)){
      if(inPit(d)||TURN!=null&&Math.abs(d-TURN)<CORNER+.5)continue;const part=onPath(d),s=.9+(i*13%7)*.18;
      const m=new THREE.Mesh(splatGeo,splat);m.scale.set(s,1,s*1.3);m.rotation.y=i;m.position.set(((i*5%7)-3)*.45,.012,0);part.add(m);
      for(let k=0;k<3;k++){const c=box(.12+k*.05,.08,.1+k*.04,gore,m.position.x+(k-1)*.3,.04,(k-1)*.25,part);c.rotation.y=i+k;}
      if(i%4===1){const b=new THREE.Group();b.position.set(m.position.x*.6,.04,.3);b.rotation.y=i*.7;part.add(b);box(.5,.05,.05,bone,0,0,0,b);for(const x of [-.27,.27])for(const z of [-.03,.03])box(.08,.08,.06,bone,x,0,z,b);}
    }}
    // Traps: full-width platform, full-width laser grid, long pit with ledges and a grinder below.
    course.events.forEach((event,i)=>{
      if(event.type==='turn')return;
      const trap=onPath(event.at);trap.userData.trap=event.type;
      const board=label(SIGNS[(i+course.seed)%SIGNS.length],event.type==='pit',1.9,.7);board.position.set(0,3.05,-.25);trap.add(board);
      for(const x of [-.6,.6])box(.03,.6,.03,gold,x,3.55,-.25,trap);
      if(event.type==='platform'){
        box(4.6,.6,1.3,inset,0,.3,-.65,trap);box(4.6,.06,1.34,gold,0,.62,-.65,trap);box(4.6,.05,.05,red,0,.66,0,trap);
        const stripes=new THREE.Mesh(new THREE.PlaneGeometry(4.4,.45),hazard);stripes.position.set(0,.3,.005);trap.add(stripes);
      }else if(event.type==='grid'){
        for(const side of [-1,1])box(.18,3.8,.3,gold,side*1.95,1.9,0,trap);box(4.4,.22,.3,gold,0,3.55,0,trap);
        for(let k=0;k<6;k++)box(4.6,.04,.04,laser,0,1.02+k*.42,0,trap);
        const field=new THREE.Mesh(new THREE.PlaneGeometry(4.2,2.4),hum);field.position.set(0,2.08,0);trap.add(field);
      }else{
        const L=event.length,z=-L/2;
        for(const side of [-1,1]){box(1.6,4.2,L,ledge,side*1.65,-2.1,z,trap);box(.06,.05,L,gold,side*.87,.02,z,trap);box(.04,.04,L,red,side*.86,-.5,z,trap);}
        box(1.8,4.2,.3,black,0,-2.1,-L-.15,trap);box(1.8,.05,.06,red,0,.01,0,trap);box(1.8,.05,.06,red,0,.01,-L,trap);
        const floor=new THREE.Mesh(new THREE.PlaneGeometry(1.8,L).rotateX(-Math.PI/2),pitFloor);floor.position.set(0,-4,z);trap.add(floor);
        const mist=new THREE.Mesh(new THREE.PlaneGeometry(1.7,L).rotateX(-Math.PI/2),haze);mist.position.set(0,-.35,z);trap.add(mist);
        // Saw blades: glowing toothed rim around a dark steel body with three cut-outs (so the spin reads); teeth reach deck level.
        const teeth=new THREE.Shape();for(let k=0;k<32;k++){const a=k/32*TAU,r=k%2?.78:1.02;teeth[k?'lineTo':'moveTo'](Math.cos(a)*r,Math.sin(a)*r);}
        const rim=new THREE.Path();rim.absarc(0,0,.7,0,TAU,true);teeth.holes.push(rim);
        const body=new THREE.Shape();body.absarc(0,0,.72,0,TAU,false);
        for(let k=0;k<3;k++){const a=k/3*TAU,h=new THREE.Path();h.absarc(Math.cos(a)*.42,Math.sin(a)*.42,.15,0,TAU,true);body.holes.push(h);}
        const teethGeo=new THREE.ShapeGeometry(teeth,4).rotateY(Math.PI/2),bodyGeo=new THREE.ShapeGeometry(body,6).rotateY(Math.PI/2),hubGeo=new THREE.CylinderGeometry(.16,.16,.16,8).rotateZ(Math.PI/2);
        for(let k=0;k<5;k++){const r=new THREE.Group();r.position.set((k%2?.3:-.3),-1.02,-.7-k*(L-1.4)/4);trap.add(r);r.add(new THREE.Mesh(teethGeo,blade),new THREE.Mesh(bodyGeo,steel),new THREE.Mesh(hubGeo,gold));rotors.push(r);}
        for(let k=0;k<2;k++){const axle=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,L,6).rotateX(Math.PI/2),gold);axle.position.set(k?.3:-.3,-1.02,z);trap.add(axle);}
        const mid=pathAt(event.at+L/2,course);pitSpots.push({at:event.at,end:event.at+L,pos:new THREE.Vector3(mid.x,-.55,mid.z)});
      }
    });
    // Course banner: the next hall starts where this one ends.
    const banner=label(['MOM INC / '+String(course.level+2).padStart(2,'0'),'NEXT HALL'],false,2.3,.8);
    const bp=onPath(course.length-3);banner.position.set(0,3.2,0);bp.add(banner);
    batchStaticBoxes();
    dust.length=0;for(let i=0;i<DUST;i++)dust.push({d:Math.random()*24-2,x:(Math.random()*2-1)*1.9,y:Math.random()*3.6,s:Math.random()*TAU});
  }
  // A tiny generated environment (ceiling panels, side glow, floor bounce) in the theme's colours so the metal shows highlights.
  function makeEnv(renderer,t){
    const env=new THREE.Scene(),pm=new THREE.PMREMGenerator(renderer);env.background=new THREE.Color(t.bg);
    const panel=(c,w,h,x,y,z)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:c,side:THREE.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);env.add(m);};
    for(let z=-8;z<=8;z+=4)panel(t.light,2,1.2,0,5,z);panel(t.neon.amber,1,8,-5,1,0);panel(t.neon.amber,1,8,5,1,0);panel(t.wall.to,10,10,0,-5,0);panel(t.neon.rail,.4,10,3,-4,0);
    const tex=pm.fromScene(env,.04).texture;pm.dispose();return tex;
  }
  let strobeTimer=0,strobeState=[1,1];
  return {scene,camera,get theme(){return look?.name},render(renderer,run,motion=true,options={}){
    if(course!==run.course){build(run.course,themeAt(run.courses));yaw=pathAt(run.distance,course).yaw;}
    if(envLook!==look){envLook=look;scene.environment?.dispose();scene.environment=makeEnv(renderer,look);scene.environmentIntensity=.45;}
    const pressure=Math.max(0,Math.min(1,+options.pressure||0)),now=performance.now()/1000;
    const p=pathAt(run.distance,course),blend=motion?.22:1,pace=Math.min(1,runSpeed(run)/4);
    cameraLane=cameraLane+((LANES[run.lane]??0)-cameraLane)*blend;yaw=yaw+(p.yaw-yaw)*(motion?.18:1);
    const bob=motion&&!run.paused&&run.height<.1?Math.sin(run.time*17)*.045*pace:0;
    // Stumble: a short shake and roll while the slow-down lasts.
    const shake=motion?Math.min(1,run.stumble/.9):0,jx=shake*Math.sin(now*61)*.06,jr=shake*Math.sin(now*37)*.08;
    camera.aspect=renderer.domElement.clientWidth/Math.max(1,renderer.domElement.clientHeight);camera.fov=72;camera.updateProjectionMatrix();
    camera.position.set(p.x+Math.cos(p.yaw)*(cameraLane+jx),1.67+run.height-(run.duck||0)*1.03+bob-shake*.12,p.z-Math.sin(p.yaw)*(cameraLane+jx));
    camera.rotation.set(-shake*.06,yaw,(motion?-cameraLane*.035:0)+jr,'YXZ');
    // Lights ride with the runner: a lamp on the body and a work light a few metres ahead.
    const fwd=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
    lamp.position.copy(camera.position).y=2.9;fill.position.copy(camera.position).addScaledVector(fwd,14).y=1.2;
    const pit=pitSpots.find(s=>run.distance<s.end+2&&s.at-run.distance<22);if(pit){pitLight.position.copy(pit.pos);pitLight.intensity=9*(.8+.2*Math.sin(now*23)*(motion?1:0));}else pitLight.intensity=0;ahead.position.copy(camera.position).addScaledVector(fwd,7).y=3.3;alarm.position.copy(camera.position).addScaledVector(fwd,3).y=3.2;
    // Flicker: two light banks strobe at random; the work light stutters with them.
    if(motion&&now>strobeTimer){strobeTimer=now+.04+Math.random()*.25;strobeState=[Math.random()<.85?1:.08,Math.random()<.6?1:.05];}
    if(!motion)strobeState=[1,1];
    strobeA.color.copy(W).multiplyScalar(strobeState[0]);strobeB.color.copy(W).multiplyScalar(strobeState[1]);ahead.intensity=14*(.55+.45*strobeState[0]);
    // Emergency strips and the red wash grow with coach pressure.
    const pulse=motion?.5+.5*Math.sin(now*(3+7*pressure)):1;
    emergency.color.copy(E).multiplyScalar(.25+pressure*(.6+.9*pulse));alarm.intensity=pressure*(4+10*pulse);
    laser.color.copy(LZ).multiplyScalar(.85+.15*Math.sin(now*40));hum.opacity=.12+.08*Math.sin(now*9);haze.opacity=.22+.1*Math.sin(now*5);
    if(motion)for(const r of rotors)r.rotation.x=now*9+r.position.z;
    // Space: stars follow the camera (so they read as far away) and drift slowly.
    // The set piece turns with the runner so it stays in the windows ahead after a corner.
    sky.position.copy(camera.position);sky.rotation.y=yaw;if(motion){stars.rotation.y=now*.004;for(const o of vista.children)if(o.userData.spin)o.rotation.y+=o.userData.spin*.016;}
    const end=course.length+20;
    for(let i=0;i<DUST;i++){const m=dust[i];if(m.d<run.distance-2||m.d>run.distance+26)m.d=run.distance+(m.d<run.distance?22+Math.random()*4:Math.random()*24);
      const q=place(Math.min(m.d,end)),wob=motion?Math.sin(now*.7+m.s)*.15:0;
      dustPos[i*3]=q.x+Math.cos(q.yaw)*m.x;dustPos[i*3+1]=m.y+wob;dustPos[i*3+2]=q.z-Math.sin(q.yaw)*m.x;if(motion){m.y=(m.y+.0015)%3.6;}}
    dustGeo.attributes.position.needsUpdate=true;
    options.before?.(scene,camera,course);
    renderer.render(scene,camera);
  }};
}

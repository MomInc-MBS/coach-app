const CHUNK_LENGTH=12;
const CHUNK_COUNT=9;
const CORRIDOR_LENGTH=CHUNK_LENGTH*CHUNK_COUNT;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const mod=(value,n)=>((value%n)+n)%n;

const BIOMES={
  tropical:{bg:'#ff9c57',fog:'#cf7140',floor:'#643426',rail:'#ffc26a',dark:'#75432e',mid:'#bd7043',light:'#f7b95e',accent:'#ed5c36',glow:'#ffdd83',glass:'#70e6d1'},
  castle:{bg:'#170d20',fog:'#321626',floor:'#241a25',rail:'#fa4a30',dark:'#111117',mid:'#39313b',light:'#8b6268',accent:'#ff6037',glow:'#ffb137',glass:'#b94c32'},
  rainbow:{bg:'#121c55',fog:'#354a95',floor:'#222b65',rail:'#f8f6ff',dark:'#24264b',mid:'#7381d7',light:'#f5ecff',accent:'#ff55c8',glow:'#ffe34e',glass:'#7ef4ff'},
  loopway:{bg:'#61c9ff',fog:'#99e2ff',floor:'#28a53d',rail:'#c8ff53',dark:'#177b32',mid:'#39bd4a',light:'#b7ed78',accent:'#f5ae35',glow:'#fff0a0',glass:'#ddfbff'},
  laboratory:{bg:'#071b26',fog:'#143b4b',floor:'#152630',rail:'#30e5c5',dark:'#1d3039',mid:'#4c6770',light:'#b6d7dd',accent:'#ff4c8f',glow:'#7dfff0',glass:'#8df6e5'},
  asteroid:{bg:'#02050e',fog:'#081125',floor:'#10151e',rail:'#47e6ff',dark:'#171c27',mid:'#394352',light:'#a8b4c5',accent:'#ff3989',glow:'#93f7ff',glass:'#7aa7d5'}
};

function makeSignTexture(THREE,owned){
  if(!globalThis.document?.createElement)return null;
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
  const context=canvas.getContext?.('2d');if(!context)return null;
  context.fillStyle='#050505';context.fillRect(0,0,512,256);
  context.strokeStyle='#fff';context.lineWidth=12;context.strokeRect(10,10,492,236);
  context.fillStyle='#fff';context.font='900 83px Arial, sans-serif';context.textAlign='center';context.textBaseline='middle';
  context.fillText('MOM INC.',256,95);
  context.font='800 28px Arial, sans-serif';context.fillText('YOUR BEST IS OUR PRODUCT',256,177);
  context.fillStyle='#fff';context.fillRect(30,218,452,9);
  const texture=new THREE.CanvasTexture(canvas);if('colorSpace'in texture&&THREE.SRGBColorSpace)texture.colorSpace=THREE.SRGBColorSpace;
  owned.add(texture);return texture;
}

export function createBiomeScene(THREE,{id='tropical',section=0}={}){
  if(!THREE)throw new TypeError('A Three.js namespace is required.');
  const biome=BIOMES[id]??BIOMES.tropical,biomeId=BIOMES[id]?id:'tropical';
  const group=new THREE.Group();group.name=`plank-flight-biome-${biomeId}`;group.userData.biomeId=biomeId;
  const geometries=new Set(),materials=new Set(),textures=new Set(),chunks=[],animated=[],rotating=[];
  const geometry=(kind,...args)=>{const item=new THREE[kind](...args);geometries.add(item);return item;};
  const material=(kind,params)=>{const item=new THREE[kind](params);materials.add(item);return item;};
  const box=geometry('BoxGeometry',1,1,1),crateGeo=box,brickGeo=box;
  const beamGeo=box,postGeo=geometry('CylinderGeometry',.16,.22,1,5),leafGeo=geometry('ConeGeometry',1,1,5);
  const sphereGeo=geometry('IcosahedronGeometry',1,1),octaGeo=geometry('OctahedronGeometry',1,0),torusGeo=geometry('TorusGeometry',1,.08,6,24);
  const ringGeo=geometry('TorusGeometry',1,.035,5,32),podGeo=geometry('SphereGeometry',1,8,6),signGeo=geometry('PlaneGeometry',1.35,.68);
  const colors={};for(const key of Object.keys(biome))if(key!=='bg'&&key!=='fog')colors[key]=material('MeshStandardMaterial',{color:biome[key],roughness:key==='glass'?.24:.7,metalness:key==='rail'?.48:.12,emissive:key==='glow'||key==='accent'?biome[key]:'#000000',emissiveIntensity:key==='glow'?.38:.12});
  const signInk=material('MeshBasicMaterial',{color:'#050505',side:THREE.DoubleSide});
  const signWhite=material('MeshBasicMaterial',{color:'#ffffff',side:THREE.DoubleSide});
  const signTexture=makeSignTexture(THREE,textures);
  const signPrint=signTexture?material('MeshBasicMaterial',{map:signTexture,transparent:false,side:THREE.DoubleSide}):signWhite;
  const rainbowRibbonMat=material('MeshPhysicalMaterial',{color:'#ffffff',roughness:.045,metalness:.32,clearcoat:1,clearcoatRoughness:.025,emissive:'#6d78ff',emissiveIntensity:.12});
  const matrixHelper=new THREE.Object3D();
  const shared={};
  const cachedGeometry=(key,kind,...args)=>shared[key]??(shared[key]=geometry(kind,...args));

  function addInstances(parent,geo,mat,transforms){
    if(!transforms.length)return null;
    const mesh=new THREE.InstancedMesh(geo,mat,transforms.length);mesh.frustumCulled=false;
    transforms.forEach((t,index)=>{
      matrixHelper.position.set(t.x??0,t.y??0,t.z??0);
      matrixHelper.rotation.set(t.rx??0,t.ry??0,t.rz??0);
      const s=t.s??1;Array.isArray(s)?matrixHelper.scale.set(s[0],s[1],s[2]):matrixHelper.scale.set(t.sx??s,t.sy??s,t.sz??s);
      matrixHelper.updateMatrix();mesh.setMatrixAt(index,matrixHelper.matrix);
    });
    mesh.instanceMatrix.needsUpdate=true;parent.add(mesh);return mesh;
  }

  function addMesh(parent,geo,mat,{x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1}={}){
    const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.rotation.set(rx,ry,rz);mesh.scale.set(sx,sy,sz);parent.add(mesh);return mesh;
  }

  // Grounded worlds get floor/edge cues; rainbow is a floating ribbon and space stays open.
  const hasFloor=!['rainbow','asteroid'].includes(biomeId);
  if(hasFloor){
    const floorMat=material('MeshStandardMaterial',{color:biome.floor,roughness:.86,metalness:.1});
    addMesh(group,geometry('BoxGeometry',5.6,.16,CORRIDOR_LENGTH),floorMat,{x:0,y:-.12,z:-CORRIDOR_LENGTH/2});
  }
  const railMat=material('MeshStandardMaterial',{color:biome.rail,roughness:.38,metalness:.62,emissive:biome.rail,emissiveIntensity:.28});
  if(!['rainbow','asteroid'].includes(biomeId))for(const side of [-1,1]){
    const railHeight=['tropical','loopway'].includes(biomeId)?.18:.32;
    addMesh(group,geometry('BoxGeometry',.13,railHeight,CORRIDOR_LENGTH),railMat,{x:side*2.72,y:railHeight/2-.04,z:-CORRIDOR_LENGTH/2});
    if(['castle','laboratory'].includes(biomeId))addMesh(group,geometry('BoxGeometry',.22,4.6,CORRIDOR_LENGTH),colors.dark,{x:side*3.05,y:2.3,z:-CORRIDOR_LENGTH/2});
  }

  const palette=['#ff2738','#ff8a24','#ffe629','#38ed72','#24dff0','#3478ff','#bd55ff'];
  const cubeMat=material('MeshStandardMaterial',{color:biome.mid,roughness:.76,metalness:.08});
  const loopStoneMat=material('MeshStandardMaterial',{color:'#74523b',roughness:.92,flatShading:true});
  const rockMat=material('MeshStandardMaterial',{color:biome.dark,roughness:.9,flatShading:true});
  const glowMat=material('MeshBasicMaterial',{color:biome.glow});
  const transparentGlass=material('MeshPhysicalMaterial',{color:biome.glass,roughness:.2,metalness:.25,transparent:true,opacity:.42,clearcoat:.8});

  function makeSign(chunk,index){
    if(index%3!==0)return;
    for(const side of [-1,1]){
      const board=addMesh(chunk,signGeo,signInk,{x:side*1.95,y:3.78,z:-5.2});
      const print=addMesh(chunk,signGeo,signPrint,{x:side*1.95,y:3.78,z:-5.18,sx:.88,sy:.82,sz:1});
      board.userData.propaganda=true;print.userData.propaganda=true;
    }
    // A high frontal banner reinforces the recurring black/white corporate motif.
    const banner=addMesh(chunk,signGeo,signInk,{x:0,y:4.35,z:-5.2,sx:1.7,sy:.62});
    const bannerPrint=addMesh(chunk,signGeo,signPrint,{x:0,y:4.35,z:-5.18,sx:1.5,sy:.48});
    banner.userData.propaganda=true;bannerPrint.userData.propaganda=true;
  }

  function addTropical(chunk,index,variant=0){
    addInstances(chunk,crateGeo,cubeMat,[
      {x:-2.3,y:.42,z:-2.4,s:[.78,.84,.9]},{x:2.28,y:.48,z:-8.3,s:[.9,.96,.8]},
      {x:-2.15,y:.28,z:-9.5,s:[.62,.56,.55]}
    ]);
    addInstances(chunk,postGeo,colors.mid,[{x:-3.55,y:1.35,z:-4.8,s:[.8,2.8,.8]},{x:3.6,y:1.45,z:-9,s:[.8,3,.8]}]);
    const fronds=[];
    for(const [x,z] of [[-3.55,-4.8],[3.6,-9]])for(let leaf=0;leaf<5;leaf++)fronds.push({x,y:3.15+(leaf%2)*.13,z,s:[1.25,.12,.27],ry:leaf*Math.PI/5,rz:(leaf%2?.11:-.1)});
    addInstances(chunk,box,colors.dark,fronds);
    addInstances(chunk,brickGeo,colors.light,[{x:-2.7,y:1.1,z:-6.1,s:[.5,2.2,.48]},{x:2.7,y:1.1,z:-6.1,s:[.5,2.2,.48]}]);
    if(variant===0)addInstances(chunk,box,colors.mid,[{x:-2.45,y:.16,z:-5.9,s:[.45,.25,4.8]},{x:-2.45,y:.31,z:-5.9,s:[.12,.12,4.8]}]); // dock planks
    if(variant===1)addInstances(chunk,box,colors.light,[{x:-2.72,y:1.55,z:-5.8,s:[.38,3.1,.4]},{x:2.72,y:1.55,z:-5.8,s:[.38,3.1,.4]},{x:-2.72,y:3.15,z:-5.8,s:[.38,.35,.4]},{x:2.72,y:3.15,z:-5.8,s:[.38,.35,.4]}]);
    if(variant===2){addInstances(chunk,box,cubeMat,[{x:2.35,y:.42,z:-4,s:[.8,.82,.85]},{x:2.25,y:1.25,z:-4.1,s:[.66,.76,.7]},{x:-2.3,y:.42,z:-8.2,s:[.8,.82,.85]}]);addMesh(chunk,box,colors.accent,{x:-2.05,y:.36,z:-5.7,sx:1,sy:.16,sz:3.4,rz:-.12});}
  }

  function addCastle(chunk,index,variant=0){
    const bricks=[];
    for(let row=0;row<4;row++)for(const side of [-1,1])bricks.push({x:side*(2.48+(row%2)*.09),y:.42+row*.62,z:-1.8-(row%2)*.5,s:[.58,.54,1.05]});
    addInstances(chunk,brickGeo,colors.dark,bricks);
    addInstances(chunk,beamGeo,colors.mid,[{x:-2.55,y:2.7,z:-6,s:[.45,4.5,.65]},{x:2.55,y:2.7,z:-6,s:[.45,4.5,.65]},{x:0,y:4.55,z:-6,s:[5.25,.38,.7]}]);
    addInstances(chunk,octaGeo,colors.accent,[{x:-2.2,y:.18,z:-3,s:[1.7,.12,3.8]},{x:2.2,y:.18,z:-9,s:[1.7,.12,3.6]}]);
    // Block-built fire and battlements keep the castle's intentionally chunky pixel style.
    addInstances(chunk,box,glowMat,[{x:-2.28,y:.62,z:-4.1,s:[.28,.34,.28]},{x:-2.28,y:.96,z:-4.1,s:[.18,.34,.18]},{x:2.28,y:.62,z:-8.6,s:[.28,.34,.28]},{x:2.28,y:.96,z:-8.6,s:[.18,.34,.18]}]);
    addInstances(chunk,box,colors.light,[{x:-3.15,y:2.35,z:-10,s:[1.1,3.7,1.1]},{x:3.15,y:2.35,z:-2,s:[1.1,3.7,1.1]}]);
    if(variant===0)addInstances(chunk,box,colors.mid,[{x:-2.7,y:.65,z:-5.3,s:[.7,.16,4.8]},{x:-2.7,y:.82,z:-5.3,s:[.12,.12,4.8]}]);
    if(variant===1)addInstances(chunk,octaGeo,colors.accent,[{x:-2.5,y:.22,z:-2.5,s:[.8,.13,4.8]},{x:2.5,y:.22,z:-9,s:[.8,.13,4.8]},{x:-2.55,y:.32,z:-2.5,s:[.35,.15,4.6]},{x:2.55,y:.32,z:-9,s:[.35,.15,4.6]}]);
    if(variant===2)addInstances(chunk,box,colors.glow,[{x:-2.45,y:3.85,z:-3.8,s:[.65,.22,.55]},{x:2.45,y:3.85,z:-8.2,s:[.65,.22,.55]}]);
  }

  function addRainbow(chunk,index,variant=0){
    addInstances(chunk,torusGeo,colors.glow,[{x:-2.48,y:1.9,z:-4.3,s:[1.15,1.65,1]},{x:2.48,y:2.2,z:-9,s:[1.25,1.8,1]}]);
    addInstances(chunk,octaGeo,colors.glass,[{x:-2.5,y:2.7,z:-7,s:[.6,2.1,.6]},{x:2.55,y:1.3,z:-3,s:[.55,1.8,.55]}]);
    addInstances(chunk,sphereGeo,colors.light,[{x:-4.1,y:3.7,z:-3.2,s:.08},{x:4.1,y:2.1,z:-8.4,s:.1},{x:-3.8,y:1.2,z:-10,s:.07}]);
    if(variant===1)addInstances(chunk,sphereGeo,colors.glass,[{x:-3.6,y:.2,z:-3,s:[1.4,.48,1.1]},{x:3.6,y:.25,z:-8.5,s:[1.5,.55,1.2]}]);
    if(variant===2)addInstances(chunk,torusGeo,colors.glow,[{x:-3.7,y:2.4,z:-5.5,s:[1.4,1.4,.2]},{x:3.7,y:2.4,z:-5.5,s:[1.4,1.4,.2]}]);
  }

  function addLoopway(chunk,index,variant=0){
    const checks=[];
    for(let row=0;row<5;row++)for(const side of [-1,1])checks.push({x:side*(3.1+(row%2)*.38),y:.3+row*.76,z:-.8-(row%3)*3.1,s:[.58,.68,.72]});
    addInstances(chunk,brickGeo,loopStoneMat,checks);
    addInstances(chunk,brickGeo,colors.mid,checks.filter((_,i)=>i%2===index%2).map(t=>({...t,s:[.59,.28,.73]})));
    // Lower checker cliffs read as an open-air green canyon, not solid corridor walls.
    addInstances(chunk,box,loopStoneMat,[{x:-3.35,y:.52,z:-5.8,s:[1.6,1.05,11.5]},{x:3.35,y:.52,z:-5.8,s:[1.6,1.05,11.5]}]);
    addInstances(chunk,box,colors.mid,[{x:-3.35,y:1.08,z:-5.8,s:[1.6,.12,11.5]},{x:3.35,y:1.08,z:-5.8,s:[1.6,.12,11.5]}]);
    const loop=addMesh(chunk,cachedGeometry('loopway-loop','TorusGeometry',2.05,.13,8,40),colors.accent,{x:index%2===0?-3.9:3.9,y:2.35,z:-6});
    rotating.push({object:loop,axis:'z',rate:.08,base:0});
    addInstances(chunk,ringGeo,colors.glow,[{x:-2.35,y:1.2,z:-2.5,s:[.9,.9,.9]},{x:2.35,y:3.1,z:-9.5,s:[1.1,1.1,1.1]}]);
    if(variant===0)addInstances(chunk,ringGeo,colors.glow,[{x:-3.3,y:2.35,z:-2.5,s:[1.1,1.1,1.1]},{x:3.3,y:2.35,z:-9,s:[1.1,1.1,1.1]}]);
    if(variant===2)addInstances(chunk,box,colors.glass,[{x:-4.1,y:1.8,z:-4.5,s:[.7,3.6,3.2]},{x:4.1,y:1.8,z:-9,s:[.7,3.6,3.2]}]);
  }

  function addLaboratory(chunk,index,variant=0){
    addInstances(chunk,beamGeo,colors.mid,[{x:-2.55,y:2.3,z:-5,s:[.22,4.4,.28]},{x:2.55,y:2.3,z:-5,s:[.22,4.4,.28]},{x:0,y:4.45,z:-5,s:[5.2,.2,.3]}]);
    const pods=addInstances(chunk,podGeo,transparentGlass,[{x:-2.36,y:1.85,z:-2.8,s:[.55,.85,.55]},{x:2.36,y:2.3,z:-8,s:[.5,.8,.5]}]);
    const core=addInstances(chunk,sphereGeo,glowMat,[{x:-2.36,y:1.85,z:-2.8,s:.19},{x:2.36,y:2.3,z:-8,s:.18}]);
    const turbine=addMesh(chunk,torusGeo,colors.glass,{x:index%2===0?-2.7:2.7,y:2.45,z:-10.2,sx:.74,sy:.74,sz:.74});
    rotating.push({object:turbine,axis:'z',rate:1.2,base:0});
    const streaks=addInstances(chunk,beamGeo,colors.accent,[{x:-2.15,y:.7,z:-7,s:[.055,.055,2.3]},{x:2.18,y:3.65,z:-3,s:[.045,.045,1.8]}]);
    if(streaks)animated.push({object:streaks,kind:'streak'});if(pods)animated.push({object:pods,kind:'pod'});if(core)animated.push({object:core,kind:'core'});
    if(variant===1){const fan=addMesh(chunk,cachedGeometry('lab-fan','TorusGeometry',.82,.09,7,24),colors.glow,{x:index%2===0?-2.7:2.7,y:2.45,z:-10.2});rotating.push({object:fan,axis:'z',rate:1.8,base:0});}
    if(variant===2)addInstances(chunk,beamGeo,colors.glass,[{x:-2.45,y:3.9,z:-2.5,s:[.18,.18,5]},{x:2.45,y:3.9,z:-8.5,s:[.18,.18,5]},{x:-2.45,y:3.65,z:-2.5,s:[.18,.65,.18]},{x:2.45,y:3.65,z:-8.5,s:[.18,.65,.18]}]);
  }

  function addAsteroid(chunk,index,variant=0){
    addInstances(chunk,sphereGeo,rockMat,[{x:-3.8,y:1.3,z:-2,s:[1.2,.9,.8]},{x:3.6,y:3,z:-8,s:[1.3,1.1,1]},{x:-4.4,y:3.7,z:-10,s:[.7,.6,.6]}]);
    const rocks=addInstances(chunk,octaGeo,colors.mid,[{x:-3.6,y:2.5,z:-7,s:[.75,.9,.8]},{x:3.8,y:1.35,z:-3.8,s:[.8,.7,.9]}]);
    if(rocks)rotating.push({object:rocks,axis:'y',rate:.23,base:index*.4});
    const tracers=addInstances(chunk,beamGeo,colors.accent,[{x:-2.5,y:3.1,z:-2.2,s:[.035,.035,3.4]},{x:2.55,y:1.2,z:-9,s:[.03,.03,3.8]}]);
    if(tracers)animated.push({object:tracers,kind:'streak'});
    if(variant===1)addInstances(chunk,box,colors.mid,[{x:-3.3,y:3.8,z:-5,s:[1.2,.12,5]},{x:-3.9,y:3.4,z:-5,s:[.12,.85,.12]},{x:3.3,y:.55,z:-8,s:[1.2,.12,5]}]);
    if(variant===2){const planet=addMesh(chunk,cachedGeometry('asteroid-planet','SphereGeometry',1,12,8),colors.glass,{x:8,y:5.7,z:-10,sx:2.5,sy:2.5,sz:2.5});planet.material=colors.glass;}
  }

  const motifBuilders={tropical:addTropical,castle:addCastle,rainbow:addRainbow,loopway:addLoopway,laboratory:addLaboratory,asteroid:addAsteroid};
  for(let i=0;i<CHUNK_COUNT;i++){
    const chunk=new THREE.Group();chunk.name=`${biomeId}-chunk-${i}`;chunk.userData.slot=i;group.add(chunk);
    const variants=[];
    for(let v=0;v<3;v++){
      const landmark=new THREE.Group();landmark.name=`landmark-section-${v}`;landmark.visible=v===0;chunk.add(landmark);
      (motifBuilders[biomeId]??addTropical)(landmark,i,v);
      variants.push(landmark);
    }
    makeSign(chunk,i);chunks.push({group:chunk,variants});
  }

  let stars=null;
  if(biomeId==='asteroid'){
    const points=[];let state=0x5319ac7d;
    const rand=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
    for(let i=0;i<420;i++)points.push((rand()-.5)*72,(rand()-.5)*46,-8-rand()*105);
    const starGeometry=geometry('BufferGeometry');starGeometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
    stars=new THREE.Points(starGeometry,material('PointsMaterial',{color:'#d9eeff',size:.075,sizeAttenuation:true}));group.add(stars);
  }else if(biomeId==='rainbow'){
    const points=[];let state=0x8248ab1;
    const rand=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
    for(let i=0;i<190;i++)points.push((rand()-.5)*44,3+rand()*17,-4-rand()*100);
    const starGeometry=geometry('BufferGeometry');starGeometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
    stars=new THREE.Points(starGeometry,material('PointsMaterial',{color:'#ffffff',size:.065,sizeAttenuation:true}));group.add(stars);
  }

  let rainbowRoad=null;
  if(biomeId==='rainbow'){
    const bands=[];
    for(let band=0;band<7;band++)for(let tile=0;tile<CHUNK_COUNT;tile++)bands.push({x:-2.46+band*.82,y:-.015,z:-6-tile*CHUNK_LENGTH,s:[.82,.055,CHUNK_LENGTH],color:palette[band]});
    rainbowRoad=addInstances(group,box,rainbowRibbonMat,bands);
    bands.forEach((band,i)=>rainbowRoad?.setColorAt(i,new THREE.Color(band.color)));
    if(rainbowRoad?.instanceColor)rainbowRoad.instanceColor.needsUpdate=true;
  }

  // Far silhouettes and sky color are scenery-owned, so callers only add the group.
  if(biomeId!=='asteroid'){
    const sky=addMesh(group,geometry('PlaneGeometry',150,90),material('MeshBasicMaterial',{color:biome.bg,side:THREE.DoubleSide}),{x:0,y:12,z:-120});
    sky.renderOrder=-10;
  }

  function sectionValue(value){
    const n=Number(value);if(!Number.isFinite(n)||n<0)return 0;
    return Math.floor(n>2?n/30:n)%3;
  }
  function update({distance=0,time=0,section:nextSection=section,speed=5.2,boost=false,turn=0}={}){
    const d=Number.isFinite(distance)?Math.max(0,distance):0;
    const whole=Math.floor(d/CHUNK_LENGTH),offset=d%CHUNK_LENGTH;
    const variant=sectionValue(nextSection),bend=clamp(Number(turn)||0,-1,1);
    for(let i=0;i<CHUNK_COUNT;i++){
      const absolute=whole+i,slot=mod(absolute,CHUNK_COUNT),chunk=chunks[slot];
      chunk.group.position.set(Math.sin((d+i*CHUNK_LENGTH)*.009)*.32+bend*(i/CHUNK_COUNT)*.1,0,offset-i*CHUNK_LENGTH);
      const activeVariant=mod(Math.floor(absolute/3)+variant,3);
      chunk.variants.forEach((landmark,index)=>{landmark.visible=index===activeVariant;});
    }
    const flow=clamp((Number(speed)||5.2)/5.2,.5,1.8)*(boost?1.32:1);
    if(rainbowRoad){
      let instance=0;
      for(let band=0;band<7;band++)for(let tile=0;tile<CHUNK_COUNT;tile++){
        matrixHelper.position.set(-2.46+band*.82,-.015,offset-tile*CHUNK_LENGTH-6);
        matrixHelper.rotation.set(0,0,0);matrixHelper.scale.set(.82,.055,CHUNK_LENGTH);matrixHelper.updateMatrix();
        rainbowRoad.setMatrixAt(instance++,matrixHelper.matrix);
      }
      rainbowRoad.instanceMatrix.needsUpdate=true;
    }
    for(const item of rotating){
      const angle=(Number(time)||0)*item.rate*flow+item.base;
      item.object.rotation[item.axis]=angle;
    }
    for(const item of animated){
      if(item.kind==='streak')item.object.userData.flowPhase=(d*flow)%CHUNK_LENGTH;
      else if(item.kind==='pod')item.object.rotation.y=Math.sin((Number(time)||0)*.4)*.035;
      else if(item.kind==='core')item.object.rotation.y=(Number(time)||0)*.2;
    }
    if(stars)stars.position.z=(d%96)*.6;
    // Turn changes only the corridor's distant visual sweep; player controls stay independent.
  }
  update({distance:0,section,speed:5.2,turn:0});

  let disposed=false;
  function dispose(){
    if(disposed)return;disposed=true;
    group.removeFromParent?.();
    for(const item of geometries)item.dispose?.();
    for(const item of materials)item.dispose?.();
    for(const item of textures)item.dispose?.();
    chunks.length=0;animated.length=0;rotating.length=0;
  }
  return {group,update,dispose};
}

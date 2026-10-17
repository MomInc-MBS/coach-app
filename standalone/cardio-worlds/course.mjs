export const METRO_BUSES=[
  {id:'bus-a',lane:0,start:70,rampEnd:86,roofEnd:110,end:126,height:3.2},
  {id:'bus-b',lane:1,start:210,rampEnd:226,roofEnd:252,end:268,height:3.2},
  {id:'bus-c',lane:-1,start:360,rampEnd:376,roofEnd:408,end:424,height:3.2}
];
export function courseBuses(world,leg=0){return world===2?METRO_BUSES.map(b=>({...b,lane:leg%2?-b.lane:b.lane})):[];}
export function surfaceAt(world,distance,lane,leg=0){
  const b=courseBuses(world,leg).find(b=>b.lane===lane&&distance>=b.start&&distance<=b.end);
  if(!b)return {height:0,type:'ground',id:null};
  const height=distance<b.rampEnd?b.height*(distance-b.start)/(b.rampEnd-b.start):distance>b.roofEnd?b.height*(b.end-distance)/(b.end-b.roofEnd):b.height;
  return {height,type:distance>=b.rampEnd&&distance<=b.roofEnd?'roof':'ramp',id:b.id};
}
export const POWER_KITS=[['headstart','magnet','shield','boost','superJump','recovery'],['magnet','phase','doubleCoins','coinTier','recovery','shield','boost'],['jetpack','superJump','magnet','board','scoreBoost','pogo']];
const pickupCache=new Map(),coinCache=new Map();
export function coursePickups(world,leg=0){
  if(leg%2){const items=coursePickups(world).map(p=>({...p,lane:-p.lane}));if(world===0)items.push({id:'power-0-return-headstart',kind:'headstart',distance:10,lane:0,height:1.15});return items;}
  if(pickupCache.has(world))return pickupCache.get(world);
  const items=[];for(let pass=0;pass<2;pass++)for(const [i,kind] of (POWER_KITS[world]||[]).entries()){
    if(kind==='headstart')continue;const distance=kind==='headstart'?10:32+i*25+pass*240,lane=kind==='headstart'?0:(i%3)-1;
    items.push({id:`power-${world}-${pass}-${kind}`,kind,distance,lane,height:surfaceAt(world,distance,lane).height+1.15});
  }
  if(world===2)for(const [i,b] of METRO_BUSES.entries()){const distance=(b.rampEnd+b.roofEnd)/2;items.push({id:`roof-power-${i}`,kind:['jetpack','board','pogo'][i],lane:b.lane,distance,height:b.height+1.15});}
  pickupCache.set(world,items);return items;
}
export function courseCoins(world,leg=0){
  if(leg%2)return courseCoins(world).map(c=>({...c,lane:-c.lane}));
  if(coinCache.has(world))return coinCache.get(world);
  const items=[];for(let distance=20;distance<545;distance+=4){const lane=Math.floor(distance/32)%3-1;items.push({id:`coin-${distance}`,distance,lane,height:surfaceAt(world,distance,lane).height+1});}
  if(world===2)for(const b of METRO_BUSES)for(let distance=b.start;distance<=b.end;distance+=3)items.push({id:`coin-${b.id}-${distance}`,distance,lane:b.lane,height:surfaceAt(world,distance,b.lane).height+1});
  coinCache.set(world,items);return items;
}
export function jumpHeight(r){return r.jump>0?Math.sin(Math.min(1,r.jump/(r.jumpDuration||1.4))*Math.PI)*(r.jumpPeak||1.7):0;}

// Crossed-distance collection lives in simulation, independent of rendering FPS or screenshots.
export function collectCourse(r,from,to,{coin,power}){
  if(to<from||r.phase==='wormhole')return;
  const reached=(o,attract=false)=>o.distance>from&&o.distance<=to&&(o.lane===r.lane||(attract&&r.powers.magnet>0)||r.powers.jetpack>0)&&Math.abs(o.height-(r.elevation+1.15+jumpHeight(r)+(r.powers.jetpack?3:0)))<((attract&&r.powers.magnet)||r.powers.jetpack?5:1.8);
  for(const c of courseCoins(r.world,r.leg))if(!r.collected[c.id]&&reached(c,true)){r.collected[c.id]=true;coin(r);}
  for(const p of coursePickups(r.world,r.leg))if(!r.collected[p.id]&&reached(p)){if(power(r,p.kind)!==false){r.collected[p.id]=true;r.lastPickup=p.kind;r.pickupSerial=(r.pickupSerial||0)+1;}}
}

// Each encounter has more than two seconds of clear approach at 12 m/s.
// Additional loops add a second occupied lane, preserving an escape lane and pace.
export function courseHazards(world,loop=0,leg=0){
  if(leg%2)return courseHazards(world,loop).map(h=>({...h,lane:-h.lane}));
  const hazards=[],pickups=coursePickups(world);
  const stations=[68,152,236,320,404,488,536];
  if(loop>=2)stations.push(110,194,278,362,446);
  stations.sort((a,b)=>a-b);
  for(const [i,distance] of stations.entries()){
    const preferred=[-1,0,1].map((_,n)=>((i+world+n)%3)-1);
    const available=preferred.filter(lane=>!pickups.some(p=>p.lane===lane&&Math.abs(p.distance-distance)<16)&&!(world===2&&METRO_BUSES.some(b=>b.lane===lane&&distance+3>=b.start-12&&distance<=b.end+12)));
    const count=Math.min(available.length,1+(loop>0?1:0));
    for(let n=0;n<count;n++)hazards.push({id:`hazard-${world}-${i}-${n}`,lane:available[n],distance,elevation:0,type:(i+n+world+Math.max(0,Math.floor(loop)))%2?'slide':'jump',height:(i+n+world+Math.max(0,Math.floor(loop)))%2?1.05:.85,length:2.4});
  }
  return hazards;
}

// Test the full crossed footprint, including entry/exit between simulation steps.
// Timer interpolation prevents a jump button press from counting as clearance.
export function collideCourse(r,from,to,{jumpBefore,slideBefore,dt,onHit,onDodge=()=>{}}){
  if(to<=from||r.phase!=='run')return;
  r.hazardsSeen ||= {};
  for(const h of courseHazards(r.world,r.loop,r.leg)){
    if(r.hazardsSeen[h.id]||to<h.distance)continue;
    if(h.lane!==r.lane){if(to>=h.distance+h.length){r.hazardsSeen[h.id]=true;onDodge(r,{...h,reason:'lane'});}continue;}
    if(from>h.distance+h.length){r.hazardsSeen[h.id]=true;continue;}
    const entry=Math.max(from,h.distance),exit=Math.min(to,h.distance+h.length);
    const elapsed=d=>dt*(d-from)/(to-from);
    const clearance=d=>jumpHeight({...r,jump:Math.max(0,jumpBefore-elapsed(d))});
    const ducking=d=>slideBefore-elapsed(d)>0;
    const blocked=h.type==='jump'?Math.min(clearance(entry),clearance(exit))<h.height:!ducking(entry)||!ducking(exit)||Math.max(clearance(entry),clearance(exit))+.65>h.height;
    if(blocked){r.hazardsSeen[h.id]=true;onHit(r,h);}
    else if(to>=h.distance+h.length){r.hazardsSeen[h.id]=true;onDodge(r,{...h,reason:h.type});}
  }
}

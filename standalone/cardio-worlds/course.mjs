export const METRO_BUSES=[
  {id:'bus-a',lane:0,start:70,rampEnd:86,roofEnd:110,end:126,height:3.2},
  {id:'bus-b',lane:1,start:210,rampEnd:226,roofEnd:252,end:268,height:3.2},
  {id:'bus-c',lane:-1,start:360,rampEnd:376,roofEnd:408,end:424,height:3.2}
];
export function surfaceAt(world,distance,lane){
  const b=world===2&&METRO_BUSES.find(b=>b.lane===lane&&distance>=b.start&&distance<=b.end);
  if(!b)return {height:0,type:'ground',id:null};
  const height=distance<b.rampEnd?b.height*(distance-b.start)/(b.rampEnd-b.start):distance>b.roofEnd?b.height*(b.end-distance)/(b.end-b.roofEnd):b.height;
  return {height,type:distance>=b.rampEnd&&distance<=b.roofEnd?'roof':'ramp',id:b.id};
}
export const POWER_KITS=[['headstart','magnet','shield','boost','superJump','recovery'],['magnet','phase','doubleCoins','coinTier','recovery','shield','boost'],['jetpack','superJump','magnet','board','scoreBoost','pogo']];
const pickupCache=new Map(),coinCache=new Map();
export function coursePickups(world){
  if(pickupCache.has(world))return pickupCache.get(world);
  const items=[];for(let pass=0;pass<2;pass++)for(const [i,kind] of (POWER_KITS[world]||[]).entries()){
    if(kind==='headstart'&&pass)continue;const distance=kind==='headstart'?10:32+i*25+pass*240,lane=kind==='headstart'?0:(i%3)-1;
    items.push({id:`power-${world}-${pass}-${kind}`,kind,distance,lane,height:surfaceAt(world,distance,lane).height+1.15});
  }
  if(world===2)for(const [i,b] of METRO_BUSES.entries()){const distance=(b.rampEnd+b.roofEnd)/2;items.push({id:`roof-power-${i}`,kind:['jetpack','board','pogo'][i],lane:b.lane,distance,height:b.height+1.15});}
  pickupCache.set(world,items);return items;
}
export function courseCoins(world){
  if(coinCache.has(world))return coinCache.get(world);
  const items=[];for(let distance=20;distance<545;distance+=4){const lane=Math.floor(distance/32)%3-1;items.push({id:`coin-${distance}`,distance,lane,height:surfaceAt(world,distance,lane).height+1});}
  if(world===2)for(const b of METRO_BUSES)for(let distance=b.start;distance<=b.end;distance+=3)items.push({id:`coin-${b.id}-${distance}`,distance,lane:b.lane,height:surfaceAt(world,distance,b.lane).height+1});
  coinCache.set(world,items);return items;
}
export function jumpHeight(r){return r.jump>0?Math.sin(Math.min(1,r.jump/(r.jumpDuration||1.4))*Math.PI)*(r.jumpPeak||1.7):0;}

// Crossed-distance collection lives in simulation, independent of rendering FPS or screenshots.
export function collectCourse(r,from,to,{coin,power}){
  if(to<from||r.phase==='wormhole')return;
  const reached=o=>o.distance>from&&o.distance<=to&&(o.lane===r.lane||r.powers.magnet>0||r.powers.jetpack>0)&&Math.abs(o.height-(r.elevation+1.15+jumpHeight(r)+(r.powers.jetpack?3:0)))<(r.powers.magnet||r.powers.jetpack?5:1.8);
  for(const c of courseCoins(r.world))if(!r.collected[c.id]&&reached(c)){r.collected[c.id]=true;coin(r);}
  for(const p of coursePickups(r.world))if(!r.collected[p.id]&&reached(p)){r.collected[p.id]=true;power(r,p.kind);r.lastPickup=p.kind;r.pickupSerial=(r.pickupSerial||0)+1;}
}

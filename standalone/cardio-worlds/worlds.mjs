import {surfaceAt,jumpHeight,collectCourse,collideCourse,courseHazards} from './course.mjs';
export const WORLDS=[{id:'metal',name:'Crown Foundry',length:600},{id:'temple',name:'Verdant Ruins',length:600},{id:'metro',name:'Neon Transit',length:600}];
export const POWERS={magnet:{duration:12},shield:{duration:10},doubleCoins:{duration:15},boost:{duration:6},jetpack:{duration:8},superJump:{duration:12},board:{duration:15},headstart:{instant:true},scoreBoost:{duration:15},phase:{duration:8},pogo:{instant:true},recovery:{duration:30},coinTier:{duration:20}};
export function createWorldRun({unlocked=0}={}){return {world:0,leg:0,mirrored:false,time:0,arrivalSerial:0,arrivalTime:0,eventSerial:0,lastEvent:null,events:[],destroyed:{},distance:0,totalDistance:0,coins:0,score:0,unlocked:Number.isFinite(unlocked)?Math.max(0,Math.min(2,Math.floor(unlocked))):0,phase:'run',lane:0,jump:0,jumpDuration:1.4,slide:0,powers:{},loop:0,stumbles:0,stumble:0,_wormholeElapsed:0,headstartUsed:false,elevation:0,collected:{},hazardsSeen:{},hazardSerial:0,lastHazard:null,lastPickup:null,jumpPeak:1.7};}
export function advance(r,delta,{moving=true,pace=1}={}){
  let left=Number.isFinite(delta)?Math.max(0,Math.min(delta,.25)):0;
  const gait=Number.isFinite(pace)?Math.max(0,Math.min(1,pace)):1;
  while(left>1e-8){const dt=Math.min(.05,left);left-=dt;
    r.time=(r.time||0)+dt;
    const jumpBefore=r.jump,slideBefore=r.slide;
    r.jump=Math.max(0,r.jump-dt);r.slide=Math.max(0,r.slide-dt);r.stumble=Math.max(0,(r.stumble||0)-dt);
    for(const id of Object.keys(r.powers)){r.powers[id]=Math.max(0,r.powers[id]-dt);if(!r.powers[id])delete r.powers[id];}
    if(r.phase==='wormhole'){r._wormholeElapsed+=dt;if(r._wormholeElapsed>=1.8-1e-8){if(r.leg===0)r.leg=1;else{r.leg=0;r.world=(r.world+1)%3;if(r.world===0)r.loop++;}r.mirrored=r.leg===1;r.arrivalSerial++;r.arrivalTime=r.time;r.unlocked=Math.max(r.unlocked,r.world);r.distance=0;r.elevation=0;r.collected={};r.hazardsSeen={};r.destroyed={};r.lastPickup=null;r.phase='run';r._wormholeElapsed=0;r.jump=0;r.slide=0;}continue;}
    if(r.phase==='run'&&moving){
      const from=r.distance,step=Math.min(12*dt*gait,600-r.distance);r.distance+=step;r.totalDistance+=step;r.score+=step*(r.powers.scoreBoost?2:1);
      let surface=surfaceAt(r.world,r.distance,r.lane,r.leg);
      // Walking up a ramp is continuous. Entering a bus side in flight cannot
      // promote a below-roof runner to the surface when flight expires.
      if(surface.height>r.elevation+.2){
        if(!r.powers.jetpack){const safe=[-1,0,1].filter(l=>surfaceAt(r.world,r.distance,l,r.leg).height<=r.elevation+.2).sort((a,b)=>Math.abs(a-r.lane)-Math.abs(b-r.lane));if(safe.length){hit(r,{id:surface.id,type:'bus-side'});r.lane=safe[0];surface=surfaceAt(r.world,r.distance,r.lane,r.leg);}}
      }else r.elevation=surface.height>=r.elevation-.15?surface.height:Math.max(surface.height,r.elevation-dt*6);
      collideCourse(r,from,r.distance,{jumpBefore,slideBefore,dt,onHit:(r,h)=>{hit(r,h);if(r.lastHazard?.result!=='bypass')r.destroyed[h.id]=true;},onDodge:(r,h)=>emitRunEvent(r,'dodge',h)});
      collectCourse(r,from,r.distance,{coin:collectCoin,power:collectPower});
      if(r.distance>=600-1e-8){r.distance=600;r.phase='portal';}
    }
  }
}
export function act(r,a){if(r.phase==='wormhole')return;if(a==='jump'){if(r.jump<=0){r.jumpDuration=r.powers.superJump?2.2:1.4;r.jump=r.jumpDuration;r.jumpPeak=r.powers.superJump?3.5:1.7;r.slide=0;}if(r.phase==='portal')enterPortal(r);}else if(a==='slide'&&r.phase==='run'){r.slide=.8;r.jump=0;}else if(['left','moveLeft','right','moveRight'].includes(a)){const lane=Math.max(-1,Math.min(1,r.lane+(['left','moveLeft'].includes(a)?-1:1)));const next=surfaceAt(r.world,r.distance,lane,r.leg);if(next.height>r.elevation+jumpHeight(r)+.4&&!r.powers.phase&&!r.powers.jetpack){hit(r,{id:next.id,type:'bus-side'});return;}if(next.height>r.elevation+.4&&!r.powers.jetpack){r.elevation=next.height;r.jump=0;}r.lane=lane;}}
export function enterPortal(r){if(r.phase!=='portal'||r.jump<=0)return false;r.phase='wormhole';r._wormholeElapsed=0;return true;}
export function collectPower(r,id){const p=POWERS[id];if(!p||r.phase!=='run')return false;if(id==='headstart'){if(r.headstartUsed||r.world!==0||r.loop!==0||r.distance>150)return false;r.totalDistance+=Math.max(0,150-r.distance);r.distance=Math.max(r.distance,150);r.headstartUsed=true;}else if(id==='pogo'){r.jumpDuration=2.2;r.jump=2.2;r.jumpPeak=3.5;r.slide=0;collectCoin(r,5);}else r.powers[id]=p.duration;return true;}
export function hit(r,hazard={id:'impact',type:'impact'}){
  if(r.phase!=='run')return;
  let result='stumble',protection=null;
  for(const id of ['jetpack','boost','phase'])if(r.powers[id]){result='bypass';protection=id;break;}
  if(result==='stumble')for(const id of ['shield','board','recovery'])if(r.powers[id]){delete r.powers[id];result='absorbed';protection=id;break;}
  if(result==='stumble'){r.stumbles++;r.stumble=.9;r.score=Math.max(0,r.score-25);}
  r.lastHazard={...hazard,result,protection};r.hazardSerial=(r.hazardSerial||0)+1;
  emitRunEvent(r,result==='bypass'?'dodge':'hit',r.lastHazard);
  return result;
}
export function collectCoin(r,count=1){if(r.phase!=='run'||!Number.isFinite(count)||count<=0)return;const n=Math.floor(count);r.coins+=n*(r.powers.doubleCoins?2:1)*(r.powers.coinTier?3:1);r.score+=n*10*(r.powers.scoreBoost?2:1);}

export function emitRunEvent(r,type,data={}){
  const e={...data,type,world:r.world,leg:r.leg,lane:data.lane??r.lane,distance:data.distance??r.distance,serial:++r.eventSerial,time:r.time};
  r.lastEvent=e;r.events.push(e);if(r.events.length>32)r.events.shift();return e;
}
export function punchCourse(r,id){
  if(r.phase!=='run')return false;
  const h=courseHazards(r.world,r.loop,r.leg).find(h=>h.id===id);
  if(!h||r.hazardsSeen[id]||h.distance<r.distance||Math.hypot(h.distance-r.distance,(h.lane-r.lane)*2.8)>7.5)return false;
  r.hazardsSeen[id]=true;r.destroyed[id]=true;r.score+=15;emitRunEvent(r,'punch',{...h,result:'destroyed'});return true;
}
export function resolveThrowMiss(r,o){
  if(r.phase!=='run')return 'inactive';
  const feet=jumpHeight(r)+(r.powers.jetpack?3:0),top=feet+(r.slide>0?.7:1.8);
  const touches=Math.abs(o.x-r.lane)*2.8<=o.r+.4&&o.y+o.r>=feet&&o.y-o.r<=top;
  const data={id:'throw-'+o.id,kind:'throw',lane:o.x,distance:r.distance+o.d};
  if(touches)return hit(r,data);
  emitRunEvent(r,'dodge',{...data,result:'clear'});return 'dodge';
}

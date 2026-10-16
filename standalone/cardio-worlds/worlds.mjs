export const WORLDS=[{id:'metal',name:'Crown Foundry',length:600},{id:'temple',name:'Verdant Ruins',length:600},{id:'metro',name:'Neon Transit',length:600}];
export const POWERS={magnet:{duration:12},shield:{duration:10},doubleCoins:{duration:15},boost:{duration:6},jetpack:{duration:8},superJump:{duration:12},board:{duration:15},headstart:{instant:true},scoreBoost:{duration:15},phase:{duration:8},pogo:{instant:true},recovery:{duration:30},coinTier:{duration:20}};
export function createWorldRun({unlocked=0}={}){return {world:0,distance:0,totalDistance:0,coins:0,score:0,unlocked:Number.isFinite(unlocked)?Math.max(0,Math.min(2,Math.floor(unlocked))):0,phase:'run',lane:0,jump:0,jumpDuration:1.4,slide:0,powers:{},loop:0,stumbles:0,_wormholeElapsed:0,headstartUsed:false};}
export function advance(r,delta,{moving=true}={}){
  let left=Number.isFinite(delta)?Math.max(0,Math.min(delta,.25)):0;
  while(left>1e-8){const dt=Math.min(.05,left);left-=dt;
    r.jump=Math.max(0,r.jump-dt);r.slide=Math.max(0,r.slide-dt);
    for(const id of Object.keys(r.powers)){r.powers[id]=Math.max(0,r.powers[id]-dt);if(!r.powers[id])delete r.powers[id];}
    if(r.phase==='wormhole'){r._wormholeElapsed+=dt;if(r._wormholeElapsed>=1.8-1e-8){r.world=(r.world+1)%3;if(r.world===0)r.loop++;r.unlocked=Math.max(r.unlocked,r.world);r.distance=0;r.phase='run';r._wormholeElapsed=0;r.jump=0;r.slide=0;}continue;}
    if(r.phase==='run'&&moving){const step=Math.min(12*dt,600-r.distance);r.distance+=step;r.totalDistance+=step;r.score+=step*(r.powers.scoreBoost?2:1);if(r.distance>=600-1e-8){r.distance=600;r.phase='portal';}}
  }
}
export function act(r,a){if(r.phase==='wormhole')return;if(a==='jump'){if(r.jump<=0){r.jumpDuration=r.powers.superJump?2.2:1.4;r.jump=r.jumpDuration;r.slide=0;}if(r.phase==='portal')enterPortal(r);}else if(a==='slide'&&r.phase==='run'){r.slide=.8;r.jump=0;}else if(a==='left'||a==='moveLeft')r.lane=Math.max(-1,r.lane-1);else if(a==='right'||a==='moveRight')r.lane=Math.min(1,r.lane+1);}
export function enterPortal(r){if(r.phase!=='portal'||r.jump<=0)return false;r.phase='wormhole';r._wormholeElapsed=0;return true;}
export function collectPower(r,id){const p=POWERS[id];if(!p||r.phase!=='run')return false;if(id==='headstart'){if(r.headstartUsed||r.world!==0||r.loop!==0||r.distance>150)return false;r.totalDistance+=Math.max(0,150-r.distance);r.distance=Math.max(r.distance,150);r.headstartUsed=true;}else if(id==='pogo'){r.jumpDuration=2.2;r.jump=2.2;collectCoin(r,5);}else r.powers[id]=p.duration;return true;}
export function hit(r){if(r.phase!=='run')return;if(r.powers.jetpack||r.powers.boost||r.powers.phase)return;for(const id of ['shield','board','recovery'])if(r.powers[id]){delete r.powers[id];return;}r.stumbles++;}
export function collectCoin(r,count=1){if(r.phase!=='run'||!Number.isFinite(count)||count<=0)return;const n=Math.floor(count);r.coins+=n*(r.powers.doubleCoins?2:1)*(r.powers.coinTier?3:1);r.score+=n*10*(r.powers.scoreBoost?2:1);}

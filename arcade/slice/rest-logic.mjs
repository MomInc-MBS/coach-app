// Rest-mode (touch + tilt) pieces of Fruit Ninja rest. Pure logic, no DOM: the shared engine is arcade/slice/core.mjs.
export const REST={dodgeSpeed:420,tiltGain:2.2,stillMotion:.9,laserTelegraph:1000,laserEvery:[9000,14000],throwEvery:[1400,700],strikesMax:3,firstThrowDelay:0};

// Dodger: the user's character slides along the floor. gx (screen-right gravity, -1..1) from the phone, keys / drag as fallback.
export function createDodger(width,margin=40){
 let x=width/2,target=x,key=0;
 const clamp=v=>Math.min(width-margin,Math.max(margin,v));
 return {
  get x(){return x;},
  resize(w){const f=x/width;width=w;x=clamp(f*w);target=x;},
  tilt(gx){target=clamp(width/2+Math.max(-1,Math.min(1,gx*REST.tiltGain))*(width/2-margin));},
  drag(px){target=clamp(px);},
  key(dir){key=dir;},
  step(dt){if(key)target=clamp(target+key*REST.dodgeSpeed*dt);const d=target-x,m=REST.dodgeSpeed*1.6*dt;x=clamp(x+Math.max(-m,Math.min(m,d)));return x;},
 };
}

// Thrower: coach at the top aims where the character is now, so dodging matters. Waves get faster with wave number.
export function throwPlan(wave,coachX,dodgerX,rand=Math.random){
 const [a,b]=REST.throwEvery,gap=Math.max(b,a-wave*90),spread=(rand()-.5)*80;
 return {gap,x:coachX,aimX:dodgerX+spread,count:1+Math.floor(wave/3)};
}

// Swipe: pointer path -> segments to push through core.hitSegment; a path that never moves far is a tap.
export function createSwipe(tapRadius=10){
 let last=null,start=null,far=false;
 return {
  down(p){last=start=p;far=false;return null;},
  move(p){if(!last)return null;const seg=[last,p];last=p;if(Math.hypot(p.x-start.x,p.y-start.y)>tapRadius)far=true;return seg;},
  up(){const tap=last&&!far?start:null;last=start=null;return tap;},
  get moved(){return far;},
 };
}

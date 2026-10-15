// Fruit-Ninja slice engine: input-agnostic (pose limbs, finger swipes, taps all call hitSegment) + 2D pixel renderer.
// Logical canvas is small (default 180x320); scale it up in CSS with image-rendering:pixelated.
// Optional art: arcade/slice/sprites/<type>.png = 8 rotation frames of 64px cells in one row (Tripo renders replace the procedural pixels).
// [main, shade, light] per object id. Every id's art is arcade/slice/sprites/<id>.png (Tripo render) or, until it exists,
// the canister placeholder sheet tinted with the main colour.
import {XP_SCALE} from '../../progression-rules.mjs';
export const TYPES={'asteroid-rock':['#8a7a68','#5e5246','#b9a88f'],'asteroid-ember':['#d0552a','#7a2a14','#ffb070'],'ice-comet':['#9fdcff','#4f9fd8','#ffffff'],'mini-planet':['#c060d8','#6a3a9c','#ffd27a'],moon:['#cfcfd8','#8d8d9a','#f4f4ff'],'sun-chunk':['#ffb400','#ff5a1f','#fff3a0'],'satellite-junk':['#9aa6b4','#4a5566','#e8f0ff'],'xp-star':['#ffe14a','#c8901a','#fffbd0'],'xp-orb':['#4affc8','#1a9c80','#d8fff4']};
export const TYPE_IDS=Object.keys(TYPES).filter(k=>!k.startsWith('xp-'));
export const BONUS_IDS=['xp-star','xp-orb'];
const GRAVITY=260,TAU=Math.PI*2,HALF_LIFE=1.25;
export function rng(seed=1){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export function distPointSeg(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l)):0;return Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy));}
// Straight shot (punch, kick) vs looping shot (chop, hook, roundhouse): sideways bow of the last ~6 points relative to the chord.
export function pathCurvature(pts){
 const p=pts.slice(-6);if(p.length<3)return 0;
 const a=p[0],b=p[p.length-1],chord=Math.hypot(b.x-a.x,b.y-a.y);let path=0,bow=0;
 for(let i=1;i<p.length;i++)path+=Math.hypot(p[i].x-p[i-1].x,p[i].y-p[i-1].y);
 if(path<1e-9)return 0;
 for(const q of p)bow=Math.max(bow,distPointSeg(q,a,b));
 return chord<path*.25?1:Math.min(1,bow/Math.max(chord,1e-9)*2); // loops back on itself = fully curved
}
export const pathKind=(pts,limit=.2)=>pathCurvature(pts)>limit?'slice':'explode';
// samples = whole-body motion per second (screen heights/s); still enough = shield up.
export const stillness=(samples,max=.1)=>samples.length>0&&samples.reduce((s,v)=>s+v,0)/samples.length<=max;

export function createSlice({w=180,h=320,seed=1,mode='martial',auto=true,coachX=w/2,stillMax=.1,strikes=true,onEvent=()=>{}}={}){
 const rand=rng(seed),pick=a=>a[Math.floor(rand()*a.length)];
 const e={w,h,mode,coachX,objects:[],halves:[],parts:[],stains:[],trail:[],pops:[],t:0,wave:0,strikes:0,score:0,xp:0,combo:0,best:0,hits:0,over:false,
  laser:{phase:'idle',t:0,tx:0,ty:0,samples:[],result:null,flash:0},cool:0,spawnIn:1,bonusIn:4,swipeAt:-9,swipeN:0,speed:1};
 const emit=(type,data)=>onEvent(type,data);
 const pop=(text,x,y,c='#fff',big=false)=>e.pops.push({text,x,y,c,big,life:big?1.1:.8});
 function mk(type,x,y,vx,vy,r,bonus=false){const o={type,x,y,vx,vy,r,rot:rand()*TAU,vr:(rand()-.5)*8,bonus,alive:true,seed:Math.floor(rand()*1e6)};e.objects.push(o);return o;}
 // Parabola from the coach at the bottom toward the user: same apex every wave; speed scales gravity so later waves fall faster, not higher.
 e.launch=()=>{const tx=w*(.15+rand()*.7),apex=h*(.45+rand()*.35),g=GRAVITY*e.speed*e.speed,vy=-Math.sqrt(2*g*apex),T=-2*vy/g;
  const o=mk(pick(TYPE_IDS),coachX,h-4,(tx-coachX)/T,vy,11+rand()*6);o.g=g;return o;};
 // Generic thrower (rest mode: coach throws DOWN from the top): e.spawn({type,x,y,vx,vy,r,bonus}); non-bonus objects feel gravity.
 e.spawn=({type=pick(TYPE_IDS),x,y,vx=0,vy=0,r=12,bonus=false})=>mk(type,x,y,vx,vy,r,bonus);
 e.dropBonus=()=>mk(pick(BONUS_IDS),w*(.1+rand()*.8),-12,(rand()-.5)*6,22+rand()*10,9,true);
 e.spawnWave=()=>{const n=Math.min(8,2+e.wave);for(let i=0;i<n;i++){const o=e.launch();o.hold=true;o.delay=i*.35/e.speed;o.vx0=o.vx;o.vy0=o.vy;o.vx=o.vy=0;}};
 function burst(x,y,type,n,spread){const cs=TYPES[type];for(let i=0;i<n;i++){const a=rand()*TAU,s=spread*(.3+rand());e.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-30,life:.5+rand()*.4,c:pick(cs),s:1+Math.floor(rand()*3)});}}
 function award(o,kind,a,b){
  o.alive=false;e.hits++;
  if(kind==='slice'){const ang=Math.atan2(b.y-a.y,b.x-a.x),n=[-Math.sin(ang),Math.cos(ang)];for(const side of[-1,1])e.halves.push({...o,cut:ang,side,life:HALF_LIFE,vx:o.vx*.5+n[0]*side*60,vy:o.vy*.5+n[1]*side*60,rot0:o.rot,hr:0,hvr:side*(2+rand()*4)});burst(o.x,o.y,o.type,8,60);}
  else burst(o.x,o.y,o.type,22,120);
  e.stains.push({c:TYPES[o.type][1],life:4,dots:Array.from({length:7},()=>[o.x+(rand()-.5)*20,o.y+(rand()-.5)*20,1+Math.floor(rand()*3)])}); // juice splat fades on the background
  if(o.bonus){e.xp+=3*XP_SCALE;e.score+=15;pop(`+${3*XP_SCALE} XP`,o.x,o.y-10,'#ffe14a');emit('bonus',{xp:3*XP_SCALE,x:o.x,y:o.y,kind});}
  else{e.score+=10;emit('hit',{kind,x:o.x,y:o.y,type:o.type});}
  if(e.t-e.swipeAt>.45)e.swipeN=0;e.swipeAt=e.t;e.swipeN++;
  if(e.swipeN>=3){const bonus=10*(e.swipeN-2);e.score+=bonus;e.combo=e.swipeN;e.best=Math.max(e.best,e.combo);pop(`COMBO x${e.swipeN}`,w/2,h*.35,'#ff4fd8',true);emit('combo',{n:e.swipeN,bonus});}
 }
 // Sweep a limb/finger segment a->b (logical coords). A tap/touch is a===b. Returns the number of objects hit.
 e.hitSegment=(a,b,{kind='slice',pad=2}={})=>{let n=0;for(const o of e.objects)if(o.alive&&!o.hold&&distPointSeg(o,a,b)<=o.r+pad){award(o,kind,a,b);n++;}e.objects=e.objects.filter(o=>o.alive);return n;};
 e.addTrail=(x,y)=>e.trail.push({x,y,life:.25});
 // Laser (the bomb): ~1s red sight-line, then it fires. feedMotion() collects whole-body motion during the aim window.
 e.laserStart=(tx,ty,aim=1)=>{if(e.laser.phase!=='idle')return false;Object.assign(e.laser,{phase:'aim',t:0,aim,tx,ty,samples:[],result:null});emit('laser-aim',{tx,ty});return true;};
 e.feedMotion=m=>{if(e.laser.phase==='aim')e.laser.samples.push(m);};
 function fire(){const L=e.laser,shield=stillness(L.samples,stillMax);L.phase='fire';L.t=0;L.result=shield?'shield':'hit';
  if(shield){emit('laser-shield',{x:L.tx,y:L.ty});pop('BLOCKED',L.tx,L.ty-20,'#7cf',true);}
  else{L.flash=.35;strike();emit('laser-hit',{x:L.tx,y:L.ty});pop('ZAPPED',L.tx,L.ty-20,'#f44',true);}}
 function strike(){if(e.cool>0)return;e.strikes++;emit('strike',{n:e.strikes});if(e.strikes>=3){e.cool=3;e.strikes=0;e.objects=[];emit('wave-end',{wave:e.wave});pop('WAVE OVER - KEEP GOING',w/2,h*.4,'#fff',true);}}
 e.step=dt=>{
  e.t+=dt;
  if(e.cool>0){e.cool-=dt;if(e.cool<=0)e.speed=Math.max(1,e.speed-.1);}
  else if(auto&&!e.over){
   if(mode==='martial'){e.spawnIn-=dt;if(e.spawnIn<=0&&!e.objects.some(o=>!o.bonus)){e.wave++;e.speed=Math.min(1.5,1+e.wave*.04);e.spawnWave();e.spawnIn=1.2;emit('wave',{wave:e.wave});}}
   e.bonusIn-=dt;if(e.bonusIn<=0){e.dropBonus();e.bonusIn=mode==='hold'?5+rand()*2:2+rand();}
  }
  for(const o of e.objects){
   if(o.hold){o.delay-=dt;if(o.delay<=0){o.hold=false;o.vx=o.vx0;o.vy=o.vy0;}continue;}
   o.rot+=o.vr*dt;o.x+=o.vx*dt;o.y+=o.vy*dt;if(!o.bonus)o.vy+=(o.g||GRAVITY)*dt;
   if(o.vy>0&&o.y>h+o.r){o.alive=false;if(!o.bonus){emit('land',{x:o.x,type:o.type});if(strikes)strike();}} // a missed rock lands = strike
  }
  e.objects=e.objects.filter(o=>o.alive);
  for(const q of e.halves){q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=GRAVITY*dt;q.hr+=q.hvr*dt;q.life-=dt;}e.halves=e.halves.filter(q=>q.life>0&&q.y<h+40);
  for(const q of e.parts){q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=GRAVITY*.6*dt;q.life-=dt;}e.parts=e.parts.filter(q=>q.life>0);
  for(const q of e.stains)q.life-=dt;e.stains=e.stains.filter(q=>q.life>0);
  for(const q of e.trail)q.life-=dt;e.trail=e.trail.filter(q=>q.life>0);
  for(const q of e.pops){q.life-=dt;q.y-=14*dt;}e.pops=e.pops.filter(q=>q.life>0);
  const L=e.laser;if(L.flash>0)L.flash-=dt;
  if(L.phase==='aim'){L.t+=dt;if(L.t>=L.aim)fire();}else if(L.phase==='fire'){L.t+=dt;if(L.t>=(L.result==='shield'?.7:.3))L.phase='idle';}
 };
 return e;
}

// ---- renderer ----
const sheets={},cache={};
// sheet(type): the id's own sheet, else the tinted canister placeholder. null until loaded (procedural pixels meanwhile).
function load(src){return new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=src;});}
function tinted(img,colour){const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d');x.drawImage(img,0,0);x.globalCompositeOperation='multiply';x.fillStyle=colour;x.fillRect(0,0,c.width,c.height);x.globalCompositeOperation='destination-in';x.drawImage(img,0,0);return c;}
function sheet(type){
 if(typeof Image==='undefined')return null;
 if(!(type in sheets)){sheets[type]=null;const base=`/arcade/slice/sprites/`;
  load(base+type+'.png').then(i=>{sheets[type]=i;},()=>load(base+'canister.png').then(i=>{sheets[type]=tinted(i,TYPES[type][0]);},()=>{}));}
 return sheets[type];
}
function procedural(type,seed){ // 16x16 pixel disc, hash-shaded
 const k=type+seed%7;if(cache[k])return cache[k];const c=document.createElement('canvas');c.width=c.height=16;const g=c.getContext('2d'),cs=TYPES[type];
 for(let y=0;y<16;y++)for(let x=0;x<16;x++){const d=Math.hypot(x-7.5,y-7.5);if(d>7.5)continue;const n=((x*73856093^y*19349663^seed%7*83492791)>>>0)%7;g.fillStyle=d>6.2?cs[1]:x+y<9&&n<5?cs[2]:n<2?cs[1]:cs[0];g.fillRect(x,y,1,1);}
 return cache[k]=c;
}
function drawBody(g,o){
 const s=sheet(o.type),r=o.r;
 if(s){const f=Math.floor(((o.rot%TAU+TAU)%TAU)/TAU*8)%8;g.drawImage(s,f*64,0,64,64,-r,-r,r*2,r*2);}
 else{g.save();g.rotate(Math.round(o.rot/(Math.PI/4))*Math.PI/4);g.drawImage(procedural(o.type,o.seed),-r,-r,r*2,r*2);g.restore();}
 if(o.bonus){g.strokeStyle='#ffe14a';g.lineWidth=1;g.strokeRect(-r-1,-r-1,r*2+2,r*2+2);}
}
// coach(g,e) lets the host draw the 64-bit coach sprite under the objects.
export function render(g,e,{coach=null,pointerTrail=true}={}){
 g.imageSmoothingEnabled=false;g.clearRect(0,0,e.w,e.h);
 for(const s of e.stains){g.globalAlpha=Math.min(.7,s.life/4);g.fillStyle=s.c;for(const[x,y,z]of s.dots)g.fillRect(Math.round(x),Math.round(y),z*2,z*2);}
 g.globalAlpha=1;
 if(coach)coach(g,e);
 for(const o of e.objects){if(o.hold)continue;g.save();g.translate(Math.round(o.x),Math.round(o.y));drawBody(g,o);g.restore();}
 for(const q of e.halves){g.save();g.globalAlpha=Math.min(1,q.life/HALF_LIFE);g.translate(Math.round(q.x),Math.round(q.y));g.rotate(q.hr);g.rotate(q.cut);g.beginPath();g.rect(-q.r*2,q.side>0?0:-q.r*2,q.r*4,q.r*2);g.clip();g.rotate(-q.cut);drawBody(g,{...q,rot:q.rot0});g.restore();}
 for(const q of e.parts){g.globalAlpha=Math.min(1,q.life*2);g.fillStyle=q.c;g.fillRect(Math.round(q.x),Math.round(q.y),q.s,q.s);}
 g.globalAlpha=1;
 if(pointerTrail&&e.trail.length>1){g.lineWidth=2;for(let i=1;i<e.trail.length;i++){const a=e.trail[i-1],b=e.trail[i];g.strokeStyle=`rgba(255,255,255,${Math.min(1,b.life*4)})`;g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();}}
 const L=e.laser;
 if(L.phase!=='idle'){
  const gx=e.coachX,gy=e.h-18;g.fillStyle='#444';g.fillRect(gx-4,gy-3,10,5);g.fillStyle='#f33';g.fillRect(gx+5,gy-2,3,3);
  if(L.phase==='aim'){g.strokeStyle=(Math.floor(L.t*12)%2)?'#ff2a2a':'#ff8080';g.lineWidth=1;g.setLineDash([3,3]);g.beginPath();g.moveTo(gx+8,gy);g.lineTo(L.tx,L.ty);g.stroke();g.setLineDash([]);}
  else if(L.result==='hit'){g.strokeStyle='#f22';g.lineWidth=3;g.beginPath();g.moveTo(gx+8,gy);g.lineTo(L.tx,L.ty);g.stroke();}
  else{g.strokeStyle='#f66';g.lineWidth=2;g.beginPath();g.moveTo(gx+8,gy);g.lineTo(L.tx,L.ty+14);g.stroke();
   g.fillStyle='rgba(120,200,255,.55)';for(let y=-14;y<=14;y+=4)for(let x=-12;x<=12;x+=4)if(x*x/144+y*y/196<=1)g.fillRect(L.tx+x,L.ty+y,3,3);} // pixel shield
 }
 if(L.flash>0){g.fillStyle=`rgba(255,0,0,${L.flash})`;g.fillRect(0,0,e.w,e.h);}
 g.textAlign='center';
 for(const p of e.pops){g.globalAlpha=Math.min(1,p.life*2);g.font=`bold ${p.big?14:9}px monospace`;g.fillStyle='#000';g.fillText(p.text,Math.round(p.x)+1,Math.round(p.y)+1);g.fillStyle=p.c;g.fillText(p.text,Math.round(p.x),Math.round(p.y));}
 g.globalAlpha=1;
 if(e.mode==='martial'){g.font='bold 12px monospace';g.textAlign='right';g.fillStyle='#f33';g.fillText('X'.repeat(e.strikes)+'.'.repeat(3-e.strikes),e.w-6,14);}
 g.textAlign='left';g.font='bold 9px monospace';g.fillStyle='#fff';g.fillText(`${e.score}  W${e.wave}${e.xp?`  +${e.xp}XP`:''}`,6,14);
}

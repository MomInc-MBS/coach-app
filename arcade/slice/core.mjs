// Fruit-Ninja slice engine: input-agnostic (pose limbs, finger swipes, taps all call hitSegment) + 2D pixel renderer.
// Logical canvas is small (default 180x320); scale it up in CSS with image-rendering:pixelated.
// Optional art: arcade/slice/sprites/<type>.png = 8 rotation frames of 64px cells in one row (Tripo renders replace the procedural pixels).
// [main, shade, light] per object id. Every id's art is arcade/slice/sprites/<id>.png (Tripo render) or, until it exists,
// the canister placeholder sheet tinted with the main colour.
import {XP_SCALE} from '../../progression-rules.mjs';
// The MOM Inc. barrel blaster replaces the old coach thrower. All tuning lives here (real phones need tuning).
export const GUN={
 aim:.45,            // s of LED blink + tube tracking before each shot
 recoilPx:6, recoilS:.12, flashS:.09, scale:2, // scale = integer pixel multiplier for the 48x24 gun art
 shakeShot:.18, shakeSlice:.12, shakeExplode:.25, shakeBig:.4, shakeDecay:.85, shakePx:8,
 freeze:.04,         // hit-pause on explode
 scaleStart:.6,      // drawn size at the muzzle, grows to 1 by the apex (collision always full)
 wobbleAmp:[0,4,6,8],// by wave band 1,2,3-6,7+ (logical px, <=25% of a barrel radius)
 wobbleHz:[1,1.6], wobbleFadeLast:.3, wobbleFadeIn:.25, // fade out over the last fraction of the flight, in over the first seconds
 spinMax:Math.PI*2,  // rad/s, rolling not tumbling
 shotsPerSec:[1.5,2.2,2.8], // within a volley, wave 1-2, 3-6, 7+
 // Fruit Ninja rhythm: a volley is 1-3 barrels (pick one entry), the next volley only starts volleyGap s AFTER the last barrel is resolved (hit or off-screen).
 volley:[[1,1,2],[1,2],[1,2,2,3],[2,3,3]], volleyGap:[1.4,1.1,.9,.8], // by wave band 1,2,3-6,7+
 bonusEvery:{hold:[6,9],martial:[4,6]}, // s between XP bonus drops
 hardHit:1.6,        // limb speed (screen heights/s) for +5 HARD HIT
 chainRadius:28, chainDelay:.08, // fuel barrel: other barrels whose centre is within r+chainRadius blow 80 ms later (one level)
 trailEvery:.06, trailMax:3,
 brand:{plate:'#ff4fd8',stencil:'#fff',stripe:'#ffd23a',body:'#3a3f4a',hi:'#5b6475',led:'#ffb000'},
};
// [main, shade, light] per id. Barrel art: arcade/slice/sprites/<id>.png (Tripo sheet) or the procedural 16x16 barrel below.
export const TYPES={'barrel-wood':['#a3642c','#5e3514','#e0a060'],'barrel-steel':['#7d8aa0','#3f4a5c','#d6e0f0'],'barrel-toxic':['#4fcf4a','#1f6e22','#c8ffb0'],'barrel-fuel':['#d8342a','#6e1410','#ffb070'],'xp-star':['#ffe14a','#c8901a','#fffbd0'],'xp-orb':['#4affc8','#1a9c80','#d8fff4']};
export const TYPE_IDS=Object.keys(TYPES).filter(k=>!k.startsWith('xp-'));
export const BONUS_IDS=['xp-star','xp-orb'];
const TYPE_BAG=['barrel-wood','barrel-wood','barrel-wood','barrel-wood','barrel-steel','barrel-steel','barrel-toxic','barrel-toxic','barrel-fuel']; // common wood, rare fuel
// Explosion size per barrel: particle count, stave chunks, smoke puffs, screen shake, ring growth, stain life.
const BOOM={'barrel-wood':{parts:22,chunks:8,smoke:4,shake:GUN.shakeExplode,ring:2.2,stain:4},'barrel-steel':{parts:16,chunks:7,smoke:4,shake:GUN.shakeExplode,ring:2.2,stain:4},
 'barrel-toxic':{parts:30,chunks:6,smoke:6,shake:GUN.shakeExplode,ring:2.5,stain:5.5},'barrel-fuel':{parts:40,chunks:10,smoke:6,shake:GUN.shakeBig,ring:3,stain:4}};
export const TARGET_SIZE=2.5;
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
  laser:{phase:'idle',t:0,tx:0,ty:0,samples:[],result:null,flash:0},cool:0,spawnIn:1,bonusIn:4,swipeAt:-9,swipeN:0,speed:1,
  gun:{phase:'idle',t:0,tx:coachX,ang:0,recoil:0,flash:0},shake:0,freeze:0,shots:0,lastShot:-9,fx:[],chain:[]};
 const emit=(type,data)=>onEvent(type,data);
 e.resize=nh=>{if(nh>0)h=e.h=nh;}; // orientation change: the world keeps its width, height follows the host
 const pop=(text,x,y,c='#fff',big=false)=>e.pops.push({text,x,y,c,big,life:big?1.1:.8});
 function mk(type,x,y,vx,vy,r,bonus=false){const o={type,x,y,vx,vy,r:r*TARGET_SIZE,rot:rand()*TAU,vr:bonus?(rand()-.5)*8:(vx<0?-1:1)*(3+rand()*3),bonus,alive:true,seed:Math.floor(rand()*1e6),
   flight:0,T:0,wA:0,wF:0,wP:0,wOff:0,sc:bonus||mode==='rest'?1:GUN.scaleStart,trail:[],trailAt:0};o.vr=Math.max(-GUN.spinMax,Math.min(GUN.spinMax,o.vr));e.objects.push(o);return o;}
 const bandOf=w=>w<=1?0:w<=2?1:w<=6?2:3,wobble=(o,amp,T)=>{o.T=T;o.wA=amp*(rand()*.5+.5);o.wF=GUN.wobbleHz[0]+rand()*(GUN.wobbleHz[1]-GUN.wobbleHz[0]);o.wP=rand()*TAU;};
 // Parabola from the coach at the bottom toward the user: same apex every wave; speed scales gravity so later waves fall faster, not higher.
 e.launch=()=>{const tx=w*(.15+rand()*.7),apex=h*(.45+rand()*.35),g=GRAVITY*e.speed*e.speed,vy=-Math.sqrt(2*g*apex),T=-2*vy/g;
  const o=mk(pick(TYPE_BAG),coachX,h-4,(tx-coachX)/T,vy,11+rand()*6);o.g=g;o.tApex=-vy/g;wobble(o,GUN.wobbleAmp[bandOf(e.wave)],T);return o;};
 // Generic thrower (rest mode: coach throws DOWN from the top): e.spawn({type,x,y,vx,vy,r,bonus}); non-bonus objects feel gravity.
 // wobble = max sideways sway in logical px, T = flight time (fades the sway out so the landing spot stays fair).
 e.spawn=({type=pick(TYPE_BAG),x,y,vx=0,vy=0,r=12,bonus=false,wobble:amp=0,T=0})=>{const o=mk(type,x,y,vx,vy,r,bonus);if(amp)wobble(o,amp,T);return o;};
 e.dropBonus=()=>mk(pick(BONUS_IDS),w*(.1+rand()*.8),-12,(rand()-.5)*6,22+rand()*10,9,true);
 // Barrels are held, then fired one by one by the gun (aim cue first). Gap = 1/shots-per-second cap by wave band.
 e.spawnWave=()=>{const n=pick(GUN.volley[bandOf(e.wave)]),gap=1/GUN.shotsPerSec[Math.min(2,Math.max(0,bandOf(e.wave)-1))];for(let i=0;i<n;i++){const o=e.launch();if(!i)o.wA=0;o.hold=true;o.delay=GUN.aim+i*gap;o.vx0=o.vx;o.vy0=o.vy;o.vx=o.vy=0;}};
 // Gun: aim cue (tube tracks tx, LED blinks) then fire (recoil, muzzle flash, shake). Rest mode calls these around its throws.
 e.gunAim=tx=>{const G=e.gun;if(G.phase==='aim')return;G.phase='aim';G.t=0;G.tx=tx;emit('gun-aim',{tx});};
 e.gunFire=()=>{const G=e.gun;G.phase='fire';G.t=0;G.recoil=1;G.flash=GUN.flashS;e.shake=Math.max(e.shake,GUN.shakeShot);e.shots++;e.lastShot=e.t;emit('shot',{});};
 function burst(x,y,type,n,spread){const cs=TYPES[type];for(let i=0;i<n;i++){const a=rand()*TAU,s=spread*(.3+rand());e.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-30,life:.5+rand()*.4,c:pick(cs),s:1+Math.floor(rand()*3)});}}
 function smoke(o,n){for(let i=0;i<n;i++)e.fx.push({kind:'smoke',x:o.x+(rand()-.5)*o.r,y:o.y+(rand()-.5)*o.r*.6,vx:(rand()-.5)*10,life:.6,max:.6,d:0});}
 // Layered boom: white flash -> tinted flash -> shockwave ring -> stave chunks -> smoke, plus particles, shake and a hit-pause. Fuel chains once.
 function boom(o,chained){
  const B=BOOM[o.type]||BOOM['barrel-wood'],cs=TYPES[o.type];burst(o.x,o.y,o.type,B.parts,120+B.parts*2);
  e.fx.push({kind:'flash',x:o.x,y:o.y,r:o.r*.9,c:'#fff',c2:cs[2],life:.07,max:.07,d:0});
  if(o.type==='barrel-fuel')e.fx.push({kind:'flash',x:o.x,y:o.y,r:o.r*1.2,c:'#ffe9a0',c2:'#ff8a30',life:.09,max:.09,d:.06});
  e.fx.push({kind:'ring',x:o.x,y:o.y,r0:o.r,r1:o.r*B.ring,c:cs[2],life:.25,max:.25,d:0});
  for(let i=0;i<B.chunks;i++){const a=rand()*TAU,sp=60+rand()*90;e.fx.push({kind:'chunk',x:o.x,y:o.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-50,rot:rand()*TAU,vr:(rand()-.5)*14,c:cs[i%2],life:.6+rand()*.4,max:1,d:0});}
  smoke(o,B.smoke);
  e.shake=Math.max(e.shake,B.shake);if(!chained)e.freeze=GUN.freeze;
  if(o.type==='barrel-fuel'&&!chained)for(const q of e.objects)if(q!==o&&q.alive&&!q.hold&&!q.bonus&&Math.hypot(q.x-o.x,q.y-o.y)<=o.r+GUN.chainRadius&&!e.chain.some(c=>c.o===q))e.chain.push({o:q,t:GUN.chainDelay});
 }
 function award(o,kind,a,b,{speed=0,chained=false}={}){
  o.alive=false;e.hits++;let stain=4;
  if(kind==='slice'){const ang=Math.atan2(b.y-a.y,b.x-a.x),n=[-Math.sin(ang),Math.cos(ang)];for(const side of[-1,1])e.halves.push({...o,cut:ang,side,life:HALF_LIFE,vx:o.vx*.5+n[0]*side*60,vy:o.vy*.5+n[1]*side*60,rot0:o.rot,hr:0,hvr:side*(2+rand()*4)});burst(o.x,o.y,o.type,8,60);
   if(!o.bonus){smoke(o,3);e.shake=Math.max(e.shake,GUN.shakeSlice);}}
  else if(o.bonus)burst(o.x,o.y,o.type,22,120);
  else{boom(o,chained);stain=(BOOM[o.type]||BOOM['barrel-wood']).stain;}
  e.stains.push({c:TYPES[o.type][1],life:stain,dots:Array.from({length:7},()=>[o.x+(rand()-.5)*20,o.y+(rand()-.5)*20,1+Math.floor(rand()*3)])}); // juice splat fades on the background
  if(o.bonus){e.xp+=3*XP_SCALE;e.score+=15;pop(`+${3*XP_SCALE} XP`,o.x,o.y-10,'#ffe14a');emit('bonus',{xp:3*XP_SCALE,x:o.x,y:o.y,kind});}
  else if(chained){e.score+=10;emit('chain',{x:o.x,y:o.y,type:o.type});return;}
  else{const hard=speed>=GUN.hardHit;e.score+=hard?15:10;if(hard)pop('HARD HIT',o.x,o.y-o.r-4,'#ffb000');emit('hit',{kind,x:o.x,y:o.y,type:o.type,hard});}
  if(e.t-e.swipeAt>.45)e.swipeN=0;e.swipeAt=e.t;e.swipeN++;
  if(e.swipeN>=3){const bonus=10*(e.swipeN-2);e.score+=bonus;e.combo=e.swipeN;e.best=Math.max(e.best,e.combo);pop(`COMBO x${e.swipeN}`,w/2,h*.35,'#ff4fd8',true);emit('combo',{n:e.swipeN,bonus});}
 }
 // Sweep a limb/finger segment a->b (logical coords). A tap/touch is a===b. Returns the number of objects hit.
 e.hitSegment=(a,b,{kind='slice',pad=2,speed=0}={})=>{let n=0;for(const o of e.objects)if(o.alive&&!o.hold&&distPointSeg(o,a,b)<=o.r+pad){award(o,kind,a,b,{speed});n++;}e.objects=e.objects.filter(o=>o.alive);return n;};
 e.addTrail=(x,y)=>e.trail.push({x,y,life:.25});
 // Laser (the bomb): ~1s red sight-line, then it fires. feedMotion() collects whole-body motion during the aim window.
 e.laserStart=(tx,ty,aim=1)=>{if(e.laser.phase!=='idle')return false;Object.assign(e.laser,{phase:'aim',t:0,aim,tx,ty,samples:[],result:null});emit('laser-aim',{tx,ty});return true;};
 e.feedMotion=m=>{if(e.laser.phase==='aim')e.laser.samples.push(m);};
 function fire(){const L=e.laser,shield=stillness(L.samples,stillMax);L.phase='fire';L.t=0;L.result=shield?'shield':'hit';
  if(shield){emit('laser-shield',{x:L.tx,y:L.ty});pop('BLOCKED',L.tx,L.ty-20,'#7cf',true);}
  else{L.flash=.35;strike();emit('laser-hit',{x:L.tx,y:L.ty});pop('ZAPPED',L.tx,L.ty-20,'#f44',true);}}
 function strike(){if(e.cool>0)return;e.strikes++;emit('strike',{n:e.strikes});if(e.strikes>=3){e.cool=3;e.strikes=0;e.objects=[];emit('wave-end',{wave:e.wave});pop('WAVE OVER - KEEP GOING',w/2,h*.4,'#fff',true);}}
 e.step=dt=>{
  if(e.freeze>0){e.freeze-=dt;return;} // hit-pause: the world holds for a beat on a big explosion
  e.t+=dt;e.shake*=Math.pow(GUN.shakeDecay,dt*60);if(e.shake<.02)e.shake=0;
  const G=e.gun;G.t+=dt;if(G.recoil>0)G.recoil=Math.max(0,G.recoil-dt/GUN.recoilS);if(G.flash>0)G.flash-=dt;if(G.phase==='fire'&&G.t>=GUN.recoilS)G.phase='idle';
  let next=null;for(const o of e.objects)if(o.hold&&(!next||o.delay<next.delay))next=o;
  if(next&&next.delay<=GUN.aim&&G.phase!=='aim')e.gunAim(next.x+next.vx0*(-2*next.vy0/next.g)); // aim at where the next barrel lands
  G.ang+=((G.phase==='aim'?Math.max(-.61,Math.min(.61,Math.atan2(G.tx-e.coachX,e.h*.55))):0)-G.ang)*Math.min(1,dt*20);
  if(e.cool>0){e.cool-=dt;if(e.cool<=0)e.speed=Math.max(1,e.speed-.1);}
  else if(auto&&!e.over){
   if(mode==='martial'&&!e.objects.some(o=>!o.bonus)){e.spawnIn-=dt;if(e.spawnIn<=0){e.wave++;e.speed=Math.min(1.5,1+e.wave*.04);e.spawnWave();e.spawnIn=GUN.volleyGap[bandOf(e.wave)];emit('wave',{wave:e.wave});}} // gap counts only once the volley is resolved
   e.bonusIn-=dt;if(e.bonusIn<=0){e.dropBonus();{const[lo,hi]=GUN.bonusEvery[mode==='hold'?'hold':'martial'];e.bonusIn=lo+rand()*(hi-lo);}}
  }
  for(const o of e.objects){
   if(o.hold){o.delay-=dt;if(o.delay<=0){o.hold=false;o.vx=o.vx0;o.vy=o.vy0;e.gunFire();}continue;}
   o.rot+=o.vr*dt;o.x+=o.vx*dt;o.y+=o.vy*dt;if(!o.bonus)o.vy+=(o.g||GRAVITY)*dt;
   o.flight+=dt;
   if(o.wA){const f=Math.min(1,o.flight/GUN.wobbleFadeIn)*(o.T?Math.max(0,Math.min(1,(o.T-o.flight)/(o.T*GUN.wobbleFadeLast))):1),off=o.wA*f*Math.sin(TAU*o.wF*o.flight+o.wP);o.x+=off-o.wOff;o.wOff=off;} // sideways sway only; the vertical stays a pure parabola
   if(!o.bonus){o.sc=mode==='rest'?1-.25*Math.min(1,o.flight/(o.T||2)):GUN.scaleStart+(1-GUN.scaleStart)*Math.min(1,o.flight/(o.tApex||1));
    if(o.flight>=o.trailAt){o.trailAt=o.flight+GUN.trailEvery;o.trail.push({x:o.x,y:o.y});if(o.trail.length>GUN.trailMax)o.trail.shift();}}
   if(o.vy>0&&o.y>h+o.r){o.alive=false;if(!o.bonus){emit('land',{x:o.x,type:o.type});if(strikes)strike();}} // a missed rock lands = strike
  }
  for(const c of e.chain)if((c.t-=dt)<=0&&c.o.alive){award(c.o,'explode',c.o,c.o,{chained:true});}
  e.chain=e.chain.filter(c=>c.t>0);
  e.objects=e.objects.filter(o=>o.alive);
  for(const q of e.fx){if(q.d>0){q.d-=dt;continue;}q.life-=dt;if(q.kind!=='ring'&&q.kind!=='flash'){q.x+=(q.vx||0)*dt;q.y+=(q.vy||-20)*dt;if(q.kind==='chunk'){q.vy+=GRAVITY*.6*dt;q.rot+=q.vr*dt;}}}e.fx=e.fx.filter(q=>q.life>0);
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
// sheet(id): the id's own sheet (Tripo render). Bonus ids fall back to the tinted canister; barrels and the gun go procedural. null until loaded.
function load(src){return new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=src;});}
function tinted(img,colour){const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d');x.drawImage(img,0,0);x.globalCompositeOperation='multiply';x.fillStyle=colour;x.fillRect(0,0,c.width,c.height);x.globalCompositeOperation='destination-in';x.drawImage(img,0,0);return c;}
function sheet(type){
 if(typeof Image==='undefined')return null;
 if(!(type in sheets)){sheets[type]=null;const base=`/arcade/slice/sprites/`;
  load(base+type+'.png').then(i=>{sheets[type]=i;},()=>{if(type.startsWith('xp-'))load(base+'canister.png').then(i=>{sheets[type]=tinted(i,TYPES[type][0]);},()=>{});});}
 return sheets[type];
}
const canvasOf=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
function procedural(type,seed){ // 16x16: barrels get a staved cylinder with steel hoops and a MOM dot; bonuses stay hash-shaded discs
 const k=type+seed%7;if(cache[k])return cache[k];const c=canvasOf(16,16),g=c.getContext('2d'),cs=TYPES[type];
 if(type.startsWith('barrel-')){
  for(let y=0;y<16;y++)for(let x=2;x<14;x++){if((y===0||y===15)&&(x===2||x===13))continue;g.fillStyle=(x-2)%3===2||x===13?cs[1]:x===3?cs[2]:cs[0];g.fillRect(x,y,1,1);}
  g.fillStyle='#9aa6b4';for(const y of[3,12])g.fillRect(2,y,12,2);g.fillStyle='#d8e2ee';for(const y of[3,12])g.fillRect(3,y,1,1);
  g.fillStyle=GUN.brand.plate;g.fillRect(6,6,3,3);g.fillStyle='#fff';g.fillRect(6,6,1,1);
  return cache[k]=c;
 }
 for(let y=0;y<16;y++)for(let x=0;x<16;x++){const d=Math.hypot(x-7.5,y-7.5);if(d>7.5)continue;const n=((x*73856093^y*19349663^seed%7*83492791)>>>0)%7;g.fillStyle=d>6.2?cs[1]:x+y<9&&n<5?cs[2]:n<2?cs[1]:cs[0];g.fillRect(x,y,1,1);}
 return cache[k]=c;
}
function drawBody(g,o){
 const s=sheet(o.type),r=o.r*(o.sc||1);
 if(s){const f=Math.floor(((o.rot%TAU+TAU)%TAU)/TAU*8)%8;g.drawImage(s,f*64,0,64,64,-r,-r,r*2,r*2);}
 else{g.save();g.rotate(Math.round(o.rot/(Math.PI/4))*Math.PI/4);g.drawImage(procedural(o.type,o.seed),-r,-r,r*2,r*2);g.restore();}
 if(o.bonus){g.strokeStyle='#ffe14a';g.lineWidth=1;g.strokeRect(-r-1,-r-1,r*2+2,r*2+2);}
}

// ---- the MOM Inc. gun: 48x24 receiver + separate 8x22 tube that rotates about the pivot ----
const PIV={x:24,y:9},TUBE=20; // pivot in the receiver canvas (unflipped), visible tube length in art px
function gunArt(flip){
 const k='gun'+flip;if(cache[k])return cache[k];const B=GUN.brand,body=canvasOf(48,24),g=body.getContext('2d');
 const R=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(x,flip?24-y-h:y,w,h);}; // flip = hang from the ceiling (rest mode); the plate stays upright
 R(14,22,20,2,'#6b7280');R(14,22,20,1,'#8b95a8');                                  // bolted mount
 R(8,8,32,14,B.body);R(8,10,32,1,B.hi);R(8,20,32,2,'#262a33');R(8,8,1,2,'#262a33');R(39,8,1,2,'#262a33'); // receiver
 for(let x=8;x<40;x+=4){R(x,8,2,2,B.stripe);R(x+2,8,2,2,'#111');}                   // hazard stripe along the top edge
 R(9,12,2,8,B.hi);R(37,12,2,8,B.hi);R(10,14,1,1,'#111');R(10,18,1,1,'#111');R(37,14,1,1,'#111');R(37,18,1,1,'#111'); // grips + bolts
 R(17,12,14,7,B.plate);R(17,12,14,1,'#ffa0ec');R(17,18,14,1,'#c0309a');             // MOM Inc. plate
 const M=['X...X','XX.XX','X.X.X','X...X','X...X'];g.fillStyle=B.stencil;M.forEach((row,j)=>{for(let i=0;i<5;i++)if(row[i]==='X')g.fillRect(21+i,(flip?5:12)+1+j,1,1);}); // stencil drawn upright even when the gun hangs flipped
 R(26,13,4,1,'#c0309a');R(26,15,4,1,'#c0309a');R(26,17,4,1,'#c0309a');              // "INC" tick marks beside the stencil
 const tube=canvasOf(8,22),t=tube.getContext('2d');
 t.fillStyle=B.body;t.fillRect(1,2,6,20);t.fillStyle=B.hi;t.fillRect(2,2,1,20);t.fillStyle='#262a33';t.fillRect(6,2,1,20);
 t.fillStyle='#8b95a8';t.fillRect(0,0,8,2);t.fillStyle='#5b6475';t.fillRect(0,2,8,1);t.fillStyle='#8b95a8';t.fillRect(0,8,8,1);t.fillRect(0,15,8,1); // muzzle ring + collars
 return cache[k]={body,tube};
}
// Pose of the gun for a mount point: x = centre, y = bottom edge (flip: top edge).
function gunPose(e,{x=e.coachX,y=e.h,flip=false}={}){
 const s=GUN.scale,ox=x-24*s,oy=flip?y:y-24*s,py=oy+(flip?24-PIV.y:PIV.y)*s,G=e.gun,a=Math.round(G.ang/(Math.PI/16))*(Math.PI/16),d=flip?1:-1;
 return {s,ox,oy,px:x,py,a,d,mx:x+Math.sin(a)*TUBE*s,my:py+d*Math.cos(a)*TUBE*s};
}
// Where the laser/shots leave the gun (angle 0, no recoil), for hosts that draw their own beam.
export const gunMuzzle=(e,o)=>{const p=gunPose({...e,gun:{ang:0}},o);return {x:p.mx,y:p.my};};
export function drawGun(g,e,o={}){
 const G=e.gun,p=gunPose(e,o),s=p.s,{body,tube}=gunArt(!!o.flip),rc=GUN.recoilPx*G.recoil;
 g.save();g.translate(Math.round(-Math.sin(p.a)*rc),Math.round(-p.d*Math.cos(p.a)*rc)); // kicks back opposite the shot, along the barrel axis
 const sh=sheet('gun');
 if(sh){const cell=G.flash>0?5:G.recoil>.5?6:G.phase==='aim'&&Math.floor(G.t*16)%2===0?7:Math.max(0,Math.min(4,Math.round(p.a/.61*2)+2)),z=48*s;
  g.save();g.translate(Math.round(p.px),Math.round(p.py));if(o.flip)g.scale(1,-1);g.drawImage(sh,cell*64,0,64,64,-z/2,-z+11*s,z,z);g.restore();}
 else{
  g.save();g.translate(Math.round(p.px),Math.round(p.py));if(o.flip)g.scale(1,-1);g.rotate(p.a);g.drawImage(tube,-4*s,-TUBE*s,8*s,22*s);g.restore(); // tube first: the receiver hides its root
  g.drawImage(body,Math.round(p.ox),Math.round(p.oy),48*s,24*s);
 }
 const led=G.flash>0?'#fff':G.phase==='aim'&&Math.floor(G.t*16)%2===0?GUN.brand.led:null; // 8 Hz amber blink while aiming, solid white on fire
 const mx=Math.round(p.mx),my=Math.round(p.my),ly=my-p.d*s*2;
 g.fillStyle=led||'#2a1a00';g.fillRect(mx-s,ly,s*2,s*2);
 if(led===GUN.brand.led){g.globalAlpha=.55;g.fillStyle=led;for(const[dx,dy]of[[-3,0],[3,0],[0,-3],[0,3]])g.fillRect(mx-s+dx*s,ly+dy*s,s*2,s*2);g.globalAlpha=1;} // glow ring so the cue reads on the camera feed
 if(G.flash>0){ // Vlambeer: the first frame is a circle, then a star, then a smoke pixel (~90 ms total)
  const age=GUN.flashS-G.flash,f=age<GUN.flashS/3?0:age<GUN.flashS*2/3?1:2,fy=my+p.d*s*2;
  if(f===0){g.fillStyle='#fff';for(let y=-5;y<=5;y++)for(let x=-5;x<=5;x++)if(x*x+y*y<=25)g.fillRect(mx+x*s,fy+y*s,s,s);}
  else if(f===1){g.fillStyle=GUN.brand.led;for(let i=-3;i<=3;i++){g.fillRect(mx+i*s,fy,s,s);g.fillRect(mx,fy+i*s,s,s);}}
  else{g.fillStyle='#8a8a92';g.fillRect(mx,fy+p.d*s*2,s*3,s*3);}
 }
 g.restore();
}
function drawFx(g,e){
 for(const q of e.fx){
  if(q.d>0)continue;const k=q.life/q.max;
  if(q.kind==='flash'){const r=Math.round(q.r*(k>.5?1:.66));g.fillStyle=k>.5?q.c:q.c2;const st=r>20?3:2;for(let y=-r;y<=r;y+=st)for(let x=-r;x<=r;x+=st)if(x*x+y*y<=r*r)g.fillRect(Math.round(q.x+x),Math.round(q.y+y),st,st);}
  else if(q.kind==='ring'){const R=q.r0+(q.r1-q.r0)*(1-k),n=Math.max(12,Math.ceil(TAU*R/3));g.globalAlpha=.8*k;g.fillStyle=q.c;for(let i=0;i<n;i++){const a=i/n*TAU;g.fillRect(Math.round(q.x+Math.cos(a)*R),Math.round(q.y+Math.sin(a)*R),3,3);}g.globalAlpha=1;}
  else if(q.kind==='smoke'){g.globalAlpha=.6*k;g.fillStyle='#2a2a2e';g.fillRect(Math.round(q.x),Math.round(q.y),3,3);g.globalAlpha=1;}
  else if(q.kind==='chunk'){g.save();g.globalAlpha=Math.min(1,k*2);g.translate(Math.round(q.x),Math.round(q.y));g.rotate(Math.round(q.rot/(Math.PI/4))*Math.PI/4);g.fillStyle=q.c;g.fillRect(-1,-3,2,5);g.restore();g.globalAlpha=1;}
 }
}
// coach(g,e) lets a host draw its own thrower (rest hangs the gun from the top); default = the gun at bottom centre.
export function render(g,e,{coach=null,pointerTrail=true}={}){
 g.imageSmoothingEnabled=false;g.clearRect(0,0,e.w,e.h);
 g.save();if(e.shake>0)g.translate(Math.round((Math.random()-.5)*e.shake*GUN.shakePx),Math.round((Math.random()-.5)*e.shake*GUN.shakePx));
 for(const s of e.stains){g.globalAlpha=Math.min(.7,s.life/4);g.fillStyle=s.c;for(const[x,y,z]of s.dots)g.fillRect(Math.round(x),Math.round(y),z*2,z*2);}
 g.globalAlpha=1;
 if(coach)coach(g,e);else drawGun(g,e);
 for(const o of e.objects){if(o.hold)continue;
  if(o.trail.length){g.fillStyle=TYPES[o.type][1];o.trail.forEach((t,i)=>{g.globalAlpha=.25+.2*i;g.fillRect(Math.round(t.x)-1,Math.round(t.y)-1,3,3);});g.globalAlpha=1;} // slow bright barrels leave a short trail
  g.save();g.translate(Math.round(o.x),Math.round(o.y));drawBody(g,o);g.restore();}
 for(const q of e.halves){g.save();g.globalAlpha=Math.min(1,q.life/HALF_LIFE);g.translate(Math.round(q.x),Math.round(q.y));g.rotate(q.hr);g.rotate(q.cut);g.beginPath();g.rect(-q.r*2,q.side>0?0:-q.r*2,q.r*4,q.r*2);g.clip();g.rotate(-q.cut);drawBody(g,{...q,rot:q.rot0});g.restore();}
 for(const q of e.parts){g.globalAlpha=Math.min(1,q.life*2);g.fillStyle=q.c;g.fillRect(Math.round(q.x),Math.round(q.y),q.s,q.s);}
 g.globalAlpha=1;drawFx(g,e);
 if(pointerTrail&&e.trail.length>1){g.lineWidth=2;for(let i=1;i<e.trail.length;i++){const a=e.trail[i-1],b=e.trail[i];g.strokeStyle=`rgba(255,255,255,${Math.min(1,b.life*4)})`;g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();}}
 const L=e.laser;
 if(L.phase!=='idle'){
  const m=gunMuzzle(e),gx=m.x,gy=m.y;
  if(L.phase==='aim'){g.strokeStyle=(Math.floor(L.t*12)%2)?'#ff2a2a':'#ff8080';g.lineWidth=1;g.setLineDash([3,3]);g.beginPath();g.moveTo(gx,gy);g.lineTo(L.tx,L.ty);g.stroke();g.setLineDash([]);}
  else if(L.result==='hit'){g.strokeStyle='#f22';g.lineWidth=3;g.beginPath();g.moveTo(gx,gy);g.lineTo(L.tx,L.ty);g.stroke();}
  else{g.strokeStyle='#f66';g.lineWidth=2;g.beginPath();g.moveTo(gx,gy);g.lineTo(L.tx,L.ty+14);g.stroke();
   g.fillStyle='rgba(120,200,255,.55)';for(let y=-14;y<=14;y+=4)for(let x=-12;x<=12;x+=4)if(x*x/144+y*y/196<=1)g.fillRect(L.tx+x,L.ty+y,3,3);} // pixel shield
 }
 g.restore();
 if(L.flash>0){g.fillStyle=`rgba(255,0,0,${L.flash})`;g.fillRect(0,0,e.w,e.h);}
 g.textAlign='center';
 for(const p of e.pops){g.globalAlpha=Math.min(1,p.life*2);g.font=`bold ${p.big?14:9}px monospace`;g.fillStyle='#000';g.fillText(p.text,Math.round(p.x)+1,Math.round(p.y)+1);g.fillStyle=p.c;g.fillText(p.text,Math.round(p.x),Math.round(p.y));}
 g.globalAlpha=1;
 if(e.mode==='martial'){g.font='bold 12px monospace';g.textAlign='right';g.fillStyle='#f33';g.fillText('X'.repeat(e.strikes)+'.'.repeat(3-e.strikes),e.w-6,14);}
 g.textAlign='left';g.font='bold 9px monospace';g.fillStyle='#fff';g.fillText(`${e.score}  W${e.wave}${e.xp?`  +${e.xp}XP`:''}`,6,14);
}

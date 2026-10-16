// Cardio runner rules, copied from the site's Coach Armie maze (tv/assets/armie-intro/maze-run.mjs) and made endless:
// three lanes, the same three full-width traps and the 90 degree turn; no doors, no questions, no tap boost.
// Cool Cardio: courses chain forever, each harder (more traps, tighter spacing, combos later) at one constant speed.
// A hit is a stumble, never the end: brief slow-down and coach pressure up; pressure decays as you clear traps.
// Only stopping ends it: with no jogging the speed ramps to 0 over STOP.seconds while Coach closes in from behind;
// a full STOP.seconds still and he catches you (status 'caught'). Jogging again ramps back to full speed.
export const LANES = [-1.25, 0, 1.25];
export const TRAPS = ['grid', 'platform', 'pit'];
export const PIT_LENGTH = 7;
export const STOP = {seconds:10, warn:5, rampUp:2}; // still seconds until caught; clay warning; seconds from 0 back to full speed
export const STUMBLE = {seconds:.9, slow:.3, pressure:.22, clearRelief:.07, decay:.012, floor:.08};
const START = 12, RUNOUT = 14, MIN_GAP_S = 1.5;
export function rng(seed){let a=(seed*2654435761+1013904223)>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
// Treadmill rule (Ian, R-1017): run speed is ONE constant. It never scales with effort or level; halls get harder by traps.
// JUMP is floaty: long hang time, soft gravity (pow<1 flattens the top of the arc).
export const RUN = {speed:5};
export const JUMP = {seconds:1.5, peak:1.35, float:.5};
export const courseSpeed = () => RUN.speed;
export const trapCount = level => Math.min(18, 5 + level);
export const gapSeconds = level => Math.max(MIN_GAP_S, 3.2 - .13*level);
export const comboChance = level => level < 2 ? 0 : Math.min(.55, .12*(level-1));
// One course. Gaps are in seconds at that course's speed, so a full-pace runner always has the same reaction time.
export function courseFor(seed = 0, level = 0) {
  const r=rng(seed), count=trapCount(level), types=[...TRAPS], speed=courseSpeed(level);
  while(types.length<count) types.push(TRAPS[Math.floor(r()*3)]);
  for(let i=types.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[types[i],types[j]]=[types[j],types[i]];}
  const events=[], turnAfter=Math.floor(count/2)-1, direction=r()<.5?'left':'right';
  let at=START, prev=null;
  for(let i=0;i<count;i++){
    let type=types[i];
    // Combo: a pit straight into a grid or platform at the minimum gap (mixed combos only on later courses).
    const combo=prev==='pit'&&r()<comboChance(level);
    if(combo&&type==='pit') type=r()<.5?'grid':'platform';
    const e=type==='pit'?{type,at,length:PIT_LENGTH}:{type,at};if(combo)e.combo=true;
    events.push(e);
    at+=(e.length||0)+speed*((combo||events.length>1&&events[events.length-2].combo)?MIN_GAP_S:gapSeconds(level)*(1+r()*.25));
    if(i===turnAfter){events.push({type:'turn',at,direction});at+=speed*gapSeconds(level);}
    prev=type;
  }
  // Combo gap applies to the trap after the pit; recompute positions so it is exact.
  for(let i=1;i<events.length;i++){const e=events[i],p=events[i-1];if(e.combo)e.at=p.at+(p.length||0)+speed*MIN_GAP_S;else if(e.at<p.at+(p.length||0)+speed*MIN_GAP_S)e.at=p.at+(p.length||0)+speed*MIN_GAP_S;}
  const last=events[events.length-1], turn=events.find(e=>e.type==='turn');
  return {seed, level, events, length:last.at+(last.length||0)+RUNOUT, turnAt:turn.at, direction};
}
const courseSeed=(seed,n)=>(seed+n*977)>>>0;
function load(run){
  run.course=courseFor(courseSeed(run.seed,run.courses),run.level);
  run.events=run.course.events.map(e=>({...e,cleared:false}));run.turn=null;
}
export function createRun(seed = 0) {
  const run={seed, courses:0, level:0, distance:0, total:0, time:0, lane:1, jumpTime:0, height:0, slideTime:0, duck:0, turn:null,
    jogging:false, started:false, gait:0, still:0, chase:0, warned:false, stumble:0, pressure:STUMBLE.floor, hits:0, cleared:0, paused:false, status:'running', feed:[], course:null, events:[]};
  load(run);return run;
}
// Next course in the chain, one step harder.
export function chain(run) {
  run.courses++;run.level++;load(run);run.distance=0;run.feed.push({type:'course',level:run.level,courses:run.courses});
}
export function runSpeed(run){
  return courseSpeed(run.level)*run.gait*(run.stumble>0?STUMBLE.slow:1);
}
export function upcoming(run) { return run.events.find(e=>!e.cleared) || null; }
export function input(run, action) {
  if(run.status !== 'running' || run.paused) return;
  if(action === 'jump') { if(run.jumpTime === 0 && run.slideTime === 0) run.jumpTime = JUMP.seconds; return; }
  if(action === 'slide') { if(run.jumpTime === 0 && run.slideTime === 0) run.slideTime = .96; return; }
  if(action !== 'left' && action !== 'right') return;
  const next=upcoming(run);
  if(next?.type==='turn' && next.at-run.distance <= 11) run.turn=action;
  else run.lane=Math.max(0,Math.min(LANES.length-1,run.lane+(action==='left'?-1:1)));
}
export function safe(run, event) {
  if(event.type==='turn') return run.turn===event.direction;
  if(event.type==='grid') return run.duck>.8 && run.height<.1;
  if(event.type==='platform') return run.height>.65;
  return run.lane!==1; // pit: only the two wall ledges hold you
}
// A stumble from a trap or an unhit projectile: slow-down and pressure, never the end.
export function stumble(run, event) {
  if(run.status!=='running')return;
  event.cleared=true;run.hits++;run.stumble=STUMBLE.seconds;run.pressure=Math.min(1,run.pressure+STUMBLE.pressure);
  if(event.type==='turn')run.turn=null;
  run.feed.push({type:'stumble',trap:event.type,pressure:run.pressure});
}
export function step(run, delta) {
  if(run.paused||run.status!=='running')return;
  const dt=Math.max(0,Math.min(delta,.05));
  run.time+=dt;
  run.jumpTime=Math.max(0,run.jumpTime-dt);
  run.slideTime=Math.max(0,run.slideTime-dt);
  run.stumble=Math.max(0,run.stumble-dt);
  run.pressure=Math.max(STUMBLE.floor,run.pressure-STUMBLE.decay*dt);
  // Gait: full while jogging (ramping back up), a straight ramp to 0 over STOP.seconds of stillness; caught at the end.
  // The stop clock starts with the first jog step (calibration and setup never count).
  if(run.jogging)run.started=true;
  if(run.jogging){run.still=0;run.warned=false;run.gait=Math.min(1,run.gait+dt/STOP.rampUp);run.chase=Math.max(0,run.chase-dt*.25);}
  else if(run.started){run.still+=dt;run.gait=Math.min(run.gait,Math.max(0,1-run.still/STOP.seconds));run.chase=Math.max(run.chase,Math.min(1,run.still/STOP.seconds));
    if(!run.warned&&run.still>=STOP.warn){run.warned=true;run.feed.push({type:'warn'});}
    if(run.still>=STOP.seconds-1e-6){run.status='caught';run.feed.push({type:'caught'});return;}}
  run.duck=run.slideTime>0?Math.min(1,(.96-run.slideTime)/.1,run.slideTime/.12):0;
  run.height=run.jumpTime>0?Math.pow(Math.sin((1-run.jumpTime/JUMP.seconds)*Math.PI),JUMP.float)*JUMP.peak:0;
  const next=upcoming(run), move=runSpeed(run)*dt;
  run.distance+=move;run.total+=move;
  // The pit is checked on every step while you are over it, not only at its lip.
  if(next && run.distance>=next.at) {
    if(!safe(run,next)) stumble(run,next);
    else if(run.distance>=next.at+(next.length||0)){next.cleared=true;run.cleared++;run.pressure=Math.max(STUMBLE.floor,run.pressure-STUMBLE.clearRelief);if(next.type==='turn') run.turn=null;run.feed.push({type:'clear',trap:next.type});}
  }
  if(run.distance>=run.course.length)chain(run);
}
// World route turns a real 90 degrees at the course's turn, then continues down the next corridor.
export function pathAt(distance, course) {
  const d=Math.max(0,distance),T=course.turnAt;
  if(T==null||d<=T)return {x:0,z:-d,yaw:0};
  const sign=course.direction==='right'?1:-1;
  return {x:sign*(d-T),z:-T,yaw:-sign*Math.PI/2};
}

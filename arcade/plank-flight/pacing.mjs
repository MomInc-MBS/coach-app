const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const validSeed=value=>(Number(value)>>>0)||1;
const REST_TARGET=Object.freeze({x:0,y:.04});
const ACTIVE_TARGETS=Object.freeze({
  top:Object.freeze({x:0,y:.85}),
  middle:Object.freeze({x:0,y:.5}),
  left:Object.freeze({x:-.55,y:.6}),
  right:Object.freeze({x:.55,y:.6})
});
const ACTIVE_ORDER=Object.freeze(['top','middle','left','right']);

function pairRandom(seed,index){
  let state=(seed+Math.imul(index+1,0x9e3779b9))>>>0;
  return ()=>{
    state=(state+0x6d2b79f5)>>>0;
    let t=state;
    t=Math.imul(t^(t>>>15),t|1);
    t^=t+Math.imul(t^(t>>>7),t|61);
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}

/** Create a deterministic, indexed rest/active pace schedule. Pairs are generated lazily. */
export function createPaceSchedule(seed=1){
  return {seed:validSeed(seed),transitionSeconds:.9,_pairs:[]};
}

function pairAt(schedule,index){
  const pairIndex=Math.max(0,Math.floor(index));
  while(schedule._pairs.length<=pairIndex){
    const n=schedule._pairs.length,random=pairRandom(schedule.seed,n);
    const activeSeconds=3+random()*2;
    // Rest allocation satisfies the 40–60% pair band. The +1.5s lower
    // bound also leaves at least 40% neutral rest after both entry blends.
    const minRest=Math.max(3,2*activeSeconds/3+1.5);
    const maxRest=Math.min(5,1.5*activeSeconds);
    const restSeconds=minRest+random()*(maxRest-minRest);
    const start=n===0?0:schedule._pairs[n-1].end;
    schedule._pairs.push({index:n,start,restSeconds,activeSeconds,end:start+restSeconds+activeSeconds,
      restFraction:restSeconds/(restSeconds+activeSeconds),
      modeledRestFraction:(restSeconds-schedule.transitionSeconds)/(restSeconds+activeSeconds)});
  }
  return schedule._pairs[pairIndex];
}

function activeKindFor(schedule,pairIndex){
  const offset=schedule.seed%ACTIVE_ORDER.length;
  const direction=(schedule.seed&1)?1:-1;
  return ACTIVE_ORDER[(offset+direction*pairIndex%ACTIVE_ORDER.length+ACTIVE_ORDER.length)%ACTIVE_ORDER.length];
}

function targetFor(schedule,index){
  if(index<0)return REST_TARGET;
  if(index%2===0)return REST_TARGET;
  return ACTIVE_TARGETS[activeKindFor(schedule,(index-1)/2)];
}

function controlTarget(target){return {height01:target.y,steer:clamp(target.x/.8,-1,1)};}

/** Get any rest/active segment by zero-based index, independent of call order. */
export function segmentAt(schedule,index){
  if(!schedule||!Number.isInteger(index)||index<0)throw new RangeError('Segment index must be a nonnegative integer.');
  const pair=pairAt(schedule,Math.floor(index/2));
  const isRest=index%2===0;
  const kind=isRest?'rest':'active';
  const activeKind=isRest?undefined:activeKindFor(schedule,Math.floor(index/2));
  const duration=isRest?pair.restSeconds:pair.activeSeconds;
  const start=isRest?pair.start:pair.start+pair.restSeconds;
  const target=targetFor(schedule,index);
  const fromTarget=targetFor(schedule,index-1);
  const changed=target.x!==fromTarget.x||target.y!==fromTarget.y;
  const transitionSeconds=changed?schedule.transitionSeconds:0;
  const modeledRestSeconds=isRest?Math.max(0,duration-transitionSeconds):0;
  return {index,kind,...(activeKind?{activeKind}:{}),start,end:start+duration,duration,allocatedSeconds:duration,
    target:{x:target.x,y:target.y},controlTarget:controlTarget(target),height01:target.y,steer:controlTarget(target).steer,
    fromTarget:{x:fromTarget.x,y:fromTarget.y},fromControlTarget:controlTarget(fromTarget),transitionSeconds,
    settledSeconds:Math.max(0,duration-transitionSeconds),modeledRestSeconds,
    restShare:pair.restFraction,modeledRestFraction:pair.modeledRestFraction};
}

/** Resolve target and preview from schedule time (seconds since run start). */
export function paceAt(schedule,timeSeconds){
  if(!schedule||!Number.isFinite(timeSeconds)||timeSeconds<0)throw new RangeError('Pace time must be a finite nonnegative number.');
  let index=0,current=segmentAt(schedule,index);
  while(timeSeconds>=current.end){current=segmentAt(schedule,++index);}
  const elapsed=timeSeconds-current.start;
  const transitioning=current.transitionSeconds>0&&elapsed<current.transitionSeconds;
  const blend=current.transitionSeconds?clamp(elapsed/current.transitionSeconds,0,1):1;
  const target={x:current.fromTarget.x+(current.target.x-current.fromTarget.x)*blend,
    y:current.fromTarget.y+(current.target.y-current.fromTarget.y)*blend};
  const next=segmentAt(schedule,index+1);
  return {segment:current,index,kind:current.kind,activeKind:current.activeKind,elapsed,
    remaining:Math.max(0,current.duration-elapsed),progress:clamp(elapsed/current.duration,0,1),
    target,controlTarget:controlTarget(target),height01:target.y,steer:controlTarget(target).steer,
    transitioning,transitionRemaining:transitioning?current.transitionSeconds-elapsed:0,
    isRest:current.kind==='rest',modeledRest:current.kind==='rest'&&!transitioning,
    modeledRestSeconds:current.modeledRestSeconds,restShare:current.restShare,next,nextAt:current.end};
}

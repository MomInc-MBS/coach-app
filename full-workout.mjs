// FULL WORKOUT (circuit) mode: pure logic only (no DOM) so it is unit tested directly.
// One of each checked exercise, grouped into style blocks (a style = a focus group: boxing, legs, ...),
// shuffled, with a long rest between style blocks and a short one between exercises in a block.
import {EXERCISES,FOCUS_GROUPS} from './exercise-library.mjs';

// TUNING KNOBS -- real phones need tuning; change only here.
export const FULL_WORKOUT={
 restBetweenExercisesSeconds:15, // short breather inside a style block
 restBetweenStylesSeconds:60,    // long break when the style changes
 goalByKind:{reps:5,hold:20,pace:20,steps:12,jumps:10}, // reps / seconds per exercise
 shuffleStyles:true,             // false = keep the library's style order
 storageKey:'myr5-full-workout-v1',
};

/** Every exercise a circuit may use. Endless runner modes (Cool Cardio) are not a counted set. */
export const circuitExercises=()=>Object.values(EXERCISES).filter(e=>!e.endless);
export const circuitStyles=()=>FOCUS_GROUPS.map(g=>({id:g.id,name:g.name,exercises:circuitExercises().filter(e=>e.group===g.id)})).filter(g=>g.exercises.length);
export const goalFor=id=>FULL_WORKOUT.goalByKind[EXERCISES[id]?.kind]??5;

/** Small seeded PRNG (mulberry32): same seed, same circuit. */
export function seededRandom(seed){let a=(Number(seed)||0)>>>0;return()=>{a=a+0x6D2B79F5>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export function shuffle(list,random=Math.random){const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

/** Steps: {type:'exercise',id,style,goal} and {type:'break',seconds,between:'styles'|'exercises',next:{id,style}}. */
export function buildFullWorkout(ids,{seed=Date.now(),knobs=FULL_WORKOUT}={}){
 const random=seededRandom(seed),chosen=[...new Set(ids)].filter(id=>EXERCISES[id]&&!EXERCISES[id].endless);
 const byStyle=new Map();
 for(const id of chosen){const style=EXERCISES[id].group;if(!byStyle.has(style))byStyle.set(style,[]);byStyle.get(style).push(id);}
 let styles=[...byStyle.keys()];
 if(knobs.shuffleStyles)styles=shuffle(styles,random);
 const flat=[];
 for(const style of styles)for(const id of shuffle(byStyle.get(style),random))flat.push({type:'exercise',id,style,goal:goalFor(id)});
 const steps=[];
 flat.forEach((step,i)=>{
  if(i){const styleChange=flat[i-1].style!==step.style;steps.push({type:'break',between:styleChange?'styles':'exercises',seconds:styleChange?knobs.restBetweenStylesSeconds:knobs.restBetweenExercisesSeconds,next:{id:step.id,style:step.style}});}
  steps.push(step);
 });
 return steps;
}

// ---- power + level ladder ----
// A style (focus group) is powered by its plug. Inside a powered style the exercises are a level ladder, easiest first
// (library order). Level L means switches 1..L are engaged; the circuit uses the exercise at switch L, one per style.
export const styleLadder=style=>circuitExercises().filter(e=>e.group===style);
/** Highest level reachable: the leading run of unlocked exercises (a locked rung kills every rung above it). */
export function maxLevel(style,canUse){const l=styleLadder(style);let n=0;while(n<l.length&&canUse(l[n].id))n++;return n;}
/** Tap switch k (1-based): an off switch engages 1..k; an engaged switch drops the ladder to k-1. Dead switches (above max) do nothing. */
export function tapLevel(level,k,max=Infinity){if(k>max||k<1)return level;return k<=level?k-1:k;}
/** One exercise per powered style at its engaged level; unpowered or level-0 styles contribute none. */
export function sectionPicks({powered,levels,canUse}){
 const out=[];
 for(const style of powered){const l=styleLadder(style),lv=Math.min(levels[style]??0,maxLevel(style,canUse));if(lv>=1)out.push(l[lv-1].id);}
 return out;
}

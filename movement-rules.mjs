// SPDX-License-Identifier: AGPL-3.0-or-later
// Deliberately coarse movement measurements, not a form or injury-risk score.
// Counting rules are data: one row per exercise (or per detector family), run by the small interpreter below.
// Pattern after yakupzengin/fitness-trainer-pose-estimation (MIT): joint triplets with up/down thresholds.
// squat, pushup, tree, warrior and horse still count on their hand-tuned paths in movement-engine.mjs (the ones
// tested on Ian's phone); boxing (pace), march (steps) and jumping (body rise) are not threshold rules.
//
// A condition is 'measure op number', 'both measure op number' (true for the left AND the right side), a bare
// flag ('upright'), or 'clear <landmarks>' (each clearly visible, >= .6). A measure is a joint triplet such as
// 's-e-w' (the elbow angle on the counted side: s shoulder, e elbow, w wrist, h hip, k knee; MediaPipe ids work
// too) or a name from MEASURES. Row fields:
//  need   landmarks the counted side must show; the clearer side is picked, or the exercise's fixed side.
//  gate   conditions that must hold or counting pauses.
//  up/down  start and far positions of a repetition (hysteresis sits in the gap between the thresholds).
//  match  hold shape; with either:true it may hold for either leg (mirror).
//  metric 'measure zero span' progress, (value-zero)/span; a list takes the smallest.
//  travel hip travel from the calibrated start, in torso lengths (squats).
// Timing (dwell, minCycle) stays on the exercise-library row. Angles are EMA-smoothed by the engine.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const angle=(a,b,c)=>{const u=[a.x-b.x,a.y-b.y,(a.z??0)-(b.z??0)],v=[c.x-b.x,c.y-b.y,(c.z??0)-(b.z??0)],d=Math.hypot(...u)*Math.hypot(...v);return d>1e-8?Math.acos(clamp(u.reduce((s,x,i)=>s+x*v[i],0)/d,-1,1))*180/Math.PI:NaN;};
// World angles are optional: never combine world and image coordinates.
const a3=(f,a,b,c)=>{const w=f.world;return w&&[a,b,c].every(i=>w[i]&&[w[i].x,w[i].y,w[i].z].every(Number.isFinite))?angle(w[a],w[b],w[c]):angle(f.p[a],f.p[b],f.p[c]);};
// s: counted side, o: the other side. …Drop: below its reference in the counted side's torso lengths; the rest use
// the body torso T (both sides averaged).
const MEASURES={
 core:c=>c.s.core,upright:c=>c.f.upright,horizontal:c=>c.s.horizontal,imageElbow:c=>c.s.elbow,
 hipDrop:c=>(c.s.h.y-c.s.s.y)/c.s.torso,wristDrop:c=>(c.s.w.y-c.s.s.y)/c.s.torso,kneeDrop:c=>(c.s.k.y-c.s.h.y)/c.s.torso,shoulderDrop:c=>(c.s.s.y-c.s.k.y)/c.s.torso,
 wristY:c=>(c.s.w.y-c.s.s.y)/c.T,elbowY:c=>(c.s.e.y-c.s.s.y)/c.T,wristElbowY:c=>(c.s.w.y-c.s.e.y)/c.T,wristLevel:c=>Math.abs(c.s.w.y-c.s.s.y)/c.T,
 kneeY:c=>(c.s.k.y-c.s.h.y)/c.T,otherKneeY:c=>(c.o.k.y-c.o.h.y)/c.T,kneeOut:c=>Math.abs(c.s.k.x-c.s.h.x)/c.T,otherKneeOut:c=>Math.abs(c.o.k.x-c.o.h.x)/c.T,kneeGap:c=>(c.o.k.y-c.s.k.y)/c.T,
 spread:c=>Math.abs(c.l.k.x-c.r.k.x)/c.T,wristSpan:c=>Math.abs(c.l.w.x-c.r.w.x)/c.T,shoulderStackY:c=>Math.abs(c.l.s.y-c.r.s.y)/c.T,shoulderStackX:c=>Math.abs(c.l.s.x-c.r.s.x)/c.T
};
const UPPER='clear 11 12 13 14 15 16 23 24',LEGS='clear 11 12 23 24 25 26',OVERHEAD=[UPPER,'both wristY < -.65'];
const push={need:'s e w h',gate:['horizontal >= .5','wristDrop >= .12'],up:['s-e-w > 150'],down:['s-e-w < 112'],metric:'s-e-w 165 -60'};
const incline={...push,gate:['horizontal >= .28','wristDrop >= .12']};
const squat={gate:['core','hipDrop >= .55'],travel:.25};
const hinge={need:'s h k',gate:['kneeDrop >= .35'],up:['s-h-k > 158'],down:['s-h-k < 135'],metric:'s-h-k 180 -65'};
const plank={need:'s e w h k',gate:['horizontal > .65'],match:['s-h-k > 155','wristDrop > .2','s-e-w > 145']};
const raise={gate:[UPPER,'upright'],up:['both h-s-w < 30'],down:['both h-s-w > 75','both s-e-w > 145'],metric:'both h-s-w 0 90'};
const standing=[LEGS,'upright'],straightLegs=['both kneeOut < .55','both kneeY > .7','spread < 1.2'];
const balance={gate:standing,either:true,match:['otherKneeOut < .55','otherKneeY > .5','kneeGap > .15','kneeOut > .4']};
const horse=deepest=>({gate:standing,match:['spread > 1.4','both kneeOut > .5','both kneeY > .08','both kneeY < '+deepest]});
const front={gate:standing,match:['spread > 1.1','kneeY < .85','otherKneeY > .85']};
const jack={gate:[UPPER,LEGS,'upright'],up:['spread < 1.2','both h-s-w < 35'],down:['spread > 1.5','both h-s-w > 130'],metric:['spread 0 1.5','both h-s-w 0 140']};
// Keyed by exercise id, falling back to the exercise's detector.
export const RULES={
 pushup:push,'high-incline-pushup':incline,'low-incline-pushup':incline,
 squat,'shallow-squat':{...squat,travel:.18},
 split:{need:'s h k',gate:['upright','kneeDrop >= 0'],up:['s-h-k > 155'],down:['s-h-k < 135'],metric:'s-h-k 165 -60'},
 hinge,'small-hinge':{...hinge,down:['s-h-k < 155']},
 bridge:{need:'s h k',gate:['horizontal >= .5','kneeDrop < .2','shoulderDrop >= .1'],up:['s-h-k < 145'],down:['s-h-k > 162'],metric:'s-h-k 125 50'},
 plank,'forearm-plank':{...plank,match:['s-h-k > 155','wristDrop > .2','s-e-w > 60','s-e-w < 120']},
 sideplank:{gate:['clear 11 12 23 24 e k'],match:['shoulderStackY > .3','shoulderStackX < .5','horizontal > .7','s-h-k > 153','elbowY > .15']},
 raise,'overhead-reach':{...raise,down:['both h-s-w > 150','both s-e-w > 145'],metric:'both h-s-w 0 160'},
 press:{gate:[UPPER,'upright'],up:['both s-e-w < 115','both wristY < .2'],down:['both wristY < -.65','both s-e-w > 155'],metric:'both h-s-w 0 90'},
 balance,'low-tree':{...balance,match:['otherKneeOut < .55','otherKneeY > .5','kneeGap > .08','kneeOut > .2']},
 'knee-balance':{...balance,match:['otherKneeOut < .55','otherKneeY > .5','kneeGap > .35']},'overhead-tree':{...balance,match:[...balance.match,...OVERHEAD]},
 mountain:{gate:standing,match:[...straightLegs,UPPER,'both wristY > .5']},salute:{gate:standing,match:[...straightLegs,...OVERHEAD]},
 chair:{gate:standing,match:['both kneeY > .08','both kneeY < .8','spread < 1.2',...OVERHEAD]},
 'warrior-one':{...front,either:true,match:[...front.match,...OVERHEAD]},
 warrior:{...front,either:true,match:[...front.match,UPPER,'both imageElbow > 145','both wristLevel < .3','wristSpan > 2']},
 goddess:{gate:standing,match:[...horse(1).match,UPPER,'both imageElbow < 120','both wristElbowY < 0']},
 stance:horse(1),'high-horse':horse(1.25),'low-horse':horse(.6),'front-stance-left':front,'front-stance-right':front,
 jack,'step-jack':{...jack,down:['spread > 1.3','both h-s-w > 130']}
};
const OPS={'<':(a,b)=>a<b,'>':(a,b)=>a>b,'<=':(a,b)=>a<=b,'>=':(a,b)=>a>=b};
const swap=c=>({...c,s:c.o,o:c.s});
function measure(name){
 if(MEASURES[name])return MEASURES[name];
 if(!/^([sewhk]|\d+)-([sewhk]|\d+)-([sewhk]|\d+)$/.test(name))throw new Error('Unknown movement measure: '+name);
 const keys=name.split('-');
 return c=>{
  const [a,b,d]=keys.map(k=>c.s.id[k]??Number(k)),v=a3(c.f,a,b,d);
  if(!Number.isFinite(v)){c.flags.nan=true;return v;}
  return c.smooth?c.smooth(a+name,v):v;
 };
}
function condition(text){
 const t=text.split(' ');
 if(t[0]==='clear'){const keys=t.slice(1);return c=>keys.every(k=>{const i=c.s.id[k]??Number(k);return c.f.visible([i])&&c.f.p[i].visibility>=.6;});}
 const both=t[0]==='both';if(both)t.shift();
 const [name,op,value]=t,get=measure(name);if(op&&!OPS[op])throw new Error('Unknown movement operator: '+text);
 const one=op?c=>OPS[op](get(c),Number(value)):c=>!!get(c);
 return both?c=>[one(c),one(swap(c))].every(Boolean):one;
}
function progress(text){
 const t=text.split(' '),both=t[0]==='both';if(both)t.shift();
 const get=measure(t[0]),zero=Number(t[1]),span=Number(t[2]),one=c=>(get(c)-zero)/span;
 return both?c=>Math.min(one(c),one(swap(c))):one;
}
// Every condition is evaluated (no short-circuit) so an unusable angle anywhere in a repetition rule is seen.
const all=list=>{const tests=list.map(condition);return c=>tests.map(test=>test(c)).every(Boolean);};
const compile=r=>({...r,need:r.need?.split(' ')??null,gate:all(r.gate??[]),match:r.match&&all(r.match),up:all(r.up??[]),down:all(r.down??[]),metric:[r.metric??[]].flat().map(progress)});
// Rows compile once (a typo fails when this module loads); a row added later compiles on first use.
const compiled=new WeakMap(),ruleFor=rule=>rule&&(compiled.get(rule)??compiled.set(rule,compile(rule)).get(rule));
Object.values(RULES).forEach(ruleFor);
// smooth(key,value) is the engine's EMA; tests and one-off checks pass none.
export function evaluateMovement(f,m,previousSide=null,smooth=null){
 const rule=ruleFor(RULES[m.id]??RULES[m.detector]),need=rule?.need;
 const candidates=Object.entries(f.sides).filter(([name,s])=>(!m.side||m.side===name)&&s.torso>.035&&(!need||f.visible(need.map(k=>s.id[k]))));
 const picked=candidates.find(([name])=>name===previousSide)??candidates.sort((a,b)=>b[1].coreQuality-a[1].coreQuality)[0];
 const out={valid:false,up:false,down:false,match:false,metric:0,side:picked?.[0]??null,message:m.hint};
 if(!rule||need&&!picked)return out;
 const l=f.sides.left,r=f.sides.right,s=m.side?f.sides[m.side]:picked?.[1]??l;
 const c={f,l,r,s,o:s===l?r:l,T:Math.max(f.torso,.035),smooth,flags:{nan:false}};
 if(need&&!need.every(k=>f.visible([s.id[k]])&&f.p[s.id[k]].visibility>=.6)||!rule.gate(c))return out;
 if(rule.travel){out.valid=true;out.travel=rule.travel;out.sample={hipY:s.h.y,torso:s.torso,angle:0};out.metric=s.h.y;return out;}
 if(rule.match){out.valid=true;out.match=rule.either?[c,swap(c)].some(x=>rule.match(x)):rule.match(c);out.metric=Number(out.match);return out;}
 const up=rule.up(c),down=rule.down(c),metric=rule.metric.length?Math.min(...rule.metric.map(p=>p(c))):0;
 if(c.flags.nan)return out;
 return Object.assign(out,{valid:true,up,down,metric});
}

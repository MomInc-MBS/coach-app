// SPDX-License-Identifier: AGPL-3.0-or-later
// Original movement recipes on MediaPipe landmarks. See movement-research.md.
// Difficulty is a suggested progression, never a personal ability assessment.
export const FOCUS_GROUPS = [
  {id:'chest',name:'Chest',description:'Push-up progressions'},
  {id:'legs',name:'Legs',description:'Squats and split squats'},
  {id:'hips',name:'Hips & glutes',description:'Hinges and bridges'},
  {id:'core',name:'Core',description:'Plank holds'},
  {id:'shoulders',name:'Shoulders',description:'Controlled arm movement'},
  {id:'balance',name:'Balance',description:'Single-leg yoga holds'},
  {id:'yoga',name:'Yoga',description:'Standing poses'},
  {id:'stances',name:'Martial stances',description:'Controlled stance holds'},
  {id:'boxing',name:'Boxing',description:'Slow shadowboxing'},
  {id:'cardio',name:'Cardio',description:'Marches and jacks'}
];
const rows=[];
function add(group,id,name,detector,options={}){
  const kind=options.kind??(['plank','sideplank','balance','yoga','stance'].includes(detector)?'hold':detector==='boxing'?'pace':detector==='march'?'steps':'reps');
  const view=options.view??(['pushup','hinge','bridge','plank','split'].includes(detector)?'side':'front');
  const measurement=kind==='hold'?'Pose hold':kind==='pace'?'Active hand time':kind==='steps'?'Knee lifts':'Repetitions';
  const limits=options.limits??'Counts the visible movement; does not grade technique.';
  const camera=view==='side'?'Camera beside you.':view==='angle'?'Camera at a slight angle.':'Face the camera.';
  rows.push({id,group,name,detector,kind,view,measurement,limits,difficulty:rows.filter(r=>r.group===group).length+1,defaultGoal:kind==='hold'||kind==='pace'?15:5,evidence:'rule-based; camera validation pending',source:'mediapipe',...options,hint:`${camera} ${options.cue??'Keep the joints used for this movement visible.'}`});
}
const pushLimits='Counts elbow bend and return. Hand shape, support stability and chest depth are not verified.';
for(const [id,name,extra] of [
 ['knee-pushup','Knee push-up',{support:'knees',cue:'Knees down; show shoulder, elbow, wrist and hip.'}],
 ['high-incline-pushup','High incline push-up',{incline:true,cue:'Hands on a stable high surface; show your full arm and torso.'}],
 ['low-incline-pushup','Low incline push-up',{incline:true,cue:'Hands on a stable lower surface; show your full arm and torso.'}],
 ['pushup','Regular push-up',{}],
 ['wide-pushup','Wide push-up',{wide:true}],
 ['slow-pushup','Slow push-up',{minCycle:1.2}],
 ['diamond-pushup','Diamond push-up',{narrow:true}],
 ['decline-pushup','Feet-elevated push-up',{decline:true,cue:'Feet on a stable low surface; show your full arm and torso.'}]
])add('chest',id,name,'pushup',{cue:'Show shoulder, elbow, wrist and hip. Start with your arm extended.',limits:pushLimits,...extra});
for(const [id,name,extra] of [
 ['shallow-squat','Shallow squat',{travel:.18}],['squat','Bodyweight squat',{}],['wide-squat','Wide squat',{wide:true}],
 ['pause-squat','Pause squat',{dwell:.8}],['slow-squat','Slow squat',{minCycle:1.2}],
 ['split-left','Split squat · left',{detector:'split',side:'left'}],['split-right','Split squat · right',{detector:'split',side:'right'}]
])add('legs',id,name,extra.detector??'squat',{cue:extra.side?'Show the front leg from hip to knee. Start tall.':'Show shoulders and hips. Start standing tall.',...extra});
for(const [id,name,detector,extra] of [
 ['small-hinge','Small hip hinge','hinge',{bend:25}],['hip-hinge','Hip hinge','hinge',{}],['good-morning','Bodyweight good morning','hinge',{arms:'chest'}],
 ['glute-bridge','Glute bridge','bridge',{}],['pause-bridge','Pause glute bridge','bridge',{dwell:.8}]
])add('hips',id,name,detector,{cue:detector==='bridge'?'Lie on your back, knees bent. Show shoulder, hip and knee. Start with hips down.':'Show shoulder, hip and knee. Start upright; hinge slowly.',limits:'Tracks hip movement. Back curvature and muscle engagement are not verified.',...extra});
for(const [id,name,extra] of [
 ['knee-plank','Knee plank',{support:'knees'}],['high-plank','High plank',{}],['forearm-plank','Forearm plank',{forearm:true}],
 ['side-knee-left','Side knee plank · left',{side:'left',support:'knees'}],['side-knee-right','Side knee plank · right',{side:'right',support:'knees'}],
 ['side-plank-left','Side plank · left',{side:'left'}],['side-plank-right','Side plank · right',{side:'right'}]
])add('core',id,name,extra.side?'sideplank':'plank',{view:extra.side?'front':'side',cue:extra.side?'Show both shoulders, hips and the supporting knee. Stack your shoulders.':'Show shoulder, elbow, wrist, hip and supporting knee.',limits:'Times the shoulder–hip–knee line. Feet, floor contact and loading are not tracked.',...extra});
for(const [id,name,detector,extra] of [
 ['front-raise','Front arm raise','raise',{view:'side',plane:'front'}],['lateral-raise','Lateral arm raise','raise',{}],
 ['overhead-reach','Overhead reach','raise',{overhead:true}],['standing-press','Standing arm press','press',{}],['slow-press','Slow arm press','press',{minCycle:1.2}]
])add('shoulders',id,name,detector,{cue:'Keep both shoulders, elbows, wrists and hips visible. Use controlled, unloaded movement.',...extra});
for(const [id,name,extra] of [
 ['knee-balance','Knee-lift balance',{kneeLift:true}],['low-tree','Low tree pose',{low:true}],['tree','Tree pose',{}],['overhead-tree','Tree · arms overhead',{overhead:true}]
])add('balance',id,name,'balance',{cue:'Show both hips and knees. Either leg works; keep a support nearby if needed.',limits:'Times the visible leg shape. Balance, foot pressure and support use are not verified.',...extra});
for(const [id,name,pose] of [['mountain','Mountain','mountain'],['salute','Upward salute','salute'],['chair','Chair pose','chair'],['warrior-one','Warrior I','warrior-one'],['warrior','Warrior II','warrior'],['goddess','Goddess pose','goddess']])
 add('yoga',id,name,'yoga',{pose,view:['chair','warrior-one'].includes(pose)?'side':'front',cue:'Show arms, hips and knees. Hold only a comfortable position.',limits:'Times broad pose shape. Foot rotation and joint alignment are not graded.'});
for(const [id,name,extra] of [['high-horse','High horse stance',{high:true}],['horse','Horse stance',{}],['low-horse','Lower horse stance',{low:true}],['front-stance-left','Front stance · left',{side:'left'}],['front-stance-right','Front stance · right',{side:'right'}]])
 add('stances',id,name,'stance',{view:extra.side?'side':'front',cue:'Keep hips and knees visible. Move slowly into a comfortable stance.',limits:'Times stance shape only. This is not martial-arts technique instruction.',...extra});
for(const [id,name,extra] of [['jab-left','Left straight practice',{side:'left'}],['jab-right','Right straight practice',{side:'right'}],['boxing','Alternating straights',{}],['double-jab','Double-jab practice',{double:true}]])
 add('boxing',id,name,'boxing',{view:'angle',cue:'Show shoulders, elbows, wrists and hips. Practice slow, controlled punches into empty space.',limits:'Tracks active hand time and relative pace. Punch type, power, accuracy and guard are not verified.',...extra});
for(const [id,name,detector,extra] of [['march','Easy march','march',{}],['high-march','High-knee march','march',{lift:.4}],['jogging','Jog in place','march',{}],['step-jack','Step jack','jack',{step:true}],['jumping-jack','Jumping jack','jack',{}]])
 add('cardio',id,name,detector,{cue:detector==='jack'?'Show your upper body and knees. Start with arms down and knees close together.':'Show shoulders, hips and both knees. Start standing tall.',limits:detector==='jack'?'Counts arm-and-knee opening cycles. Feet, airtime and landings are not tracked.':'Counts knee lifts. Footfalls and impact are not verified.',...extra});
export const EXERCISES=Object.freeze(Object.fromEntries(rows.map(r=>[r.id,Object.freeze(r)])));
export const GROUP_EXERCISES=Object.freeze(Object.fromEntries(FOCUS_GROUPS.map(g=>[g.id,Object.freeze(rows.filter(r=>r.group===g.id))])));
export const EXERCISE_COUNT=rows.length;
export function focusFor(id){return EXERCISES[id]?.group??'cardio';}
export function exerciseAt(group,index){const choices=GROUP_EXERCISES[group]??GROUP_EXERCISES.chest;return choices[Math.max(0,Math.min(choices.length-1,Math.round(Number(index)||0)))];}

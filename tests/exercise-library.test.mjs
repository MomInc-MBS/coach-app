import test from 'node:test';
import assert from 'node:assert/strict';
import {EXERCISES,EXERCISE_COUNT,FOCUS_GROUPS,GROUP_EXERCISES,exerciseAt} from '../exercise-library.mjs';
import {MovementSession,features} from '../movement-engine.mjs';
import {evaluateMovement} from '../movement-rules.mjs';
import {SetFlow,DEFAULT_GOALS} from '../pod/set-flow.mjs';
import {MODES,validateCompletion} from '../server/domain.mjs';
import {readFileSync} from 'node:fs';
const clone=p=>p.map(v=>({...v}));
function standing(){const p=Array.from({length:33},()=>({x:.5,y:.1,z:0,visibility:1}));for(const [s,e,w,h,k,a,x] of [[11,13,15,23,25,27,.4],[12,14,16,24,26,28,.6]])for(const [i,y] of [[s,.2],[e,.3],[w,.42],[h,.4],[k,.64],[a,.88]])p[i]={x,y,z:0,visibility:1};return p;}
function set(p,points){for(const [i,x,y] of points)Object.assign(p[i],{x,y});return p;}
function floor(down=false){const p=standing();for(const [s,e,w,h,k,a,z] of [[11,13,15,23,25,27,0],[12,14,16,24,26,28,.02]])set(p,[[s,down?.14:.23,down?.61:.42],[e,down?.29:.23,.63],[w,.23,.80],[h,.5,down?.57:.49],[k,.65,down?.55:.525],[a,.8,down?.53:.56]]);return p;}
function squatting(){const p=standing();for(const i of [11,12,13,14,15,16,23,24])p[i].y+=.13;return p;}
function split(side='left',down=true){const p=standing(),left=side==='left';set(p,[[11,.45,.2],[12,.55,.2],[23,.45,.4],[24,.55,.4]]);if(down)set(p,[[left?25:26,.27,.49],[left?27:28,.25,.78],[left?26:25,.72,.57],[left?28:27,.91,.76]]);return p;}
function hinge(){const p=standing();p[11].x-=.2;p[12].x-=.2;p[11].y=.32;p[12].y=.32;return p;}
function bridge(up=false){const p=standing();for(const [s,h,k,a,off] of [[11,23,25,27,0],[12,24,26,28,.015]])set(p,[[s,.2,.75+off],[h,.45,(up?.56:.75)+off],[k,.6,.5+off],[a,.77,.75+off]]);return p;}
function arms(up=0,press=false){const p=standing();for(const [s,e,w,h,x,sign]of [[11,13,15,23,.4,-1],[12,14,16,24,.6,1]]){if(press&&!up)set(p,[[e,x+sign*.16,.22],[w,x+sign*.16,.07]]);else{const a=up*Math.PI/180;set(p,[[e,x+sign*Math.sin(a)*.14,.2+Math.cos(a)*.14],[w,x+sign*Math.sin(a)*.27,.2+Math.cos(a)*.27]]);}}for(const v of p)v.y+=.08;return p;}
function jack(open){const p=arms(open?165:0);if(open){p[25].x=.22;p[26].x=.78;}return p;}
function tree(overhead=false){const p=overhead?arms(170):standing();set(p,[[25,.27,.52],[27,.53,.62]]);return p;}
function horse(){return set(standing(),[[11,.42,.28],[12,.58,.28],[23,.42,.48],[24,.58,.48],[25,.23,.58],[26,.77,.58],[27,.23,.83],[28,.77,.83]]);}
function runner(mode){let now=0;const session=new MovementSession(mode);return {session,feed(p,sec=1){for(let i=0;i<sec*20;i++){now+=50;session.update(typeof p==='function'?p(now):p,now);}return session.snapshot();},gap(p){now+=3000;return session.update(p,now);}};}
test('all focus groups offer ordered, reachable recipes and backend goals',()=>{assert.equal(FOCUS_GROUPS.length,10);assert.equal(EXERCISE_COUNT,56);const seen=new Set();for(const group of FOCUS_GROUPS){const choices=GROUP_EXERCISES[group.id];assert(choices.length>=4);choices.forEach((m,i)=>{assert.equal(m.difficulty,i+1);assert.equal(exerciseAt(group.id,i).id,m.id);assert(MODES[m.id]);assert(DEFAULT_GOALS[m.id]>0);assert(m.hint&&m.limits);assert(!seen.has(m.id));seen.add(m.id);});assert.equal(exerciseAt(group.id,999).id,choices.at(-1).id);}assert.equal(seen.size,EXERCISE_COUNT);});
for(const [mode,start,end] of [
 ['knee-pushup',()=>floor(),()=>floor(true)],['diamond-pushup',()=>floor(),()=>floor(true)],['high-incline-pushup',()=>floor(),()=>floor(true)],
 ['shallow-squat',standing,squatting],['wide-squat',standing,squatting],['split-left',()=>split('left',false),()=>split()],['split-right',()=>split('right',false),()=>split('right')],
 ['hip-hinge',standing,hinge],['small-hinge',standing,hinge],['good-morning',standing,hinge],['glute-bridge',()=>bridge(),()=>bridge(true)],
 ['lateral-raise',()=>arms(0),()=>arms(90)],['overhead-reach',()=>arms(0),()=>arms(170)],['standing-press',()=>arms(0,true),()=>arms(170,true)],
 ['step-jack',()=>jack(false),()=>jack(true)],['jumping-jack',()=>jack(false),()=>jack(true)]]){
 test(`${mode}: three complete cycles count, stillness and incomplete cycles do not`,()=>{const r=runner(mode);r.feed(start(),1.2);assert(r.session.base,'start detected');for(let i=0;i<3;i++){r.feed(end(),.7);r.feed(start(),.7);}assert.equal(r.session.count,3);r.feed(start(),2);assert.equal(r.session.count,3);r.feed(end(),.7);r.feed(null,.6);r.feed(start(),1);assert.equal(r.session.count,3);});
}
test('pause squats require the bottom hold; a fast bounce is rejected',()=>{const r=runner('pause-squat');r.feed(standing(),1.2);r.feed(squatting(),.4);r.feed(standing(),.6);assert.equal(r.session.count,0);r.feed(squatting(),1.2);r.feed(standing(),.7);assert.equal(r.session.count,1);});
test('slow push-ups require extra time before a completed return',()=>{const r=runner('slow-pushup');r.feed(floor(),1.2);r.feed(floor(true),.4);r.feed(floor(),.3);assert.equal(r.session.count,0);r.feed(floor(),1.3);assert.equal(r.session.count,1);});
for(const [mode,pose] of [['high-plank',floor],['low-tree',tree],['overhead-tree',()=>tree(true)],['mountain',standing],['salute',()=>arms(170)],['high-horse',horse]]){
 test(`${mode}: held shape accrues time; a missing required joint pauses`,()=>{const r=runner(mode);r.feed(pose(),2);assert(r.session.totalHold>1,JSON.stringify(r.session.snapshot()));const before=r.session.totalHold;const lost=clone(pose());for(const i of [11,12])lost[i].visibility=.1;r.feed(lost,1);assert.equal(r.session.totalHold,before);assert.equal(r.session.hold,0);r.gap(pose());assert.equal(r.session.totalHold,before);});
}
test('forearm and straight-arm plank holds use different elbow geometry',()=>{const p=floor(),bent=clone(p);set(bent,[[13,.23,.68],[15,.40,.68],[14,.23,.68],[16,.40,.68]]);assert.equal(evaluateMovement(features(p),EXERCISES['forearm-plank']).match,false);assert.equal(evaluateMovement(features(bent),EXERCISES['forearm-plank']).match,true);assert.equal(evaluateMovement(features(bent),EXERCISES['high-plank']).match,false);});
test('upright curls are never new push-up reps',()=>{const r=runner('diamond-pushup');r.feed(standing(),2);r.feed(arms(80),2);r.feed(standing(),2);assert.equal(r.session.count,0);assert.equal(r.session.base,null);});
test('world coordinates can measure an arm raising toward the camera',()=>{const image=standing(),world=standing();for(const [s,e,w] of [[11,13,15],[12,14,16]]){world[e].y=world[s].y;world[e].z=.14;world[w].y=world[s].y;world[w].z=.27;}assert.equal(evaluateMovement(features(image,1,world),EXERCISES['front-raise']).down,true);assert.equal(evaluateMovement(features(image),EXERCISES['front-raise']).down,false);});
test('low visibility, off-frame joints and invalid world angles never count a new movement',()=>{for(const mode of ['hip-hinge','diamond-pushup','high-plank','standing-press','jumping-jack']){const r=runner(mode);r.feed(standing().map(p=>({...p,visibility:.2})),2);assert.equal(r.session.tracking,false);assert.equal(r.session.count,0);assert.equal(r.session.totalHold,0);r.feed(standing().map(p=>({...p,x:2})),2);assert.equal(r.session.tracking,false);}});
test('changing recipes clears counts, baselines, holds and in-progress phases',()=>{const r=runner('diamond-pushup');r.feed(floor(),1.2);r.feed(floor(true),.7);r.session.reset('high-plank');assert.equal(r.session.mode,'high-plank');assert.equal(r.session.phase,'ready');assert.equal(r.session.base,null);assert.equal(r.session.count,0);assert.equal(r.session.totalHold,0);});
test('new holds receive hold-duration checks on the server; unknown modes are absent',()=>{assert(!Object.hasOwn(MODES,'flying-kick'));assert.throws(()=>validateCompletion({mode:'high-plank',goal:20,started_at:0},{value:20},10000));assert(validateCompletion({mode:'high-plank',goal:20,started_at:0},{value:20},25000));});
test('boxing cannot finish a set while the user is still or off camera',()=>{const f=new SetFlow();f.start('jab-left',15);assert.equal(f.consume({mode:'jab-left',kind:'pace',elapsed:60,active:0},60000),null);assert.equal(f.consume({mode:'jab-left',name:'Left straight practice',kind:'pace',elapsed:60,active:15},60001).xp,25);});
test('every exercise uses the same catalogue across goal validation and session startup',()=>{for(const m of Object.values(EXERCISES)){const f=new SetFlow();assert.equal(f.start(m.id).mode,m.id);assert.equal(new MovementSession(m.id).snapshot().kind,m.kind);}});
test('intro has explicit Begin, no forced start, and the focus stylesheet is loaded',()=>{const menu=readFileSync('menu.mjs','utf8'),app=readFileSync('app.mjs','utf8'),html=readFileSync('pose.html','utf8');assert(!menu.includes('8000'));assert(!menu.includes('Starting in three'));assert(!app.includes("cinematics.play('pre'"));assert(menu.includes("$('useHologram').addEventListener('click',()=>begin())"));assert(html.includes('href="/focus-library.css"'));});

test('every exercise produces identical results with absent, hidden or wildly moving feet',()=>{
 for(const mode of Object.keys(EXERCISES)){
  const sessions=[new MovementSession(mode),new MovementSession(mode),new MovementSession(mode)];
  for(let i=0;i<160;i++){
   const pose=[standing(),squatting(),floor(),floor(true),arms(170),horse(),tree(),jack(true)][Math.floor(i/20)];
   const missing=clone(pose).slice(0,27),hidden=clone(pose),noisy=clone(pose);
   for(let j=27;j<33;j++){hidden[j]={x:0,y:0,z:0,visibility:0};noisy[j]={x:Math.sin(i*j)*99,y:Math.cos(i*j)*99,z:i,visibility:1};}
   [missing,hidden,noisy].forEach((p,n)=>sessions[n].update(p,i*50+1,1,p));
   assert.deepEqual(sessions[0].snapshot(),sessions[1].snapshot(),mode+' missing feet');
   assert.deepEqual(sessions[0].snapshot(),sessions[2].snapshot(),mode+' moving feet');
  }
 }
});

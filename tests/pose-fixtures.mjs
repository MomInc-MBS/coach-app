// Synthetic landmark poses, copied from tests/movement-engine.test.mjs (ENGINE) and tests/exercise-library.test.mjs
// (LIBRARY), plus a seeded synthetic recording in the ?recordPose=1 format for the k-NN path.
const set=(p,points)=>{for(const [i,x,y] of points)Object.assign(p[i],{x,y});return p;};
function engineStanding(){
 const p=Array.from({length:33},()=>({x:.5,y:.2,visibility:1}));
 for(const [s,e,w,h,k,a,x] of [[11,13,15,23,25,27,.4],[12,14,16,24,26,28,.6]]){Object.assign(p[s],{x,y:.23});Object.assign(p[e],{x,y:.34});Object.assign(p[w],{x,y:.43});Object.assign(p[h],{x,y:.43});Object.assign(p[k],{x,y:.65});Object.assign(p[a],{x,y:.89});}
 return p;
}
function engineSquat(){const p=engineStanding();for(const [s,h,k] of [[11,23,25],[12,24,26]]){p[s].x-=.08;p[s].y=.41;p[h].x-=.07;p[h].y=.60;p[k].x+=.10;p[k].y=.69;}return p;}
function enginePushup(down=false){const p=engineStanding();for(const [s,e,w,h,k,a,d] of [[11,13,15,23,25,27,0],[12,14,16,24,26,28,.025]]){
 Object.assign(p[s],{x:(down?.15:.25),y:(down?.60:.45)+d});Object.assign(p[e],{x:down?.27:.25,y:(down?.65:.59)+d});Object.assign(p[w],{x:.25,y:.78+d});Object.assign(p[h],{x:.53,y:(down?.56:.5)+d});Object.assign(p[k],{x:.67,y:.52+d});Object.assign(p[a],{x:.8,y:.54+d});}return p;}
export const ENGINE={standing:engineStanding,squat:engineSquat,pushup:enginePushup};
function standing(){const p=Array.from({length:33},()=>({x:.5,y:.1,z:0,visibility:1}));for(const [s,e,w,h,k,a,x] of [[11,13,15,23,25,27,.4],[12,14,16,24,26,28,.6]])for(const [i,y] of [[s,.2],[e,.3],[w,.42],[h,.4],[k,.64],[a,.88]])p[i]={x,y,z:0,visibility:1};return p;}
function floor(down=false){const p=standing();for(const [s,e,w,h,k,a] of [[11,13,15,23,25,27],[12,14,16,24,26,28]])set(p,[[s,down?.14:.23,down?.61:.42],[e,down?.29:.23,.63],[w,.23,.80],[h,.5,down?.57:.49],[k,.65,down?.55:.525],[a,.8,down?.53:.56]]);return p;}
function squatting(){const p=standing();for(const i of [11,12,13,14,15,16,23,24])p[i].y+=.13;return p;}
function split(side='left',down=true){const p=standing(),left=side==='left';set(p,[[11,.45,.2],[12,.55,.2],[23,.45,.4],[24,.55,.4]]);if(down)set(p,[[left?25:26,.27,.49],[left?27:28,.25,.78],[left?26:25,.72,.57],[left?28:27,.91,.76]]);return p;}
function hinge(){const p=standing();p[11].x-=.2;p[12].x-=.2;p[11].y=.32;p[12].y=.32;return p;}
function bridge(up=false){const p=standing();for(const [s,h,k,a,off] of [[11,23,25,27,0],[12,24,26,28,.015]])set(p,[[s,.2,.75+off],[h,.45,(up?.56:.75)+off],[k,.6,.5+off],[a,.77,.75+off]]);return p;}
function arms(up=0,press=false){const p=standing();for(const [s,e,w,h,x,sign]of [[11,13,15,23,.4,-1],[12,14,16,24,.6,1]]){if(press&&!up)set(p,[[e,x+sign*.16,.22],[w,x+sign*.16,.07]]);else{const a=up*Math.PI/180;set(p,[[e,x+sign*Math.sin(a)*.14,.2+Math.cos(a)*.14],[w,x+sign*Math.sin(a)*.27,.2+Math.cos(a)*.27]]);}}for(const v of p)v.y+=.08;return p;}
function jack(open){const p=arms(open?165:0);if(open){p[25].x=.22;p[26].x=.78;}return p;}
export const LIBRARY={standing,floor,squatting,split,hinge,bridge,arms,jack};
// Rep exercises with their existing start and end fixtures.
export const REP_CYCLES=[
 ['squat',engineStanding,engineSquat],['pushup',()=>enginePushup(),()=>enginePushup(true)],
 ['knee-pushup',()=>floor(),()=>floor(true)],['diamond-pushup',()=>floor(),()=>floor(true)],['high-incline-pushup',()=>floor(),()=>floor(true)],
 ['shallow-squat',standing,squatting],['wide-squat',standing,squatting],['split-left',()=>split('left',false),()=>split()],['split-right',()=>split('right',false),()=>split('right')],
 ['hip-hinge',standing,hinge],['small-hinge',standing,hinge],['good-morning',standing,hinge],['glute-bridge',()=>bridge(),()=>bridge(true)],
 ['lateral-raise',()=>arms(0),()=>arms(90)],['overhead-reach',()=>arms(0),()=>arms(170)],['standing-press',()=>arms(0,true),()=>arms(170,true)],
 ['step-jack',()=>jack(false),()=>jack(true)],['jumping-jack',()=>jack(false),()=>jack(true)]
];
export function random(seed){return ()=>{seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const lerp=(a,b,k)=>a.map((v,i)=>({...v,x:v.x+(b[i].x-v.x)*k,y:v.y+(b[i].y-v.y)*k}));
// Squats as a phone would record them: 2 s standing, then `reps` cycles (0.3 s moves, `hold` s at each end), jitter
// on every landmark, "down"/"up" labels on the first `labelled` cycles only. Same format as pose-recorder.mjs.
export function syntheticRecording({reps=6,labelled=3,fps=15,hold=.7,seed=7}={}){
 const rnd=random(seed),top=engineStanding(),bottom=engineSquat(),frames=[],labels=[],start=1000,move=.3,cycle=2*(move+hold);
 const pose=s=>{if(s<2)return top;const c=(s-2)%cycle;return c<move?lerp(top,bottom,c/move):c<move+hold?bottom:c<2*move+hold?lerp(bottom,top,(c-move-hold)/move):top;};
 for(let i=0;i<(2+reps*cycle+1)*fps;i++){const s=i/fps;frames.push([start+Math.round(s*1000),pose(s).slice(0,27).map(v=>[+(v.x+(rnd()-.5)*.008).toFixed(4),+(v.y+(rnd()-.5)*.008).toFixed(4),v.visibility])]);}
 labels.push({label:'up',from:start+300,to:start+1800});
 for(let r=0;r<labelled;r++){const c=start+2000+r*cycle*1000;labels.push({label:'down',from:Math.round(c+move*1000+100),to:Math.round(c+(move+hold)*1000-100)},{label:'up',from:Math.round(c+(2*move+hold)*1000+100),to:Math.round(c+cycle*1000-100)});}
 return {version:1,exercise:'squat',aspect:1,frames,labels};
}

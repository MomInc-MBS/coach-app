// Read-only synthetic research probes. Does not change production modules.
import {MovementSession,features,MOVEMENTS} from '../movement-engine.mjs';
import {evaluateMovement} from '../movement-rules.mjs';
import {ENGINE,LIBRARY} from '../tests/pose-fixtures.mjs';
import {PoseClassifier} from '../pose-classifier.mjs';
import {convert} from './pose-samples.mjs';
import {syntheticRecording} from '../tests/pose-fixtures.mjs';
import {execFileSync} from 'node:child_process';

const clone=p=>p.map(v=>({...v}));
function tree(){const p=ENGINE.standing();Object.assign(p[25],{x:.25,y:.60});return p;}
function hold(mode,pose,{missing=null,from=2000,to=2400}={}){
 const session=new MovementSession(mode,{samples:null});
 for(let t=0;t<=5000;t+=50){let p=clone(pose());if(missing&&t>=from&&t<to)p=missing(p);session.update(p,t);}
 return {seconds:session.totalHold,continuous:session.hold,message:session.message};
}
const obscure=p=>p.map((v,i)=>({...v,visibility:[11,12,13,14,15,16,23,24,25,26].includes(i)?0:v.visibility}));
const results={source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),syntheticOnly:true,hold:[],cadence:[]};
for(const [mode,pose] of [['tree',tree],['high-plank',()=>LIBRARY.floor()]]){
 for(const [label,missing] of [['continuous',null],['missing-joints',obscure],['no-pose',()=>null]]){
  results.hold.push({mode,scenario:label,...hold(mode,pose,{missing})});
 }
}
const floor=LIBRARY.floor(),handsKnees=clone(floor);
for(const i of [25,26])Object.assign(handsKnees[i],{x:.5,y:.8});
const cropped=p=>p.map((v,i)=>({...v,...([25,26].includes(i)?{y:1.2,visibility:0}:{})}));
results.plankAmbiguity={visible:evaluateMovement(features(handsKnees),MOVEMENTS['high-plank']),cropped:evaluateMovement(features(cropped(handsKnees)),MOVEMENTS['high-plank'])};
function count(fps,period,offset){
 const r=new MovementSession('squat',{samples:null}),a=ENGINE.standing(),b=ENGINE.squat(),n=10,end=3+n*period;
 for(let t=offset/fps;t<end+2;t+=1/fps){const k=t<3||t>=end?0:(1-Math.cos(2*Math.PI*(t-3)/period))/2;
  r.update(a.map((v,i)=>({...v,x:v.x+(b[i].x-v.x)*k,y:v.y+(b[i].y-v.y)*k})),t*1000);
 }
 return r.count;
}
for(const fps of [1.4,1.5,1.6,2,2.5,4,8,15,30])for(const period of [1,1.5,2,3,4]){
 const counts=Array.from({length:40},(_,i)=>count(fps,period,i/40));
 results.cadence.push({fps,secondsPerRep:period,expected:10,min:Math.min(...counts),max:Math.max(...counts),mean:counts.reduce((a,b)=>a+b,0)/counts.length,exact:counts.filter(n=>n===10).length,phases:40});
}
const {samples}=convert(syntheticRecording()),knn=new PoseClassifier(samples),p=ENGINE.standing();
const gate=points=>features(points).visible(knn.need);
const crop=p.map((v,i)=>({...v,...([25,26].includes(i)?{y:1.2,visibility:0}:{})}));
results.knn={required:knn.need,standing:{gate:gate(p),votes:knn.classify(features(p).p)},kneesCropped:{gate:gate(crop),votes:knn.classify(features(crop).p)}};
console.log(JSON.stringify(results,null,2));

import {valueOf} from './set-flow.mjs';
const LINES={reps:['Steady work.','One movement at a time.','Keep your own pace.'],hold:['Stay comfortable.','Take your time.','Steady work.'],pace:['Find your rhythm.','Keep your own pace.','Steady work.'],steps:['Find your rhythm.','One step at a time.','Keep your own pace.'],jumps:['Keep your own pace.','One movement at a time.','Steady work.']};
export class SetEncouragement {
 constructor(){this.reset();}
 reset(){this.first=null;this.last=-Infinity;this.halfway=false;this.index=0;}
 update(m,goal,now,otherCues=[]){
  if(!m.tracking||m.complete||valueOf(m)>=goal)return null;
  if(['squat','pushup','jumping'].includes(m.mode)&&!m.calibrated)return null;
  if(m.kind==='hold'&&m.progress!==1)return null;
  this.first??=now;
  // Speak around counts; give setup, recovery and timer announcements priority.
  if(otherCues.some(c=>c.key!=='count')||now-this.last<8000)return null;
  if(!this.halfway&&valueOf(m)>=goal/2){this.halfway=true;this.last=now;return {text:'Halfway. Keep your own pace.',key:'encouragement'};}
  if(now-this.first>=18000&&now-this.last>=20000){this.last=now;const choices=LINES[m.kind]||LINES.reps;return {text:choices[this.index++%choices.length],key:'encouragement'};}
  return null;
 }
}

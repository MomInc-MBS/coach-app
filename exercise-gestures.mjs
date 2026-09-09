// Gesture proposals are separate from workout counting. Feet are never used.
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function handShape(raw,aspect=1){
 if(!raw||raw.length<21||raw.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>1||p.y<0||p.y>1))return null;
 const p=raw.map(v=>({x:v.x*aspect,y:v.y})),scale=distance(p[0],p[9]);if(scale<.025)return null;
 const extended=[8,12,16,20].map(tip=>distance(p[tip],p[0])>distance(p[tip-2],p[0])*1.25);
 const curled=[8,12,16,20].map(tip=>distance(p[tip],p[0])<distance(p[tip-2],p[0])*1.12);
 return {wrist:p[0],tip:p[8],base:p[6],fist:curled.every(Boolean),point:extended[0]&&curled.slice(1).every(Boolean),thumb:curled.every(Boolean)&&p[4].y<p[3].y-scale*.2&&p[4].y<p[5].y-scale*.35&&distance(p[4],p[0])>scale*1.15};
}
export class ExerciseRecognizer {
 constructor(){this.pumpSide=0;this.pumps=[];this.last=0;}
 update(raw,hands,t,aspect=1){
  const shapes=hands.map(h=>handShape(h,aspect)).filter(Boolean),thumb=shapes.some(h=>h.thumb);
  if(t-this.last>850){this.pumps=[];this.pumpSide=0;}this.last=t;
  if(!raw||raw.length<25)return {mode:null,thumb};
  const p=raw.map(v=>({...v,x:v.x*aspect})),valid=ids=>ids.every(i=>p[i]&&p[i].visibility>=.5&&raw[i].x>=0&&raw[i].x<=1&&raw[i].y>=0&&raw[i].y<=1);
  if(!valid([11,12,13,14,15,16,23,24]))return {mode:null,thumb};
  const scale=(distance(p[11],p[23])+distance(p[12],p[24]))/2;if(scale<.06)return {mode:null,thumb};
  const close=(a,b,n)=>distance(a,b)<scale*n;
  for(const [s,e,w,otherW] of [[11,13,15,16],[12,14,16,15]]){
   const target={x:(p[s].x+p[e].x)/2,y:(p[s].y+p[e].y)/2};
   if(p[e].y<p[s].y+.12*scale&&p[w].y<p[s].y-.25*scale&&shapes.some(h=>h.point&&close(h.wrist,p[otherW],.65)&&close(h.tip,target,.75)&&distance(h.tip,target)<distance(h.base,target)))return {mode:'pushup',thumb};
  }
  const above=p[15].y<p[11].y-.45*scale&&p[16].y<p[12].y-.45*scale;
  let mode=null;
  if(above)mode=close(p[15],p[16],.5)?'tree':'jumping';
  else if(close(p[15],p[23],.42)&&close(p[16],p[24],.42))mode='squat';
  else if(Math.abs(p[15].y-p[11].y)<.25*scale&&Math.abs(p[16].y-p[12].y)<.25*scale&&Math.abs(p[15].x-p[16].x)>2.3*scale)mode='warrior';
  else if(close(p[15],p[16],.35)&&p[15].y>Math.min(p[11].y,p[12].y)&&p[15].y<(p[11].y+p[23].y)/2)mode='horse';
  else if(shapes.filter(h=>h.fist&&!h.thumb).length>=2&&close(p[15],p[11],.8)&&close(p[16],p[12],.8))mode='boxing';
  const delta=(p[15].y-p[16].y)/scale,side=delta>.45?1:delta<-.45?-1:0;
  if(side&&side!==this.pumpSide){this.pumpSide=side;this.pumps.push(t);}this.pumps=this.pumps.filter(n=>t-n<3000);
  if(!mode&&this.pumps.length>=4)mode='jogging';
  return {mode,thumb};
 }
}
export class GestureConfirmation {
 constructor(){this.reset();}
 reset(){this.candidate=null;this.since=0;this.pending=null;this.expires=0;this.thumbSince=null;this.last=null;this.blocked=null;}
 update({mode=null,thumb=false},t){
  const gap=this.last!==null&&t-this.last>850;this.last=t;
  if(gap){this.candidate=null;this.thumbSince=null;}
  if(!mode)this.blocked=null;
  if(this.pending){
   if(t>=this.expires){this.blocked=this.pending;this.pending=null;this.thumbSince=null;return {event:'expired',progress:0};}
   if(thumb){this.thumbSince??=t;const progress=Math.min(1,(t-this.thumbSince)/1400);if(progress===1){const id=this.pending;this.reset();this.blocked=id;return {event:'confirmed',mode:id,progress:1};}return {event:'holding',mode:this.pending,progress};}
   this.thumbSince=null;return {event:'pending',mode:this.pending,progress:0};
  }
  if(!mode||thumb||mode===this.blocked){this.candidate=null;return {event:'idle',progress:0};}
  if(mode!==this.candidate){this.candidate=mode;this.since=t;}
  if(t-this.since>=650){this.pending=mode;this.expires=t+12000;this.candidate=null;return {event:'proposed',mode,progress:0};}
  return {event:'recognizing',mode,progress:0};
 }
}

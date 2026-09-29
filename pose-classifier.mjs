// SPDX-License-Identifier: AGPL-3.0-or-later
// k-NN pose classifier: a plain-JS reimplementation of the pose classification method documented by Google
// MediaPipe (the "Pose classification" colab for MediaPipe Pose, Apache-2.0): normalise landmarks on the hip centre
// and torso size, embed pairwise joint distances, keep the top 30 samples by max distance, then the top 10 by mean
// distance, and vote. A mirrored pose (x negated, as in the original) also matches, so one side's recording
// serves both. Differences: 2D (the engine keeps no z), feet and ankles dropped (they never enter counting).
// Counting on these votes (EMA, enter/exit thresholds) lives in movement-engine.mjs.
export const EMBED_LANDMARKS=[11,12,13,14,15,16,23,24,25,26];
const PAIRS=[[11,13],[12,14],[13,15],[14,16],[23,25],[24,26],[11,15],[12,16],[23,15],[24,16],[13,14],[25,26],[15,16]];
// p: aspect-corrected points (features().p). Returns 2 numbers per pair, torso first.
export function embed(p){
 const hx=(p[23].x+p[24].x)/2,hy=(p[23].y+p[24].y)/2,sx=(p[11].x+p[12].x)/2,sy=(p[11].y+p[12].y)/2;
 const size=Math.max(Math.hypot(sx-hx,sy-hy)*2.5,...EMBED_LANDMARKS.map(i=>Math.hypot(p[i].x-hx,p[i].y-hy)))||1;
 const e=[(sx-hx)/size,(sy-hy)/size];
 for(const [a,b] of PAIRS)e.push((p[b].x-p[a].x)/size,(p[b].y-p[a].y)/size);
 return e;
}
// samples file: {exercise, need:[landmark ids], samples:[[label,[embedding]],…]} from scripts/pose-samples.mjs.
export class PoseClassifier{
 constructor({need=[11,12,23,24],samples}){this.need=need;this.samples=samples.map(([label,e])=>({label,e:Float64Array.from(e)}));}
 classify(p){
  const e=embed(p),m=e.map((v,i)=>i%2?v:-v),n=e.length;
  const dist=(s,q)=>{let max=0,sum=0;for(let i=0;i<n;i++){const d=Math.abs(s[i]-q[i]);sum+=d;if(d>max)max=d;}return [max,sum/n];};
  const scored=this.samples.map(({label,e:s})=>{const a=dist(s,e),b=dist(s,m);return {label,max:Math.min(a[0],b[0]),mean:Math.min(a[1],b[1])};});
  const top=scored.sort((a,b)=>a.max-b.max).slice(0,30).sort((a,b)=>a.mean-b.mean).slice(0,10);
  const votes={};for(const {label} of top)votes[label]=(votes[label]??0)+1/top.length;
  return votes;
 }
}

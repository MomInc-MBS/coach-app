import test from 'node:test';
import assert from 'node:assert/strict';
import {recognizeShape,SHAPE_IDS} from '../portal-shapes.mjs';

// Seeded jitter so failures reproduce.
let seed=7;const rand=()=>((seed=(seed*16807)%2147483647)/2147483647);
const jitter=(points,amount=.02)=>points.map(([x,y])=>[x+(rand()-.5)*2*amount,y+(rand()-.5)*2*amount]);
// Walk a polyline at a finger-like spacing, optionally rotating the start and reversing.
function trace(corners,{start=0,reverse=false,step=.01,amount=.02}={}){
 let pts=corners.slice(0,-1);pts=[...pts.slice(start),...pts.slice(0,start)];if(reverse)pts.reverse();pts.push(pts[0]);
 const out=[];for(let i=0;i<pts.length-1;i++){const [a,b]=[pts[i],pts[i+1]],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/step));for(let k=0;k<n;k++)out.push([a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n]);}
 out.push(pts.at(-1));return jitter(out,amount);
}
const line=(a,b,amount)=>trace([a,b,a],{amount}).slice(0,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.01)+1);
const ellipse=(cx,cy,rx,ry,{start=0,sweep=1,dir=1,amount=.02}={})=>jitter(Array.from({length:Math.round(160*sweep)+1},(_,i)=>{const t=start+dir*i/160*Math.PI*2;return [cx+rx*Math.cos(t),cy+ry*Math.sin(t)];}),amount);
// Fingers can't reach the exact board edge: the rectangle is traced slightly inside it.
const RECT=[[.04,.04],[.96,.04],[.96,.96],[.04,.96],[.04,.04]];
const UP=[[.5,.02],[.98,.71],[.02,.71],[.5,.02]];
const DOWN=[[.02,.29],[.98,.29],[.5,.98],[.02,.29]];
const VDIAMOND=[[.5,.02],[.98,.5],[.5,.98],[.02,.5],[.5,.02]];
const HDIAMOND=[[.02,.5],[.5,.29],[.98,.5],[.5,.71],[.02,.5]];

test('exports the nine shape ids',()=>{assert.deepEqual([...SHAPE_IDS].sort(),['cross','down','hdiamond','line','oval','rect','up','vdiamond','x'].sort());});

test('recognizes each closed shape from any start corner and direction',()=>{
 for(const [id,corners] of [['rect',RECT],['up',UP],['down',DOWN],['vdiamond',VDIAMOND],['hdiamond',HDIAMOND]])
  for(let start=0;start<corners.length-1;start++)for(const reverse of [false,true])
   assert.equal(recognizeShape([trace(corners,{start,reverse})]),id,`${id} start ${start} reverse ${reverse}`);
 for(const dir of [1,-1])for(const start of [0,1.3,3])assert.equal(recognizeShape([ellipse(.5,.5,.47,.47,{start,dir})]),'oval',`oval start ${start} dir ${dir}`);
});

test('recognizes a sloppier trace with overshoot and a small closing gap',()=>{
 const t=trace(RECT,{amount:.035});assert.equal(recognizeShape([t.slice(0,-12)]),'rect');
 assert.equal(recognizeShape([ellipse(.5,.5,.45,.46,{sweep:.95,amount:.03})]),'oval');
 assert.equal(recognizeShape([trace(UP,{amount:.035})]),'up');
});

// Boards' carved patterns can sit a few % off the template (scaled, shifted): traces that follow them must still match.
test('recognizes traces that follow a carved pattern a few percent off the template, and sloppier ovals',()=>{
 const off=corners=>corners.map(([x,y])=>[.5+(x-.5)*.93+.03,.5+(y-.5)*.94-.025]);
 for(const [id,corners] of [['rect',RECT],['up',UP],['down',DOWN],['vdiamond',VDIAMOND],['hdiamond',HDIAMOND]])assert.equal(recognizeShape([trace(off(corners),{amount:.035})]),id,id+' off-template');
 assert.equal(recognizeShape([ellipse(.53,.48,.43,.44,{amount:.035})]),'oval','oval off-template');
 assert.equal(recognizeShape([ellipse(.5,.5,.44,.46,{sweep:.88,amount:.045})]),'oval','sloppy oval with a closing gap');
 assert.equal(recognizeShape([line([.56,.05],[.53,.95],.03)]),'line','slanted, off-centre line');
});

test('recognizes the two-stroke X and center cross in either stroke order, and a single center line',()=>{
 const d1=line([.03,.03],[.97,.97]),d2=line([.97,.03],[.03,.97]);
 assert.equal(recognizeShape([d1,d2]),'x');assert.equal(recognizeShape([d2,d1.slice().reverse()]),'x');
 const v=line([.5,.03],[.5,.97]),h=line([.03,.5],[.97,.5]);
 assert.equal(recognizeShape([v,h]),'cross');assert.equal(recognizeShape([h,v]),'cross');
 assert.equal(recognizeShape([v]),'line');assert.equal(recognizeShape([h.slice().reverse()]),'line');
});

test('sparse fast swipes are filled in before matching',()=>{
 assert.equal(recognizeShape([[[.5,.03],[.5,.4],[.5,.75],[.5,.97]]]),'line');
 assert.equal(recognizeShape([[[.04,.04],[.96,.04],[.96,.96],[.04,.96],[.04,.05]]]),'rect');
});

test('near misses and scribbles return null',()=>{
 const misses={
  'small circle':[ellipse(.5,.5,.15,.15)],
  'half oval':[ellipse(.5,.5,.47,.47,{sweep:.5})],
  // TOLERANCE is loose enough that a rectangle missing one side still counts (a closing gap); an L is clearly wrong.
  'two sides of the rectangle (an L)':[trace(RECT).slice(0,184)],
  'off-center vertical line':[line([.2,.03],[.2,.97])],
  'short center line':[line([.5,.35],[.5,.65])],
  'one diagonal':[line([.03,.03],[.97,.97])],
  'tap':[[[.5,.5],[.505,.5]]],
  'empty':[],
  'scribble':[jitter(Array.from({length:120},(_,i)=>[.5+.3*Math.sin(i*.7),.5+.3*Math.cos(i*1.9)]),.02)],
 };
 for(const [name,strokes] of Object.entries(misses))assert.equal(recognizeShape(strokes),null,name);
});

test('ignores malformed input instead of throwing',()=>{
 assert.equal(recognizeShape(null),null);assert.equal(recognizeShape([[['a',1]]]),null);assert.equal(recognizeShape([[[NaN,NaN],[1,1]]]),null);
});

test('distinguishes inset rectangles from ovals despite shifts, jitter and reversed traces',()=>{
 const before=seed;
 try{
  for(const [dx,dy,sx,sy] of [[.03,-.025,.93,.94],[-.025,.02,.94,.95],[0,0,.93,.93]]){
   for(const reverse of [false,true]){
    // Reset the noise for each pair; this regression is independent of earlier tests.
    seed=37;
    const corners=RECT.map(([x,y])=>[.5+(x-.5)*sx+dx,.5+(y-.5)*sy+dy]);
    assert.equal(recognizeShape([trace(corners,{reverse,amount:.035})]),'rect',`rect ${dx},${dy} reversed=${reverse}`);
    seed=37;
    assert.equal(recognizeShape([ellipse(.5+dx,.5+dy,.46*sx,.46*sy,{dir:reverse?-1:1,amount:.035})]),'oval',`oval ${dx},${dy} reversed=${reverse}`);
   }
  }
 }finally{seed=before;}
});

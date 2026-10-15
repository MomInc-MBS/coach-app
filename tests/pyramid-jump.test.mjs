import test from 'node:test';
import assert from 'node:assert/strict';
import {paperFor,mealMarkers,Level,mulberry,MAX_JUMP,levelAt,markerHeight,LEVELS,LEVEL_H,END_Y,highestLevel,saveLevel,steeringForMotion} from '../arcade/pyramid-jump/logic.mjs';
import {SHAPES} from '../arcade/pyramid-jump/data.mjs';
import {foodPhotoToday,markFoodPhotoToday} from '../food/pyramid-tiles.mjs';
const mem=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v))};};
test('photo-day flag is true only on the day of the photo (or the vault scan day)',()=>{
 const s=mem(),day=new Date(2026,9,14),next=new Date(2026,9,15);assert.equal(foodPhotoToday(s,day),false);
 markFoodPhotoToday(s,day);assert.equal(foodPhotoToday(s,day),true);assert.equal(foodPhotoToday(s,next),false);
 const v=mem();v.setItem('myr5-vault-v1',JSON.stringify({days:{'food-scan':'2026-10-14'}}));assert.equal(foodPhotoToday(v,day),true);
});
test('coach body maps to its own paper shape, coloured by the body colour only',()=>{
 const id=Object.keys(SHAPES).find(k=>k.startsWith('18-quad-all--dragon'));
 const a=paperFor({body:'roster/'+id,materials:{body:{colorId:'#336699'}}});assert.equal(a.id,id);assert.equal(a.d,SHAPES[id].d);assert.equal(a.colour,'#336699');
 assert.equal(paperFor({body:'myr5',styles:{body:1}}).colour,'#3f7448');
 assert.equal(paperFor({body:'nope'}).id,'myr5');assert.equal(paperFor(null).id,'myr5');
 assert.equal(Object.keys(SHAPES).length,71);
});
test('meal markers run oldest first whatever order the API returns; guests get none',()=>{
 const rows=[{name:'Pasta',eaten_at:'2026-10-14T18:00:00Z',protein:20,carbs:70,fat:10},{name:'Oats',eaten_at:'2026-10-01T08:00:00Z',protein:12.4,carbs:50,fat:6},{name:'Egg',eaten_at:'2026-10-07T08:00:00Z',protein:6,carbs:1,fat:5},{name:'',eaten_at:'2026-10-02'},{name:'Bad',eaten_at:'nope'}];
 const m=mealMarkers(rows);assert.deepEqual(m.map(x=>x.name),['Oats','Egg','Pasta']);assert.equal(m[0].p,12);
 assert.ok(markerHeight(0,3)<markerHeight(1,3)&&markerHeight(1,3)<markerHeight(2,3));assert.deepEqual(mealMarkers(null),[]);assert.deepEqual(mealMarkers([]),[]);
});
test('platform generator always leaves a reachable safe route and mixes every type',()=>{
 const l=new Level(mulberry(42));l.ensure(99999);const safe=l.items.filter(i=>['static','moving','spring'].includes(i.type)).map(i=>i.y).sort((a,b)=>a-b);
 for(let i=1;i<safe.length;i++)assert.ok(safe[i]-safe[i-1]<MAX_JUMP-10,`gap ${safe[i]-safe[i-1]} at ${safe[i]}`);
 const kinds=new Set(l.items.map(i=>i.type)),gear=new Set(l.items.map(i=>i.gear).filter(Boolean));
 for(const k of['static','moving','breaking','spring','monster','hole'])assert.ok(kinds.has(k),k);
 assert.deepEqual([...gear].sort(),['jetpack','propeller']);
 
});
test('Pyramid Jump steers strongly from small signed corrections and treats zero as neutral',()=>{
 assert.ok(steeringForMotion({steerX:.6,gx:0})>.99,'a small near-flat right correction restores the full previous heading feel');
 assert.ok(steeringForMotion({steerX:-.6,gx:0})<-.99,'a small left correction is equally responsive');
 assert.equal(steeringForMotion({steerX:0,gx:.9}),0,'current neutral input wins over a stale retained heading');
 assert.equal(steeringForMotion({gx:.25}),.55,'legacy motion providers still use their gx');
 assert.equal(steeringForMotion({}),0);
});
test('20 levels in order: every band is reachable, the desk ends level 20, tags span the climb, progress saves',()=>{
 assert.equal(LEVELS.length,20);assert.deepEqual([0,999,1000,19999,20500].map(levelAt),[0,0,1,19,19]);
 assert.deepEqual(LEVELS.map(l=>l.name).slice(0,3),['The Office','Ceiling Vents','Propaganda Stairwell']);assert.equal(LEVELS[9].name,'The Fold');
 for(const plus of[0,3])for(const seed of[1,2,3]){
  const l=new Level(mulberry(seed),plus);l.ensure(99999);assert.ok(l.end>=END_Y-200&&l.end<=END_Y+200,'desk '+l.end);
  const safe=l.items.filter(i=>['static','moving','spring','desk'].includes(i.type)&&!i.blink).map(i=>i.y).sort((a,b)=>a-b);
  for(let i=1;i<safe.length;i++)assert.ok(safe[i]-safe[i-1]<MAX_JUMP-5,`gap ${safe[i]-safe[i-1]} at ${safe[i]} seed ${seed}`);
  for(let n=0;n<20;n++)assert.ok(safe.some(y=>levelAt(y)===n),'level '+(n+1)+' has a route');
  assert.ok(l.items.filter(i=>i.type==='monster').every(i=>i.y>=LEVEL_H),'no monsters in level 1');assert.ok(l.items.filter(i=>i.type==='hole').every(i=>i.y>=7*LEVEL_H),'no holes before level 8');
  const mid=n=>l.items.filter(i=>levelAt(i.y)>=n&&levelAt(i.y)<n+4&&['moving','breaking'].includes(i.type)).length/l.items.filter(i=>levelAt(i.y)>=n&&levelAt(i.y)<n+4).length;
  assert.ok(mid(16)>mid(0),'later levels get harder');
 }
 assert.equal(markerHeight(0,50),500);assert.ok(markerHeight(49,50)>END_Y-1100&&markerHeight(49,50)<END_Y);
 const store=new Map(),s={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};assert.equal(highestLevel(s),1);saveLevel(7,s);saveLevel(3,s);assert.equal(highestLevel(s),7);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {paperFor,mealMarkers,Level,mulberry,MAX_JUMP,zoneAt,markerHeight} from '../arcade/pyramid-jump/logic.mjs';
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
 assert.ok(markerHeight(0)<markerHeight(1));assert.deepEqual(mealMarkers(null),[]);assert.deepEqual(mealMarkers([]),[]);
});
test('platform generator always leaves a reachable safe route and mixes every type',()=>{
 const l=new Level(mulberry(42));l.ensure(30000);const safe=l.items.filter(i=>['static','moving','spring'].includes(i.type)).map(i=>i.y).sort((a,b)=>a-b);
 for(let i=1;i<safe.length;i++)assert.ok(safe[i]-safe[i-1]<MAX_JUMP-10,`gap ${safe[i]-safe[i-1]} at ${safe[i]}`);
 const kinds=new Set(l.items.map(i=>i.type)),gear=new Set(l.items.map(i=>i.gear).filter(Boolean));
 for(const k of['static','moving','breaking','spring','monster','hole'])assert.ok(kinds.has(k),k);
 assert.deepEqual([...gear].sort(),['jetpack','propeller']);
 assert.deepEqual([0,1799,1800,4200,7000,10500].map(zoneAt),['office','office','posters','orbit','ports','deep']);
});

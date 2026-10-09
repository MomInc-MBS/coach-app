import test from 'node:test';
import assert from 'node:assert/strict';
import {mountPodPlaces,choosePodPlace,POD_PLACE_KEY,POD_PLACE_INTERVAL} from '../pod/pod-places.mjs';
import {STARTER_WONDERS} from '../meditation-backgrounds.mjs';

function fixture(ImageCtor){
 const events=new Map(),timers=new Map(),values=new Map([[POD_PLACE_KEY,STARTER_WONDERS[0]]]);let sequence=0;
 const documentRef={hidden:false,body:{dataset:{}},querySelector:()=>null,addEventListener:(k,f)=>events.set(k,f),removeEventListener:k=>events.delete(k)};
 const windowRef={setTimeout:(f,ms)=>{assert.equal(ms,POD_PLACE_INTERVAL);timers.set(++sequence,f);return sequence;},clearTimeout:id=>timers.delete(id),addEventListener:(k,f)=>events.set(k,f),removeEventListener:k=>events.delete(k)};
 const view={dataset:{},style:{setProperty:(k,v)=>values.set(k,v)}};
 const dispose=mountPodPlaces(view,{documentRef,windowRef,storageRef:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},ImageCtor,random:()=>0});
 const tick=async()=>{const callback=[...timers.values()][0];timers.clear();callback();await settle();};
 return {view,values,events,timers,documentRef,dispose,tick};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));

test('every pixel starter can be picked without repeating the preceding photo',()=>{
 for(const previous of STARTER_WONDERS)for(const random of [0,.2,.4,.6,.8,1]){
  const chosen=choosePodPlace(previous,()=>random);assert.ok(STARTER_WONDERS.includes(chosen));assert.notEqual(chosen,previous);
 }
});
test('the visible pod rotates every20s and persists its last photo across remounts',async()=>{
 const f=fixture();await settle();const first=f.view.dataset.podPlace;
 assert.notEqual(first,STARTER_WONDERS[0]);assert.match(f.values.get('--pod-world'),new RegExp(first));
 await f.tick();assert.notEqual(f.view.dataset.podPlace,first);assert.equal(f.values.get(POD_PLACE_KEY),f.view.dataset.podPlace);
 f.dispose();assert.equal(f.timers.size,0);
});
test('hidden pages and camera tracking stop the timer; return picks a new photo once',async()=>{
 const f=fixture();await settle();const first=f.view.dataset.podPlace;
 f.documentRef.hidden=true;f.events.get('visibilitychange')();assert.equal(f.timers.size,0);
 f.documentRef.hidden=false;f.events.get('visibilitychange')();await settle();assert.notEqual(f.view.dataset.podPlace,first);
 const resumed=f.view.dataset.podPlace;f.events.get('pageshow')({persisted:true});await settle();assert.equal(f.view.dataset.podPlace,resumed);
 f.documentRef.body.dataset.tracking='true';f.events.get('visibilitychange')();assert.equal(f.timers.size,0);
 f.documentRef.body.dataset.tracking='false';f.events.get('visibilitychange')();await settle();assert.equal(f.timers.size,1);
 const beforeCache=f.view.dataset.podPlace;
 f.events.get('pagehide')({persisted:true});assert.equal(f.timers.size,0);f.events.get('pageshow')({persisted:true});await settle();assert.notEqual(f.view.dataset.podPlace,beforeCache);
 f.dispose();assert.equal(f.events.size,0);
});
test('failed or late image loads leave the existing background intact',async()=>{
 let image;
 class PendingImage{constructor(){image=this;}set src(value){this.url=value;}}
 const f=fixture(PendingImage);image.onerror();await settle();assert.equal(f.values.has('--pod-world'),false);
 await f.tick();f.dispose();image.onload();await settle();assert.equal(f.values.has('--pod-world'),false);
});

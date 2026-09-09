import test from 'node:test';
import assert from 'node:assert/strict';
import {mountMealScanner} from '../meal-scanner.mjs';
class Element extends EventTarget {dataset={};style={};hidden=false;disabled=false;children=[];textContent='';setAttribute(k,v){this[k]=v;}removeAttribute(k){delete this[k];}replaceChildren(...items){this.children=items;}focus(){}getContext(){return {drawImage(){}};}toDataURL(){return 'data:image/jpeg;base64,test';}}
test('scanner drops stale photo work, shows actual scores, and cancels when the panel closes',async()=>{
 const old={document:globalThis.document,window:globalThis.window,Worker:globalThis.Worker,createImageBitmap:globalThis.createImageBitmap},nodes=new Map(),workers=[];
 const get=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};
 globalThis.document={getElementById:get,createElement:()=>new Element()};globalThis.window=new EventTarget();
 globalThis.Worker=class {constructor(){workers.push(this);}postMessage(){}terminate(){this.stopped=true;}};
 try{
  mountMealScanner();const select=()=>{get('foodPhoto').files=[new Blob(['photo'],{type:'image/jpeg'})];get('foodPhoto').onchange();};
  let resolve,closed=false;globalThis.createImageBitmap=()=>new Promise(r=>resolve=r);select();const obsolete=get('recognizeFood').onclick();select();resolve({close(){closed=true;}});await obsolete;assert(closed);assert.equal(workers.length,0);
  globalThis.createImageBitmap=async()=>({width:500,height:400,close(){}});await get('recognizeFood').onclick();const first=workers[0];
  first.onmessage({data:{type:'progress',stage:'loading',progress:37,text:'Model file download · 37%'}});assert.equal(get('scanProgress').value,37);
  first.onmessage({data:{type:'progress',stage:'analyzing',text:'Comparing foods'}});assert(get('scanProgress').hidden);
  first.onmessage({data:{type:'result',uncertain:false,items:[{label:'pizza',score:.83}]}});assert.match(get('scanDetail').textContent,/83.0%/);assert(!get('recognizeFood').disabled);get('foodSuggestions').children[0].onclick();assert.equal(get('mealName').value,'pizza');
  await get('recognizeFood').onclick();get('mealsPanel').dispatchEvent(new Event('close'));assert(first.stopped);assert(!get('recognizeFood').disabled);
  first.onmessage({data:{type:'result',items:[{label:'old food',score:.9}]}});assert.equal(get('scanPhase').textContent,'SCAN PAUSED');
  get('foodPhoto').files=[new Blob(['wrong'],{type:'text/plain'})];get('foodPhoto').onchange();assert(get('mealScanStage').hidden);assert.match(get('foodStatus').textContent,/JPEG/);
 }finally{globalThis.window.dispatchEvent(new Event('pagehide'));for(const [key,value] of Object.entries(old)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});

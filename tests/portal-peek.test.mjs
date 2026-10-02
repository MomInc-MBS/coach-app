// PORTAL-PEEK: the kill switch / quality signal, and one reused render target that dispose() frees.
import test from 'node:test';
import assert from 'node:assert/strict';

const store=new Map();
globalThis.localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
globalThis.devicePixelRatio=3;
const {peekQuality,createPortalPeek,RT_SCALE,MAX_DPR}=await import('../modules/portal/portal-peek.mjs');
const cores=n=>Object.defineProperty(globalThis.navigator,'hardwareConcurrency',{value:n,configurable:true});

test('on by default, "0" switches it off, low-end phones fall back to the plain wormhole',()=>{
 cores(8);store.clear();assert.equal(peekQuality(),'medium');
 store.set('myr5PortalPeek','0');assert.equal(peekQuality(),null);
 store.set('myr5PortalPeek','high');assert.equal(peekQuality(),'high');
 store.clear();cores(4);assert.equal(peekQuality(),null);
 cores(8);
});

test('one render target: scaled per quality, DPR capped, reused per frame, restored and freed',()=>{
 const calls=[];let target=null;
 const renderer={getRenderTarget:()=>target,setRenderTarget(t){target=t;calls.push(t);},render(){calls.push('draw');},readRenderTargetPixels(rt,x,y,w,h,buf){assert.equal(buf.length,w*h*4);}};
 const peek=createPortalPeek({renderer,quality:'medium'});
 let disposed=0;peek.setSource({scene:{},camera:{aspect:1,updateProjectionMatrix(){}},dispose(){disposed++;}});
 peek.resize(200,300);
 assert.equal(peek.width,Math.round(200*MAX_DPR*RT_SCALE.medium));assert.equal(peek.height,Math.round(300*MAX_DPR*RT_SCALE.medium));
 const first=peek.read();peek.resize(200,300);assert.equal(peek.read(),first,'same size: no new buffer');
 assert.equal(peek.render(),true);assert.equal(target,null,'the previous target is restored');assert.equal(calls.at(-2),'draw');
 let rtFreed=0;peek.target.addEventListener('dispose',()=>rtFreed++);
 peek.dispose();assert.equal(disposed,1);assert.equal(rtFreed,1);
});

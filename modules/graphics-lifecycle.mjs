// Serialize renderer handoffs around the browser's asynchronous WebGL context-loss event.
// Drivers can mark a context lost immediately while keeping its slot reserved until that event.
// State lives on globalThis: app-runtime, launch-runtime and the raw modules each bundle their own copy of this file.
const G=globalThis.__myr5Graphics??={pending:new Set(),releasing:new WeakMap(),claims:new Set()};
const {pending,releasing}=G;

export function releaseGraphics(canvas,gl,release,{deadlineMs=250}={}){
 if(!canvas||!gl){try{release?.();}catch{}return Promise.resolve();}
 const existing=releasing.get(canvas);if(existing)return existing;
 let resolvePromise,timer=0,settled=false;
 const promise=new Promise(resolve=>{resolvePromise=resolve;});
 const finish=()=>{
  if(settled)return;settled=true;clearTimeout(timer);canvas.removeEventListener('webglcontextlost',finish);pending.delete(promise);if(releasing.get(canvas)===promise)releasing.delete(canvas);resolvePromise();
 };
 pending.add(promise);releasing.set(canvas,promise);
 canvas.addEventListener('webglcontextlost',finish,{once:true});
 timer=setTimeout(finish,Math.max(0,deadlineMs)); // Broken drivers may omit the event; never stall navigation indefinitely.
 try{release?.();}catch{finish();}
 return promise;
}

export async function waitForGraphicsRelease(){
 while(pending.size)await Promise.all([...pending]);
}

// A 3D screen claims the GPU before it creates its renderer: every long-lived renderer that listens for 'myr5:graphics-claim'
// (the 3D coach = 'coach', the portal board/tunnel/peek = 'portal') gives its context back for real (detail.wait(promise)
// until the loss lands) unless the claim keeps it, and rebuilds on 'myr5:graphics-free' once no claim excludes it.
// iOS refuses new contexts while hidden ones still hold GPU memory ("Error creating WebGL context").
// Returns release(); await release.ready before creating the renderer, call release(canvas) right after forceContextLoss
// so the holders rebuild only once that context's loss has landed.
export function claimGraphics(owner,{keep=[]}={}){
 const claim={owner,keep};G.claims.add(claim);let done=false;const waits=[];
 const release=canvas=>{if(done)return;done=true;G.claims.delete(claim);
  const lost=canvas?.addEventListener?new Promise(r=>{canvas.addEventListener('webglcontextlost',r,{once:true});setTimeout(r,250);}):null;
  void Promise.resolve(lost).then(waitForGraphicsRelease).then(()=>{if(!G.claims.has(claim))dispatchEvent(new CustomEvent('myr5:graphics-free',{detail:{owner}}));});};
 try{dispatchEvent(new CustomEvent('myr5:graphics-claim',{detail:{owner,keep,wait:p=>waits.push(Promise.resolve(p).catch(()=>{}))}}));}catch{}
 release.ready=Promise.all(waits).then(waitForGraphicsRelease);
 return release;
}
// Is a holder ('coach', 'portal') kept off the GPU by a live claim?
export const graphicsBlocked=holder=>[...G.claims].some(c=>!c.keep.includes(holder));

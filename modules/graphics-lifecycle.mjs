// Serialize renderer handoffs around the browser's asynchronous WebGL context-loss event.
// Drivers can mark a context lost immediately while keeping its slot reserved until that event.
const pending=new Set();
const releasing=new WeakMap();

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

// A full-screen 3D owner (the Vault) claims the GPU: every other renderer that listens for 'myr5:graphics-claim' gives its
// context back (detail.wait(promise) until the loss lands), and rebuilds on 'myr5:graphics-free' once the last claim ends.
// iOS refuses new contexts while hidden ones (3D coach, portal board) still hold GPU memory.
// Returns release(); await release.ready before creating the renderer.
let claims=0;
export function claimGraphics(owner){
 claims++;let done=false;const waits=[];
 const release=()=>{if(done)return;done=true;claims--;if(!claims)void waitForGraphicsRelease().then(()=>{if(!claims)dispatchEvent(new CustomEvent('myr5:graphics-free',{detail:{owner}}));});};
 try{dispatchEvent(new CustomEvent('myr5:graphics-claim',{detail:{owner,wait:p=>waits.push(Promise.resolve(p).catch(()=>{}))}}));}catch{}
 release.ready=Promise.all(waits).then(waitForGraphicsRelease);
 return release;
}
export const graphicsClaimed=()=>claims>0;

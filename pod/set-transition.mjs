// #150 (Ian, D46): a finished set goes into rest through the wormhole and comes back out through it, slow enough to
// load under it and to put the phone down or pick it up. Each trip is one pair: 'in' covers the screen, swap() changes
// what is under it, 'out' opens it again (playWormhole('in') leaves its cover up until 'out' removes it).
// Never over the live camera (D24); without the portal or with reduced motion, a plain fade.
export const TRANSITION_MIN_MS=2600; // the one knob: how long each trip keeps the screen moving/covered
export const FADE_MS=600;
export const LINES={rest:'Set complete — put the phone down, rest starts in a moment',practice:'Rest starts in a moment',next:'Next set — pick up your phone',home:'Leaving rest'};
const reducedMotion=()=>!!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function cover(text,fade){
 const el=document.createElement('div');el.className='set-transition';el.setAttribute('role','status');el.textContent=text;
 el.style.cssText=`position:fixed;inset:0;margin:0;padding:0 24px 22vh;border:0;width:auto;height:auto;max-width:none;max-height:none;display:flex;align-items:flex-end;justify-content:center;text-align:center;box-sizing:border-box;pointer-events:none;z-index:10001;color:#fff;font:600 17px/1.35 system-ui,sans-serif;text-shadow:0 1px 6px #000,0 0 14px #000;background:${fade?'#000':'transparent'}`;
 document.body.append(el);if(el.showPopover){el.setAttribute('popover','manual');el.showPopover();}
 return el;
}
const fadeTo=(el,to)=>el.animate([{opacity:1-to},{opacity:to}],{duration:FADE_MS/2,easing:'ease',fill:'forwards'}).finished.catch(()=>{});
// Resolves once the new screen is showing; swap()'s error (if any) is rethrown after the cover is gone.
export async function throughWormhole(text,swap){
 const body=document.body;
 if(body.dataset.tracking==='true'||body.dataset.cameraWorkout==='true')return swap();
 const portal=globalThis.myr5Portal,play=!reducedMotion()&&!portal?.disposed&&typeof portal?.playWormhole==='function'?portal.playWormhole:null;
 const half=TRANSITION_MIN_MS/2,wasInert=body.inert;body.inert=true; // the tunnel lets taps through; nothing under it is live
 let el=null;
 try{
  if(play){const going=play({direction:'in',minMs:half});el=cover(text,false);await going;}
  else{el=cover(text,true);await fadeTo(el,1);}
  await swap();
 }finally{
  try{if(play)await play({direction:'out',minMs:half});else if(el)await fadeTo(el,0);}catch{}
  el?.remove();body.inert=wasInert;
 }
}

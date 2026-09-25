// The Reminders form remains usable while its optional computer artwork is absent.
// Only a downloaded room packet may activate the illustrated frame.
let styleReady;
const artwork='/pod/rooms/console.webp',style='/modules/rooms/reminders-computer.css';
const loadStyle=()=>styleReady??=new Promise(resolve=>{
 const link=document.createElement('link');link.rel='stylesheet';link.href=style;
 link.onload=link.onerror=resolve;document.head.append(link);
});

const MAX_SPIN=60,KEY_STEP=8,DRAG_DEG_PER_PX=.4,DRAG_SLOP=8,INTERACTIVE='button,input,select,textarea,a,label,summary,[contenteditable]';
export const spinBy=(spin,delta)=>Math.max(-MAX_SPIN,Math.min(MAX_SPIN,spin+delta));

// Drag the shell sideways (or press Left/Right while it is focused) to turn the art; taps, inner controls and vertical scroll pass through.
function bindSpin(panel){
 let spin=0,drag=null;
 const set=value=>{spin=spinBy(0,value);panel.style.setProperty('--computer-spin',spin+'deg');};
 const end=event=>{if(drag&&event.pointerId===drag.id){if(drag.moving)panel.releasePointerCapture?.(drag.id);drag=null;}};
 const down=event=>{
  if(panel.dataset.reminderRoom!=='ready'||(event.pointerType==='mouse'&&event.button!==0)||event.target.closest?.(INTERACTIVE))return;
  drag={id:event.pointerId,x:event.clientX,y:event.clientY,spin,moving:false};
 };
 const move=event=>{
  if(!drag||event.pointerId!==drag.id)return;
  const dx=event.clientX-drag.x;
  if(!drag.moving){
   if(Math.abs(event.clientY-drag.y)>DRAG_SLOP&&Math.abs(event.clientY-drag.y)>Math.abs(dx)){drag=null;return;}// vertical: let it scroll
   if(Math.abs(dx)<DRAG_SLOP)return;
   drag.moving=true;panel.setPointerCapture?.(drag.id);
  }
  set(drag.spin+dx*DRAG_DEG_PER_PX);
 };
 const key=event=>{
  if(event.target!==panel||panel.dataset.reminderRoom!=='ready'||!/^Arrow(Left|Right)$/.test(event.key))return;
  event.preventDefault();set(spin+(event.key==='ArrowLeft'?-KEY_STEP:KEY_STEP));
 };
 const on={pointerdown:down,pointermove:move,pointerup:end,pointercancel:end,lostpointercapture:end,keydown:key};
 for(const [name,fn] of Object.entries(on))panel.addEventListener(name,fn);
 return()=>{for(const [name,fn] of Object.entries(on))panel.removeEventListener(name,fn);panel.style.removeProperty('--computer-spin');};
}

export function mountRemindersComputer(panel=document.getElementById('remindersPanel')){
 if(!panel)return null;
 const unbindSpin=bindSpin(panel);
 const hint=document.createElement('span');hint.id='remindersComputerHint';hint.hidden=true;hint.textContent='Drag the computer sideways, or press Left and Right arrow keys, to turn it.';
 panel.append(hint);
 const setReady=on=>{
  if(on){panel.tabIndex=0;panel.setAttribute('aria-describedby',hint.id);panel.setAttribute('aria-keyshortcuts','ArrowLeft ArrowRight');}
  else{panel.removeAttribute('tabindex');panel.removeAttribute('aria-describedby');panel.removeAttribute('aria-keyshortcuts');}
 };
 const offer=document.createElement('div');offer.className='reminders-computer-offer';offer.style.cssText='margin:0 0 12px';
 const button=document.createElement('button');button.type='button';button.textContent='Download Reminders computer';
 const note=document.createElement('span');note.setAttribute('role','status');
 offer.append(button,note);panel.querySelector('header')?.after(offer);
 let epoch=0;
 async function check(){
  if(!panel.open)return;
  const mine=++epoch;
  try{
   // Both files ship in the room-reminders packet; either missing keeps the 2D panel.
   const cached=await Promise.all([artwork,style].map(url=>globalThis.caches?.match(url)));
   if(!cached.every(hit=>hit?.ok)){if(mine===epoch){setReady(false);panel.dataset.reminderRoom='offer';note.textContent='The computer room is an optional download.';}return;}
   await loadStyle();
   const image=new Image();image.src=artwork;await image.decode();
   if(mine===epoch&&panel.open){setReady(true);panel.dataset.reminderRoom='ready';note.textContent='';}
  }catch(error){if(mine===epoch){setReady(false);panel.dataset.reminderRoom='offer';note.textContent='Computer art is unavailable; reminders still work.';}}
 }
 button.onclick=()=>{if(!window.myr5Packs?.open?.('room-reminders'))note.textContent='Open Downloads from Settings to add this room.';};
 const observer=new MutationObserver(()=>{if(panel.open)void check();else ++epoch;});
 observer.observe(panel,{attributes:true,attributeFilter:['open']});
 window.addEventListener('focus',check);
 if(panel.open)void check();
 return ()=>{observer.disconnect();window.removeEventListener('focus',check);offer.remove();unbindSpin();setReady(false);hint.remove();delete panel.dataset.reminderRoom;};
}

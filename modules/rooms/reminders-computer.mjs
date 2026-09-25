// The Reminders form remains usable while its optional computer artwork is absent.
// Only a downloaded room packet may activate the illustrated frame.
let styleReady;
const artwork='/pod/rooms/console.webp',style='/modules/rooms/reminders-computer.css';
const loadStyle=()=>styleReady??=new Promise(resolve=>{
 const link=document.createElement('link');link.rel='stylesheet';link.href=style;
 link.onload=link.onerror=resolve;document.head.append(link);
});

export function mountRemindersComputer(panel=document.getElementById('remindersPanel')){
 if(!panel)return null;
 const offer=document.createElement('div');offer.className='reminders-computer-offer';offer.style.cssText='display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:0 0 12px';
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
   if(!cached.every(hit=>hit?.ok)){if(mine===epoch){panel.dataset.reminderRoom='offer';note.textContent='The computer room is an optional download.';}return;}
   await loadStyle();
   const image=new Image();image.src=artwork;await image.decode();
   if(mine===epoch&&panel.open){panel.dataset.reminderRoom='ready';note.textContent='';}
  }catch(error){if(mine===epoch){panel.dataset.reminderRoom='offer';note.textContent='Computer art is unavailable; reminders still work.';}}
 }
 button.onclick=()=>{if(!window.myr5Packs?.open?.('room-reminders'))note.textContent='Open Downloads from Settings to add this room.';};
 const observer=new MutationObserver(()=>{if(panel.open)void check();else ++epoch;});
 observer.observe(panel,{attributes:true,attributeFilter:['open']});
 window.addEventListener('focus',check);
 if(panel.open)void check();
 return ()=>{observer.disconnect();window.removeEventListener('focus',check);offer.remove();delete panel.dataset.reminderRoom;};
}

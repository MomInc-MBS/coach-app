// Sparkle for newly unlocked items: an item is "new" only while its grant-time pending marker (unlock-pending.mjs)
// is set, so grants that existed before this shipped never sparkle. Viewing clears the marker. It never grants or
// gates anything: callers decide an item is unlocked, this only remembers that it was looked at.
import {isPending,clearPending} from './unlock-pending.mjs';

/** True when this item was granted since the feature shipped and has not been viewed. */
export const isUnseen=isPending;

const STYLE='[data-sparkle]::after{content:"\\2726" / "New";color:#ffd23a;font-size:.85em;margin-left:.3em;text-shadow:0 0 4px #ffd23a;animation:myr5-sparkle 1.4s ease-in-out infinite alternate}'+
 'button[data-sparkle]{position:relative}button[data-color][data-sparkle]::after{position:absolute;top:1px;right:3px;margin:0}'+
 '@keyframes myr5-sparkle{to{opacity:.45}}@media (prefers-reduced-motion:reduce){[data-sparkle]::after{animation:none}}';
function ensureStyle(doc){
 if(doc.getElementById('myr5-sparkle-style'))return;
 const style=doc.createElement('style');style.id='myr5-sparkle-style';style.textContent=STYLE;doc.head.append(style);
}

/** Records the item as viewed and clears every sparkle showing it. */
export function markSeen(kind,id,options){
 clearPending(kind,id,options);
 for(const el of globalThis.document?.querySelectorAll('[data-sparkle]')||[])if(el.dataset.sparkle===`${kind}:${id}`){
  delete el.dataset.sparkle;
  if(el.tagName==='OPTION'&&el.textContent.startsWith('✦ '))el.textContent=el.textContent.slice(2);
 }
}

// Keep each badge visible long enough to notice. Time outside the viewport or in a hidden tab never counts.
const DWELL_MS=1500;
function afterVisibleDwell(el,seen,active=()=>!!el.dataset.sparkle){
 if(typeof IntersectionObserver!=='function')return;
 const doc=el.ownerDocument;let inView=false,timer=null;
 const cancel=()=>{if(timer!==null){clearTimeout(timer);timer=null;}};
 const schedule=()=>{if(timer!==null||!inView||doc.visibilityState!=='visible'||!active())return;
  timer=setTimeout(()=>{timer=null;if(inView&&el.isConnected&&doc.visibilityState==='visible'&&active()){io.disconnect();doc.removeEventListener('visibilitychange',onVisibility);seen();}},DWELL_MS);
 };
 const onVisibility=()=>{if(doc.visibilityState!=='visible')cancel();else schedule();};
 const io=new IntersectionObserver(entries=>{
  if(!el.isConnected){cancel();io.disconnect();doc.removeEventListener('visibilitychange',onVisibility);return;}
  inView=entries.some(e=>e.isIntersecting&&e.intersectionRatio>=.6);
  if(inView)schedule();else cancel();
 },{threshold:[.6]});
 doc.addEventListener('visibilitychange',onVisibility);io.observe(el);
}

/** Sparkles `el` if unseen. It clears after 1.5s on screen, or immediately on click/focus. */
export function sparkle(el,kind,id,options){
 if(!isUnseen(kind,id,options))return false;
 ensureStyle(el.ownerDocument);
 el.dataset.sparkle=`${kind}:${id}`;
 const seen=()=>markSeen(kind,id,options);
 el.addEventListener('click',seen,{once:true});el.addEventListener('focus',seen,{once:true});
 afterVisibleDwell(el,seen);
 return true;
}

/** <option> variant: a closed dropdown shows nothing, so the item counts as viewed once it is picked (watchSelect). */
export function sparkleOption(option,kind,id,options){
 if(!isUnseen(kind,id,options))return false;
 ensureStyle(option.ownerDocument);
 option.dataset.sparkle=`${kind}:${id}`;option.textContent='✦ '+option.textContent;
 return true;
}
const markSelected=(select,options)=>{
 const tag=select.selectedOptions[0]?.dataset.sparkle,at=tag?.indexOf(':');
 if(tag)markSeen(tag.slice(0,at),tag.slice(at+1),options);
};
/** Picking an option views it; so does the select showing it on screen (a lone ship or skin can't be "picked"). */
export function watchSelect(select,options){
 select.addEventListener('change',()=>markSelected(select,options));
 afterVisibleDwell(select,()=>markSelected(select,options),()=>!!select.selectedOptions[0]?.dataset.sparkle);
}

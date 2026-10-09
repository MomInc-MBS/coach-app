import {STARTER_WONDERS,starterWonderUrl} from '../meditation-backgrounds.mjs';

export const POD_PLACE_KEY='myr5-pod-place-v1';
export const POD_PLACE_INTERVAL=20000;
export function choosePodPlace(previous,random=Math.random){
 const choices=STARTER_WONDERS.filter(id=>id!==previous);
 return choices[Math.min(choices.length-1,Math.max(0,Math.floor(random()*choices.length)))];
}
function available(url,ImageCtor){
 if(!ImageCtor)return Promise.resolve(true);
 return new Promise(resolve=>{
  let done=false;
  const finish=ok=>{if(done)return;done=true;clearTimeout(timer);resolve(ok);};
  const image=new ImageCtor(),timer=setTimeout(()=>finish(false),3000);
  image.onload=()=>finish(true);image.onerror=()=>finish(false);image.src=url;
 });
}
// Pixel photos belong only to the workout pod, not the shared room or oval ship scene.
export function mountPodPlaces(view,{documentRef=globalThis.document,windowRef=globalThis.window,storageRef,ImageCtor=globalThis.Image,random=Math.random}={}){
 if(!view)return ()=>{};
 let storage=storageRef;try{storage??=windowRef.localStorage;}catch{}
 let previous='';try{previous=storage?.getItem(POD_PLACE_KEY)||'';}catch{}
 let timer=0,generation=0,disposed=false,visible=!globalThis.IntersectionObserver,active=false;
 const shown=()=>!documentRef.hidden&&visible&&documentRef.body.dataset.tracking!=='true'&&documentRef.body.dataset.screen!=='rest'&&!documentRef.querySelector('dialog[open]');
 const rotate=async()=>{
  const id=choosePodPlace(previous,random),token=++generation,url=starterWonderUrl(id);
  if(!await available(url,ImageCtor)||disposed||token!==generation)return;
  previous=id;view.style.setProperty('--pod-world',`url("${url}")`);view.dataset.podPlace=id;
  try{storage?.setItem(POD_PLACE_KEY,id);}catch{}
 };
 const schedule=()=>{windowRef.clearTimeout(timer);timer=0;if(active&&!disposed)timer=windowRef.setTimeout(()=>{void rotate();schedule();},POD_PLACE_INTERVAL);};
 const sync=()=>{const next=shown();if(next&&!active)void rotate();if(!next&&active)++generation;active=next;schedule();};
 const visibility=()=>sync();
 const pageShow=()=>sync();
 const dispose=()=>{disposed=true;++generation;windowRef.clearTimeout(timer);observer?.disconnect();intersection?.disconnect();documentRef.removeEventListener('visibilitychange',visibility);windowRef.removeEventListener('pageshow',pageShow);windowRef.removeEventListener('pagehide',pageHide);};
 const pageHide=event=>{if(event.persisted){active=false;windowRef.clearTimeout(timer);}else dispose();};
 const observer=globalThis.MutationObserver?new MutationObserver(sync):null;
 observer?.observe(documentRef.body,{subtree:true,attributes:true,attributeFilter:['data-screen','data-tracking','open']});
 const intersection=globalThis.IntersectionObserver?new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();}):null;
 intersection?.observe(view);
 documentRef.addEventListener('visibilitychange',visibility);windowRef.addEventListener('pageshow',pageShow);windowRef.addEventListener('pagehide',pageHide);
 sync();return dispose;
}

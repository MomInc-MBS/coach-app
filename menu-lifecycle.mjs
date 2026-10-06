// Shared menu lifetime boundary. Route code calls enter() after adoption and leave() on finish.
// Native close, hidden panels, and pagehide are covered as fallbacks for legacy openers.
const isElement=value=>!!value&&typeof value==='object'&&typeof value.querySelectorAll==='function';

export function mountMenuLifecycle({doc=globalThis.document,win=globalThis.window,routes=win?.myr5Routes?.ROUTES}={}){
 if(!doc||!win)throw new Error('Menu lifecycle needs a document and window.');
 const routeEntries=Object.entries(routes||{}).filter(([,route])=>route?.dialog);
 const resources=new Map(),states=new Map(),frames=new Map();
 let disposed=false;
 const dialogs=()=>[...doc.querySelectorAll('dialog')];
 function key(owner){
  if(typeof owner==='string')return owner;
  if(!owner)return '';
  if(owner.dataset?.route)return owner.dataset.route;
  const match=routeEntries.find(([,route])=>owner.matches?.(route.dialog));
  return match?.[0]||owner.id||owner;
 }
 function element(owner){
  if(isElement(owner))return owner;
  const route=routes?.[owner];
  if(route?.dialog)return doc.querySelector(route.dialog);
  return typeof owner==='string'?doc.getElementById?.(owner):null;
 }
 function state(owner){
  const id=key(owner);
  if(!states.has(id)){
   const root=element(owner);
   states.set(id,{active:root?.tagName==='DIALOG'?!!root.open:root?root.hidden!==true:true});
  }
  return states.get(id);
 }
 function items(root,selector){return [...(root?.matches?.(selector)?[root]:[]),...(root?.querySelectorAll?.(selector)||[])];}
 function pauseMedia(root){for(const media of items(root,'audio,video'))try{media.pause?.();}catch{}}
 function suspendFrame(frame){
  if(frames.has(frame)){
   const saved=frames.get(frame),src=frame.getAttribute?.('src'),srcdoc=frame.getAttribute?.('srcdoc');
   if(src==null&&srcdoc==null){frames.delete(frame);return;}
   if(srcdoc!=null){saved.srcdoc=srcdoc;frame.removeAttribute('srcdoc');}
   if(src!=null&&src!=='about:blank'){saved.src=src;frame.setAttribute('src','about:blank');}
   return;
  }
  const src=frame.getAttribute?.('src'),srcdoc=frame.getAttribute?.('srcdoc');
  if(src==null&&srcdoc==null)return;
  frames.set(frame,{src,srcdoc});
  frame.removeAttribute('srcdoc');
  frame.setAttribute('src','about:blank');
 }
 function restoreFrames(root){
  for(const frame of items(root,'iframe')){
   if(hidden(frame))continue;
   const saved=frames.get(frame);if(!saved)continue;
   frames.delete(frame);
   frame.removeAttribute('src');
   if(saved.srcdoc!=null)frame.setAttribute('srcdoc',saved.srcdoc);
   if(saved.src!=null)frame.setAttribute('src',saved.src);
  }
 }
 function suspend(root){pauseMedia(root);for(const frame of items(root,'iframe'))suspendFrame(frame);}
 function hidden(frame){
  if(doc.hidden||frame.closest?.('[hidden]'))return true;
  const dialog=frame.closest?.('dialog');
  return !!dialog&&!dialog.open||!!frame.getClientRects&&!frame.getClientRects().length;
 }
 function scanHidden(){for(const frame of doc.querySelectorAll('iframe'))if(hidden(frame))suspendFrame(frame);}
 function event(owner,reason){
  const detail={owner:key(owner),reason,element:element(owner)};
  const EventType=win.CustomEvent||globalThis.CustomEvent;
  if(EventType)win.dispatchEvent(new EventType('myr5:menu-leave',{detail}));
 }
 function leave(owner,reason='route-leave'){
  if(disposed)return;
  const id=key(owner),entry=state(id);if(!entry.active)return;
  entry.active=false;
  const root=element(owner);if(root)suspend(root);
  for(const resource of resources.get(id)||[])if(resource.active){resource.active=false;try{resource.dispose?.(reason);}catch(error){win.console?.error?.('Menu resource disposal failed',error);}}
  event(owner,reason);
 }
 function enter(owner){
  if(disposed)return;
  if(doc.hidden){const root=element(owner);if(root?.open)root.close();return;}
  const id=key(owner),entry=state(id);entry.active=true;
  const root=element(owner);if(root)restoreFrames(root);
  for(const resource of resources.get(id)||[])if(!resource.active){resource.active=true;try{resource.reopen?.();}catch(error){win.console?.error?.('Menu resource reopen failed',error);}}
 }
 function closeInactive(current){
  if(disposed)return;
  const active=element(current);
  for(const dialog of dialogs())if(dialog.open&&dialog!==active){leave(dialog,'route-switch');dialog.close();}
  scanHidden();
 }
 function stopAll(reason='page-hidden'){
  if(disposed)return;
  for(const dialog of dialogs())if(dialog.open){leave(dialog,reason);dialog.close();}
  for(const [id,entry] of states)if(entry.active)leave(id,reason);
  for(const media of doc.querySelectorAll('audio,video'))try{media.pause?.();}catch{}
  for(const frame of doc.querySelectorAll('iframe'))suspendFrame(frame);
 }
 function registerMenuResource(owner,{dispose,reopen}={}){
  const id=key(owner),record={dispose,reopen,active:state(id).active};
  if(!resources.has(id))resources.set(id,new Set());
  resources.get(id).add(record);
  if(!record.active)try{dispose?.('registered-inactive');}catch(error){win.console?.error?.('Menu resource disposal failed',error);}
  return ()=>resources.get(id)?.delete(record);
 }
 const onClose=e=>{if(e.target?.tagName==='DIALOG'&&!e.target.open)leave(e.target,'dialog-close');};
 const onVisibility=()=>{if(doc.hidden)stopAll('page-hidden');};
 const onPageHide=()=>stopAll('pagehide');
 doc.addEventListener('close',onClose,true);
 doc.addEventListener('visibilitychange',onVisibility);
 win.addEventListener('pagehide',onPageHide);
 const Observer=win.MutationObserver||globalThis.MutationObserver;
 const observer=Observer?new Observer(records=>{
  for(const record of records){
   if(record.type==='attributes'&&record.target?.tagName==='DIALOG'&&record.attributeName==='open'&&record.target.open)enter(record.target);
  }
  scanHidden();
 }):null;
 observer?.observe(doc.documentElement||doc,{subtree:true,childList:true,attributes:true,attributeFilter:['open','hidden','src','srcdoc']});
 scanHidden();
 const api={enter,leave,closeInactive,stopAll,registerMenuResource,scanHidden,dispose(){if(disposed)return;stopAll('lifecycle-dispose');disposed=true;observer?.disconnect();doc.removeEventListener('close',onClose,true);doc.removeEventListener('visibilitychange',onVisibility);win.removeEventListener('pagehide',onPageHide);resources.clear();states.clear();frames.clear();}};
 return api;
}

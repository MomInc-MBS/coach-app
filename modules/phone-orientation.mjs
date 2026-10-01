const PHONE_UA=/(?:iPhone|iPod|Android.*Mobile)/i;
const NOTICE_STYLE=`
[data-phone-portrait-notice]{box-sizing:border-box;position:fixed;inset:0;width:100vw;height:100vh;height:100dvh;max-width:none;max-height:none;margin:0;padding:max(24px,env(safe-area-inset-top)) 24px max(24px,env(safe-area-inset-bottom));border:0;border-radius:0;background:#110d1df5;color:#fff4d8;box-shadow:none;font:700 clamp(22px,6vw,34px)/1.35 system-ui,sans-serif;text-align:center;display:grid;place-items:center;z-index:2147483647;}
[data-phone-portrait-notice]::backdrop{background:#090611eF}
[data-phone-portrait-notice][hidden]{display:none!important}
`;

export function isPhone(navigator=globalThis.navigator){
 return navigator?.userAgentData?.mobile===true||PHONE_UA.test(navigator?.userAgent||'');
}

// Use physical orientation signals only. innerWidth/innerHeight and visualViewport can flip
// while the on-screen keyboard is open, which must never trigger the rotate notice.
export function isPhysicalLandscape(screen=globalThis.screen,win=globalThis.window){
 const type=screen?.orientation?.type;
 if(typeof type==='string'&&type.startsWith('landscape'))return true;
 if(typeof type==='string'&&type.startsWith('portrait'))return false;
 const angle=win?.orientation;
 return typeof angle==='number'&&Math.abs(angle)%180===90;
}

export function mountPhoneOrientation(){
 const win=globalThis.window,doc=globalThis.document,nav=globalThis.navigator,scr=globalThis.screen;
 if(!win||!doc||!isPhone(nav))return()=>{};
 const orientation=scr?.orientation;
 const notice=doc.createElement('dialog');notice.dataset.phonePortraitNotice='';notice.setAttribute('role','alert');notice.setAttribute('aria-live','assertive');
 notice.textContent='Rotate your phone upright to continue.';
 if(typeof notice.showPopover==='function')notice.setAttribute('popover','manual');
 let style=doc.querySelector('style[data-phone-orientation-style]'),ownsStyle=!style;
 if(!style){style=doc.createElement('style');style.dataset.phoneOrientationStyle='';style.textContent=NOTICE_STYLE;doc.head.append(style);}
 doc.body.append(notice);
 let disposed=false,locked=false,pending=false,gestureUsed=false,restacking=false,shown=false,modalFallback=false;
 const open=()=>{try{return notice.open||notice.matches(':popover-open');}catch{return notice.open||(!notice.hidden&&shown);}};
 const anotherModalOpen=()=>[...doc.querySelectorAll('dialog[open]')].some(dialog=>dialog!==notice&&dialog.matches(':modal'));
 function show(){
  if(disposed)return;
  notice.hidden=false;
  // A popover opened outside a modal dialog's top layer can be inert in Chromium.
  // Promote the guard to a modal dialog whenever an app dialog is already active.
  if(anotherModalOpen()){
   if(notice.matches?.(':popover-open'))try{notice.hidePopover();}catch{}
   showModalFallback();return;
  }
  if(typeof notice.showPopover==='function'){
   if(!open())try{notice.showPopover();shown=true;}catch{showModalFallback();}
  }else showModalFallback();
 }
 function showModalFallback(){if(disposed)return;try{if(!notice.open){notice.showModal();modalFallback=true;}shown=true;}catch{notice.hidden=false;shown=true;}}
 function hide(){
  if(typeof notice.hidePopover==='function'&&open())try{notice.hidePopover();}catch{}
  if(notice.open)try{notice.close();}catch{}
  notice.hidden=true;shown=false;
 }
 function updateNotice(){if(isPhysicalLandscape(scr,win))show();else hide();}
 function restack(){
  if(disposed||restacking||!isPhysicalLandscape(scr,win)||!open())return;
  restacking=true;
  try{
   if(anotherModalOpen()&&notice.matches(':popover-open')){notice.hidePopover();showModalFallback();}
   else if(notice.matches(':popover-open')&&typeof notice.hidePopover==='function'){notice.hidePopover();notice.showPopover();}
   else if(notice.open&&modalFallback){notice.close();notice.showModal();}
   shown=true;
  }catch{}
  queueMicrotask(()=>{restacking=false;});
 }
 async function requestLock(){
  if(disposed||pending||locked||typeof orientation?.lock!=='function'){updateNotice();return false;}
  pending=true;
  try{await orientation.lock.call(orientation,'portrait-primary');if(disposed){try{orientation.unlock?.call(orientation);}catch{}return false;}locked=true;updateNotice();return true;}
  catch{if(!disposed)updateNotice();return false;}
  finally{pending=false;}
 }
 function firstGesture(){if(gestureUsed)return;gestureUsed=true;void requestLock();}
 function blockLandscapeKeys(event){if(!disposed&&isPhysicalLandscape(scr,win)&&open()){event.preventDefault();event.stopImmediatePropagation();}}
 function onFullscreen(){if(!doc.fullscreenElement)locked=false;void requestLock();updateNotice();}
 function onOrientation(){updateNotice();}
 function onTopLayerChange(event){
  if(event.target===notice)return;
  const target=event.target;if(target?.matches?.('dialog[open]')){queueMicrotask(restack);return;}
  try{if(target?.matches?.('[popover]:popover-open'))queueMicrotask(restack);}catch{}
 }
 const layers=new MutationObserver(records=>{
  if(records.some(record=>record.target!==notice&&record.target?.tagName==='DIALOG'&&record.attributeName==='open'&&record.target.open))queueMicrotask(restack);
 });
 layers.observe(doc.body,{subtree:true,attributes:true,attributeFilter:['open']});
 win.addEventListener('pointerdown',firstGesture,{capture:true,once:true});
 win.addEventListener('keydown',firstGesture,{capture:true,once:true});
 win.addEventListener('keydown',blockLandscapeKeys,true);
 win.addEventListener('orientationchange',onOrientation);
 win.addEventListener('resize',onOrientation); // the physical orientation check ignores keyboard-only viewport changes
 doc.addEventListener('fullscreenchange',onFullscreen);
 doc.addEventListener('toggle',onTopLayerChange,true);
 orientation?.addEventListener?.('change',onOrientation);
 void requestLock();
 updateNotice();
 return()=>{
  if(disposed)return;disposed=true;layers.disconnect();
  win.removeEventListener('pointerdown',firstGesture,true);win.removeEventListener('keydown',firstGesture,true);
  win.removeEventListener('keydown',blockLandscapeKeys,true);
  win.removeEventListener('orientationchange',onOrientation);win.removeEventListener('resize',onOrientation);
  doc.removeEventListener('fullscreenchange',onFullscreen);doc.removeEventListener('toggle',onTopLayerChange,true);
  orientation?.removeEventListener?.('change',onOrientation);
  if(locked)try{orientation?.unlock?.call(orientation);}catch{}
  if(typeof notice.hidePopover==='function'&&open())try{notice.hidePopover();}catch{}
  if(notice.open)try{notice.close();}catch{}
  notice.remove();
  if(ownsStyle)style?.remove();
 };
}

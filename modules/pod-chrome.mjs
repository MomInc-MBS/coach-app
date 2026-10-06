// A single set of controls follows the active top-layer menu; no duplicate buttons.
export function mountPodChrome(grimoireButton,{signal}={}){
 const doc=grimoireButton.ownerDocument;
 let nav=doc.getElementById('podPersistentChrome');
 if(nav){
  const current=nav.querySelector('.metal-grimoire-key');
  if(current!==grimoireButton){
   grimoireButton.classList.add('metal-grimoire-key');
   current?.replaceWith(grimoireButton);
   // A lazy pod key stays available if the heavyweight portal is later disposed.
   const fallback=nav._lazyGrimoireButton;
   if(fallback&&signal)signal.addEventListener('abort',()=>{
    if(nav.isConnected&&grimoireButton.parentNode===nav)grimoireButton.replaceWith(fallback);
   },{once:true});
  }
  return nav;
 }
 // The mark already says MOM INC. Keep the real home link and its image, but clear
 // the duplicate wordmark and location caption from the visible ship header.
 const brand=doc.querySelector('.ship-header .mom-brand');
 brand?.querySelectorAll(':scope > span').forEach(text=>text.remove());
 if(brand){brand.setAttribute('aria-label','Return to the pod');brand.querySelector('img')?.setAttribute('alt','MOM Inc');}
 doc.querySelectorAll('.ship-header .ship-location').forEach(location=>location.remove());
 const settingsKey=doc.getElementById('openSettings');
 if(settingsKey){
  settingsKey.classList.add('ship-settings-toggle');
  settingsKey.setAttribute('aria-label','Open settings terminal');
  settingsKey.setAttribute('aria-haspopup','dialog');
  settingsKey.setAttribute('aria-controls','settings');
  const handle=doc.createElement('span');handle.className='ship-settings-handle';handle.setAttribute('aria-hidden','true');
  const screen=doc.createElement('span');screen.className='ship-settings-screen';screen.setAttribute('aria-hidden','true');
  const status=doc.createElement('small');status.textContent='SHIP SYSTEMS';
  const title=doc.createElement('strong');title.textContent='SETTINGS';screen.append(status,title);
  settingsKey.replaceChildren(handle,screen);
 }
 doc.getElementById('coachDock')?.classList.add('ship-control-deck');
 nav=doc.createElement('nav');nav.id='podPersistentChrome';nav.className='pod-persistent-chrome';nav.setAttribute('aria-label','Pod terminals');
 grimoireButton.classList.add('metal-grimoire-key');
 if(grimoireButton.id==='podGrimoireLazyOpen')nav._lazyGrimoireButton=grimoireButton;
 const playing=doc.createElement('button');playing.type='button';playing.id='spotifyNowPlayingOpen';playing.className='pod-now-playing';playing.setAttribute('aria-label','Open Spotify DJ terminal');
 const caption=doc.createElement('small');caption.textContent='NOW PLAYING';
 const label=doc.createElement('span');label.id='spotifyNowPlayingLabel';label.textContent='CONNECT SPOTIFY';playing.append(caption,label);nav.append(grimoireButton,playing);doc.body.append(nav);
 const move=()=>{
  const settings=doc.getElementById('settings');
  if(settingsKey)settingsKey.setAttribute('aria-expanded',String(!!settings?.open));
  const dialogs=[...doc.querySelectorAll('dialog[open]')].filter(d=>!d.matches('[data-phone-portrait-notice],#coachGate'));
  const owner=dialogs.at(-1)||doc.body;
  if(nav.parentNode!==owner)owner.append(nav);
  for(const dialog of dialogs)dialog.classList.toggle('has-pod-chrome',dialog===owner);
 };
 const observer=new MutationObserver(move);observer.observe(doc.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
 const close=()=>queueMicrotask(move);doc.addEventListener('close',close,true);
 const dispose=()=>{observer.disconnect();doc.removeEventListener('close',close,true);nav.remove();};
 signal?.addEventListener('abort',dispose,{once:true});move();return nav;
}

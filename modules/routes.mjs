// W2-2A (#4, #5, #17, #18, #30): one hash route per scene, one bottom bar everywhere.
// Each route reuses the opener the app already had (the portal's MENUS open() calls go()). A route's dialog is
// adopted however it was opened (bar button, traced shape, header button, deep link): its #hash goes into
// history, the bottom bar moves inside it (a modal dialog makes everything outside it inert, so the bar has to
// be in there to stay tappable), the bar lights the route, focus goes to its heading and a polite live region
// names it. Phone back closes it and returns to the quilt; back on the quilt asks once before leaving.
// Bundled into app-runtime via app.mjs; no .ts imports, no build defines.
const $=id=>document.getElementById(id);
// Kept by reference: the bar can sit inside a dialog that is being removed (portal dispose) and must come back.
let dockEl=null;
const dock=()=>dockEl||=$('coachDock');
const quiltUp=()=>$('portalHome')?.hidden===false;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const hideQuilt=()=>{if(quiltUp())window.myr5Portal?.hide?.();};
const panel=name=>{document.querySelector(`.coach-dock [data-panel="${name}"]`)?.click();return $(name+'Panel');};
const bare=()=>location.pathname+location.search;
// The ship view resolves only once its entrance is over; the portal's dive needs the dialog as soon as it opens.
const whenOpen=(selector,opening)=>new Promise(resolve=>{
 const open=()=>{const found=document.querySelector(selector);return found?.open?found:null;};
 const watch=new MutationObserver(()=>{const found=open();if(found){watch.disconnect();resolve(found);}});
 watch.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
 Promise.resolve(opening).then(dialog=>{watch.disconnect();resolve(open()||dialog);},()=>{watch.disconnect();resolve(null);});
});
const WAR_ROOM_LOCKED='Finish Coach setup to unlock the War Room.';

// id -> {label, open() -> its dialog (or a promise of it), dialog: selector of the dialog it owns (adopted
// however it opens), page: a no-dialog scene, focus: what a page route focuses, nav: another page, own: the
// dialog keeps its own history (ship-view.mjs pushes #ship itself), shared: adopts that dialog only when it opened it}.
export const ROUTES={
 // Ian 2026-09-23: the square is the workout start page (the pod's viewing port, control board and BEGIN, which
 // starts the camera as always) and the oval is the coach's arrival: its ship flies in and beams it down, every time.
 // W2-2M: from the top, but BEGIN never under the bar: the page fits at 375x812, a shorter phone scrolls just enough.
 workout:{label:'Workout',page:true,focus:'#view',open(){hideQuilt();const begin=$('start')?.getBoundingClientRect(),room=innerHeight-(dock()?.offsetHeight||0)-8;scrollTo({top:begin?.height?Math.max(0,scrollY+begin.bottom-room):0,behavior:reduced()?'auto':'smooth'});}},
 // W2-2Q: the router is the one owner of the ship view's #ship/#select history (the view only keeps its own standalone).
 select:{label:'Coach arrival',dialog:'dialog.ship-view',shared:true,open:()=>whenOpen('dialog.ship-view',window.myr5Menus?.ship?.({entrance:'always',hash:'#select'}))},
 food:{label:'Food',dialog:'#mealsPanel',open:()=>typeof window.myr5Menus?.food==='function'?window.myr5Menus.food():panel('meals')},
 achievements:{label:'Achievements',dialog:'.ach-board',open:()=>window.myr5Menus?.achievements?.()},
 scoreboard:{label:'Scoreboard',dialog:'#accountPanel',open:()=>panel('account')},
 // #148 (Ian 2026-09-23): the customizer's one door is the oval: its ship arrives and the user taps it (ship-intro.mjs
 // opens /creature/index.html with the gate the editor checks). So #customize, the X and any link to it land on the arrival.
 customize:{label:'Character editor',open(){if(hashRoute()==='customize')history.replaceState(null,'',bare()+'#select');void go('select',pending.get('customize'));}},
 meditate:{label:'Meditation',dialog:'.meditation-panel',open(){document.querySelector('.meditation-entry')?.click();return document.querySelector('.meditation-panel');}},
 reminders:{label:'Reminders',dialog:'#remindersPanel',open:()=>panel('reminders')},
 settings:{label:'Settings',dialog:'#settings',open(){$('openSettings')?.click();return $('settings');}},
 // Share isn't built: its route is today's portal Menu sheet (the traced line-up opens the same sheet).
 share:{label:'Menu',dialog:'#portalMenu',async open(){if(!quiltUp()&&!await window.myr5Menus?.portal?.())return null;await window.myr5Portal?.open?.('line-up');return $('portalMenu');}},
 ship:{label:'Ship',dialog:'dialog.ship-view',open:()=>window.myr5Menus?.ship?.()},
 'war-room':{label:'War Room',nav:'/war-room/index.html',locked:()=>window.myr5VerifiedOptionalAccess!==true,lockedMessage:WAR_ROOM_LOCKED},
 pod:{label:'Training pod',page:true,focus:'#homeScreen',open:hideQuilt},
 history:{label:'History',dialog:'#historyPanel',open:()=>panel('history')},
 install:{label:'Install',dialog:'#installPanel',open:()=>panel('install')},
};
// Old ?panel= deep links (reminder pushes, update emails, recovery) open the same routes.
export const PANEL_ROUTES={meals:'food',reminders:'reminders',account:'scoreboard',history:'history',install:'install'};
export function hashRoute(hash=location.hash){const id=hash.slice(1);return Object.hasOwn(ROUTES,id)?id:'';}

let active=null,expectBack=false,guardArmed=false,guardHref='',hintTimer=0;
const pending=new Map();

function paint(){
 const current=active?active.id:quiltUp()?'portal':'';
 for(const button of dock()?.querySelectorAll('[data-route]')||[]){if(button.dataset.route===current)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}
}
function say(text){
 const live=dock()?.querySelector('.dock-live');if(!live)return;
 live.textContent='';setTimeout(()=>{live.textContent=text;},60);
}
function announce(entry){
 const route=ROUTES[entry.id],target=entry.dialog?[...entry.dialog.querySelectorAll('h1,h2')].find(h=>h.getClientRects().length):document.querySelector(route.focus);
 if(target){
  if(!target.hasAttribute('tabindex'))target.setAttribute('tabindex','-1');
  target.focus({preventScroll:true});
  // A #hash that is also an element id (#settings is the Settings dialog's) gets the browser's fragment focus after
  // popstate; take it back once the navigation is done.
  setTimeout(()=>{const now=document.activeElement;if(active===entry&&(now===document.body||now===entry.dialog))target.focus({preventScroll:true});});
 }
 say(route.label);
}
// Home is the quilt: after a back (or closing a cold deep link) bring it up unless something else now owns the screen.
function showQuiltLater(force=false){
 setTimeout(()=>{
  const body=document.body.dataset;
  const idle=()=>!quiltUp()&&!document.querySelector('dialog[open]')&&body.tracking!=='true'&&body.cameraWorkout!=='true'&&body.screen!=='rest';
  if(idle()&&(force||window.coachPlan||window.myr5Portal))void window.myr5Menus?.portal?.({shouldShow:idle});
 });
}

function adopt(id,dialog){
 if(active&&active.dialog===dialog&&active.id===id)return;
 const route=ROUTES[id],flags=pending.get(id)||{};pending.delete(id);
 const prev=active,entry={id,dialog,own:!!route.own,pushed:false,deepLink:!!flags.deepLink,reason:''};
 active=entry;
 if(prev)finish(prev,'switch');
 if(!entry.own){
  const state={myr5Route:id},url=bare()+'#'+id;
  // Switching from one route to the next replaces its history entry, so back always lands on the quilt.
  if(location.hash==='#'+id){entry.pushed=!!flags.fromHash&&!entry.deepLink;history.replaceState(state,'',url);}
  else if(prev?.pushed&&!prev.own){entry.pushed=true;history.replaceState(state,'',url);}
  else if(entry.deepLink)history.replaceState(state,'',url);
  else{entry.pushed=true;history.pushState(state,'',url);}
 }
 if(dialog){
  dialog.dataset.route=id;
  const bar=dock();if(bar)dialog.append(bar);
  dialog.addEventListener('close',()=>finish(entry,entry.reason||'user'),{once:true});
 }
 paint();announce(entry);
}
function finish(entry,reason){
 if(entry.done)return;
 entry.done=true;entry.reason=reason;
 if(active===entry)active=null;
 const {dialog}=entry;
 if(dialog&&dialog!==active?.dialog){
  delete dialog.dataset.route;
  const bar=dock();if(bar?.parentNode===dialog)(active?.dialog||document.body).append(bar);
  if(dialog.open)dialog.close();
 }
 if(!entry.own&&(reason==='user'||reason==='portal')&&location.hash==='#'+entry.id){
  if(entry.pushed){expectBack=true;history.back();}else history.replaceState(null,'',bare());
 }
 if(reason==='back'||(reason==='user'&&entry.deepLink))showQuiltLater();
 paint();
}

export function go(id,{deepLink=false,fromHash=false}={}){
 const route=ROUTES[id];if(!route)return undefined;
 if(route.locked?.()){
  say(route.lockedMessage);const status=$('status');if(status)status.textContent=route.lockedMessage;
  if(hashRoute()===id)history.replaceState(null,'',bare());
  return undefined;
 }
 if(route.nav){
  if(active)active.reason='nav';
  if(hashRoute())history.replaceState(history.state?.myr5Home?history.state:null,'',bare());
  location.assign(route.nav);return undefined;
 }
 if(active?.id===id&&(!active.dialog||active.dialog.open))return active.dialog||undefined;
 const request={deepLink,fromHash};pending.set(id,request);
 let result;
 try{result=route.open();}catch(error){pending.delete(id);throw error;}
 // Only this request may adopt: an older, slower open of the same route (the ship view's) must not take it back.
 const settle=dialog=>{
  if(pending.get(id)!==request)return;
  if(dialog instanceof HTMLDialogElement&&dialog.open)adopt(id,dialog);
  else if(route.page&&!(result instanceof Promise))adopt(id,null);
  else pending.delete(id);
 };
 if(result instanceof Promise)result.then(settle,()=>{if(pending.get(id)===request)pending.delete(id);});else settle(result);
 return result;
}

// Back/forward and #links. popstate covers traversal (and fragment links in current browsers); hashchange is the
// fallback for a link that fired no popstate.
function sync(event){
 if(event.type==='popstate'&&expectBack){expectBack=false;return;}
 const id=hashRoute(),state=event.state??history.state;
 if(active){
  if(active.id!==id){if(active.own)active.reason='back';else finish(active,'back');}
  return;
 }
 if(state?.myr5Route&&ROUTES[state.myr5Route]){go(state.myr5Route,{fromHash:true});return;}
 if(event.type==='popstate'&&guardArmed&&!state?.myr5Home&&location.href===guardHref){
  // The first back on the quilt lands here instead of leaving the app; the next one leaves.
  guardArmed=false;
  const bar=dock();
  if(bar){bar.dataset.hint='Press back again to leave Coach';clearTimeout(hintTimer);hintTimer=setTimeout(()=>delete bar.dataset.hint,3000);}
  say('Press back again to leave Coach');showQuiltLater();return;
 }
 // A route already opening is the same request (#customize rewrites itself to #select before its hashchange lands).
 if(id&&!pending.has(id))go(id,{fromHash:true});
}
// The back guard is pushed only after a tap or key (browsers skip history entries added without one).
function armGuard(){
 if(history.state?.myr5Home){guardArmed=true;return;}
 if(guardArmed||active)return;
 guardHref=location.href;history.pushState({myr5Home:true},'',guardHref);guardArmed=true;
}
// Closes whatever route is open and brings up the quilt. Used by the bar's centre Portal off the quilt, and by
// anything else that wants to send the user home (#56's rest exit, a stopped/paused set, the Settings PORTAL link).
export function home(){
 if(active){const entry=active;if(entry.dialog?.open)entry.reason='portal';finish(entry,'portal');}
 showQuiltLater(true);
}
// The bar's centre Portal: on the quilt the portal's own handler opens the Menu sheet; anywhere else it goes
// home to the quilt (closing the open route).
function portalButton(event){
 if(!event.target.closest?.('#coachDock [data-route="portal"]'))return;
 if(quiltUp()&&!active)return;
 event.stopPropagation();
 home();
}

export function mountRoutes(){
 if(window.myr5Routes)return window.myr5Routes;
 let seen='';
 addEventListener('popstate',event=>{seen=location.href;sync(event);});
 addEventListener('hashchange',()=>{const href=location.href,handled=href===seen;seen='';if(!handled)sync({type:'hashchange',state:history.state});});
 addEventListener('pointerup',armGuard,true);addEventListener('keydown',armGuard,true);
 document.addEventListener('click',portalButton,true);
 // #148: a plain tap on any link to the customizer (the pod's nameplate, the coach card's) plays the arrival instead.
 document.addEventListener('click',event=>{const link=event.target.closest?.('a[href]');if(!link||event.defaultPrevented||event.button||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;const url=new URL(link.href,location.href);if(url.origin===location.origin&&/^\/creature\/(index\.html)?$/.test(url.pathname)){event.preventDefault();go('customize');}});
 new MutationObserver(records=>{
  for(const {target,attributeName} of records){
   if(attributeName==='open'&&target.tagName==='DIALOG'&&target.open){
    const owns=key=>ROUTES[key].dialog&&target.matches(ROUTES[key].dialog);
    const id=[...pending.keys()].find(owns)||Object.keys(ROUTES).find(key=>!ROUTES[key].shared&&owns(key));
    if(id)adopt(id,target);
   }else if(attributeName==='hidden'&&target.id==='portalHome'){
    if(quiltUp()&&active&&!active.dialog)finish(active,'user');
    paint();
   }
  }
 }).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open','hidden']});
 return window.myr5Routes={
  go,home,ROUTES,hashRoute,
  current:()=>active?.id||'',
  // launch.mjs calls this once the panels exist: a ?panel= or #route deep link opens its route.
  boot(panelName){const id=PANEL_ROUTES[panelName]||hashRoute();if(id&&id!=='pod')go(id,{deepLink:true});else paint();},
 };
}

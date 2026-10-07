// "ACHIEVEMENT UNLOCKED" banner: listens for myr5:vault-earned {ids}, shows one goal at a time at the top for 5 s, fades 0.6 s.
import {GOALS} from './vault-goals.mjs';
export const SHOW_MS=5000,FADE_MS=600;
/** Queue + timing, DOM-free so tests can drive it: show(goal) / hide() are callbacks. */
export function createBanner({show,hide,done=()=>{},setTimer=setTimeout,clearTimer=clearTimeout}){
 const q=[];let busy=false,t=0;
 const next=()=>{const g=q.shift();if(!g){busy=false;return;}busy=true;show(g);t=setTimer(()=>{hide();t=setTimer(()=>{done();next();},FADE_MS);},SHOW_MS);};
 return {push(ids){for(const id of ids||[]){const g=GOALS.find(x=>x.id===id);if(g)q.push(g);}if(!busy)next();},
  dismiss(){if(!busy)return;clearTimer(t);hide();t=setTimer(()=>{done();next();},FADE_MS);}};
}
const CSS=`.vault-banner{position:fixed;inset:auto;margin:0;overflow:visible;left:50%;top:calc(env(safe-area-inset-top,0px) + 10px);z-index:2147483000;width:min(92vw,420px);box-sizing:border-box;padding:10px 14px;transform:translate(-50%,-14px);opacity:0;transition:opacity .6s ease,transform .6s ease;pointer-events:none;text-align:center;font:12px/1.35 ui-monospace,Menlo,Consolas,monospace;color:#ff9a3c;text-shadow:0 0 6px rgba(255,140,40,.7);background:linear-gradient(160deg,rgba(76,29,120,.88),rgba(36,12,64,.92));border:2px solid #e6b94c;border-radius:12px;box-shadow:0 0 18px rgba(176,96,255,.55),inset 0 0 14px rgba(230,185,76,.18);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
.vault-banner.on{opacity:1;transform:translate(-50%,0);pointer-events:auto}
.vault-banner small{display:block;letter-spacing:.2em;font-size:10px;color:#e6b94c}
.vault-banner b{display:block;font-size:17px;letter-spacing:.06em;margin:2px 0;text-transform:uppercase}
.vault-banner span{display:block;opacity:.85}`;
export function mountBanner(doc=document,win=window){
 if(win.myr5VaultBanner)return win.myr5VaultBanner;
 const st=doc.createElement('style');st.textContent=CSS;doc.head.append(st);
 const el=doc.createElement('div');el.className='vault-banner';el.setAttribute('role','status');el.setAttribute('aria-live','polite');el.setAttribute('popover','manual');
 const lab=doc.createElement('small'),ti=doc.createElement('b'),de=doc.createElement('span');lab.textContent='ACHIEVEMENT UNLOCKED';el.append(lab,ti,de);doc.body.append(el);
 const b=createBanner({show:g=>{ti.textContent=g.title;de.textContent=g.clue;try{el.showPopover();}catch{el.style.display='block';}void el.offsetWidth;el.classList.add('on');},hide:()=>el.classList.remove('on'),done:()=>{try{el.hidePopover();}catch{el.style.display='';}}});
 el.addEventListener('click',()=>b.dismiss());
 win.addEventListener('myr5:vault-earned',e=>b.push(e.detail?.ids));
 return win.myr5VaultBanner=b;
}
if(typeof document!=='undefined'&&typeof window!=='undefined')mountBanner();

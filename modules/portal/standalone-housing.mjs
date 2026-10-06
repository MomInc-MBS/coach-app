import {readLook,applyLookVars,stripSeq} from './portal-look.mjs';

const BOLTS=[[0,0],[1,0],[0,1],[1,1],[0,.33],[0,.67],[1,.33],[1,.67]];
export const frameMarkup=()=>`<div class="portal-frame" aria-hidden="true"><span class="portal-energy">${'<span><span></span></span>'.repeat(4)}</span>${BOLTS.map(([x,y])=>`<i style="--x:${x};--y:${y}"></i>`).join('')}<b>MOM INC</b></div><div class="portal-standalone-aura" aria-hidden="true"></div>`;

/** Applies the saved metal colour and strip colour to a frameMarkup() host (shared with the camera workout). */
export function paintHousing(chrome,doc=document){const look=readLook();applyLookVars(doc.documentElement,look);chrome.style.setProperty('--portal-strip-glow',`${look.strip}40`);chrome.querySelector('.portal-standalone-aura')?.style.setProperty('--aura',look.strip);const seq=stripSeq(look.strip);for(const [i,channel] of [...chrome.querySelectorAll('.portal-energy>span')].entries()){channel.style.setProperty('--dir',i%2?'180deg':'90deg');channel.firstElementChild.style.background=`repeating-linear-gradient(${i%2?'180deg':'90deg'},${seq.map((color,j)=>`${color} ${j*90}px ${(j+1)*90}px`).join(',')})`;}}

/** A lightweight persistent frame for the separately-loaded coach customizer. */
export async function mountStandaloneHousing({content=document.querySelector('.editor-shell'),doc=document}={}){
 if(!content||!doc)return ()=>{};
 const view=doc.defaultView;let leftEarly=false;
 const beforeReady=event=>{if(!event.persisted)leftEarly=true;};view?.addEventListener('pagehide',beforeReady);
 const loadCss=href=>new Promise((resolve,reject)=>{const link=doc.createElement('link');link.rel='stylesheet';link.href=href;link.onload=()=>resolve(link);link.onerror=()=>reject(Error(`Could not load ${href}`));doc.head.append(link);});
 const links=await Promise.all(['/modules/portal/portal.css','/modules/portal/standalone-housing.css'].map(loadCss));
 if(leftEarly){links.forEach(link=>link.remove());view?.removeEventListener('pagehide',beforeReady);return ()=>{};}
 doc.getElementById('coachDock')?.classList.add('ship-control-deck');
 let chrome=doc.getElementById('portalChrome');if(!chrome){chrome=doc.createElement('div');chrome.id='portalChrome';chrome.setAttribute('popover','manual');chrome.setAttribute('aria-hidden','true');doc.body.append(chrome);}
 chrome.classList.add('portal-standalone');chrome.innerHTML=frameMarkup();
 const face=()=>{const rail=15;for(const [key,value] of Object.entries({left:rail,top:rail,width:Math.max(1,innerWidth-2*rail),height:Math.max(1,innerHeight-2*rail-(doc.getElementById('coachDock')?.getBoundingClientRect().height||0))}))chrome.style.setProperty('--face-'+key,value+'px');};
 const updateLook=()=>paintHousing(chrome,doc);
 face();updateLook();
 if(chrome.showPopover){if(!chrome.matches(':popover-open'))chrome.showPopover();}else chrome.removeAttribute('popover');
 const reduced=view?.matchMedia?.('(prefers-reduced-motion: reduce)');let raf=0,tx=0,ty=0,x=0,y=0,disposed=false,sensorBase=null;
 const requestTilt=()=>{if(!disposed&&!raf&&!doc.hidden&&!reduced?.matches)raf=requestAnimationFrame(step);};
 const pointer=e=>{if(disposed||reduced?.matches||doc.hidden)return;tx=Math.max(-1,Math.min(1,(e.clientX/Math.max(1,view.innerWidth)-.5)*2));ty=Math.max(-1,Math.min(1,(e.clientY/Math.max(1,view.innerHeight)-.5)*2));requestTilt();};
 const step=()=>{raf=0;x+=(tx-x)*.055;y+=(ty-y)*.055;content.style.setProperty('--editor-peer-x',(x*2.5).toFixed(2)+'px');content.style.setProperty('--editor-peer-y',(y*2.5).toFixed(2)+'px');content.style.setProperty('--editor-peer-tilt',(x*.65).toFixed(2)+'deg');if(Math.abs(tx-x)+Math.abs(ty-y)>.01)raf=requestAnimationFrame(step);};
 const orientation=event=>{if(disposed||reduced?.matches||doc.hidden||event.beta==null||event.gamma==null)return;if(!sensorBase)sensorBase={beta:event.beta,gamma:event.gamma};tx=Math.max(-1,Math.min(1,(event.gamma-sensorBase.gamma)/15));ty=Math.max(-1,Math.min(1,(event.beta-sensorBase.beta)/15));requestTilt();};
 const allowTilt=async()=>{const DeviceOrientationEvent=view.DeviceOrientationEvent;try{const answer=await DeviceOrientationEvent.requestPermission();if(disposed)return;if(answer==='granted'){view.addEventListener('deviceorientation',orientation);chip?.remove();}}catch{}}
 const chip=view?.DeviceOrientationEvent?.requestPermission?doc.createElement('button'):null;
 if(chip){chip.type='button';chip.className='editor-tilt-request';chip.textContent='Enable tilt';chip.setAttribute('aria-label','Enable device tilt to look around');(doc.querySelector('.view-buttons')||doc.querySelector('.preview-toolbar')||content).append(chip);chip.addEventListener('click',allowTilt);}
 else if(view?.DeviceOrientationEvent)view.addEventListener('deviceorientation',orientation);
 const resize=()=>face(),storage=e=>{if(!e.key||e.key.startsWith('myr5.portal'))updateLook();};
 const clearPeer=()=>{tx=ty=x=y=0;content.style.removeProperty('--editor-peer-x');content.style.removeProperty('--editor-peer-y');content.style.removeProperty('--editor-peer-tilt');};
 const onVisibility=()=>{if(doc.hidden){clearPeer();cancelAnimationFrame(raf);raf=0;}else requestTilt();};
 const onReduced=()=>{if(reduced.matches){clearPeer();cancelAnimationFrame(raf);raf=0;}else requestTilt();};
 const dispose=()=>{if(disposed)return;disposed=true;cancelAnimationFrame(raf);doc.removeEventListener('visibilitychange',onVisibility);view?.removeEventListener('pagehide',pagehide);view?.removeEventListener('pointermove',pointer);view?.removeEventListener('resize',resize);view?.removeEventListener('storage',storage);view?.removeEventListener('focus',updateLook);view?.removeEventListener('deviceorientation',orientation);reduced?.removeEventListener?.('change',onReduced);chip?.remove();clearPeer();chrome.hidePopover?.();chrome.remove();links.forEach(link=>link.remove());};
 const pagehide=event=>{if(!event.persisted)dispose();};
 view?.removeEventListener('pagehide',beforeReady);view?.addEventListener('pagehide',pagehide);view?.addEventListener('pointermove',pointer,{passive:true});view?.addEventListener('resize',resize);view?.addEventListener('storage',storage);view?.addEventListener('focus',updateLook);doc.addEventListener('visibilitychange',onVisibility);reduced?.addEventListener?.('change',onReduced);
 return dispose;
}

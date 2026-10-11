import {performanceOwner} from './performance-progress.mjs';
import {isGranted} from './creature/source/creator/unlock-store.ts';

const CSS=`
.cosmetic-reward-reveal{box-sizing:border-box;width:min(380px,calc(100vw - 28px));max-height:calc(100dvh - 28px);padding:20px;margin:auto;overflow:auto;border:2px solid var(--reward-color,#4bafff);border-radius:20px;background:#17131f;color:#fff7df;font:500 16px/1.4 system-ui;text-align:center}
.cosmetic-reward-reveal::backdrop{background:#090717d9}.cosmetic-reward-reveal h2{margin:0;font-size:22px}.cosmetic-reward-reveal p{margin:8px 0}.cosmetic-reward-reveal .reward-name{color:var(--reward-color);font-weight:800;overflow-wrap:anywhere}
.original-coach-reward-stage{width:100%;height:clamp(140px,30dvh,260px);position:relative}.original-coach-reward-stage canvas{display:block;width:100%;height:100%}
.cosmetic-reward-reveal .reward-actions{display:flex;gap:10px;justify-content:center;margin-top:14px}.cosmetic-reward-reveal button{min-width:80px;min-height:44px;padding:8px 16px;border:2px solid var(--reward-color);border-radius:12px;background:var(--reward-color);color:#15101c;font:800 15px system-ui;cursor:pointer}.cosmetic-reward-reveal button.secondary{background:transparent;color:#fff7df}.cosmetic-reward-reveal button:focus-visible{outline:3px solid white;outline-offset:3px}.cosmetic-reward-reveal [hidden]{display:none}
`;

export function mountCosmeticRewardReveal(){
 let queue=[],card=null,preview=null,timer=0,epoch=0,disposed=false,owner=performanceOwner(),current=null;
 const style=document.createElement('style');style.textContent=CSS;document.head.append(style);
 const viewerUrl='/creature/assets/reward-preview.js';
 const clean=()=>{++epoch;preview?.dispose();preview=null;card?.close();card?.remove();card=null;current=null;};
 const clear=()=>{clearTimeout(timer);queue=[];clean();owner=performanceOwner();};
 async function loadPreview(stage,status,retry,item){
  const run=++epoch,expectedOwner=owner;preview?.dispose();preview=null;stage.replaceChildren();delete stage.dataset.ready;status.textContent='Loading original MYR5 coach…';retry.hidden=true;
  try{
   const module=await import(viewerUrl);
   if(disposed||run!==epoch||expectedOwner!==performanceOwner()||!card?.open)return;
   const instance=module.mountOriginalRewardPreview(stage,item);preview=instance;
   const loaded=await instance.ready;
   if(disposed||run!==epoch||expectedOwner!==performanceOwner())return;
   if(!loaded)throw Error('Preview unavailable');
   card.querySelector('.reward-name').textContent=module.cosmeticRewardName(item.kind,item.id);
   status.textContent='Also unlocked for original MYR5.';
  }catch{
   if(disposed||run!==epoch||expectedOwner!==performanceOwner())return;
   preview?.dispose();preview=null;status.textContent='Reward saved. Download the Coach pack to see it on original MYR5 offline, or retry online.';retry.hidden=false;
  }
 }
 function showNext(){
  clearTimeout(timer);if(disposed||card||!queue.length)return;
  if(owner!==performanceOwner()){clear();return;}
  // Rewards never interrupt an active workout or another native dialog.
  if(document.hidden||document.querySelector('dialog[open]')||document.body.dataset.tracking==='true'||document.body.dataset.cameraWorkout==='true'){timer=setTimeout(showNext,400);return;}
  const item=queue.shift();if(!isGranted(item.kind,item.id,'myr5')){showNext();return;}
  current=item;card=document.createElement('dialog');card.className='cosmetic-reward-reveal';card.setAttribute('aria-label','Cosmetic unlocked on original MYR5');card.style.setProperty('--reward-color',item.kind==='texture'?'#ff9c36':item.kind==='palette'?'#4bafff':'#76e356');
  card.innerHTML='<h2>Original MYR5 unlocked</h2><p class="reward-name"></p><div class="original-coach-reward-stage"></div><p data-status role="status" aria-live="polite"></p><div class="reward-actions"><button type="button" class="secondary" data-retry hidden>Retry preview</button><button type="button" class="secondary" data-close>Close</button><button type="button" data-next></button></div>';
  const next=card.querySelector('[data-next]'),retry=card.querySelector('[data-retry]'),status=card.querySelector('[data-status]'),stage=card.querySelector('.original-coach-reward-stage');card.querySelector('.reward-name').textContent=item.id;next.textContent=queue.length?'Next reward':'Done';
  next.onclick=()=>{clean();showNext();};card.querySelector('[data-close]').onclick=clear;card.addEventListener('cancel',event=>{event.preventDefault();clear();});retry.onclick=()=>loadPreview(stage,status,retry,item);
  document.body.append(card);card.showModal();next.focus();void loadPreview(stage,status,retry,item);
 }
 const onGrant=event=>{
  if(disposed||event.detail?.owner!==performanceOwner()||!Array.isArray(event.detail?.granted))return;
  if(owner!==performanceOwner())clear();
  const batch=new Set();for(const item of event.detail.granted){if(!['color','palette','texture'].includes(item?.kind)||typeof item.id!=='string'||!isGranted(item.kind,item.id,'myr5'))continue;const key=item.kind+':'+item.id;if(batch.has(key))continue;batch.add(key);queue.push({kind:item.kind,id:item.id});}
  if(card&&current)card.querySelector('[data-next]').textContent=queue.length?'Next reward':'Done';showNext();
 };
 const accountChanged=()=>{if(owner!==performanceOwner())clear();};
 const dispose=()=>{if(disposed)return;disposed=true;clear();style.remove();window.removeEventListener('myr5:cosmetics-unlocked',onGrant);window.removeEventListener('myr5:account-ready',accountChanged);window.removeEventListener('myr5:account-cleared',clear);window.removeEventListener('pagehide',dispose);};
 window.addEventListener('myr5:cosmetics-unlocked',onGrant);window.addEventListener('myr5:account-ready',accountChanged);window.addEventListener('myr5:account-cleared',clear);window.addEventListener('pagehide',dispose);
 return dispose;
}

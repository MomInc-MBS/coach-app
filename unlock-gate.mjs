// "Why is this locked" sheet + the one-time celebration. The rule itself is unlockStatus() in performance-progress.mjs.
import {readPerformanceProgress,unlockStatus} from './performance-progress.mjs';
export const UNLOCK_SEEN_KEY='myr5-all-unlocked-seen-v1';
export const UNLOCK_MESSAGE='Finish a workout, a meditation and a food log to unlock every coach and workout style.';
const STYLE='position:fixed;inset:auto 12px 12px 12px;z-index:99999;margin:0;max-width:none;border:1px solid #6cf;border-radius:16px;background:#101828;color:#fff;padding:16px;font:15px system-ui;box-shadow:0 8px 40px #000a';
const ITEMS=[['workout','Workout (Cool Cardio counts)'],['meditation','Meditation'],['food','Food log']];
let sheet;
export function showUnlockGate({onCardio}={}){
 const status=unlockStatus(readPerformanceProgress());
 sheet?.remove();sheet=document.createElement('dialog');sheet.id='unlockGate';sheet.setAttribute('style',STYLE);
 const p=document.createElement('p');p.textContent=UNLOCK_MESSAGE;p.setAttribute('role','status');
 const ul=document.createElement('ul');ul.style.cssText='list-style:none;padding:0;margin:8px 0';
 for(const [key,label] of ITEMS){const li=document.createElement('li');li.dataset.item=key;li.dataset.done=String(status[key]);li.textContent=`${status[key]?'\u2713':'\u25CB'} ${label}`;ul.append(li);}
 const row=document.createElement('div');row.style.cssText='display:flex;gap:8px';
 const cardio=document.createElement('button');cardio.type='button';cardio.dataset.gate='cardio';cardio.textContent='Play Cool Cardio';
 const close=document.createElement('button');close.type='button';close.textContent='Close';
 cardio.onclick=()=>{sheet.close();onCardio?.();};close.onclick=()=>sheet.close();
 row.append(cardio,close);sheet.append(p,ul,row);document.body.append(sheet);sheet.showModal();
}
/** Celebrate once, the first time progress flips to fully unlocked (silent for already-unlocked saves). */
export function watchUnlock(storage=globalThis.localStorage){
 const check=()=>{try{if(!unlockStatus(readPerformanceProgress()).done||storage.getItem(UNLOCK_SEEN_KEY))return;storage.setItem(UNLOCK_SEEN_KEY,'1');celebrate();}catch{}};
 addEventListener('myr5:performance-progress',check);
}
function celebrate(){
 const t=document.createElement('div');t.id='unlockToast';t.setAttribute('role','status');t.setAttribute('style',STYLE.replace('border-radius:16px','border-radius:16px;text-align:center'));
 t.textContent='\u2728 Everything unlocked: all coaches, workout styles and movements!';document.body.append(t);setTimeout(()=>t.remove(),5000);
}

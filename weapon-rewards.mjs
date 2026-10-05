import {TRAINING_TRACKS} from './weapon-training.mjs';
import {readPerformanceProgress} from './performance-progress.mjs';
export function weaponRewardSummary(group,{kind,options={}}={}){
 const track=TRAINING_TRACKS[group];if(!track)return null;
 const state=readPerformanceProgress(options),weapons=track.weapons.map(type=>({type,tier:state.weapons[type]??0}));
 const hold='Holds: 1 uninterrupted minute earns the first tier in the difficulty block; 3 minutes earns the second; 5 minutes unlocks the coach. Repeat a 5-minute clear for another tier. 10 minutes finishes the block and earns gold.';
 const reps='Working reps: 8 earns the first tier in the difficulty block; 12 earns the second; 15 unlocks the coach. Repeat the 15-rep clear on an eligible day for another tier.';
 const timed='Active movement: complete 5 active minutes to earn a weapon tier. '+(group==='cardio'?'For sprinting, complete 5 rounds. ':'')+'Repeat at the same difficulty to improve its block.';
 return {name:track.name,weapons,blocks:'Easy tiers 1–5 · Medium 6–10 · Hard 11–15 · Expert 16–20',target:kind==='hold'?hold:kind==='reps'?reps:kind==='cardio'?timed:[hold,reps].join(' ')};
}
export function mountWeaponRewards(host,getGroup,getKind=()=>undefined){
 const strip=document.createElement('section');strip.className='training-rewards';strip.setAttribute('aria-label','Performance weapon rewards');host.after(strip);
 function paint(){
  const summary=weaponRewardSummary(getGroup(),{kind:getKind()});strip.replaceChildren();if(!summary)return;
  const W=window.GalaWeapons,heading=document.createElement('p');heading.textContent=`${summary.name} · Earned weapon tiers`;strip.append(heading);
  const row=document.createElement('div');row.className='training-reward-weapons';
  for(const {type,tier} of summary.weapons){
   const card=document.createElement('div'),canvas=document.createElement('canvas'),label=document.createElement('span');canvas.width=80;canvas.height=144;canvas.setAttribute('aria-hidden','true');W?.draw?.(canvas.getContext('2d'),{type,tier},{scale:2});const name=W?.types?.find(w=>w.id===type)?.name||type[0].toUpperCase()+type.slice(1);label.textContent=`${name} · ${tier===0?'Starter':`Tier ${tier} / 20`}`;card.dataset.weapon=type;card.dataset.tier=String(tier);card.append(canvas,label);row.append(card);
  }
  strip.append(row);for(const text of [summary.blocks,summary.target]){const status=document.createElement('small');status.textContent=text;strip.append(status);}
 }
 for(const event of ['myr5:performance-progress','myr5:account-progress','myr5:account-ready','myr5:account-cleared','storage'])window.addEventListener(event,paint);
 paint();return {paint,element:strip};
}

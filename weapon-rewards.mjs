import {TRAINING_TRACKS,trackProgress} from './weapon-training.mjs';

export function mountWeaponRewards(host,getGroup){
 let progress={};
 const strip=document.createElement('section');strip.className='training-rewards';strip.setAttribute('aria-label','Category weapon rewards');host.after(strip);
 function paint(){
  const group=getGroup(),track=TRAINING_TRACKS[group],W=window.GalaWeapons;if(!track||!W)return;
  const p=trackProgress(progress,group);strip.replaceChildren();
  const heading=document.createElement('p');const lv=W.level(progress);heading.textContent=`${track.name} · Level ${lv.level}`;strip.append(heading);
  const row=document.createElement('div');row.className='training-reward-weapons';
  for(const type of track.weapons){
   let tier=0;for(let i=1;i<W.tiers.length;i++)if(W.unlocked({type,tier:i},progress))tier=i;
   const card=document.createElement('div'),canvas=document.createElement('canvas'),label=document.createElement('span');canvas.width=80;canvas.height=144;canvas.setAttribute('aria-hidden','true');W.draw(canvas.getContext('2d'),{type,tier},{scale:2});label.textContent=W.types.find(w=>w.id===type).name;card.append(canvas,label);row.append(card);
  }
  strip.append(row);
  const next=W.tiers.findIndex((_,tier)=>!W.unlocked({type:track.weapons[0],tier},progress)),status=document.createElement('small');
  status.textContent=next<0?'Fully evolved':`+100 XP per active day, +10 per set · Next: Level ${next+1} at ${W.requirements({type:track.weapons[0],tier:next}).xp} XP`;
  strip.append(status);
 }
 window.addEventListener('myr5:account-progress',event=>{progress=event.detail;paint();});
 paint();return {paint};
}

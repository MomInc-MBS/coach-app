import {COSMETIC_LEVEL_XP,cosmeticLevel,coachXpMultiplier} from './progression-rules.mjs';
import {readPerformanceProgress} from './performance-progress.mjs';
import {STARTER_COACH_IDS} from './performance-catalog.mjs';
import {syncBattlePass} from './battle-pass.mjs';

const node=(tag,text,className)=>{const el=document.createElement(tag);if(text!=null)el.textContent=text;if(className)el.className=className;return el;};
const localDay=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
export function mountBattlePass(){
 if(document.getElementById('battlePassPanel'))return;
 const dialog=node('dialog',null,'launch-panel battle-pass-page');dialog.id='battlePassPanel';dialog.setAttribute('aria-labelledby','battlePassTitle');
 const header=node('header'),heading=node('h2','Battle pass');heading.id='battlePassTitle';const close=node('button','Close');close.type='button';close.onclick=()=>dialog.close();header.append(heading,close);
 const summary=node('section',null,'pass-summary'),daily=node('section',null,'pass-daily'),explain=node('p','XP earns coach-specific colors, textures and cosmetic packs. Coaches, weapons and ships follow workout milestones. Golden coaches require a continuous 10-minute hold.','pass-explanation'),levels=node('ol',null,'pass-levels');levels.setAttribute('aria-label','Cosmetic level rewards');dialog.append(header,summary,daily,explain,levels);document.body.append(dialog);
 function render(){
  const p=readPerformanceProgress(),rank=cosmeticLevel(p.totalXp),day=p.days?.[localDay()]||{};
  summary.replaceChildren(node('strong',`Level ${rank.level} / 250`),node('span',`${Math.floor(rank.xp).toLocaleString()} XP`));
  const progress=node('progress');progress.max=rank.max?1:rank.need;progress.value=rank.max?1:rank.into;progress.setAttribute('aria-label','Progress to next level');summary.append(progress,node('small',rank.max?'Cosmetic pass complete':`${Math.ceil(rank.next-rank.xp).toLocaleString()} XP to level ${rank.level+1}`));
  daily.replaceChildren(node('h3','Today’s rewards'));
  const workout=Number(day.workoutXp??day.baseXp??0)>0||!!day.workout,meditation=!!day.meditation,food=!!day.food;
  for(const [label,complete] of [['Workout',workout],['Meditation · ×2 workout XP',meditation],['Food',food]])daily.append(node('p',`${complete?'✓':'○'} ${label}`));
  daily.append(node('strong',workout&&meditation&&food?'✓ All three complete · +500 XP':'Complete all three · +500 XP'),node('small','Meditation doubles today’s workout XP, including workouts completed earlier. The 500 XP bonus is awarded once and stays separate.'));
  const coaches=p.coaches.filter(id=>!STARTER_COACH_IDS.includes(id)).length;daily.append(node('small',`Coach XP multiplier: ×${coachXpMultiplier(coaches)}`));
  levels.replaceChildren();
  COSMETIC_LEVEL_XP.forEach((xp,index)=>{const level=index+1,tier=level%10===0?'Legendary':level%5===0?'Rare':'Uncommon',row=node('li',null,'pass-level');row.dataset.state=level<rank.level?'earned':level===rank.level?'current':'locked';if(level===rank.level)row.setAttribute('aria-current','step');row.append(node('b',String(level)),node('span',level===1?'Starter cosmetics':`${tier} pack`),node('small',`${xp.toLocaleString()} XP`));levels.append(row);});
 }
 const open=()=>{syncBattlePass();render();if(!dialog.open)dialog.showModal();return dialog;};
 window.myr5Menus={...window.myr5Menus,battlePass:open};
 document.getElementById('battlePassOpen')?.addEventListener('click',()=>window.myr5Routes?.go?window.myr5Routes.go('battlepass'):open());
 window.addEventListener('myr5:performance-progress',()=>{syncBattlePass();render();});window.addEventListener('myr5:account-ready',render);window.addEventListener('storage',render);
 render();
}

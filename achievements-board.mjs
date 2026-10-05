import {COACHES,COACH_REQUIREMENTS,STARTER_COACH_IDS,WEAPON_GROUPS,SHIP_REQUIREMENTS,CADENCE_MILESTONES,exerciseDifficulty} from './performance-catalog.mjs';
import {EXERCISES,FOCUS_GROUPS} from './exercise-library.mjs';
import {readPerformanceProgress} from './performance-progress.mjs';
import {cosmeticLevel,DIFFICULTIES} from './progression-rules.mjs';
import {SHIP_CATALOG} from './modules/ships/ship-catalog.mjs';
export {selectedTracks} from './battle-pass.mjs';
export const loadProgress=readPerformanceProgress;
export const GROUP_NAMES=Object.fromEntries([...FOCUS_GROUPS.map(g=>[g.id,g.name]),['meditation','Meditation']]);
export const BOSSES=COACHES.map(c=>({...c,name:c.label,requirement:COACH_REQUIREMENTS.find(r=>r.id===c.id)||null}));
const difficultyName=d=>d[0].toUpperCase()+d.slice(1);
const groupName=g=>GROUP_NAMES[g]||g;
export function coachRequirements(id){
 const coach=BOSSES.find(c=>c.id===id);if(!coach)return null;
 const r=coach.requirement;if(!r)return {starter:true,unlock:'Available from the start',gold:'Select this coach and complete a 10-minute uninterrupted hold to earn its golden version.',exercises:[]};
 if(r.groups.includes('meditation'))return {starter:false,unlock:`Complete meditation on ${CADENCE_MILESTONES.meditationDays[DIFFICULTIES.indexOf(r.difficulty)]} separate days.`,gold:null,exercises:[]};
 const exercises=Object.values(EXERCISES).filter(e=>r.groups.includes(e.group)&&exerciseDifficulty(e.id)===r.difficulty);
 const kinds=[...new Set(exercises.map(e=>e.kind))],options=[];
 if(kinds.includes('hold'))options.push('hold for 5 uninterrupted minutes');
 if(kinds.includes('reps'))options.push('complete 15 reps in one working set');
 if(r.groups.includes('cardio'))options.push('complete 5 sprint rounds or 5 active minutes of gentle cardio');
 else if(kinds.some(k=>k==='pace'||k==='steps'))options.push('complete 5 active minutes');
 return {starter:false,difficulty:r.difficulty,groups:r.groups,unlock:`${difficultyName(r.difficulty)} · ${r.groups.map(groupName).join(' / ')}: ${options.join(' OR ')}.`,gold:kinds.includes('hold')?'Complete a 10-minute uninterrupted hold at this difficulty in one of these groups. Breaks and difficulty changes restart the uninterrupted attempt.':null,exercises:exercises.map(e=>e.name)};
}
export function bossStates(progress=readPerformanceProgress()){
 return BOSSES.map(b=>({...b,state:progress.coaches?.includes(b.id)?'done':'locked',golden:progress.goldenCoaches?.includes(b.id)===true,requirements:coachRequirements(b.id)}));
}
export function weaponRequirements(group){
 return {group,name:groupName(group),weapons:WEAPON_GROUPS[group]||[],blocks:DIFFICULTIES.map((difficulty,i)=>({difficulty,first:i*5+1,last:i*5+5})),hold:'1 uninterrupted minute: first tier in the difficulty block. 3 minutes: second tier. 5 minutes: coach clear; repeating it adds one tier. 10 minutes: finish the five-tier block and earn gold.',reps:'8 reps: first tier in the difficulty block. 12 reps: second tier. 15 reps: coach clear; repeating it adds one tier. One working set per muscle group per day.'};
}
export const shipRequirements=()=>SHIP_REQUIREMENTS.map(r=>({...r,name:SHIP_CATALOG.find(s=>s.id===r.id)?.name||r.id,unlock:`Expert ${groupName(r.group)}: ${r.kind==='hold'?'5 uninterrupted minutes':'15 reps in one working set'}.`}));
// Retained for decorative constellation consumers; roster ownership never uses zoom or defeats.
export function layerTransform(depth,{tx=0,ty=0,scale=1}={}){const f={far:.35,mid:.65,near:1.25}[depth]??1;return {tx:tx*f,ty:ty*f,scale:1+(scale-1)*f};}
let dialog,content,current='coaches';
function element(tag,text,className){const el=document.createElement(tag);if(text)el.textContent=text;if(className)el.className=className;return el;}
function card(title,status,lines){const article=element('article',null,'ach-card');article.append(element('h2',title),element('p',status,'ach-status'));for(const [label,text] of lines){if(!text)continue;const p=element('p');p.append(element('strong',`${label} `),document.createTextNode(text));article.append(p);}return article;}
function paint(){
 const state=readPerformanceProgress(),rank=cosmeticLevel(state.totalXp),states=bossStates(state);
 dialog.querySelector('.ach-count').textContent=`${state.coaches.length} / ${BOSSES.length} coaches · ${state.goldenCoaches.length} golden · cosmetic level ${rank.level} / 250`;
 content.replaceChildren();
 for(const button of dialog.querySelectorAll('[data-ach-tab]')){const selected=button.dataset.achTab===current;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;}
 if(current==='coaches')for(const b of states){const r=b.requirements,c=card(b.name,b.golden?'Unlocked · Golden':b.state==='done'?'Unlocked':'Locked', [['Unlock',r.unlock],['Golden',r.gold],['Suggested exercises',r.exercises.join(', ')],['64-bit character','Unlocks together with this coach. Customize its colors in the War Room mirror.']]);c.dataset.id=b.id;c.dataset.state=b.state;c.dataset.golden=String(b.golden);content.append(c);}
 if(current==='weapons')for(const group of Object.keys(WEAPON_GROUPS)){const r=weaponRequirements(group);content.append(card(r.name,r.weapons.map(w=>`${w}: tier ${state.weapons[w]??0} / 20`).join(' · '),[['Difficulty blocks',r.blocks.map(b=>`${difficultyName(b.difficulty)} ${b.first}–${b.last}`).join(' · ')],['Holds',r.hold],['Reps',r.reps],['Other timed modes','Complete 5 active minutes, or 5 sprint rounds for cardio, to add a tier in your difficulty block.']]));}
 if(current==='ships')for(const ship of shipRequirements())content.append(card(ship.name,state.ships.includes(ship.id)?'Unlocked':'Locked',[['Unlock',ship.unlock]]));
 if(current==='rewards'){
  content.append(card('Cosmetic battle pass',`Level ${rank.level} / 250 · ${Math.floor(state.totalXp)} XP`,[['XP','Active exercise earns XP for packs, colors, palettes, textures and finishes. Cosmetic levels do not unlock coaches, weapons or ships.'],['Coach bonus','Each earned coach adds 25% to workout XP. Bonuses add together.'],['Daily meditation','Complete meditation to double today’s workout XP, including workout XP already earned.'],['Daily trio','Workout + meditation + food earns a separate 500 XP once that local day.'],['Packs','Uncommon contains 1 cosmetic; rare 2; legendary 3.']]));
  content.append(card('Rest arena','Rewards reset each local day',[['First defeat','Defeat one boss during a rest timer to earn one uncommon pack that day.'],['Fifth defeat','Defeat five bosses during rest timers that day to earn one legendary pack. Both rewards are granted once per day.'],['Streak damage','Your login streak and weapon strength still power your attacks. Rest defeats award packs; coach ownership comes from exercise performance.']]));
 }
}
function build(){
 dialog=document.createElement('dialog');dialog.className='ach-board';dialog.setAttribute('aria-labelledby','achievementsTitle');
 dialog.innerHTML='<header class="ach-head"><h1 id="achievementsTitle">Achievements</h1><p class="ach-count"></p><p class="ach-intro">Choose any exercise path. Every coach shows the performance needed to unlock it.</p></header><button type="button" class="ach-close" aria-label="Close achievements">Close</button><nav class="ach-tabs" role="tablist" aria-label="Achievement categories"></nav><section class="ach-catalog" role="tabpanel" tabindex="0"></section>';
 document.body.append(dialog);content=dialog.querySelector('.ach-catalog');content.id='ach-catalog';
 for(const [id,label] of [['coaches','Coaches'],['weapons','Weapons'],['ships','Ships'],['rewards','XP & packs']]){const button=element('button',label);button.type='button';button.dataset.achTab=id;button.id=`ach-tab-${id}`;button.setAttribute('role','tab');button.setAttribute('aria-controls','ach-catalog');button.onclick=()=>{current=id;content.setAttribute('aria-labelledby',button.id);paint();content.scrollTop=0;};dialog.querySelector('.ach-tabs').append(button);}
 dialog.querySelector('.ach-tabs').onkeydown=event=>{const tabs=[...dialog.querySelectorAll('[data-ach-tab]')],index=tabs.findIndex(t=>t.dataset.achTab===current),next={ArrowRight:(index+1)%tabs.length,ArrowLeft:(index+tabs.length-1)%tabs.length,Home:0,End:tabs.length-1}[event.key];if(next!==undefined){event.preventDefault();tabs[next].click();tabs[next].focus();}};
 dialog.querySelector('.ach-close').onclick=()=>dialog.close();
 for(const event of ['myr5:performance-progress','myr5:account-ready','myr5:account-cleared','storage'])window.addEventListener(event,()=>{if(dialog.open)paint();});
 content.setAttribute('aria-labelledby','ach-tab-coaches');
}
export function openAchievements(){if(!dialog)build();paint();if(!dialog.open)dialog.showModal();return dialog;}

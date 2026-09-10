import {initRestArena} from './rest-arena.mjs';
import {abilityFor} from './weapon-evolution.mjs';
import {initHandCompanion} from '../hand-companion.mjs';
import {SetFlow,DEFAULT_GOALS,valueOf,COACH_HEALTH} from './set-flow.mjs';
import {SetEncouragement} from './encouragement.mjs';
import {setFlipValue,clockDigits} from '../flip-display.mjs';
import {GALA_KEY,loadGala,importGala,loadPower,POWERS} from './identity.mjs';
const $=id=>document.getElementById(id),PROGRESS='myr5-workout-progress-v1',COOLDOWN='myr5-special-cooldown-v1';
const time=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
const safeRead=key=>{try{return localStorage.getItem(key);}catch{return null;}};
export function initPod({voice,movements,onStop,onNext}){
 const hand=initHandCompanion(),arena=initRestArena();
 const flow=new SetFlow(null,{cooldown:safeRead(COOLDOWN)}),encourage=new SetEncouragement();let currentMode=null,card=null,observedCard=null,restTimer=0,hitTimer=0,lastSpoken=-Infinity,restCalled=false,look;
 window.addEventListener('myr5:coach-plan',()=>{if(flow.phase==='set')return;const mode=currentMode||'squat';currentMode=null;configure(mode);if(window.coachPlan?.data?.profile?.restSeconds)$('restDuration').value=window.coachPlan.data.profile.restSeconds;});
 const avatar=window.GalaAvatar;let storageAvailable=true;
 const store=(key,value)=>{try{localStorage.setItem(key,value);return true;}catch{storageAvailable=false;return false;}};
 function updateProgress(){const level=String(flow.level).padStart(2,'0');$('levelBadge').textContent='WORKOUT LV. '+level;$('restLevel').textContent='LV. '+level;$('setNumber').textContent='SET '+String(flow.progress.completedSets+1).padStart(2,'0');}
 function paintGuest(){
  if(!avatar)return;
  try{look=loadGala(localStorage,avatar);}catch{look={look:structuredClone(avatar.defaultLook),linked:false};}
  for(const id of ['miniAvatar','identityAvatar'])avatar.draw($(id),look.look,{base:id!=='restAvatar'});
  const name=window.MBS_DJ?.display()||(look.linked?(look.look.name||'Gala guest'):'Guest preview');arena.load();$('guestLabel').textContent=look.linked?name:'Your avatar';$('restGuest').textContent=name;$('identityName').textContent=name;
  $('restAvatar').setAttribute('aria-label',name+' on the floating platform');$('identityStatus').textContent=look.linked?'Appearance saved':'Guest appearance';
 }
 function moveCoach(){
  card??=document.querySelector('.myr5-companion-card');if(!card)return;
  if(observedCard!==card){observer.observe(card,{childList:true,subtree:true,attributes:true,attributeFilter:['data-ready']});observedCard=card;}
  const mount=flow.phase==='rest'?$('restCoachMount'):$('coachMount');if(card.parentElement!==mount)mount.append(card);
  if(window.myr5Creature?.stats().stage!==(flow.phase==='rest'?'encounter':'pod'))window.myr5Creature?.stage(flow.phase==='rest'?'encounter':'pod');
  const label=card.querySelector('.myr5-companion-status')?.textContent||'';
  // Errors from the finished companion still need a visible place in the new shell.
  for(const id of ['coachLoading','restCoachLoading']){const loading=$(id);loading.hidden=card.dataset.ready==='true';if(!loading.hidden&&loading.textContent!==label)loading.textContent=label;}
 }
 const observer=new MutationObserver(moveCoach);observer.observe($('view'),{childList:true,subtree:true});moveCoach();
 function configure(mode){
  if(mode!==currentMode){currentMode=mode;const kind=movements[mode].kind,unit=kind==='hold'||kind==='pace'?'seconds':kind==='steps'?'steps':kind==='jumps'?'jumps':'reps';
   const planned=window.coachPlan?.targets?.goals[mode]||DEFAULT_GOALS[mode];
   const values=[...new Set([1,2,3,5,9,10,15,20,30,45,60,90,120,180,planned,Math.max(1,planned-1),planned+1])].sort((a,b)=>a-b);
   $('goal').replaceChildren(...values.map(n=>{const o=document.createElement('option');o.value=n;o.textContent=n+' '+unit;return o;}));$('goal').value=planned;
  }
  encourage.reset();$('goalValue').textContent=['hold','pace'].includes(movements[mode].kind)?time(Number($('goal').value)):String($('goal').value);updateProgress();
 }
 async function beginSet(mode){configure(mode);if(!window.coachAccount)throw Error('Your account is still connecting. Try again in a moment.');const ticket=await window.coachAccount.start(mode,Number($('goal').value));flow.start(mode,Number($('goal').value),Number($('restDuration').value));flow.active.cloudId=ticket.id;document.body.dataset.screen='pod';clearInterval(restTimer);}
 function render(m){const goal=flow.active?.mode===m.mode?flow.active.goal:Number($('goal').value)||DEFAULT_GOALS[m.mode];$('activity').style.width=Math.min(100,valueOf(m)/goal*100)+'%';}
 function power(){const p=$('coachPower').value;document.body.dataset.power=p;$('powerName').textContent=POWERS[p].name.toUpperCase()+' ACTIVE';store('myr5-pod-power-v1',p);}
 function syncCombat(){flow.weapon=arena.weapon;const p=flow.combat;$('shieldNote').textContent=p?`${p.loginStreak} login days × weapon level ${arena.weapon.tier+1}${p.breathingCompleted?' ×100 breathing':''} · ${flow.attackDamage} damage`:`BASE POWER · ${flow.attackDamage} damage`;}
 function specialControls(){syncCombat();const weapon=arena.weapon,ability=abilityFor(weapon),remaining=flow.abilities.remaining(),button=$('weaponSpecial');button.disabled=flow.phase!=='rest'||!ability||remaining>0;button.textContent=!ability?'Special · tier 4':remaining?`${ability.name} · ${Math.ceil(remaining/1000)}s`:ability.name;$('weaponCooldown').value=remaining?Math.max(0,1-remaining/Math.max(1,flow.abilities.durationMs)):1;}
 $('coachPower').value=loadPower({getItem:safeRead});power();
 function paintHealth(){const hp=flow.coachHealth;$('coachHealth').textContent=hp.toLocaleString()+' HP';$('bossHealth').style.width=(hp/COACH_HEALTH*100)+'%';$('bossHealth').parentElement.setAttribute('aria-valuenow',String(hp));}
 function tick(){if(flow.phase!=='rest')return;const now=Date.now();if(flow.shouldEndRest(now)){leave();return;}specialControls();const remaining=flow.remaining(now);setFlipValue($('restTime'),clockDigits(remaining),'recovery remaining');$('nextSet').disabled=remaining>0;$('nextSet').textContent=remaining?'Recovering…':'Next set →';if(!remaining&&!restCalled&&!document.hidden){restCalled=true;voice.say('Rest complete. Keep tapping to stay.',{interrupt:true});}}
 function enterRest(result=null){
  for(const id of ['settings','identity'])if($(id).open)$(id).close();
  document.body.dataset.screen='rest';$('homeScreen').hidden=true;$('restScreen').hidden=false;
  $('restEyebrow').textContent=result?'SET COMPLETE':'REST PRACTICE';$('restHeading').textContent='Rest';
  $('setReceipt').textContent=result?`${result.name} · ${Math.round(result.value)} ${movements[result.mode].kind==='hold'||movements[result.mode].kind==='pace'?'seconds':movements[result.mode].kind==='steps'?'steps':movements[result.mode].kind==='jumps'?'jumps':'reps'}`:'Practice';
  $('earnedXp').textContent=result?.earned?`+${result.xp} XP`:'NO XP';$('damageTotal').textContent='0 DAMAGE';paintHealth();
  syncCombat();
  $('restFeedback').textContent='Every third tap: team strike';hand.enter();arena.start();restCalled=false;lastSpoken=-Infinity;paintGuest();updateProgress();moveCoach();
  clearInterval(restTimer);restTimer=setInterval(tick,250);tick();$('restHeading').focus();
  history.replaceState(null,'','#rest');window.myr5Creature?.play(result?'celebrate':'rest');
  voice.say(result?'Set complete. Take a breath.':'Tap to strike.',{interrupt:true});
 }
 function consume(m,now){const result=flow.consume(m,now);if(!result)return false;const id=flow.active?.cloudId;store(PROGRESS,JSON.stringify(flow.progress));if(result.earned&&id)window.coachAccount.complete({id,value:result.value,active:m.active||0}).catch(()=>{$('setReceipt').textContent+=' · Waiting to sync.';});onStop();enterRest(result);if(!storageAvailable)$('setReceipt').textContent+=' · Progress could not be saved on this device.';return true;}
 function leave(){hand.leave();arena.stop();clearInterval(restTimer);clearTimeout(hitTimer);voice.cancel();flow.leave();document.body.dataset.screen='pod';$('restScreen').hidden=true;$('homeScreen').hidden=false;moveCoach();history.replaceState(null,'','#pod');$('start').focus();}
 document.querySelector('.encounter').addEventListener('pointerdown',()=>flow.touchRest(Date.now()),{passive:true});
 $('attackCoach').addEventListener('click',()=>{
  syncCombat();const now=Date.now(),hit=flow.tap(now,true);if(!hit)return;
  hand.hit(hit);arena.attack(hit);window.myr5Creature?.play(hit.assisted?'encourage':hit.blocked?'agree':'rest');
  $('damageTotal').textContent=hit.totalDamage+' DAMAGE';paintHealth();$('damageFloat').textContent=hit.blocked?(hit.assisted?'TEAM STRIKE · BLOCKED':'BLOCKED · 0'):(hit.assisted?'TEAM −':'−')+hit.damage;
  const scene=document.querySelector('.encounter');scene.classList.remove('hit');void scene.offsetWidth;scene.classList.add('hit');clearTimeout(hitTimer);hitTimer=setTimeout(()=>scene.classList.remove('hit'),650);
  $('restFeedback').textContent=hit.blocked?`${POWERS[$('coachPower').value].line} ${hit.hits} ${hit.hits===1?'hit':'hits'}, zero damage.`:`${hit.assisted?'Helping Hand lands a team strike! ':''}${hit.hits} hits. ${hit.totalDamage} damage.`;
  if(now-lastSpoken>10000){lastSpoken=now;window.myr5Creature?.play(hit.blocked?'agree':'encourage');voice.say(hit.blocked?'Nice teamwork. My shield is still intact. Keep training.':'You and that hand make quite a team. That one connected.',{key:'rest'});}
 });
 $('leaveRest').addEventListener('click',leave);$('moreRest').addEventListener('click',()=>{flow.extend(30,Date.now());restCalled=false;tick();voice.say('Thirty more seconds. Take your time.',{interrupt:true});});
 $('weaponSpecial').addEventListener('click',async()=>{
  const activate=()=>{syncCombat();flow.abilities.merge(safeRead(COOLDOWN));const result=flow.special(arena.weapon,{now:Date.now(),progress:arena.progress,catalog:window.GalaWeapons});if(result.ok)store(COOLDOWN,JSON.stringify(flow.abilities.snapshot()));return result;};
  const hit=navigator.locks?.request?await navigator.locks.request('myr5-weapon-special',activate):activate();if(!hit.ok){specialControls();return;}
  arena.attack(hit);window.myr5Creature?.play(hit.blocked?'agree':'rest');
  $('damageTotal').textContent=hit.totalDamage+' DAMAGE';paintHealth();
  $('damageFloat').textContent=hit.blocked?'BLOCKED':'−'+hit.damage;$('restFeedback').textContent=hit.ability.name+(hit.blocked?' · Shielded':'');
  const scene=document.querySelector('.encounter');scene.classList.remove('hit');void scene.offsetWidth;scene.classList.add('hit');clearTimeout(hitTimer);hitTimer=setTimeout(()=>scene.classList.remove('hit'),650);specialControls();
 });
 $('nextSet').addEventListener('click',()=>{if(flow.remaining(Date.now())>0)return;leave();onNext();});
 $('visitRest').addEventListener('click',()=>{onStop();flow.previewRest(Date.now(),Number($('restDuration').value));enterRest();});
 $('openSettings').addEventListener('click',()=>{$('settings').showModal();voice.say('Pod controls.',{interrupt:true});});$('closeSettings').addEventListener('click',()=>$('settings').close());
 $('coachPower').addEventListener('change',()=>{power();voice.say(POWERS[$('coachPower').value].name+' selected.',{interrupt:true});});
 $('restDuration').addEventListener('change',()=>voice.say($('restDuration').value+' seconds between sets.',{interrupt:true}));
 $('openIdentity').addEventListener('click',()=>{paintGuest();$('identity').showModal();voice.say('Your Gala character.',{interrupt:true});});$('closeIdentity').addEventListener('click',()=>$('identity').close());
 $('importGala').addEventListener('change',async event=>{const f=event.target.files?.[0];if(!f)return;try{if(f.size>30000)throw Error('Choose your exported Gala look file.');const imported=importGala(await f.text(),avatar);if(!store(GALA_KEY,JSON.stringify(imported)))throw Error('Could not save this appearance on your device.');paintGuest();$('identityStatus').textContent='Appearance saved';voice.say('Appearance saved',{interrupt:true});}catch(error){$('identityStatus').textContent=error instanceof SyntaxError?'That file is not a Gala look.':error.message;}finally{event.target.value='';}});
 window.addEventListener('storage',e=>{if(e.key===GALA_KEY)paintGuest();});window.addEventListener('mominc-avatar-change',paintGuest);
 window.addEventListener('storage',e=>{if(e.key===COOLDOWN){flow.abilities.merge(e.newValue);if(flow.phase==='rest')specialControls();}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)voice.cancel();else tick();});
 window.addEventListener('pagehide',()=>{hand.dispose();arena.dispose();clearInterval(restTimer);clearTimeout(hitTimer);observer.disconnect();});
 document.querySelector('.mom-brand').addEventListener('click',event=>{event.preventDefault();if(flow.phase==='rest')leave();});
 paintGuest();updateProgress();document.body.dataset.screen='pod';
 const requestedPanel=new URLSearchParams(location.search).get('panel');if(['avatar','hand'].includes(requestedPanel)){$('identity').showModal();if(requestedPanel==='hand')hand.edit();}
 window.addEventListener('myr5:account-progress',({detail:p})=>{flow.combat=p.combat;flow.progress.completedSets=p.completedSets;store(PROGRESS,JSON.stringify(flow.progress));for(const option of $('coachPower').options){if(option.value!=='shield'){option.disabled=!p.unlocks[option.value];option.textContent=POWERS[option.value].name+(option.disabled?' · Locked':'');}}if($('coachPower').selectedOptions[0]?.disabled)$('coachPower').value='shield';power();updateProgress();});
 return {flow,configure,beginSet,consume,render,encouragement:(m,now,events)=>flow.phase==='set'?encourage.update(m,flow.active.goal,now,events):null,stopped:()=>{if(flow.phase==='set')flow.leave();},goal:()=>Number($('goal').value)};
}

import {initRestArena} from './rest-arena.mjs';
import {initHandCompanion} from '../hand-companion.mjs';
import {SetFlow,DEFAULT_GOALS,DAMAGE_LEVEL,valueOf} from './set-flow.mjs';
import {SetEncouragement} from './encouragement.mjs';
import {setFlipValue,clockDigits} from '../flip-display.mjs';
import {GALA_KEY,loadGala,importGala,loadPower,POWERS} from './identity.mjs';
const $=id=>document.getElementById(id),PROGRESS='myr5-workout-progress-v1';
const time=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
const safeRead=key=>{try{return localStorage.getItem(key);}catch{return null;}};
export function initPod({voice,movements,onStop,onNext}){
 const hand=initHandCompanion(),arena=initRestArena();
 const flow=new SetFlow(null),encourage=new SetEncouragement();let currentMode=null,card=null,observedCard=null,restTimer=0,hitTimer=0,lastSpoken=-Infinity,restCalled=false,look;
 window.addEventListener('myr5:coach-plan',()=>{if(flow.phase==='set')return;const mode=currentMode||'squat';currentMode=null;configure(mode);if(window.coachPlan?.data?.profile?.restSeconds)$('restDuration').value=window.coachPlan.data.profile.restSeconds;});
 const avatar=window.GalaAvatar;let storageAvailable=true;
 const store=(key,value)=>{try{localStorage.setItem(key,value);return true;}catch{storageAvailable=false;return false;}};
 function updateProgress(){const level=String(flow.level).padStart(2,'0');$('levelBadge').textContent='WORKOUT LV. '+level;$('restLevel').textContent='LV. '+level;$('setNumber').textContent='SET '+String(flow.progress.completedSets+1).padStart(2,'0');}
 function paintGuest(){
  if(!avatar)return;
  try{look=loadGala(localStorage,avatar);}catch{look={look:structuredClone(avatar.defaultLook),linked:false};}
  for(const id of ['miniAvatar','identityAvatar'])avatar.draw($(id),look.look,{base:id!=='restAvatar'});
  const name=window.MBS_DJ?.display()||(look.linked?(look.look.name||'Gala guest'):'Guest preview');arena.load();$('guestLabel').textContent=look.linked?name:'Bring your Gala character';$('restGuest').textContent=name;$('identityName').textContent=name;
  $('restAvatar').setAttribute('aria-label',name+' on the floating platform');$('identityStatus').textContent=look.linked?'Your Gala appearance is aboard.':'Showing a guest preview until you import your look.';
 }
 function moveCoach(){
  card??=document.querySelector('.myr5-companion-card');if(!card)return;
  if(observedCard!==card){observer.observe(card,{childList:true,subtree:true});observedCard=card;}
  const mount=flow.phase==='rest'?$('restCoachMount'):$('coachMount');if(card.parentElement!==mount)mount.append(card);
  const label=card.querySelector('.myr5-companion-status')?.textContent||'';
  // Errors from the finished companion still need a visible place in the new shell.
  const failed=/unavailable|failed|error|import|not |could/i.test(label);
  for(const id of ['coachLoading','restCoachLoading']){const loading=$(id);loading.hidden=!failed&&!!card.querySelector('canvas');if(failed&&loading.textContent!==label)loading.textContent=label;}
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
 $('coachPower').value=loadPower({getItem:safeRead});power();
 function tick(){if(flow.phase!=='rest')return;const remaining=flow.remaining(Date.now());setFlipValue($('restTime'),clockDigits(remaining),'recovery remaining');$('nextSet').disabled=remaining>0;$('nextSet').textContent=remaining?'Recovering…':'Next set →';if(!remaining&&!restCalled&&!document.hidden){restCalled=true;voice.say('Rest timer complete. Continue when you are ready.',{interrupt:true});}}
 function enterRest(result=null){
  for(const id of ['settings','identity'])if($(id).open)$(id).close();
  document.body.dataset.screen='rest';$('homeScreen').hidden=true;$('restScreen').hidden=false;
  $('restEyebrow').textContent=result?'SET COMPLETE':'REST PRACTICE';$('restHeading').textContent='Catch your breath.';
  $('setReceipt').textContent=result?`${result.name} · ${Math.round(result.value)} ${movements[result.mode].kind==='hold'||movements[result.mode].kind==='pace'?'seconds':movements[result.mode].kind==='steps'?'steps':movements[result.mode].kind==='jumps'?'jumps':'reps'}`:'Practice attacks. Workout progress stays the same.';
  $('earnedXp').textContent=result?.earned?`+${result.xp} XP`:'NO XP';$('damageTotal').textContent='0 DAMAGE';$('bossHealth').style.width='100%';
  $('shieldNote').textContent=flow.level<DAMAGE_LEVEL?`Shield intact. Damage unlocks at workout level ${DAMAGE_LEVEL}.`:`Workout level ${flow.level}. Your attacks can now deal damage.`;
  $('restFeedback').textContent='You and Helping Hand versus the coach. Every third tap is a team strike.';hand.enter();arena.start();restCalled=false;lastSpoken=-Infinity;paintGuest();updateProgress();moveCoach();
  clearInterval(restTimer);restTimer=setInterval(tick,250);tick();$('restHeading').focus();
  history.replaceState(null,'','#rest');window.myr5Creature?.play(result?'celebrate':'rest');
  voice.say(result?'Set complete. Take a breath. Your hand is on your team. Try the shield together while you rest.':'Rest chamber. Tap your coach to strike with your hand. Your workout progress stays the same.',{interrupt:true});
 }
 function consume(m,now){const result=flow.consume(m,now);if(!result)return false;const id=flow.active?.cloudId;store(PROGRESS,JSON.stringify(flow.progress));if(result.earned&&id)window.coachAccount.complete({id,value:result.value,active:m.active||0}).catch(()=>{$('setReceipt').textContent+=' · Waiting to sync.';});onStop();enterRest(result);if(!storageAvailable)$('setReceipt').textContent+=' · Progress could not be saved on this device.';return true;}
 function leave(){hand.leave();arena.stop();clearInterval(restTimer);clearTimeout(hitTimer);voice.cancel();flow.leave();document.body.dataset.screen='pod';$('restScreen').hidden=true;$('homeScreen').hidden=false;moveCoach();history.replaceState(null,'','#pod');$('start').focus();}
 $('attackCoach').addEventListener('click',()=>{
  const now=Date.now(),hit=flow.tap(now,true);if(!hit)return;
  hand.hit(hit);arena.attack(hit);window.myr5Creature?.play(hit.assisted?'encourage':hit.blocked?'agree':'rest');
  $('damageTotal').textContent=hit.totalDamage+' DAMAGE';$('bossHealth').style.width=Math.max(0,100-hit.totalDamage/100)+'%';$('damageFloat').textContent=hit.blocked?(hit.assisted?'TEAM STRIKE · BLOCKED':'BLOCKED · 0'):(hit.assisted?'TEAM −':'−')+hit.damage;
  const scene=document.querySelector('.encounter');scene.classList.remove('hit');void scene.offsetWidth;scene.classList.add('hit');clearTimeout(hitTimer);hitTimer=setTimeout(()=>scene.classList.remove('hit'),650);
  $('restFeedback').textContent=hit.blocked?`${POWERS[$('coachPower').value].line} ${hit.hits} ${hit.hits===1?'hit':'hits'}, zero damage.`:`${hit.assisted?'Helping Hand lands a team strike! ':''}${hit.hits} hits. ${hit.totalDamage} damage.`;
  if(now-lastSpoken>10000){lastSpoken=now;window.myr5Creature?.play(hit.blocked?'agree':'encourage');voice.say(hit.blocked?'Nice teamwork. My shield is still intact. Keep training.':'You and that hand make quite a team. That one connected.',{key:'rest'});}
 });
 $('leaveRest').addEventListener('click',leave);$('moreRest').addEventListener('click',()=>{flow.extend(30,Date.now());restCalled=false;tick();voice.say('Thirty more seconds. Take your time.',{interrupt:true});});
 $('nextSet').addEventListener('click',()=>{if(flow.remaining(Date.now())>0)return;leave();onNext();});
 $('visitRest').addEventListener('click',()=>{onStop();flow.previewRest(Date.now(),Number($('restDuration').value));enterRest();});
 $('openSettings').addEventListener('click',()=>{$('settings').showModal();voice.say('Pod controls.',{interrupt:true});});$('closeSettings').addEventListener('click',()=>$('settings').close());
 $('coachPower').addEventListener('change',()=>{power();voice.say(POWERS[$('coachPower').value].name+' selected.',{interrupt:true});});
 $('restDuration').addEventListener('change',()=>voice.say($('restDuration').value+' seconds between sets.',{interrupt:true}));
 $('openIdentity').addEventListener('click',()=>{paintGuest();$('identity').showModal();voice.say('Your Gala character.',{interrupt:true});});$('closeIdentity').addEventListener('click',()=>$('identity').close());
 $('importGala').addEventListener('change',async event=>{const f=event.target.files?.[0];if(!f)return;try{if(f.size>30000)throw Error('Choose your exported Gala look file.');const imported=importGala(await f.text(),avatar);if(!store(GALA_KEY,JSON.stringify(imported)))throw Error('Could not save this appearance on your device.');paintGuest();$('identityStatus').textContent='Your Gala character is aboard.';voice.say('Your Gala character is aboard.',{interrupt:true});}catch(error){$('identityStatus').textContent=error instanceof SyntaxError?'That file is not a Gala look.':error.message;}finally{event.target.value='';}});
 window.addEventListener('storage',e=>{if(e.key===GALA_KEY)paintGuest();});window.addEventListener('mominc-avatar-change',paintGuest);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)voice.cancel();else tick();});
 window.addEventListener('pagehide',()=>{hand.dispose();arena.dispose();clearInterval(restTimer);clearTimeout(hitTimer);observer.disconnect();});
 document.querySelector('.mom-brand').addEventListener('click',event=>{event.preventDefault();if(flow.phase==='rest')leave();});
 paintGuest();updateProgress();document.body.dataset.screen='pod';
 const requestedPanel=new URLSearchParams(location.search).get('panel');if(['avatar','hand'].includes(requestedPanel)){$('identity').showModal();if(requestedPanel==='hand')hand.edit();}
 window.addEventListener('myr5:account-progress',({detail:p})=>{flow.progress.completedSets=p.completedSets;store(PROGRESS,JSON.stringify(flow.progress));for(const option of $('coachPower').options){if(option.value!=='shield'){option.disabled=!p.unlocks[option.value];option.textContent=POWERS[option.value].name+(option.disabled?' · Locked':'');}}if($('coachPower').selectedOptions[0]?.disabled)$('coachPower').value='shield';power();updateProgress();});
 return {flow,configure,beginSet,consume,render,encouragement:(m,now,events)=>flow.phase==='set'?encourage.update(m,flow.active.goal,now,events):null,stopped:()=>{if(flow.phase==='set')flow.leave();},goal:()=>Number($('goal').value)};
}

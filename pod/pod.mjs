import {initRestArena} from './rest-arena.mjs';
import {abilityFor} from './weapon-evolution.mjs';
import {SetFlow,DEFAULT_GOALS,valueOf,bossHealthMax} from './set-flow.mjs';
import {SetEncouragement} from './encouragement.mjs';
import {setFlipValue,clockDigits} from '../flip-display.mjs';
import {GALA_KEY,loadGala,importGala,loadPower,POWERS} from './identity.mjs';
import {mountWorkoutRoute} from '../workout-route-ui.mjs';
import {mountCircuitUI} from '../circuit-ui.mjs';
import {ROUTE_LINES,exerciseFamily} from '../workout-route.mjs';
import {VOICE_MANIFEST} from '../robot-audio.mjs';
import {WorkoutSessionOwner} from './workout-session-owner.mjs';
import {combatLevel} from '../battle-pass.mjs';
import {throughWormhole,LINES} from './set-transition.mjs';
import {SPECIAL_LEVEL} from '../combat-config.mjs';
import {recordPerformanceSession,readPerformanceProgress,workoutEligibility,performanceOwner} from '../performance-progress.mjs';
import {HOLD_TARGET_SECONDS,REP_CAP} from '../progression-rules.mjs';
import {mountShipBackdropMotion} from './ship-backdrop.mjs';
let voiceManifest=null;
// Fetch the clips this set will say while the camera opens; sw.js stores /voice/* in the voice cache, so RobotAudio's later fetch is a hit.
function warmVoice(goal){try{voiceManifest??=fetch(VOICE_MANIFEST).then(r=>r.json()).catch(()=>{voiceManifest=null;return null;});voiceManifest.then(m=>{if(!m)return;const say=['Get into position.',...Array.from({length:Math.min(60,Number(goal)||0)},(_,i)=>String(i+1))];for(const p of say){const u=m.phrases[p];if(u)fetch(u,{priority:'low'}).catch(()=>{});}});}catch{}}
const $=id=>document.getElementById(id),PROGRESS='myr5-workout-progress-v1',COOLDOWN='myr5-special-cooldown-v1';
const time=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
const safeRead=key=>{try{return localStorage.getItem(key);}catch{return null;}};
export const idleStatus=text=>{const value=String(text||'').trim();return !value||value==='Ready';};
export function initPod({voice,movements,onStop,onNext,workouts}){
 mountShipBackdropMotion();
 let hand={enter(){},leave(){},hit(){},dispose(){},edit(){}};let handOptionalLoaded=false;const arena=initRestArena();
 window.addEventListener('myr5:optional-materials-ready',async()=>{if(handOptionalLoaded)return;handOptionalLoaded=true;const {initHandCompanion}=await import('../hand-companion.mjs');hand=initHandCompanion();},{once:true});
 // safeRead(PROGRESS) restores the last-synced circuit snapshot (and completedSets) so the
 // circuit meter can render immediately on reopen, before the next account-progress event lands.
 const flow=new SetFlow(safeRead(PROGRESS),{cooldown:safeRead(COOLDOWN)}),encourage=new SetEncouragement();
 const workoutOwner=new WorkoutSessionOwner({saveProgress:async data=>{
  try{return await workouts.complete(data.id,{value:data.value,activeSeconds:data.activeSeconds,elapsedSeconds:data.elapsedSeconds,earned:data.earned,progress:data.progress});}
  catch(error){return {local:false,reason:error?.message||'Workout progress was not saved on this device.'};}
 }});
 let currentMode=null,card=null,observedCard=null,restTimer=0,hitTimer=0,lastSpoken=-Infinity,restCalled=false,look;
 let awaitingRound=null,pendingChallenge=null,pausedLocal=null,cardioStyle='gentle';
 const route=mountWorkoutRoute({mode:()=>currentMode||'squat',busy:()=>flow.phase!=='pod'||document.body.dataset.tracking==='true',pending:()=>!!awaitingRound,onNext});
 const circuit=mountCircuitUI({voice,onNext,busy:()=>flow.phase!=='pod'||document.body.dataset.tracking==='true',pending:()=>!!awaitingRound,cached:()=>flow.progress.circuit});
 window.addEventListener('myr5:coach-plan',()=>{if(flow.phase==='set')return;const mode=currentMode||'squat';currentMode=null;configure(mode);if(window.coachPlan?.data?.profile?.restSeconds)$('restDuration').value=window.coachPlan.data.profile.restSeconds;});
 const avatar=window.GalaAvatar;let storageAvailable=true;
 const store=(key,value)=>{try{localStorage.setItem(key,value);return true;}catch{storageAvailable=false;return false;}};
 function updateProgress(){flow.performanceXp=readPerformanceProgress().totalXp;const level=String(flow.level).padStart(2,'0');$('levelBadge').textContent='WORKOUT LV. '+level;$('restLevel').textContent='LV. '+level;$('setNumber').textContent='SET '+String(flow.progress.completedSets+1).padStart(2,'0');}
 function paintGuest(){
  if(!avatar)return;
  try{look=loadGala(localStorage,avatar);}catch{look={look:structuredClone(avatar.defaultLook),linked:false};}
  for(const id of ['miniAvatar','identityAvatar'])avatar.draw($(id),look.look,{base:id!=='restAvatar'});
  const name=window.MBS_DJ?.display()||(look.linked?(look.look.name||'Gala guest'):'Guest preview');arena.load();$('guestLabel').textContent=window.MBS_DJ?.display()||(look.linked?name:'Anonymous guest');$('restGuest').textContent=name;$('identityName').textContent=name;
  $('restAvatar').setAttribute('aria-label',name+' on the floating platform');$('identityStatus').textContent=look.linked?'Appearance saved':'Guest appearance';
 }
 function moveCoach(){
  card??=document.querySelector('.myr5-companion-card');if(!card)return;
  if(observedCard!==card){observer.observe(card,{childList:true,subtree:true,attributes:true,attributeFilter:['data-ready']});observedCard=card;}
  // Full-screen workout mode parks the card in #coachOverlay (created at runtime by camera-workout.mjs,
  // not a static pose.html id, hence document.getElementById here rather than the $() shorthand); leave it there while tracking.
  if((document.body.dataset.tracking==='true'&&document.getElementById('coachOverlay'))||document.body.dataset.shipView==='true'){}else{
   const mount=flow.phase==='rest'?$('restCoachMount'):$('coachMount');if(card.parentElement!==mount)mount.append(card);
   if(window.myr5Creature?.stats().stage!==(flow.phase==='rest'?'encounter':'pod'))window.myr5Creature?.stage(flow.phase==='rest'?'encounter':'pod');
  }
  const label=card.querySelector('.myr5-companion-status')?.textContent||'';
  // Errors from the finished companion still need a visible place in the new shell.
  for(const id of ['coachLoading','restCoachLoading']){const loading=$(id);loading.hidden=card.dataset.ready==='true';if(!loading.hidden&&loading.textContent!==label)loading.textContent=label;}
 }
 const observer=new MutationObserver(moveCoach);observer.observe($('view'),{childList:true,subtree:true});moveCoach();
 function configure(mode){
  if(mode!==currentMode){currentMode=mode;const kind=movements[mode].kind,unit=kind==='hold'||kind==='pace'?'seconds':kind==='steps'?'steps':kind==='jumps'?'jumps':'reps';
   const next=window.coachProgress?.exerciseRoute?.groups?.[exerciseFamily(mode)]?.next;
   const planned=kind==='hold'?HOLD_TARGET_SECONDS:kind==='reps'?REP_CAP:HOLD_TARGET_SECONDS;
   const values=[...new Set([1,2,3,5,9,10,15,20,30,45,60,90,120,180,planned,Math.max(1,planned-1),planned+1])].sort((a,b)=>a-b);
   $('goal').replaceChildren(...values.map(n=>{const o=document.createElement('option');o.value=n;o.textContent=n+' '+unit;return o;}));$('goal').value=planned;
  }
  encourage.reset();$('goalValue').textContent=['hold','pace'].includes(movements[mode].kind)?time(Number($('goal').value)):String($('goal').value);updateProgress();route.render();circuit.render();if(document.body.dataset.tracking!=='true')$('start').disabled=!workoutEligibility(mode).allowed;
 }
 async function beginSet(mode,{manual=false}={}){const startingOwner=performanceOwner();if(workoutOwner.snapshot().transitioning)throw Error('Coach is updating. Please wait.');configure(mode);pausedLocal=await workouts.paused();if(performanceOwner()!==startingOwner)throw Error('Your account changed while the workout was opening. Start again.');const pausedOwner=pausedLocal?.progress?.performanceOwner??pausedLocal?.ownerId;if(pausedLocal&&pausedOwner&&pausedOwner!==startingOwner)throw Error('Resume this workout with the account or guest profile that started it.');if(workoutOwner.snapshot().transitioning)throw Error('Coach is updating. Please wait.');if(pausedLocal&&(!manual||pausedLocal.mode!==mode))throw Error('Resume or complete the paused manual workout first.');if(!pausedLocal&&!workoutOwner.canStart())throw Error('Workout activation is in progress. Try again.');const eligibility=workoutEligibility(mode);if(!eligibility.allowed)throw Error(eligibility.reason);const ownerStarted=!pausedLocal;if(ownerStarted&&!workoutOwner.start())throw Error('Workout activation is in progress. Try again.');let ticket=null;try{const goal=Number($('goal').value),restSeconds=30;ticket=await workouts.start({mode,goal,restSeconds,progress:{...(pausedLocal?.progress??{}),performanceOwner:startingOwner},metadata:{name:movements[mode].name},control:manual?'manual':'camera'});if(performanceOwner()!==startingOwner)throw Error('Your account changed while the workout was opening. Start again.');flow.start(mode,goal,restSeconds,{performance:true,kind:movements[mode].kind,snapshot:ticket.progress?.performanceWorkout,cardio:cardioStyle});flow.active.performanceOwner=startingOwner;flow.active.localId=ticket.id;flow.active.control=manual?'manual':'camera';flow.active.savedProgress=ticket.progress??{};pausedLocal=null;if(!manual)warmVoice($('goal').value);document.body.dataset.screen='pod';clearInterval(restTimer);return ticket;}catch(error){if(ticket){await workouts.interrupt(ticket.id,ticket.progress??{}).catch(()=>{});if(flow.phase==='set'&&flow.active?.localId===ticket.id)flow.leave();pausedLocal=null;}if(ownerStarted||ticket)workoutOwner.stop();throw error;}}
 function setGoal(goal){if(![...$('goal').options].some(o=>Number(o.value)===goal)){const option=document.createElement('option');option.value=goal;option.textContent=goal+' '+(['hold','pace'].includes(movements[currentMode].kind)?'seconds':movements[currentMode].kind==='steps'?'steps':'reps');$('goal').append(option);}$('goal').value=goal;$('goal').dispatchEvent(new Event('change',{bubbles:true}));}
 function render(m){const goal=flow.active?.mode===m.mode?flow.active.goal:Number($('goal').value)||DEFAULT_GOALS[m.mode];$('activity').style.width=Math.min(100,valueOf(m)/goal*100)+'%';}
 function power(){const p=$('coachPower').value;document.body.dataset.power=p;$('powerName').textContent=POWERS[p].name.toUpperCase()+' ACTIVE';store('myr5-pod-power-v1',p);}
 function syncCombat(){flow.weapon=arena.weapon;const p=flow.combat;$('shieldNote').textContent=p?`${p.loginStreak} login days × weapon level ${arena.weapon.tier+1}${p.breathingCompleted?' ×100 breathing':''} · ${flow.attackDamage} damage`:`BASE POWER · ${flow.attackDamage} damage`;}
 function specialControls(){syncCombat();const weapon=arena.weapon,ability=abilityFor(weapon),remaining=flow.abilities.remaining(),button=$('weaponSpecial');const locked=flow.kitLevel<SPECIAL_LEVEL;button.disabled=flow.phase!=='rest'||locked||!ability||remaining>0;button.textContent=locked?`Special · level ${SPECIAL_LEVEL}`:!ability?'Special · tier 4':remaining?`${ability.name} · ${Math.ceil(remaining/1000)}s`:ability.name;$('weaponCooldown').value=remaining?Math.max(0,1-remaining/Math.max(1,flow.abilities.durationMs)):1;}
 $('coachPower').value=loadPower({getItem:safeRead});power();
 function paintHealth(){const hp=Math.ceil(flow.coachHealth),max=bossHealthMax(flow.kitLevel);$('coachHealth').textContent=hp.toLocaleString()+' HP';$('bossHealth').style.width=(hp/max*100)+'%';$('bossHealth').parentElement.setAttribute('aria-valuenow',String(hp));}
 function speakChallenge(){if(pendingChallenge&&flow.phase==='rest'&&!document.hidden&&!document.body.dataset.cinematic){const text=pendingChallenge;pendingChallenge=null;voice.say(text,{key:'challenge',interrupt:true});}}
 window.addEventListener('myr5:cinematic-end',speakChallenge);
 function tick(){if(flow.phase!=='rest')return;speakChallenge();const now=Date.now();if(flow.shouldEndRest(now)){leave();return;}specialControls();const remaining=flow.remaining(now),next=route.suggestion();setFlipValue($('restTime'),clockDigits(remaining),'recovery remaining');$('nextSet').disabled=remaining>0||!next;$('nextSet').textContent=remaining?'Recovering…':awaitingRound?'Waiting to sync…':next?'Preview next round →':'Finished for today';if(!remaining&&!restCalled&&!document.hidden){restCalled=true;voice.say('Rest complete. Keep tapping to stay.',{interrupt:true});}}
 function enterRest(result=null){preparationPanel.hidden=true;
  flow.kitLevel=combatLevel(result?.mode||currentMode||'squat'); // real battle-pass level for this boss's track (D8/D22)
  for(const id of ['settings','identity'])if($(id).open)$(id).close();
  document.body.dataset.screen='rest';$('homeScreen').hidden=true;$('restScreen').hidden=false;
  $('restEyebrow').textContent=result?'SET COMPLETE':'REST PRACTICE';$('restHeading').textContent='Rest';
  if(result)route.showResult();else route.hideResult();
  $('setReceipt').textContent=result?`${result.name} · ${Math.round(result.value)} ${['hold','sprint','gentle'].includes(result.kind)||movements[result.mode].kind==='pace'?'seconds':movements[result.mode].kind==='steps'?'steps':movements[result.mode].kind==='jumps'?'jumps':'reps'}`:'Practice';
  $('earnedXp').textContent=result?.earned?`+${result.xp} XP`:'NO XP';$('damageTotal').textContent=Math.round(flow.damage)+' DAMAGE';paintHealth();
  syncCombat();
  $('restFeedback').textContent='Every third tap: team strike';hand.enter();arena.start();restCalled=false;lastSpoken=-Infinity;paintGuest();updateProgress();moveCoach();
  clearInterval(restTimer);restTimer=setInterval(tick,250);tick();
  history.replaceState(null,'','#rest');window.myr5Creature?.play(result?'celebrate':'rest');
 }
 // #150: into rest through the wormhole. The rest timer started with the set, so the time until rest shows (the save, the trip in) is added back;
 // the heading's focus and the voice line wait until the tunnel has opened.
 async function toRest(result=null,{silent=false,started=Date.now()}={}){
  await throughWormhole(result?LINES.rest:LINES.practice,()=>{if(flow.phase!=='rest')return;flow.restUntil+=Date.now()-started;enterRest(result);});
  if(flow.phase!=='rest')return;
  $('restHeading').focus();if(!silent)voice.say(result?'Set complete. Take a breath.':'Tap to strike.',{interrupt:true});
 }
 async function persistResult(result,m,now){
  const before={...flow.progress},id=flow.active?.localId,manual=flow.active?.control==='manual',owner=flow.active?.performanceOwner;
  let coachId;try{coachId=JSON.parse(safeRead('myr5-recipe-v1')||'null')?.body;}catch{}
  const performance={...result,id,performanceOwner:owner,...(coachId?{coachId}: {})};
  const saved=await workoutOwner.complete({id,value:result.value,activeSeconds:result.activeSeconds||m.active||0,elapsedSeconds:m.elapsed||0,earned:result.earned,progress:{...flow.progress,value:result.value,performanceOwner:owner,performance,performanceWorkout:flow.workout?.snapshot()}});
  if(!saved.saved){flow.progress=before;flow.phase='set';if(flow.workout)flow.workout.finished=false;throw Error(saved.reason);}
  const priorXp=readPerformanceProgress({owner}).totalXp,progress=recordPerformanceSession(performance,{owner});result.xp=Math.max(0,progress.totalXp-priorXp);flow.performanceXp=progress.totalXp;flow.progress.completedSets++;
  window.dispatchEvent(new Event('myr5:local-history-refresh'));onStop();await toRest(result,{silent:manual,started:now});return true;
 }
 async function consume(m,now){const result=flow.consume({...m,manual:flow.active?.control==='manual'},now);publishInstruction();if(!result)return false;return persistResult(result,m,now);}
 async function finishWorking(m,now=Date.now()){const result=flow.finishWorking({...m,manual:flow.active?.control==='manual'},now);return result?persistResult(result,m,now):false;}
 const preparationPanel=document.createElement('aside');preparationPanel.hidden=true;preparationPanel.setAttribute('aria-label','Preparation recovery');preparationPanel.style.cssText='position:fixed;left:50%;bottom:160px;transform:translateX(-50%);width:min(90vw,360px);padding:12px;border:1px solid #6ecfd3;border-radius:12px;background:#10252ff2;color:#fff;z-index:35;text-align:center';
 const preparationTime=document.createElement('p'),preparationStrike=document.createElement('button'),preparationDamage=document.createElement('p');preparationStrike.type='button';preparationStrike.textContent='Strike the warming-up boss';preparationDamage.setAttribute('role','status');preparationPanel.append(preparationTime,preparationStrike,preparationDamage);$('homeScreen').append(preparationPanel);
 preparationStrike.addEventListener('click',()=>{const hit=flow.preparationTap();if(!hit)return;preparationDamage.textContent=`${Math.round(hit.damage)} damage ? ${Math.round(hit.totalDamage)} total ? ${Math.ceil(flow.coachHealth)} boss HP`;window.myr5Creature?.play('encourage');window.dispatchEvent(new CustomEvent('myr5:preparation-hit',{detail:hit}));});
 function paintPreparation(){const w=flow.workout,visible=flow.phase==='set'&&w?.stage==='preparation-rest';preparationPanel.hidden=!visible;if(!visible)return;const host=document.body.dataset.cameraWorkout==='true'?document.getElementById('cameraWorkout'):$('homeScreen');if(host&&preparationPanel.parentElement!==host)host.append(preparationPanel);preparationPanel.inert=false;preparationTime.textContent=`Recover ${Math.max(0,Math.ceil((w.recoveryUntil-Date.now())/1000))}s ? Rest ${w.nextStage==='working'?2:1} of 3`;}
 let lastInstruction='';
 function publishInstruction(){paintPreparation();const instruction=flow.workout?.instruction??'';if(instruction===lastInstruction)return;lastInstruction=instruction;window.dispatchEvent(new CustomEvent('myr5:workout-stage',{detail:{stage:flow.workout?.stage,instruction,mode:flow.active?.mode}}));}
 function workoutMotion(m){const w=flow.workout;if(!w)return m;const cardio=['sprint','gentle'].includes(w.kind);return {...m,kind:cardio?'pace':m.kind,active:cardio?w.activeSeconds:m.active,count:w.kind==='reps'?w.value:m.count,totalHold:w.kind==='hold'?w.activeSeconds:m.totalHold,message:w.instruction,remaining:Math.max(0,(w.recoveryUntil-Date.now())/1000)};}
 async function saveManual(m){const id=flow.active?.localId;if(!id)return null;const value=valueOf(m),progress={...flow.progress,value,performanceOwner:flow.active?.performanceOwner,activeSeconds:m.active||0,elapsedSeconds:m.elapsed||0,performanceWorkout:flow.workout?.snapshot()};await workouts.update(id,progress);flow.active.savedProgress=progress;return progress;}
 async function pauseManual(m){const id=flow.active?.localId;if(!id)return null;const progress=await saveManual(m),workout=await workouts.pause(id,progress);pausedLocal=workout;flow.leave();return workout;}
 async function interruptCurrent(m){const id=flow.active?.localId;if(id)await workouts.interrupt(id,{...flow.progress,performanceOwner:flow.active?.performanceOwner,performanceWorkout:flow.workout?.snapshot(),value:m?valueOf(m):0,activeSeconds:m?.active||0,elapsedSeconds:m?.elapsed||0});if(flow.phase==='set')flow.leave();pausedLocal=null;workoutOwner.stop();route.render();circuit.render();}
 // #150: the trips out of rest stop its timer first, so the idle end can't leave() under the tunnel.
 // #56: the ↗ exit goes home to the quilt (clears the hash, closes the route); "Next set →" stays in the pod.
 function leave({home=false}={}){preparationPanel.hidden=true;pendingChallenge=null;hand.leave();arena.stop();clearInterval(restTimer);clearTimeout(hitTimer);voice.cancel();flow.leave();document.body.dataset.screen='pod';$('restScreen').hidden=true;$('homeScreen').hidden=false;moveCoach();if(home){history.replaceState(null,'',location.pathname+location.search);window.myr5Routes?.home?.();}else history.replaceState(null,'','#pod');$('start').disabled=!workoutEligibility(currentMode).allowed;route.render();circuit.render();$('start').focus();}
 document.querySelector('.encounter').addEventListener('pointerdown',()=>flow.touchRest(Date.now()),{passive:true});
 $('attackCoach').addEventListener('click',()=>{
  syncCombat();const now=Date.now(),hit=flow.tap(now,true);if(!hit)return;
  // Spectacle only (D7): no gameplay listens for this, boss attacks never touch player HP.
  if(hit.bossAttack)window.dispatchEvent(new CustomEvent('myr5:boss-attack',{detail:{level:flow.kitLevel}}));
  hand.hit(hit);arena.attack(hit);window.myr5Creature?.play(hit.assisted?'encourage':hit.blocked?'agree':'rest');
  $('damageTotal').textContent=Math.round(hit.totalDamage)+' DAMAGE';paintHealth();$('damageFloat').textContent=hit.blocked?(hit.assisted?'TEAM STRIKE · BLOCKED':'BLOCKED · 0'):(hit.assisted?'TEAM −':'−')+Math.round(hit.damage);
  const scene=document.querySelector('.encounter');scene.classList.remove('hit');void scene.offsetWidth;scene.classList.add('hit');clearTimeout(hitTimer);hitTimer=setTimeout(()=>scene.classList.remove('hit'),650);
  $('restFeedback').textContent=hit.blocked?`${POWERS[$('coachPower').value].line} ${hit.hits} ${hit.hits===1?'hit':'hits'}, zero damage.`:`${hit.assisted?'Helping Hand lands a team strike! ':''}${hit.hits} hits. ${hit.totalDamage} damage.`;
  if(now-lastSpoken>10000){lastSpoken=now;window.myr5Creature?.play(hit.blocked?'agree':'encourage');voice.say(hit.blocked?'Nice teamwork. My shield is still intact. Keep training.':'You and that hand make quite a team. That one connected.',{key:'rest'});}
 });
 $('leaveRest').addEventListener('click',()=>{clearInterval(restTimer);void throughWormhole(LINES.home,()=>leave({home:true}));});$('moreRest').addEventListener('click',()=>{flow.extend(30,Date.now());restCalled=false;tick();voice.say('Thirty more seconds. Take your time.',{interrupt:true});});
 $('weaponSpecial').addEventListener('click',async()=>{
  const activate=()=>{syncCombat();flow.abilities.merge(safeRead(COOLDOWN));const result=flow.special(arena.weapon,{now:Date.now(),progress:arena.progress,catalog:window.GalaWeapons});if(result.ok)store(COOLDOWN,JSON.stringify(flow.abilities.snapshot()));return result;};
  const hit=navigator.locks?.request?await navigator.locks.request('myr5-weapon-special',activate):activate();if(!hit.ok){specialControls();return;}
  arena.attack(hit);window.myr5Creature?.play(hit.blocked?'agree':'rest');
  $('damageTotal').textContent=Math.round(hit.totalDamage)+' DAMAGE';paintHealth();
  $('damageFloat').textContent=hit.blocked?'BLOCKED':'−'+hit.damage;$('restFeedback').textContent=hit.ability.name+(hit.blocked?' · Shielded':'');
  const scene=document.querySelector('.encounter');scene.classList.remove('hit');void scene.offsetWidth;scene.classList.add('hit');clearTimeout(hitTimer);hitTimer=setTimeout(()=>scene.classList.remove('hit'),650);specialControls();
 });
 $('nextSet').addEventListener('click',async()=>{const next=route.suggestion();if(flow.remaining(Date.now())>0||!next)return;clearInterval(restTimer);await throughWormhole(LINES.next,leave);onNext(next);});
 $('visitRest').addEventListener('click',()=>{onStop();flow.previewRest(Date.now(),Number($('restDuration').value));void toRest();});
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
 // The idle pod shows no "Ready" line: #status only appears while it has something to say (a set's hints, an error).
 const statusLine=$('status'),syncStatus=()=>{const quiet=idleStatus(statusLine.textContent);if(statusLine.hidden!==quiet)statusLine.hidden=quiet;};
 new MutationObserver(syncStatus).observe(statusLine,{childList:true,characterData:true,subtree:true});syncStatus();
 const requestedPanel=new URLSearchParams(location.search).get('panel');if(['avatar','hand'].includes(requestedPanel)){$('identity').showModal();if(requestedPanel==='hand')hand.edit();}
 window.addEventListener('myr5:account-progress',({detail:p})=>{flow.combat=p.combat;flow.progress.completedSets=p.completedSets;flow.progress.circuit=p.circuit||null;store(PROGRESS,JSON.stringify(flow.progress));for(const option of $('coachPower').options){if(option.value!=='shield'){option.disabled=!p.unlocks[option.value];option.textContent=POWERS[option.value].name+(option.disabled?' · Locked':'');}}if($('coachPower').selectedOptions[0]?.disabled)$('coachPower').value='shield';power();updateProgress();});
 window.addEventListener('myr5:performance-progress',()=>{updateProgress();if(flow.phase==='pod')$('start').disabled=!workoutEligibility(currentMode).allowed;});
 window.addEventListener('myr5:round-rejected',({detail})=>{if(awaitingRound?.id!==detail.id)return;awaitingRound=null;pendingChallenge=null;$('setReceipt').textContent=detail.message;$('earnedXp').textContent='NO XP';route.render();circuit.render();});
 window.addEventListener('myr5:account-progress',({detail:p})=>{if(awaitingRound&&p.lastSyncedWorkoutId===awaitingRound.id){awaitingRound=null;route.render();if(flow.phase==='rest'&&!flow.preview){const next=route.suggestion();pendingChallenge=(next?.line||ROUTE_LINES.limit)+' '+ROUTE_LINES.rest;speakChallenge();}}if(document.body.dataset.tracking!=='true')$('start').disabled=!workoutEligibility(currentMode).allowed;route.render();});
 const hydrationLease=workoutOwner.acquireIdleLease();
 void workouts.paused().then(paused=>{pausedLocal=paused;workoutOwner.releaseIdleLease(hydrationLease);if(paused&&workoutOwner.canStart())workoutOwner.start();route.render();}).catch(()=>workoutOwner.releaseIdleLease(hydrationLease));
 return {flow,workoutOwner,preparationTap:()=>{const hit=flow.preparationTap();if(hit)window.dispatchEvent(new CustomEvent('myr5:preparation-hit',{detail:hit}));return hit;},configure,beginSet,consume,setCardioStyle:style=>{if(!['gentle','sprint'].includes(style))throw Error('Choose gentle cardio or sprint intervals.');if(flow.phase==='set')throw Error('Choose cardio style before starting.');cardioStyle=style;},switchDifficulty:style=>flow.workout?.switchDifficulty(style),finishWorking,workoutMotion,canCount:()=>flow.workout?.counting??true,breakHold:()=>{flow.workout?.breakHold();publishInstruction();},resumeHold:()=>{flow.workout?.resumeHold();publishInstruction();},extendHoldRecovery:()=>flow.workout?.extendRecovery(),saveManual,pauseManual,interruptCurrent,render,setGoal,canStart:mode=>(workoutOwner.canStart()||pausedLocal?.mode===mode)&&workoutEligibility(mode).allowed,encouragement:(m,now,events)=>flow.phase==='set'?encourage.update(m,flow.active.goal,now,events):null,stopped:interruptCurrent,goal:()=>Number($('goal').value)};
}

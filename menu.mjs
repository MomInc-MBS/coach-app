// Fixed glass library with spoken proposals and a hologram before every start.
import {EXERCISES,FOCUS_GROUPS,GROUP_EXERCISES,focusFor} from './exercise-library.mjs';
import {movementSetup} from './movement-setup.mjs';
import {mountWeaponRewards} from './weapon-rewards.mjs';
import {WORKOUT_KINDS,workoutKind,workoutChoices,workoutLevel} from './workout-levels.mjs';
const $=id=>document.getElementById(id);
export function initLibrary({movements,onOpen,onSelect,onStart,camera,movement,voice}){
 const dialog=$('library');let hands=null,viewer=null,viewerGeneration=0,handGeneration=0,introGeneration=0,introTimer=null,resolveWait=null,introducing=false,selected='squat',page=0,filter='legs',kind='reps';
 const kindLabel=document.createElement('label');kindLabel.className='library-kind';kindLabel.textContent='Training type';const kindSelect=document.createElement('select');kindSelect.id='libraryKind';for(const item of WORKOUT_KINDS){const o=document.createElement('option');o.value=item.id;o.textContent=item.name;kindSelect.append(o);}kindLabel.append(kindSelect);$('libraryFocus').closest('label').before(kindLabel);kindSelect.value=kind;kindSelect.onchange=()=>{kind=kindSelect.value;page=0;paginate();};
 const rewards=mountWeaponRewards($('libraryFocus').closest('label'),()=>filter);
 for(const g of FOCUS_GROUPS){const o=document.createElement('option');o.value=g.id;o.textContent=g.name;$('libraryFocus').append(o);}
 $('libraryFocus').addEventListener('change',()=>{filter=$('libraryFocus').value;page=0;paginate();rewards.paint();});
 const speak=(text,options={})=>voice.say(text,options);
 function cancelIntro(){introGeneration++;introducing=false;clearTimeout(introTimer);resolveWait?.();resolveWait=null;voice.cancel();$('introCue').hidden=true;}
 function releaseViewer(){viewerGeneration++;viewer?.dispose();viewer=null;}
 function stopHands(message='Touch controls ready'){handGeneration++;hands?.stop();hands=null;$('toggleHands').disabled=false;$('toggleHands').textContent='Enable exercise gestures';$('toggleHands').setAttribute('aria-pressed','false');$('handState').textContent=message;$('confirmProgress').value=0;}
 function selection(id){if(id==='jumping')id='jumping-jack';selected=id;$('startFromLibrary').textContent='Start '+movements[id].name;for(const button of $('movementCards').querySelectorAll('[data-movement]'))button.setAttribute('aria-pressed',String(button.dataset.movement===id));}
 function home(){dialog.dataset.preview='false';filter=focusFor(selected);kind=workoutKind(selected);kindSelect.value=kind;$('libraryFocus').value=filter;page=Math.max(0,Math.floor(workoutChoices(filter,kind).findIndex(m=>m.id===selected)/4));paginate();cancelIntro();releaseViewer();$('movementCards').hidden=false;$('startFromLibrary').hidden=true;$('hologramPanel').hidden=true;$('gestureArea').hidden=false;dialog.scrollTop=0;if(dialog.open)$('movementCards').querySelector(`[data-movement="${selected}"]`)?.focus();}
 for(const [id,m] of Object.entries(EXERCISES)){
  const card=document.createElement('article');card.className='movement-card';card.dataset.group=focusFor(id);card.dataset.kind=workoutKind(id);const level=workoutLevel(id);card.dataset.difficulty=level.difficulty;
  const button=document.createElement('button');button.className='card-select';button.dataset.movement=id;button.setAttribute('aria-pressed','false');
  button.setAttribute('aria-label',`${level.label} ${m.name}, ${level.kind}`);button.title=m.name;
  const poster=document.createElement('img');poster.src=`/models/previews/${id}.png`;poster.alt='';poster.width=512;poster.height=512;poster.loading='lazy';poster.decoding='async';button.append(poster);
  const title=document.createElement('strong');title.className='movement-level';title.textContent=`${level.label} ? ${m.name}`;const targets=document.createElement('p');targets.className='movement-targets';targets.textContent=level.unlock;const xp=document.createElement('p');xp.className='movement-xp';xp.textContent=level.xp;button.append(title);button.addEventListener('click',()=>{cancelIntro();showModel(id);});card.append(button,targets,xp);$('movementCards').append(card);
 }
 function paginate(){rewards.paint();const cards=[...$('movementCards').children].filter(c=>c.dataset.group===filter&&c.dataset.kind===kind);const pages=Math.max(1,Math.ceil(cards.length/4));page=Math.max(0,Math.min(page,pages-1));for(const card of $('movementCards').children)card.hidden=true;cards.slice(page*4,page*4+4).forEach(c=>c.hidden=false);$('pageNumber').textContent=(page+1)+' / '+pages;$('previousPage').disabled=page===0;$('nextPage').disabled=page===pages-1;$('libraryPages').hidden=pages===1;let empty=document.getElementById('libraryEmpty');if(!empty){empty=document.createElement('p');empty.id='libraryEmpty';empty.setAttribute('role','status');$('movementCards').after(empty);}empty.textContent=`No ${WORKOUT_KINDS.find(k=>k.id===kind).name.toLowerCase()} in this focus. Choose another focus or training type.`;empty.hidden=cards.length>0;}
 $('previousPage').addEventListener('click',()=>{page--;paginate();});$('nextPage').addEventListener('click',()=>{page++;paginate();});
 $('libraryFocus').value=filter;paginate();
 async function showModel(id){
  if(id==='jumping')id='jumping-jack';
  const setup=movementSetup(EXERCISES[id]);
  $('holoCameraPosition').textContent=setup.position;$('holoCameraPlacement').textContent=setup.placement;
  $('holoFrameNote').textContent=setup.framing;
  $('holoVisibleJoints').replaceChildren(...setup.joints.map(name=>{const li=document.createElement('li');li.textContent=name;return li;}));
  $('holoStage').setAttribute('aria-label',`${movements[id].name} example. ${setup.position}. Drag to rotate.`);
  dialog.dataset.preview='true';stopHands();releaseViewer();const run=viewerGeneration;selection(id);onSelect(id);$('movementCards').hidden=true;$('libraryPages').hidden=true;$('startFromLibrary').hidden=true;$('gestureArea').hidden=true;$('hologramPanel').hidden=false;$('holoName').textContent=`${workoutLevel(id).label} ? ${movements[id].name}`;let targets=document.getElementById('holoUnlockTargets');if(!targets){targets=document.createElement('p');targets.id='holoUnlockTargets';$('holoName').after(targets);}targets.textContent=workoutLevel(id).unlock+' ? '+workoutLevel(id).xp;$('holoStatus').hidden=false;$('holoStatus').textContent='Loading hologram…';$('holoPlay').textContent='Pause animation';$('useHologram').disabled=false;$('useHologram').textContent='Begin';dialog.scrollTop=0;
  $('backLibrary').focus();
  try{const {createHologram}=await import('./hologram.mjs');if(run!==viewerGeneration||!dialog.open)return false;
   const instance=await createHologram($('holoStage'),id);if(run!==viewerGeneration||!dialog.open){instance.dispose();return false;}viewer=instance;$('holoStatus').hidden=true;$('useHologram').disabled=false;return true;
  }catch(error){if(run===viewerGeneration){$('holoStatus').textContent='Hologram could not load. '+error.message;$('useHologram').textContent='Begin';$('useHologram').disabled=false;}return false;}
 }
 function begin(){cancelIntro();stopHands();releaseViewer();dialog.close();onStart();}
 async function introduce(id=movement()){
  if(id==='jumping')id='jumping-jack';
  onOpen();cancelIntro();stopHands();selection(id);onSelect(id);if(!dialog.open)dialog.showModal();introducing=true;
  await showModel(id);
 }
 function gesture(event){
  $('confirmProgress').value=event.progress;
  if(event.event==='proposed'){selection(event.mode);$('handState').textContent=movements[event.mode].name+'? Hold thumbs up to confirm.';}
  else if(event.event==='holding')$('handState').textContent=`Hold thumbs up… ${Math.round(event.progress*100)}%`;
  else if(event.event==='pending')$('handState').textContent=movements[event.mode].name+'? Hold thumbs up for a moment.';
  else if(event.event==='confirmed'){stopHands();introduce(event.mode);}
  else if(event.event==='expired'){$('handState').textContent='Selection expired. Make another gesture.';speak('Selection cancelled. Make another gesture.',{interrupt:true});}
  else if(event.event==='idle')$('handState').textContent='Make an exercise gesture.';
 }
 $('toggleHands').addEventListener('click',async()=>{
  if(hands){stopHands();speak('Exercise gestures off.',{interrupt:true});return;}
  const run=++handGeneration;$('toggleHands').disabled=true;$('handState').textContent='Opening exercise gestures…';speak('Exercise gestures. Show your gesture, then hold thumbs up to confirm.',{interrupt:true});
  try{const {HandControl}=await import('./gesture-controls.mjs');if(run!==handGeneration||!dialog.open)return;
   const control=new HandControl({video:$('handVideo'),camera:camera(),message:text=>$('handState').textContent=text,onGesture:gesture,onError:text=>stopHands(text)});hands=control;await control.start();
   if(run!==handGeneration||!dialog.open){control.stop();return;}$('toggleHands').disabled=false;$('toggleHands').textContent='Disable exercise gestures';$('toggleHands').setAttribute('aria-pressed','true');
  }catch(error){if(run===handGeneration){stopHands(error.message);speak('Gesture tracking unavailable. Touch controls are ready.',{interrupt:true});}}
 });
 $('openLibrary').addEventListener('click',()=>{onOpen();selection(movement());home();dialog.showModal();speak('Choose your movement.',{interrupt:true});});
 $('startFromLibrary').addEventListener('click',()=>introduce(selected));
 $('closeLibrary').addEventListener('click',()=>{cancelIntro();dialog.close();speak('Library closed.',{interrupt:true});});
 $('backLibrary').addEventListener('click',()=>{home();speak('Movement library.',{interrupt:true});});
 $('useHologram').addEventListener('click',()=>begin());
 $('holoReset').addEventListener('click',()=>{viewer?.reset();if(!introducing)speak('View reset.');}); $('holoPlay').addEventListener('click',()=>{if(viewer){if(introducing)cancelIntro();const playing=viewer.toggle();$('holoPlay').textContent=playing?'Pause animation':'Play animation';$('useHologram').textContent='Begin';speak(playing?'Example playing.':'Example paused.');}});
 dialog.addEventListener('cancel',cancelIntro);
 dialog.addEventListener('close',()=>{stopHands();releaseViewer();$('openLibrary').focus();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&dialog.open){cancelIntro();stopHands('Gestures paused');releaseViewer();home();}});
 window.addEventListener('pagehide',()=>{cancelIntro();stopHands();releaseViewer();});
 return {introduce};
}

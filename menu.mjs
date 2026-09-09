// Fixed glass library with spoken proposals and a hologram before every start.
import {INTRO} from './coach.mjs';
const $=id=>document.getElementById(id);
export function initLibrary({movements,onOpen,onSelect,onStart,camera,movement,voice}){
 const dialog=$('library');let hands=null,viewer=null,viewerGeneration=0,handGeneration=0,introGeneration=0,introTimer=null,resolveWait=null,introducing=false,selected='squat',page=0;
 const kind={reps:'Count repetitions',hold:'Estimate your hold',pace:'Time & hand pace',steps:'Knee lifts & cadence',jumps:'Estimated jumps'};
 const speak=(text,options={})=>voice.say(text,options);
 function cancelIntro(){introGeneration++;introducing=false;clearTimeout(introTimer);resolveWait?.();resolveWait=null;voice.cancel();$('introCue').hidden=true;}
 function releaseViewer(){viewerGeneration++;viewer?.dispose();viewer=null;}
 function stopHands(message='Touch controls ready'){handGeneration++;hands?.stop();hands=null;$('toggleHands').disabled=false;$('toggleHands').textContent='Enable exercise gestures';$('toggleHands').setAttribute('aria-pressed','false');$('handState').textContent=message;$('confirmProgress').value=0;}
 function selection(id){selected=id;$('startFromLibrary').textContent='Start '+movements[id].name;for(const button of $('movementCards').querySelectorAll('[data-movement]'))button.setAttribute('aria-pressed',String(button.dataset.movement===id));}
 function home(){cancelIntro();releaseViewer();$('movementCards').hidden=false;$('libraryPages').hidden=false;$('startFromLibrary').hidden=false;$('hologramPanel').hidden=true;$('gestureArea').hidden=false;dialog.scrollTop=0;}
 function choose(id){selection(id);onSelect(id);if(!$('hologramPanel').hidden)home();speak(movements[id].name+' selected.',{interrupt:true});}
 for(const [i,[id,m]] of Object.entries(movements).entries()){
  const card=document.createElement('article');card.className='movement-card';
  const button=document.createElement('button');button.className='card-select';button.dataset.movement=id;button.setAttribute('aria-pressed','false');
  button.innerHTML=`<span class="card-number">${String(i+1).padStart(2,'0')}</span><span class="card-title">${m.name}</span><span class="card-kind">${kind[m.kind]}</span>`;
  button.addEventListener('click',()=>choose(id));card.append(button);
  const holo=document.createElement('button');holo.className='holo-link';holo.textContent='View hologram';holo.setAttribute('aria-label',`View ${m.name.toLowerCase()} hologram`);holo.addEventListener('click',()=>{cancelIntro();showModel(id);speak(m.name+' example.',{interrupt:true});});card.append(holo);$('movementCards').append(card);
 }
 function paginate(){[...$('movementCards').children].forEach((card,i)=>card.hidden=Math.floor(i/4)!==page);$('pageNumber').textContent=`${page+1} / 2`;$('previousPage').disabled=page===0;$('nextPage').disabled=page===1;}
 $('previousPage').addEventListener('click',()=>{page=0;paginate();speak('Squats, push-ups, tree pose and warrior two.',{interrupt:true});});$('nextPage').addEventListener('click',()=>{page=1;paginate();speak('Horse stance, air boxing, jogging and jumping.',{interrupt:true});});paginate();
 async function showModel(id){
  stopHands();releaseViewer();const run=viewerGeneration;selection(id);onSelect(id);$('movementCards').hidden=true;$('libraryPages').hidden=true;$('startFromLibrary').hidden=true;$('gestureArea').hidden=true;$('hologramPanel').hidden=false;$('holoName').textContent=movements[id].name+' hologram';$('holoStatus').hidden=false;$('holoStatus').textContent='Loading hologram…';$('holoPlay').textContent='Pause animation';$('useHologram').disabled=true;$('useHologram').textContent=introducing?'Start now':'Start with introduction';dialog.scrollTop=0;
  try{const {createHologram}=await import('./hologram.mjs');if(run!==viewerGeneration||!dialog.open)return false;
   const instance=await createHologram($('holoStage'),id);if(run!==viewerGeneration||!dialog.open){instance.dispose();return false;}viewer=instance;$('holoStatus').hidden=true;$('useHologram').disabled=false;return true;
  }catch(error){if(run===viewerGeneration){$('holoStatus').textContent='Hologram could not load. '+error.message;$('useHologram').textContent='Retry introduction';$('useHologram').disabled=false;}return false;}
 }
 function begin(){if(!viewer)return;cancelIntro();stopHands();releaseViewer();dialog.close();onStart();}
 async function introduce(id=movement()){
  onOpen();cancelIntro();stopHands();selection(id);onSelect(id);if(!dialog.open)dialog.showModal();introducing=true;const run=++introGeneration;
  const loaded=await showModel(id);if(run!==introGeneration||!dialog.open)return;
  if(!loaded){introducing=false;speak('The example could not load. Tap retry.',{interrupt:true});return;}
  $('introCue').hidden=false;$('introCue').textContent=INTRO[id]+' Your session starts after the introduction.';
  const minimum=new Promise(resolve=>{resolveWait=resolve;introTimer=setTimeout(()=>{resolveWait=null;resolve();},8000);});
  await Promise.all([minimum,speak(INTRO[id],{interrupt:true})]);
  if(run!==introGeneration||!dialog.open)return;
  $('introCue').textContent='Get ready. Starting in three.';await speak('Okay. Get ready. Three, two, one.',{interrupt:true});
  if(run===introGeneration&&dialog.open)begin();
 }
 function gesture(event){
  $('confirmProgress').value=event.progress;
  if(event.event==='proposed'){selection(event.mode);$('handState').textContent=movements[event.mode].name+'? Hold thumbs up to confirm.';speak(movements[event.mode].name+'? Hold thumbs up to confirm.',{interrupt:true});}
  else if(event.event==='holding')$('handState').textContent=`Hold thumbs up… ${Math.round(event.progress*100)}%`;
  else if(event.event==='pending')$('handState').textContent=movements[event.mode].name+'? Hold thumbs up for a moment.';
  else if(event.event==='confirmed'){stopHands();introduce(event.mode);}
  else if(event.event==='expired'){$('handState').textContent='Selection expired. Make another gesture.';speak('Selection cancelled. Make another gesture.',{interrupt:true});}
  else if(event.event==='idle')$('handState').textContent='Make an exercise gesture. Feet can stay outside the picture.';
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
 $('useHologram').addEventListener('click',()=>introducing&&viewer?begin():introduce(selected));
 $('holoReset').addEventListener('click',()=>{viewer?.reset();if(!introducing)speak('View reset.');});$('zoomIn').addEventListener('click',()=>{viewer?.zoom(.85);if(!introducing)speak('Closer.');});$('zoomOut').addEventListener('click',()=>{viewer?.zoom(1.18);if(!introducing)speak('Further away.');});
 $('holoPlay').addEventListener('click',()=>{if(viewer){if(introducing)cancelIntro();const playing=viewer.toggle();$('holoPlay').textContent=playing?'Pause animation':'Play animation';$('useHologram').textContent='Start with introduction';speak(playing?'Example playing.':'Example paused.');}});
 dialog.addEventListener('cancel',cancelIntro);
 dialog.addEventListener('close',()=>{stopHands();releaseViewer();$('openLibrary').focus();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&dialog.open){cancelIntro();stopHands('Gestures paused');releaseViewer();home();}});
 window.addEventListener('pagehide',()=>{cancelIntro();stopHands();releaseViewer();});
 return {introduce};
}

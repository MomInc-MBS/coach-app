// Reuse the user's native Handborne recipe and pose rig. This hand only taps the
// reserved footer corner; it never targets, follows or writes a music control.
export function deckBeat(deck) {
 if(!deck?.playing||!Number.isFinite(deck.bpm)||deck.bpm<=0||deck.bpm>400||!Number.isFinite(deck.position))return null;
 const beats=Math.max(0,deck.position)*deck.bpm/60;
 return {index:Math.floor(beats),phase:beats-Math.floor(beats)};
}
export function handAction(state) {
 const id=state?.crossfader<.5?'a':'b',beat=deckBeat(state?.decks?.[id]);
 return {mode:beat?'corner-beat':'idle',beat};
}

export function createDJHand(dialog,{getState=()=>null,loadRig=()=>import('/handborne/companion.mjs')}={}) {
 const shell=dialog.querySelector('.sp-shell'),host=document.createElement('div');
 host.className='dj-hand-overlay';host.hidden=true;host.setAttribute('aria-hidden','true');shell.append(host);
 let active=false,disposed=false,loading=false,attempted=false,fallbackMissing=false,rig=null,revision=0,frame=0,last=0,rendering=false;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function fallback(){
  let family=11;try{const recipe=JSON.parse(localStorage.getItem('handborne-recipe-v4'));if(Number.isInteger(recipe?.sections?.palm)&&recipe.sections.palm>=0&&recipe.sections.palm<23)family=recipe.sections.palm;}catch{}
  const img=document.createElement('img');img.alt='';img.src=`/handborne/previews/family-${String(family).padStart(2,'0')}.png?v=5`;
  img.onerror=()=>{if(host.firstElementChild===img){fallbackMissing=true;host.hidden=true;shell.classList.remove('dj-corner-tapping');}};
  host.replaceChildren(img);host.dataset.family=String(family);
 }
 async function load(){
  if(loading||attempted||rig||disposed||!active)return;loading=true;attempted=true;const mine=revision;
  try{const{createHandCompanion}=await loadRig();if(disposed||!active||mine!==revision)return;
   host.replaceChildren();fallbackMissing=false;rig=createHandCompanion(host,{cropWrist:true,onStatus:text=>{host.dataset.ready=String(text==='Helping Hand ready');}});rig.gesture('point-at-you');rig.setActive(rendering);
  }catch{if(!disposed&&active&&mine===revision){fallback();host.dataset.ready='false';}}
  finally{loading=false;if(active&&!disposed&&mine!==revision)void load();}
 }
 function tick(now){
  if(!active||disposed)return;frame=requestAnimationFrame(tick);if(now-last<40)return;last=now;
  const action=handAction(getState()),tapping=!!action.beat&&!document.hidden;
  if(tapping&&!attempted&&!loading){fallback();void load();}
  host.hidden=!tapping||fallbackMissing;shell.classList.toggle('dj-corner-tapping',!host.hidden);
  host.dataset.mode=tapping?'corner-beat':'idle';host.dataset.beat=tapping?String(action.beat.index):'';host.dataset.tempo=action.beat?'known':'unknown';host.dataset.target='';
  if(tapping){const box=shell.getBoundingClientRect(),width=host.offsetWidth||64,height=host.offsetHeight||84,lift=reduced.matches?0:Math.sin(action.beat.phase*Math.PI)*7;
   host.style.transform=`translate(${Math.max(0,box.width-width-8).toFixed(1)}px,${Math.max(0,box.height-height-4-lift).toFixed(1)}px)`;
  }
  if(tapping!==rendering){rig?.setActive(tapping);rendering=tapping;}
 }
 function stop(){revision++;cancelAnimationFrame(frame);frame=0;rendering=false;rig?.dispose();rig=null;host.hidden=true;host.dataset.ready='false';host.dataset.mode='idle';host.dataset.beat='';host.dataset.target='';shell.classList.remove('dj-corner-tapping');}
 return {
  setActive(value){value=!!value&&!disposed;if(value===active)return;active=value;if(!active){stop();return;}attempted=false;fallbackMissing=false;last=0;frame=requestAnimationFrame(tick);},
  dispose(){if(disposed)return;disposed=true;active=false;stop();host.remove();},
 };
}

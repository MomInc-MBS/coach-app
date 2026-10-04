import {physicalSound} from './physical-sound.mjs';

const BOARD_CUES={quilt:['quilt','quilt'],ice:['ice','ice'],jelly:['jelly','jelly'],water:['water','water-slosh'],pond:['water','pond-slosh'],grass:['grass','grass'],cogs:['cogs','cogs'],wood:['wood','wood-scrape']};
const ELECTRIC='#settings,#portalMenu,#remindersPanel,.reminders-computer-panel,.reminders-computer-screen';
const INTERNAL='dialog:not(#settings):not(#portalMenu):not(#portalWorkoutHome),.creature-editor,.handborne-app';
export function surfaceCue(el){
 if(globalThis.location?.pathname?.startsWith('/creature/')||el?.closest?.('#library,[data-route="customizeCoach"]'))return 'mechanical';
 if(globalThis.location?.pathname?.startsWith('/war-room/')||globalThis.location?.pathname?.startsWith('/handborne/'))return 'bloop';
 if(el?.closest?.(ELECTRIC))return 'electric';
 if(el?.closest?.(INTERNAL)||globalThis.window?.parent!==globalThis.window)return 'bloop';
 return el?.closest?.('#start,#coachDock,.control-board')?'main-control':'mechanical';
}
const CONTROL='button,select,input,summary,[role="button"],[role="slider"],a';

export function mountPhysicalSoundUI(){
 const sound=physicalSound.mount(),settings=document.getElementById('settings'),abort=new AbortController(),signal=abort.signal;
 if(settings){
  const group=document.createElement('details');group.className='settings-group physical-sound-settings';
  group.innerHTML='<summary>Sound effects</summary><div class="physical-sound-controls"><button type="button" data-sound-mute aria-pressed="false">Mute effects</button><label>Effects volume <input type="range" min="0" max="100" step="1" data-sound-volume aria-label="Effects volume"></label><output data-sound-value></output><p>Pod, grimoire, and controls</p><a href="/audio/sfx/credits.html">Sound credits</a></div>';
  settings.querySelector('.voice-row')?.closest('details')?.after(group);
  const mute=group.querySelector('[data-sound-mute]'),volume=group.querySelector('[data-sound-volume]'),value=group.querySelector('[data-sound-value]');
  const paint=()=>{mute.setAttribute('aria-pressed',String(sound.muted));mute.textContent=sound.muted?'Unmute effects':'Mute effects';volume.value=String(Math.round(sound.volume*100));value.value=`${Math.round(sound.volume*100)}%`;};
  mute.addEventListener('click',()=>{sound.setMuted(!sound.muted);if(!sound.muted)sound.play('switch');},{signal});
  volume.addEventListener('input',()=>{sound.setVolume(Number(volume.value)/100);paint();sound.play('electric');},{signal});
  window.addEventListener('myr5:sound-settings',paint,{signal});paint();
  const style=document.createElement('style');style.textContent='.physical-sound-controls{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:10px}.physical-sound-controls label{display:flex;align-items:center;gap:8px}.physical-sound-controls input{width:min(180px,38vw)}.physical-sound-controls p{width:100%;margin:0;opacity:.7}.physical-sound-controls a{font-size:.85em}';document.head.append(style);
  signal.addEventListener('abort',()=>{group.remove();style.remove();},{once:true});
 }
 const routeControl=(event,doc)=>{
  const target=event.target;if(target?.nodeType!==1)return;
  const el=target.closest(CONTROL);if(!el||el.disabled||el.closest('.physical-sound-settings')||el.matches('.board-marker,[data-room-board],#exerciseDial,#difficultySlider,#harder,#easier,#toggleVoice')||el.id==='portalOverlay')return;
  if(el.matches('input[type="range"],input[type="color"],select'))return;
  sound.play(el.matches('[role="switch"]')?'switch':surfaceCue(el));
 };
 function bindDocument(doc){
  if(!doc||doc.__myr5SoundBound)return;doc.__myr5SoundBound=true;
  doc.addEventListener('click',event=>routeControl(event,doc),{signal});
  doc.addEventListener('input',event=>{const el=event.target;if(el?.closest?.('.physical-sound-settings'))return;if(el?.matches?.('input[type="range"],input[type="color"]'))sound.play(['mechanical','main-control'].includes(surfaceCue(el))?'dial':surfaceCue(el));},{signal});
  doc.addEventListener('change',event=>{const el=event.target;if(el?.closest?.('.physical-sound-settings'))return;if(el?.matches?.('select,input[type="checkbox"],input[type="radio"]'))sound.play(['mechanical','main-control'].includes(surfaceCue(el))?'switch':surfaceCue(el));},{signal});
  doc.addEventListener('pointerdown',event=>{if(event.target?.closest?.(ELECTRIC)&&!event.target.closest(CONTROL))sound.play('electric');},{signal,passive:true});
 }
 bindDocument(document);
 // The Hand editor boots this module in its own document, including when framed.
 window.addEventListener('myr5:portal-sound',event=>{
  const {kind,board,visible}=event.detail||{};
  if(kind==='scene')sound.setScene(visible?'portal':'pod',board||sound.board);
  else if(kind==='board')sound.setBoard(board||'quilt');
  else if(kind==='travel'){sound.play('transit');}
  else if(kind==='press'||kind==='drag'){
   const cue=BOARD_CUES[board||sound.board]||BOARD_CUES.quilt;
   sound.play(cue[kind==='drag'?1:0]);
   if(kind==='press'&&board==='grass')sound.play('grass-tinkle');
  }
  else if(kind==='menu')sound.play('electric');
 },{signal});
 window.addEventListener('myr5:hardware-detent',event=>sound.play(event.detail?.kind==='lever'?'lever':event.detail?.kind==='switch'?'switch':'dial'),{signal});
 window.addEventListener('myr5:reminders-open',()=>{sound.play('dialup');sound.play('signal');},{signal});
 window.addEventListener('myr5:classroom-board',()=>sound.play('whiteboard'),{signal});
 window.addEventListener('myr5:whiteboard-redraw',()=>sound.play('whiteboard'),{signal});
 const openMenus=new Set();
 const menuObserver=new MutationObserver(()=>{const current=new Set(document.querySelectorAll('dialog[open]'));for(const menu of current)if(!openMenus.has(menu)&&!menu.matches('#portalWorkoutHome,.meditation-panel'))sound.play(surfaceCue(menu));openMenus.clear();for(const menu of current)openMenus.add(menu);});
 menuObserver.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});signal.addEventListener('abort',()=>menuObserver.disconnect(),{once:true});
 window.addEventListener('myr5:reminders-turn',()=>sound.play('lever'),{signal});
 return ()=>{abort.abort();sound.dispose();};
}

import {mountPhysicalSoundUI} from './sound-ui.mjs';
import {physicalSound} from './physical-sound.mjs';
import {mountPageMusic} from './page-music.mjs';
mountPhysicalSoundUI();
mountPageMusic(); // /creature/ and /war-room/ play the customizer song; framed pages leave music to the parent
function mountDockSound(){
 if(!location.pathname.startsWith('/creature/'))return;
 const dock=document.getElementById('coachDock');if(!dock||dock.querySelector('.dock-sound'))return;
 const control=document.createElement('div');control.className='cb-part dock-sound';
 control.innerHTML='<span class="cb-label" aria-hidden="true">SOUND</span><button type="button" class="dock-control" id="editorSoundSwitch" role="switch" aria-label="Sound effects" aria-checked="true" data-on="true">ON</button>';
 dock.insertBefore(control,dock.querySelector('.dock-live'));
 const button=control.querySelector('button');
 const paint=()=>{const on=!physicalSound.muted;button.dataset.on=String(on);button.setAttribute('aria-checked',String(on));button.textContent=on?'ON':'OFF';};
 button.addEventListener('click',()=>{physicalSound.setMuted(!physicalSound.muted);if(!physicalSound.muted)physicalSound.play('switch');});
 button.addEventListener('keydown',event=>{const on={ArrowUp:true,ArrowRight:true,ArrowDown:false,ArrowLeft:false}[event.key];if(on===undefined)return;event.preventDefault();if((!physicalSound.muted)!==on)button.click();});
 window.addEventListener('myr5:sound-settings',paint);paint();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountDockSound,{once:true});else mountDockSound();
if(location.pathname.startsWith('/war-room/'))physicalSound.setScene('off');
if(window.parent!==window){
 physicalSound.setScene('off');
 try{const parent=window.parent,forward=event=>window.dispatchEvent(new CustomEvent('myr5:response',{detail:event.detail}));parent.addEventListener('myr5:response',forward);window.addEventListener('pagehide',()=>parent.removeEventListener('myr5:response',forward),{once:true});}catch{}
}

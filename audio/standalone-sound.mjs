import {mountPhysicalSoundUI} from './sound-ui.mjs';
import {physicalSound} from './physical-sound.mjs';
mountPhysicalSoundUI();
if(location.pathname.startsWith('/war-room/'))physicalSound.setScene('off');
if(window.parent!==window){
 physicalSound.setScene('off');
 try{const parent=window.parent,forward=event=>window.dispatchEvent(new CustomEvent('myr5:response',{detail:event.detail}));parent.addEventListener('myr5:response',forward);window.addEventListener('pagehide',()=>parent.removeEventListener('myr5:response',forward),{once:true});}catch{}
}

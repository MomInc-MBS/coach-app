import {mountPhysicalSoundUI} from './sound-ui.mjs';
import {physicalSound} from './physical-sound.mjs';
mountPhysicalSoundUI();
if(window.parent!==window){
 physicalSound.setScene('off');
 try{window.parent.addEventListener('myr5:response',event=>window.dispatchEvent(new CustomEvent('myr5:response',{detail:event.detail})));}catch{}
}

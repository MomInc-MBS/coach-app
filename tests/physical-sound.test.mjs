import test from 'node:test';
import assert from 'node:assert/strict';
import {PhysicalSound,readSoundPrefs,SOUND_PREF_KEY} from '../audio/physical-sound.mjs';

class Param{
 value=1;
 setTargetAtTime(value){this.value=value;}
 setValueAtTime(value){this.value=value;}
 linearRampToValueAtTime(value){this.value=value;}
 exponentialRampToValueAtTime(value){this.value=value;}
 cancelScheduledValues(){}
}
class Node{
 gain=new Param();frequency=new Param();Q=new Param();
 connect(next){return next;}
 disconnect(){}
 start(){}
 stop(){}
}
class Context{
 state='running';currentTime=0;sampleRate=1000;destination=new Node();
 createGain(){return new Node();}
 createOscillator(){return new Node();}
 createBufferSource(){return new Node();}
 createBiquadFilter(){return new Node();}
 createBuffer(_channels,length){return {getChannelData:()=>new Float32Array(length)};}
 close(){}
}
const storage=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};};

test('sound settings survive reload and malformed storage fails safely',()=>{
 const saved=storage(),sound=new PhysicalSound({AudioContextClass:null,storage:saved,documentRef:null,windowRef:null});
 sound.setVolume(.27);sound.setMuted(true);
 assert.deepEqual(readSoundPrefs(saved),{volume:.27,muted:true});
 saved.setItem(SOUND_PREF_KEY,'broken');assert.deepEqual(readSoundPrefs(saved),{volume:.42,muted:false});
 assert.equal(sound.unlock(),false);
});

test('rapid gestures have bounded voices and hiding or muting stops playback',()=>{
 const documentRef={hidden:false},sound=new PhysicalSound({AudioContextClass:Context,storage:storage(),documentRef,windowRef:null});
 sound.context=new Context();sound.master=sound.context.createGain();sound.duck=sound.context.createGain();
 for(let i=0;i<30;i++){sound.last.delete('mechanical');sound.play('mechanical');}
 assert.equal(sound.voices.size,12);
 sound.stopAll();assert.equal(sound.voices.size,0);
 documentRef.hidden=true;sound.last.delete('mechanical');sound.play('mechanical');assert.equal(sound.voices.size,0);
 documentRef.hidden=false;sound.setMuted(true);sound.last.delete('mechanical');sound.play('mechanical');assert.equal(sound.voices.size,0);
 sound.dispose();
});

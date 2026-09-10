import test from 'node:test';
import assert from 'node:assert/strict';
import {CoachVoice} from '../coach.mjs';
import {RobotAudio,voicePhrases} from '../robot-audio.mjs';

test('missing or failed clips leave captions active without using any phone voice',async()=>{
 const captions=[],spoken=[];globalThis.speechSynthesis={speak:u=>spoken.push(u),cancel:()=>{}};
 try{
  for(const playback of [async()=>false,async()=>{throw Error('offline');}]){
   const voice=new CoachVoice(t=>captions.push(t));voice.available=true;voice.robot={unlock:()=>true,stop:()=>{},play:playback};
   await voice.say('Ready. Begin.');assert.equal(voice.current,null);assert.equal(voice.queue.length,0);voice.cancel();
  }
  assert.deepEqual(spoken,[]);assert.ok(captions.includes('Ready. Begin.'));
 }finally{delete globalThis.speechSynthesis;}
});
test('compound guidance can use approved sentence clips; unknown text stays caption-only',()=>{
 const phrases={'Halfway.':'a','Keep your own pace.':'b','Ready. Begin.':'c'};
 assert.deepEqual(voicePhrases('Halfway. Keep your own pace.',phrases),['Halfway.','Keep your own pace.']);
 assert.deepEqual(voicePhrases('Ready. Begin.',phrases),['Ready. Begin.']);
 assert.deepEqual(voicePhrases('Unknown phrase.',phrases),[]);
});
test('a saved phone-voice preference cannot bypass the approved robot pack',async()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');let played=0;
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=> 'phone'}});
 try{
  const robot=new RobotAudio();robot.manifest=Promise.resolve({phrases:{'1':'/voice/approved.wav'}});robot.cache.set('1',{});
  robot.context={state:'running',destination:{},createBufferSource:()=>({connect(){},disconnect(){},start(){played++;queueMicrotask(()=>this.onended());}})};robot.unlock=()=>true;
  assert.equal(await robot.play('1'),true);assert.equal(played,1);
 }finally{if(original)Object.defineProperty(globalThis,'localStorage',original);else delete globalThis.localStorage;}
});

// Event-driven cues: no language model or microphone needed during exercise.
import {RobotAudio} from './robot-audio.mjs';
function myr5VoiceState(state){if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('myr5:response',{detail:{state}}));}
export const INTRO = {
 squat:'Watch the squat. Start tall, lower, then return to your starting height. Keep your shoulders and hips in view. Feet can be outside the picture.',
 pushup:'Watch the push-up. Place your phone beside you so you can see it. Show one shoulder, elbow, hand and hip. Begin with your arm extended.',
 tree:'Watch tree pose. Raise one bent knee out to the side and find a comfortable balance. Show your hips and knees. I estimate the hold from your upper legs.',
 warrior:'Watch warrior two. Stretch your arms to either side and bend one knee in a wide stance. Keep your arms, hips and knees visible.',
 horse:'Watch horse stance. Take a comfortable wide stance and lower with your knees out. Keep your hips and knees visible. I estimate your hold.',
 boxing:'Watch air boxing. Raise your hands and move at your own pace. Keep your shoulders, elbows and hands visible. I time your round and estimate hand speed.',
 jogging:'Watch jogging in place. Alternate lifting your knees at your own pace. Keep both knees visible. Feet can be outside the picture.',
 jumping:'Watch the jump. Start standing still, then rise and return to your starting height. Keep shoulders and hips visible. I estimate jumps from body rise.'
};
export class CueEvents {
 constructor(){this.reset();}
 reset(){this.previous=null;this.ready=false;this.lostAt=null;this.warned=false;this.marks=new Set();this.lastEncourage=0;this.nextSetup=null;}
 update(m,now){
  const cues=[],p=this.previous;
  const add=(text,key='guide')=>cues.push({text,key});
  const ready=m.tracking&&(m.kind==='hold'?m.progress===1:!['squat','pushup','jumping'].includes(m.mode)||m.calibrated);
  if(m.complete){if(!p?.complete)add('Round complete. Well done.','complete');}
  else {
   if(ready&&!this.ready){add('Ready. Begin.','ready');this.ready=true;}
   if(!this.ready){this.nextSetup??=now+6000;if(now>=this.nextSetup){add(m.message,'setup');this.nextSetup=now+8000;}}
   if(this.ready&&!m.tracking){this.lostAt??=now;if(!this.warned&&now-this.lostAt>=2000){add(m.message,'tracking');this.warned=true;}}
   else if(m.tracking){if(this.warned)add('I can see you again.','tracking');this.lostAt=null;this.warned=false;}
   if(p&&m.count>p.count)add(String(m.count),'count');
   if(m.kind==='hold'&&p){const milestone=Math.floor(m.hold/10)*10;if(m.remaining==null&&milestone>=10&&milestone>Math.floor(p.hold/10)*10)add(`${milestone} seconds.`, 'time');if(p.hold>1&&m.hold===0)add('Hold paused.','tracking');}
   if(m.remaining!==null&&p?.remaining!==null&&p?.remaining!==undefined){
    const crossed=[60,30,10,5,4,3,2,1].filter(n=>p.remaining>n&&m.remaining<=n&&!this.marks.has(n));
    crossed.forEach(n=>this.marks.add(n));if(crossed.length){const n=crossed.at(-1);add(n>5?`${n} seconds left.`:String(n),'time');}
   } else if(ready&&m.kind!=='hold'&&Math.floor(m.elapsed/30)>this.lastEncourage){this.lastEncourage=Math.floor(m.elapsed/30);add(`${this.lastEncourage*30} seconds. Keep your own pace.`, 'time');}
  }
  this.previous={...m};return cues;
 }
}
export class CoachVoice {
 constructor(caption,onMode=()=>{}){this.caption=caption;this.onMode=onMode;this.enabled=true;this.queue=[];this.current=null;this.epoch=0;this.robot=new RobotAudio(onMode);this.available=!!(globalThis.AudioContext||globalThis.webkitAudioContext||globalThis.speechSynthesis);}
 unlock(){return this.robot.unlock();}
 setEnabled(enabled){this.enabled=enabled;if(!enabled)this.cancel();}
 cancel(){this.epoch++;clearTimeout(this.current?.timer);this.robot.stop();globalThis.speechSynthesis?.cancel();this.current?.resolve();this.current=null;this.queue.splice(0).forEach(item=>item.resolve());myr5VoiceState('idle');}
 say(text,{key='guide',interrupt=false}={}){
  // Encouragement can follow a short count, but never queue behind instructions.
  if(key==='encouragement'&&this.current&&this.current.key!=='count')return Promise.resolve();
  if(interrupt||(key==='count'&&this.current?.key==='guide')||(key!=='encouragement'&&this.current?.key==='encouragement'))this.cancel();this.caption(text);
  if(!this.enabled||!this.available)return Promise.resolve();
  return new Promise(resolve=>{
   // Do not build a backlog of old rep numbers or expired timer milestones.
   const old=this.queue.findIndex(item=>item.key===key);if(old>=0)this.queue.splice(old,1)[0].resolve();
   this.queue.push({text,key,resolve});this.pump();
  });
 }
 pump(){
  if(this.current||!this.queue.length)return;
  const item=this.queue.shift(),epoch=this.epoch;this.current=item;
  this.caption(item.text);myr5VoiceState('speaking');let finished=false;
  const finish=()=>{clearTimeout(item.timer);if(finished||epoch!==this.epoch)return;finished=true;this.current=null;item.resolve();myr5VoiceState('idle');this.pump();};
  const fallback=()=>{
   if(epoch!==this.epoch)return;
   if(!globalThis.speechSynthesis){finish();return;}
   this.onMode('Phone voice fallback · slow');
   const utterance=new SpeechSynthesisUtterance(item.text),voices=speechSynthesis.getVoices();
   utterance.voice=voices.find(v=>v.localService&&/^en/i.test(v.lang))||voices.find(v=>/^en/i.test(v.lang))||null;
   utterance.lang='en-US';utterance.rate=.82;utterance.pitch=1;
   utterance.onend=finish;utterance.onerror=finish;speechSynthesis.speak(utterance);
  };
  item.timer=setTimeout(()=>{if(epoch===this.epoch){this.robot.stop();globalThis.speechSynthesis?.cancel();finish();}},Math.max(10000,5000+item.text.length*220));
  if(this.robot.unlock())this.robot.play(item.text).then(played=>{if(epoch===this.epoch){if(played)finish();else fallback();}},fallback);
  else fallback();
 }
}

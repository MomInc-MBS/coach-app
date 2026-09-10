// Rebuild the approved Coach voice; filenames include its complete sound profile.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {EXERCISES} from '../exercise-library.mjs';
const require=createRequire(import.meta.url),{synthesize,PROFILE}=require('./robot-speech.cjs');
const previous=JSON.parse(await readFile('voice/manifest.json','utf8'));
const phrases=new Set(Object.keys(previous.phrases));
for(const file of ['coach.mjs','menu.mjs','app.mjs','movement-engine.mjs','movement-rules.mjs','pod/pod.mjs','pod/encouragement.mjs','coach-profile.mjs','office-domain.mjs']){
 const code=await readFile(file,'utf8');for(const m of code.matchAll(/'([^'\n]{3,600})'/g)){
  const text=m[1];if(/^[A-Za-z]/.test(text)&&/[ .!?]/.test(text)&&!/[<>{}=\[\]\/]/.test(text)&&!text.includes(' · '))phrases.add(text);
 }
}
for(const m of Object.values(EXERCISES))for(const text of [m.name,m.name+' selected.',m.name+' example.',m.name+'? Hold thumbs up to confirm.',m.hint])phrases.add(text);
for(let n=1;n<=200;n++)phrases.add(String(n));
for(let n=10;n<=600;n+=10){phrases.add(`${n} seconds.`);phrases.add(`${n} seconds left.`);phrases.add(`${n} seconds. Keep your own pace.`);}
phrases.add('MOM believes in you. One. Two. Three.');
for(const text of [...phrases])for(const sentence of text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g)||[])if(sentence.trim())phrases.add(sentence.trim());
const soundProfile={...PROFILE,filter:'rubberband-preserved-formants-eq-v1'};
await mkdir('voice',{recursive:true});
const manifest={version:2,profile:soundProfile,engine:'eSpeak NG + Rubber Band',license:previous.license,phrases:{}};
let total=0,completed=0;const queue=[...phrases];
async function render(){while(queue.length){const text=queue.shift(),filename=createHash('sha256').update(JSON.stringify(soundProfile)+'\n'+text).digest('hex').slice(0,24)+'.wav';let wav;
 try{wav=await readFile('voice/'+filename);}catch{wav=await synthesize(text);await writeFile('voice/'+filename,wav);}
 manifest.phrases[text]='/voice/'+filename;total+=wav.length;if(++completed%100===0)console.log(`${completed}/${phrases.size} approved voice clips ready.`);
}}
await render();
manifest.bytes=total;await writeFile('voice/manifest.json',JSON.stringify(manifest));console.log(`${completed} approved clips; ${Math.round(total/1024/1024)} MB.`);

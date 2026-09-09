import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{synthesize,PROFILE}=require('../robot-speech.cjs');
const phrases=new Set();
phrases.add('Coach ready. Move at your own pace. One. Two. Three. Thirty seconds left.');
for(const file of ['coach.mjs','menu.mjs','app.mjs','movement-engine.mjs','pod/pod.mjs','pod/encouragement.mjs']){const code=await readFile(file,'utf8');for(const m of code.matchAll(/'([^'\n]{5,600})'/g)){const text=m[1];if(/^[A-Za-z]/.test(text)&&/[ .!?]/.test(text)&&!/[<>{}=\[\]\/]/.test(text)&&!text.includes(' · '))phrases.add(text);}}
for(let n=1;n<=100;n++)phrases.add(String(n));
for(const n of [10,20,30,40,50,60,90,120,150,180,210,240,270,300]){phrases.add(`${n} seconds.`);phrases.add(`${n} seconds left.`);phrases.add(`${n} seconds. Keep your own pace.`);}
for(const name of ['Squats','Push-ups','Tree pose','Warrior two','Horse stance','Air boxing','Jogging in place','Jumping']){phrases.add(name+' selected.');phrases.add(name+' example.');phrases.add(name+'? Hold thumbs up to confirm.');}
await mkdir('voice',{recursive:true});const manifest={version:1,profile:PROFILE,engine:'eSpeak NG',license:'GPL-3.0-or-later; synthesized audio may be distributed',phrases:{}};let total=0;
for(const text of phrases){const filename=createHash('sha256').update(text).digest('hex').slice(0,20)+'.wav';let wav;try{wav=await readFile('voice/'+filename);}catch{wav=await synthesize(text);}await writeFile(`voice/${filename}`,wav);manifest.phrases[text]=`/voice/${filename}`;total+=wav.length;}
manifest.bytes=total;await writeFile('voice/manifest.json',JSON.stringify(manifest));console.log(`${phrases.size} clips, ${Math.round(total/1024/1024)} MB`);

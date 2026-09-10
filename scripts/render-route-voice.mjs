import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {ROUTE_LINES} from '../workout-route.mjs';
const {synthesize,PROFILE}=createRequire(import.meta.url)('./robot-speech.cjs'),exec=promisify(execFile);
const manifest=JSON.parse(await readFile('voice/manifest.json','utf8')),profile={...PROFILE,filter:'rubberband-preserved-formants-eq-v1'};
const phrases=[...Object.values(ROUTE_LINES),...[ROUTE_LINES.advance,ROUTE_LINES.max,ROUTE_LINES.limit].map(line=>line+' '+ROUTE_LINES.rest)];
await mkdir('../voice-work',{recursive:true});
for(const text of phrases){
 const hash=createHash('sha256').update(JSON.stringify(profile)+'\n'+text).digest('hex').slice(0,24),output=`voice/${hash}.mp3`;
 try{await stat(output);}catch{const input=`../voice-work/${hash}.wav`;await writeFile(input,await synthesize(text));await exec(process.env.MYR5_FFMPEG||'ffmpeg',['-hide_banner','-loglevel','error','-y','-threads','1','-i',input,'-c:a','libmp3lame','-q:a','3','-ac','1',output],{windowsHide:true});}
 manifest.phrases[text]='/'+output;
}
manifest.bytes=(await Promise.all(Object.values(manifest.phrases).map(async url=>(await stat('.'+url)).size))).reduce((a,b)=>a+b,0);
await writeFile('voice/manifest.json',JSON.stringify(manifest));console.log(`${phrases.length} workout challenge clips ready in the existing robot voice.`);

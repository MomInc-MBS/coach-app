// Phone-friendly copies of the approved masters; no pitch or tempo changes.
import {readFile,writeFile,stat} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile),engine=process.env.MYR5_FFMPEG||'ffmpeg';
const manifest=JSON.parse(await readFile('voice/manifest.json','utf8'));
let bytes=0,done=0;const entries=Object.entries(manifest.phrases);
for(const [text,url]of entries){
 const output=url.replace(/\.wav$/,'.mp3');
 if(url!==output)await exec(engine,['-hide_banner','-loglevel','error','-y','-threads','1','-i','.'+url,'-c:a','libmp3lame','-q:a','3','-ac','1','.'+output],{windowsHide:true});
 manifest.phrases[text]=output;bytes+=(await stat('.'+output)).size;if(++done%300===0)console.log(`${done}/${entries.length} compact voice clips ready.`);
}
manifest.bytes=bytes;manifest.format='mp3';await writeFile('voice/manifest.json',JSON.stringify(manifest));console.log(`Voice download: ${Math.round(bytes/1024/1024)} MB.`);

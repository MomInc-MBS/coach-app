// Local formant speech. No model download, cloud service, microphone, or GPU.
const {execFile}=require('node:child_process');
const fs=require('node:fs');
const octave=require('./octave.cjs');
const ENGINE='C:/Program Files/eSpeak NG/espeak-ng.exe';
// Keep the synthetic timbre, but retain sentence stress and avoid choppy word gaps.
const PROFILE={voice:'en-us',wordsPerMinute:125,pitch:52,pitchRange:45,wordGap:0,pitchRatio:2**(-2/12)};
const cache=new Map(),pending=new Map();let cacheBytes=0;
const MAX_CACHE=12*1024*1024;
function synthesize(text){
 if(typeof text!=='string'||!text.trim()||text.length>600||/[\x00-\x08\x0b-\x1f]/.test(text))return Promise.reject(new Error('Invalid speech text'));
 text=text.trim();if(cache.has(text))return Promise.resolve(cache.get(text));if(pending.has(text))return pending.get(text);
 if(pending.size>=4)return Promise.reject(new Error('Speech busy'));
 const task=new Promise((resolve,reject)=>{
  // Arguments are passed without a shell. Text is never interpreted as markup.
  const args=['--stdout','-b','1','-v',PROFILE.voice,'-s',String(PROFILE.wordsPerMinute),'-p',String(PROFILE.pitch),'-P',String(PROFILE.pitchRange),'-g',String(PROFILE.wordGap),'--stdin'];
  const child=execFile(ENGINE,args,{encoding:'buffer',windowsHide:true,timeout:5000,maxBuffer:5*1024*1024},async(error,wav)=>{
   if(error)return reject(new Error('Robot voice unavailable'));
   if(wav.length<44||wav.toString('ascii',0,4)!=='RIFF')return reject(new Error('Invalid speech audio'));
   // eSpeak's stdout uses streaming placeholder sizes; give phone decoders exact sizes.
   wav.writeUInt32LE(wav.length-8,4);let found=false;
   for(let offset=12;offset+8<=wav.length;){const size=wav.readUInt32LE(offset+4);if(wav.toString('ascii',offset,offset+4)==='data'){wav.writeUInt32LE(wav.length-offset-8,offset+4);found=true;break;}offset+=8+size+(size%2);}
   if(!found)return reject(new Error('Missing speech samples'));
   try{wav=await octave.lowerOctave(wav);}catch(error){reject(error);return;}
   while(cache.size&&cacheBytes+wav.length>MAX_CACHE){const key=cache.keys().next().value;cacheBytes-=cache.get(key).length;cache.delete(key);}
   cache.set(text,wav);cacheBytes+=wav.length;resolve(wav);
  });
  child.stdin.on('error',()=>{});child.stdin.end(text+'\n','utf8');
 }).finally(()=>pending.delete(text));
 pending.set(text,task);return task;
}
module.exports={synthesize,PROFILE,available:()=>fs.existsSync(ENGINE)&&octave.available()};

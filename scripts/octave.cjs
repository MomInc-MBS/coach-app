const {execFile}=require('node:child_process');
const fs=require('node:fs');
const PROCESSOR=process.env.MYR5_FFMPEG||'ffmpeg';
function repairWave(wav){
 if(wav.length<44||wav.toString('ascii',0,4)!=='RIFF')throw Error('Invalid speech audio');
 wav.writeUInt32LE(wav.length-8,4);
 for(let offset=12;offset+8<=wav.length;){const size=wav.readUInt32LE(offset+4);if(wav.toString('ascii',offset,offset+4)==='data'){wav.writeUInt32LE(wav.length-offset-8,offset+4);return wav;}offset+=8+size+(size%2);}
 throw Error('Missing speech samples');
}
function lowerOctave(input){return new Promise((resolve,reject)=>{
 const child=execFile(PROCESSOR,['-hide_banner','-loglevel','error','-threads','1','-f','wav','-i','pipe:0','-af','rubberband=pitch=0.8908987181:tempo=1:formant=preserved:pitchq=quality,highpass=f=50,equalizer=f=2600:t=q:w=1.2:g=-2,lowpass=f=7200,alimiter=limit=0.95','-ac','1','-ar','22050','-c:a','pcm_s16le','-f','wav','pipe:1'],{encoding:'buffer',windowsHide:true,timeout:7000,maxBuffer:8*1024*1024},(error,output,stderr)=>{if(error){reject(Error('Deep robot voice unavailable: '+error.message+' '+String(stderr)));return;}try{resolve(repairWave(output));}catch(e){reject(e);}});
 child.stdin.on('error',()=>{});child.stdin.end(input);
});}
module.exports={lowerOctave,repairWave,available:()=>fs.existsSync(PROCESSOR)};

// Makes a decoded ambient clip loop without a gap. Encoded clips often carry silence or a fade at each end
// (the waterfall had 0.6 s of silence in front and a fade-out behind), so looping them leaves a dip every pass.
// The steady body is kept and its end is blended into its start with an equal-power crossfade: after the last
// sample the loop continues with the sample that followed the blended start, so there is no click or dip.
const BLOCK=.01;
export function seamlessLoopChannels(channels,rate,{crossfade=.5,margin=.05}={}){
  const n=channels[0].length,block=Math.max(1,Math.round(rate*BLOCK)),count=Math.floor(n/block);
  if(count<8)return channels;
  const rms=Array.from({length:count},(_,b)=>{let s=0;for(const ch of channels)for(let i=b*block;i<(b+1)*block;i++)s+=ch[i]*ch[i];return Math.sqrt(s/(block*channels.length));});
  const median=[...rms].sort((a,b)=>a-b)[count>>1],floor=median*.8;
  let first=0,last=count-1;
  while(first<count&&rms[first]<floor)first++;
  while(last>first&&rms[last]<floor)last--;
  // Step in past the edge ramps (an end that fades measures high until its last blocks).
  const pad=Math.round(rate*margin);
  const ramp=Math.round(rate*.3),start=first*block+pad+ramp,end=(last+1)*block-pad-ramp;
  const body=end-start;
  const fade=Math.min(Math.round(rate*crossfade),Math.floor(body/3));
  if(fade<=0||body<fade*3)return channels;
  const length=body-fade;
  return channels.map(ch=>{
    const out=new Float32Array(length);
    for(let i=0;i<length;i++)out[i]=ch[start+i];
    for(let i=0;i<fade;i++){const t=(i+.5)/fade*Math.PI/2;out[i]=ch[start+i]*Math.sin(t)+ch[start+length+i]*Math.cos(t);}
    return out;
  });
}
export function seamlessLoopBuffer(context,buffer,options){
  const channels=Array.from({length:buffer.numberOfChannels},(_,c)=>buffer.getChannelData(c));
  const next=seamlessLoopChannels(channels,buffer.sampleRate,options);
  if(next===channels)return buffer;
  const out=context.createBuffer(next.length,next[0].length,buffer.sampleRate);
  next.forEach((data,c)=>out.copyToChannel(data,c));
  return out;
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {seamlessLoopChannels} from '../audio/loop-seam.mjs';

const rate=24000;
// Deterministic noise with a silent head, a short fade-in, and a fade-out: the shape of the old waterfall asset.
const clip=()=>{
  let seed=7;const rand=()=>(seed=(seed*1664525+1013904223)>>>0)/4294967296-.5;
  const a=new Float32Array(rate*11.5);
  for(let i=0;i<a.length;i++){const t=i/rate;const env=t<.64?0:t<.9?(t-.64)/.26:t>11.1?Math.max(0,(11.5-t)/.4):1;a[i]=rand()*.3*env;}
  return a;
};
const rms=(a,from,to)=>{let s=0;for(let i=from;i<to;i++)s+=a[i]*a[i];return Math.sqrt(s/(to-from));};

test('seamless loop drops the silent head and faded tail and keeps one steady level across the seam',()=>{
  const src=clip(),[out]=seamlessLoopChannels([src],rate);
  assert.ok(out.length<src.length&&out.length>rate*8,'a long steady body remains');
  const level=rms(out,rate*3,rate*6);
  assert.ok(rms(out,0,rate*.5)>level*.85&&rms(out,0,rate*.5)<level*1.15,'the blended start is as loud as the body');
  assert.ok(rms(out,out.length-rate*.5,out.length)>level*.85,'the end is as loud as the body');
  // Level held across the wrap: 50 ms either side of the seam, never a dip.
  const wrap=new Float32Array(rate*.1);wrap.set(out.subarray(out.length-rate*.05));wrap.set(out.subarray(0,rate*.05),rate*.05);
  assert.ok(rms(wrap,0,wrap.length)>level*.85,'no gap at the seam');
});

test('a steady clip with nothing to trim is still blended without NaN',()=>{
  const src=new Float32Array(rate*6).map((_,i)=>Math.sin(i/9)*.2),[out]=seamlessLoopChannels([src],rate);
  assert.ok(out.every(Number.isFinite));
});

test('real waterfall asset loops without a dip',{skip:(()=>{try{execFileSync('ffmpeg',['-version'],{stdio:'ignore'});return false;}catch{return 'ffmpeg missing';}})()},()=>{
  const raw=execFileSync('ffmpeg',['-v','error','-i','audio/sfx/meditation-waterfall.mp3','-f','f32le','-ac','1','-ar','24000','-'],{maxBuffer:1e8});
  const src=new Float32Array(raw.buffer,raw.byteOffset,raw.length>>2),[out]=seamlessLoopChannels([src],rate);
  const level=rms(out,rate*3,rate*6),wrap=new Float32Array(rate*.2);wrap.set(out.subarray(out.length-rate*.1));wrap.set(out.subarray(0,rate*.1),rate*.1);
  assert.ok(rms(wrap,0,wrap.length)>level*.85,'seam is as loud as the body');
  for(let i=0;i<out.length-rate*.2;i+=rate*.25|0)assert.ok(rms(out,i,i+rate*.1)>level*.7,'no quiet patch at '+i);
});

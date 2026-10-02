import test from 'node:test';
import assert from 'node:assert/strict';
import {buildScript,totalBreaths,breathsDone,revealRadius,pulseRadius,breathPhaseProgress,GUIDED_ROUND_TIMING as G} from '../breathing-modes.mjs';

test('revealRadius: under maxR until the last breath of the real session script, maxR on it',()=>{
 const script=buildScript('wim-hof'),total=totalBreaths(script),maxR=500;
 assert.equal(total,30);
 for(let done=0;done<total;done++)assert.ok(revealRadius(done,total,maxR)<maxR,'done '+done);
 assert.equal(revealRadius(total,total,maxR),maxR);assert.equal(revealRadius(0,total,maxR),0);
 assert.equal(breathsDone(script,0),0);assert.equal(breathsDone(script,G.settleMs+G.breathMs-1),29);assert.equal(breathsDone(script,G.settleMs+G.breathMs),30);
 assert.equal(breathsDone(script,G.durationMs),30,'the counter never resets between phases');
 const tai=buildScript('tai-chi');assert.equal(breathsDone(tai,1e9),totalBreaths(tai));
});

test('pulseRadius: exhale expands, inhale contracts to the character, peaks grow, last peak is maxR',()=>{
 const total=30,maxR=600,minR=70;
 const peaks=Array.from({length:total},(_,i)=>pulseRadius(i,total,'out',1,maxR,minR));
 for(let i=1;i<total;i++)assert.ok(peaks[i]>peaks[i-1],'exhale peak grows at breath '+i);
 assert.ok(peaks[0]>minR,'the first exhale already reaches past the character');
 assert.equal(peaks[total-1],maxR,'the final exhale reaches the farthest corner');
 for(let i=0;i<total;i++){
  assert.equal(pulseRadius(i,total,'in',1,maxR,minR),minR,'inhale ends at the character, breath '+i);
  assert.equal(pulseRadius(i,total,'out',0,maxR,minR),minR,'exhale starts from the character, breath '+i);
  if(i)assert.ok(Math.abs(pulseRadius(i,total,'in',0,maxR,minR)-peaks[i-1])<1e-9,'inhale starts from the last peak, breath '+i);
  const mid=pulseRadius(i,total,'out',.5,maxR,minR);assert.ok(mid>minR&&mid<peaks[i],'smooth mid-exhale, breath '+i);
 }
 assert.equal(pulseRadius(total,total,null,0,maxR,minR),maxR,'the session ends in full colour');
 assert.equal(pulseRadius(0,total,null,0,maxR,minR),0,'grey before the first breath');
});

test('breathPhaseProgress follows the guided round timing',()=>{
 const script=buildScript('wim-hof');
 assert.deepEqual(breathPhaseProgress(script,0),{breath:null,progress:0},'settle is not a breath');
 assert.deepEqual(breathPhaseProgress(script,G.settleMs),{breath:'in',progress:0});
 const mid=breathPhaseProgress(script,G.settleMs+G.inhaleMs+G.exhaleMs/2);assert.equal(mid.breath,'out');assert.ok(Math.abs(mid.progress-.5)<1e-6);
 const late=breathPhaseProgress(script,G.settleMs+5*(G.inhaleMs+G.exhaleMs)+G.inhaleMs/4);assert.equal(late.breath,'in');assert.ok(Math.abs(late.progress-.25)<1e-6);
});

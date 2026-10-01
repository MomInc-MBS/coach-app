import test from 'node:test';
import assert from 'node:assert/strict';
import {BREATHING_MODES,GUIDED_ROUND_TIMING,buildScript,phaseAt,scriptMs} from '../breathing-modes.mjs';

// Independent review oracle from observed circle changes in the user-selected
// official video 0BNejY1e9ik. These are approximate observations, not frame-exact
// timing or a transcription. The product's original guided round ends at 210s.
const OBSERVED_PHASE_MS=[20500,110000,2500,30000,3000,15000,29000];
const OBSERVATION_TOLERANCE_MS=250;
test('the selected-video timing profile fits one 210-second round and the observed breath rhythm',()=>{
 const script=buildScript('wim-hof'),mode=BREATHING_MODES['wim-hof'];
 assert.equal(mode.rounds,1);assert.equal(mode.breathsPerRound,30);assert.equal(script.length,OBSERVED_PHASE_MS.length);
 assert.deepEqual(script.map(phase=>phase.key),['settle','breathe','transition','optional-hold','recovery','recovery-hold','rest']);
 for(let i=0;i<script.length;i++)assert.ok(Math.abs(script[i].ms-OBSERVED_PHASE_MS[i])<=OBSERVATION_TOLERANCE_MS,`phase ${i} stays within the observed timing tolerance`);
 assert.ok(Math.abs(scriptMs(script)-210000)<1,'the complete original round lasts 3:30');
 const paced=script.find(phase=>phase.pace);
 assert.equal(GUIDED_ROUND_TIMING.durationMs,210000);assert.equal(GUIDED_ROUND_TIMING.breaths,30);
 assert.equal(paced.pace.inhaleMs,GUIDED_ROUND_TIMING.inhaleMs);assert.equal(paced.pace.exhaleMs,GUIDED_ROUND_TIMING.exhaleMs);
 assert.ok(Math.abs(paced.pace.inhaleMs-2833.3333333333335)<=OBSERVATION_TOLERANCE_MS);
 assert.ok(Math.abs(paced.pace.exhaleMs-833.3333333333334)<=OBSERVATION_TOLERANCE_MS);
 assert.ok(paced.pace.inhaleMs>paced.pace.exhaleMs,'the observed inhale is longer than the release');
 for(const time of [20750,24500,28250,32000,35750,39250])assert.equal(phaseAt(script,time).breath,'in',`expansion near ${time}ms`);
 for(const time of [23500,27250,31000,34500,38250])assert.equal(phaseAt(script,time).breath,'out',`contraction near ${time}ms`);
 assert.equal(phaseAt(script,132750).key,'transition','release before optional retention');
 assert.equal(phaseAt(script,133250).key,'optional-hold','optional retention starts near133s');
});

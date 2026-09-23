// Rank 12b port: the owner's board (achievements-board.mjs) now reads the battle-pass API for its two
// swap points. One end-to-end check from step counts to what the board paints, plus the combat level.
import test from 'node:test';
import assert from 'node:assert/strict';
import {BOSSES,bossStates,selectedTracks as boardTracks,loadProgress as boardProgress} from '../achievements-board.mjs';
import {selectedTracks,loadProgress,combatLevel} from '../battle-pass.mjs';

test('step counts reach the board: selected path + meditation open, other rows locked, shared bosses after overflow, combat level per track',()=>{
 assert.equal(boardTracks,selectedTracks);assert.equal(boardProgress,loadProgress);
 const account={onboarding:{data:{profile:{exercises:['squat']}}}}; // quads (+ meditation, always)
 // quads: 30 levels (5 bosses x 5 + 5 over); meditation: 23 levels (4 x 5 + 3 over); chest is not a selected path.
 const tracks={legs:{steps:30*5},meditation:{steps:23*5},chest:{steps:999}};
 const states=bossStates(loadProgress({tracks,account}),selectedTracks(account)),at=id=>states.find(b=>b.id===id);
 assert.deepEqual(states.map(b=>b.id),BOSSES.map(b=>b.id));
 assert.equal(at('ringer-5').state,'done');assert.equal(at('tanka-4').state,'done');
 assert.equal(at('strider-1').state,'locked');assert.equal(at('strider-1').levels,0,'unselected rows never progress');
 assert.equal(at('warden-1').state,'done','overflow 5 + 3 fills Warden first');
 assert.equal(at('lume-1').state,'open');assert.equal(at('lume-1').levels,3);
 assert.equal(combatLevel('squat',{tracks,account}),5);
 assert.equal(combatLevel('pushup',{tracks,account}),1,'an unselected track fights at the L1 kit');
 assert.equal(combatLevel('squat',{tracks:{legs:{steps:14}},account}),2);
});

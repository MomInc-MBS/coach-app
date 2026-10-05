import test from 'node:test';
import assert from 'node:assert/strict';
import {coachRequirements,BOSSES} from '../achievements-board.mjs';
import {COACH_REQUIREMENTS,CADENCE_MILESTONES} from '../performance-catalog.mjs';
test('meditation coach descriptions reflect separate-day thresholds',()=>{
 for(const r of COACH_REQUIREMENTS.filter(r=>r.groups.includes('meditation'))){const target=CADENCE_MILESTONES.meditationDays[['easy','medium','hard','expert'].indexOf(r.difficulty)];assert.match(coachRequirements(r.id).unlock,new RegExp(`${target} separate days`));}
});
test('hold gold requires uninterrupted performance; rep-only coaches do not promise hold gold',()=>{
 for(const c of BOSSES){const r=coachRequirements(c.id);if(r.gold)assert.match(r.gold,/10-minute uninterrupted hold/);if(r.unlock.includes('15 reps')&&!r.unlock.includes('hold'))assert.equal(r.gold,null);}
});

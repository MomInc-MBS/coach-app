import test from 'node:test';
import assert from 'node:assert/strict';
import {TONES,CADENCES,DAYS,reminderMessage} from '../reminder-settings.mjs';
import {isDue,reminderInput} from '../server/domain.mjs';
const r={enabled:1,time:'09:00',timezone:'America/Los_Angeles',quiet_start:'22:00',quiet_end:'07:00'};
test('consistency means the exact selected local weekdays, including across UTC dates',()=>{
 for(const cadence of CADENCES)for(let day=6;day<=12;day++){
  const date=`2026-09-${String(day).padStart(2,'0')}`,weekday=new Date(date+'T12:00Z').getUTCDay();
  assert.equal(isDue({...r,days_per_week:cadence},Date.parse(date+'T16:01Z')),DAYS[cadence].includes(weekday)?date:false);
 }
 assert.equal(isDue({...r,days_per_week:1,time:'23:00',quiet_start:'00:00',quiet_end:'00:00'},Date.parse('2026-09-08T06:01Z')),'2026-09-07');
 assert.equal(isDue({...r,days_per_week:5},Date.parse('2026-11-02T17:01Z')),'2026-11-02');
 assert.equal(isDue({...r,days_per_week:5},Date.parse('2026-11-01T17:01Z')),false);
 assert.equal(isDue({...r,days_per_week:5,enabled:0},Date.parse('2026-11-02T17:01Z')),false);
});
test('MOM wording varies for every reminder kind and old records retain direct daily defaults',()=>{
 for(const kind of ['water','workout','meal','motivation'])assert.equal(new Set(TONES.map(tone=>reminderMessage(kind,tone))).size,3);
 assert.equal(reminderMessage('water'),'Time for a water break.');
 const v=reminderInput({id:crypto.randomUUID(),kind:'water',time:'09:00',timezone:'UTC',enabled:true,quietStart:'22:00',quietEnd:'07:00'});
 assert.equal(v.tone,'direct');assert.equal(v.daysPerWeek,7);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {nextReminderAt,quietReminder,reminderCountdown} from '../reminder-live.mjs';
const r={enabled:1,time:'09:00',timezone:'America/Los_Angeles',quiet_start:'22:00',quiet_end:'07:00',days_per_week:7};
test('live next reminder agrees with local cadence, quiet hours and paused state',()=>{
 const now=Date.parse('2026-09-09T15:59:30Z');assert.equal(nextReminderAt(r,now),Date.parse('2026-09-09T16:00:00Z'));assert.equal(reminderCountdown(nextReminderAt(r,now),now),'In 30s');
 assert.equal(nextReminderAt({...r,days_per_week:1},now),Date.parse('2026-09-14T16:00:00Z'));assert.equal(nextReminderAt({...r,enabled:0},now),null);assert.equal(nextReminderAt({...r,time:'23:00'},now),null);assert(quietReminder({...r,time:'22:00'}));assert(!quietReminder({...r,time:'07:00'}));
});
test('next reminders handle the spring gap, fall repetition and fractional time zones',()=>{
 const free={...r,quiet_start:'00:00',quiet_end:'00:00'};
 assert.equal(nextReminderAt({...free,time:'02:30'},Date.parse('2026-03-08T08:00Z')),Date.parse('2026-03-09T09:30Z'));
 assert.equal(nextReminderAt({...free,time:'01:30'},Date.parse('2026-11-01T08:50Z')),Date.parse('2026-11-01T09:30Z'));
 assert.equal(nextReminderAt({...r,timezone:'Asia/Kathmandu'},Date.parse('2026-09-09T03:00Z')),Date.parse('2026-09-09T03:15Z'));
});

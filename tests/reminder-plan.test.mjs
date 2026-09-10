import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {readFile,readdir} from 'node:fs/promises';
import {readCoachPlan,saveCoachPlan,syncTrainingStatus,claimNotificationSlot} from '../server/reminder-plan.mjs';
import {missedTrainingDays,coachReminder} from '../reminder-plan.mjs';
let mf,db;
before(async()=>{mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB']});db=await mf.getD1Database('DB');for(const f of (await readdir('drizzle')).filter(x=>x.endsWith('.sql')).sort())await db.batch((await readFile('drizzle/'+f,'utf8')).split('--> statement-breakpoint').filter(s=>s.trim()).map(s=>db.prepare(s)));});
after(async()=>mf?.dispose());
const input={enabled:true,count:3,times:['09:00','14:00','19:00'],timezone:'America/Los_Angeles',quietStart:'22:00',quietEnd:'07:00',tone:'cheeky'};
test('one-to-three daily messages save without duplicates, reduce cleanly, pause, and stay account-owned',async()=>{
 const first=await saveCoachPlan(db,'plan-a',input),again=await saveCoachPlan(db,'plan-a',input);assert.deepEqual(again.ids,first.ids);assert.equal((await readCoachPlan(db,'plan-b')).enabled,false);
 const reduced=await saveCoachPlan(db,'plan-a',{...input,count:1,times:['10:00']});assert.equal(reduced.ids[0],first.ids[0]);assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM reminders WHERE user_id=?').bind('plan-a').first()).n,1);
 await saveCoachPlan(db,'plan-a',{...input,count:1,times:['10:00'],enabled:false});assert.equal((await db.prepare('SELECT enabled FROM reminders WHERE user_id=?').bind('plan-a').first()).enabled,0);
 await assert.rejects(saveCoachPlan(db,'plan-a',{...input,count:4}),/one to three/);await assert.rejects(saveCoachPlan(db,'plan-a',{...input,times:['09:00','09:00','19:00']}),/different/);
});
test('the sender atomically caps distinct daily messages at three, including simultaneous runs',async()=>{
 const day='2026-09-10',claims=await Promise.all(Array.from({length:10},(_,i)=>claimNotificationSlot(db,'cap',day,'r'+i)));assert.equal(claims.filter(Boolean).length,3);
 const winner=claims.findIndex(Boolean);assert.equal(await claimNotificationSlot(db,'cap',day,'r'+winner),true);assert.equal(await claimNotificationSlot(db,'other',day,'r9'),true);assert.equal(await claimNotificationSlot(db,'cap','2026-09-11','r9'),true);
});
test('missed training escalates bounded copy, respects scheduled weekdays, and recovers after completion',()=>{
 const monday=Date.parse('2026-09-07T12:00:00Z'),day=Math.floor(monday/86400000),status={startedDay:day,lastCompletedDay:day};assert.equal(missedTrainingDays(status,monday+86400000),0);assert.equal(missedTrainingDays(status,monday+4*86400000),3);assert.equal(missedTrainingDays(status,monday+7*86400000,1),0);
 assert.notEqual(coachReminder(0),coachReminder(1));assert.match(coachReminder(3),/disappointed/);assert.equal(coachReminder(7),coachReminder(30));assert.doesNotMatch(coachReminder(30,'gentle'),/disappointed|done waiting/);assert.equal(missedTrainingDays({...status,lastCompletedDay:day+4},monday+4*86400000),0);
});
test('training status keeps the first check-in and newest completion through delayed syncs',async()=>{
 const now=Date.now(),day=Math.floor(now/86400000);await syncTrainingStatus(db,'sync',{startedDay:day-7,lastCompletedDay:null},now);await syncTrainingStatus(db,'sync',{startedDay:day,lastCompletedDay:day},now);await syncTrainingStatus(db,'sync',{startedDay:day-3,lastCompletedDay:day-3},now-1000);const p=JSON.parse((await db.prepare('SELECT value FROM system WHERE key=?').bind('training:sync').first()).value);assert.equal(p.startedDay,day-7);assert.equal(p.lastCompletedDay,day);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {Miniflare} from 'miniflare';
import {GROUP_EXERCISES} from '../exercise-library.mjs';
import {makeExerciseRoute,nextChallenge,ROUTE_LINES} from '../workout-route.mjs';
import {workoutDayBounds,readExerciseRoute} from '../server/workout-route.mjs';
import {voicePhrases} from '../robot-audio.mjs';
import {saveOnboarding} from '../server/onboarding.mjs';
import {completeCoach} from './onboarding-fixture.mjs';
import worker from '../server/worker.mjs';

const options={day:'2026-09-10',timezone:'America/Los_Angeles'};
test('every family has an easy-to-hard route and progresses one level after completion',()=>{
 for(const [group,steps] of Object.entries(GROUP_EXERCISES)){
  const history=[];let route=makeExerciseRoute(history,[],options);
  for(const [index,step] of steps.entries()){
   assert.equal(route.groups[group].next.mode,step.id);assert.equal(route.groups[group].level,index+1);
   history.push({mode:step.id,sets:1,value:step.defaultGoal});route=makeExerciseRoute(history,[],options);
  }
  const result=route.groups[group];assert(result.mastered);assert.equal(result.next.mode,steps.at(-1).id);assert.equal(result.next.goal,steps.at(-1).defaultGoal+1);
 }
});
test('top-level rounds add one to the previous result, including seconds, and the daily allowance is shared by variations',()=>{
 const route=makeExerciseRoute([{mode:'decline-pushup',sets:9,value:21},{mode:'side-plank-right',sets:3,value:17.2}],[{mode:'knee-pushup',sets:2},{mode:'diamond-pushup',sets:2}],options);
 assert.equal(route.groups.chest.next.goal,22);assert.equal(route.groups.core.next.goal,18);assert.equal(route.groups.core.next.unit,'seconds');
 assert.equal(route.groups.chest.today,4);assert.equal(nextChallenge(route,'knee-pushup').round,5);
 route.groups.chest.remaining=0;assert(nextChallenge(route,'knee-pushup').changedFamily);assert.notEqual(nextChallenge(route,'knee-pushup').group,'chest');
 for(const group of Object.values(route.groups))group.remaining=0;assert.equal(nextChallenge(route,'pushup'),null);
});
test('local-day limits reset at midnight and handle both DST transitions',()=>{
 for(const [when,hours] of [['2026-03-08T20:00:00Z',23],['2026-11-01T20:00:00Z',25],['2026-09-10T20:00:00Z',24]]){
  const result=workoutDayBounds(Date.parse(when),'America/Los_Angeles');assert.equal(result.end-result.start,hours*3600000);
  assert.equal(workoutDayBounds(result.start,'America/Los_Angeles').start,result.start);assert.equal(workoutDayBounds(result.end,'America/Los_Angeles').start,result.end);
 }
});
test('every spoken workout challenge has a clip in the existing robot voice',async()=>{
 const manifest=JSON.parse(await readFile('voice/manifest.json','utf8'));
 for(const line of [ROUTE_LINES.advance,ROUTE_LINES.max,ROUTE_LINES.limit])assert(voicePhrases(line+' '+ROUTE_LINES.rest,manifest.phrases).length>0);
});
test('account routes persist, the fifth round is atomic across devices, and another day or family remains available',async()=>{
 const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB']});
 try{
  const DB=await mf.getD1Database('DB'),env={DB},now=Date.now();
  for(const f of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())await DB.batch((await readFile('drizzle/'+f,'utf8')).split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean).map(s=>DB.prepare(s)));
  await saveOnboarding(DB,'route-user',{data:completeCoach(),revision:0});
  const request=async(path,data,user='route-user')=>{const response=await worker.fetch(new Request('https://coach.test'+path,{method:data?'POST':'GET',headers:{Origin:'https://coach.test','Content-Type':'application/json','oai-authenticated-user-id':user,'X-Target-Account':user,'X-Expected-Data-Epoch':'1'},body:data?JSON.stringify(data):undefined}),env);return {status:response.status,data:await response.json()};};
  for(const mode of ['knee-pushup','high-incline-pushup','low-incline-pushup','pushup'])await DB.prepare('INSERT INTO workouts(id,user_id,mode,goal,started_at,completed_at,value) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),'route-user',mode,5,now-30000,now-10000,5).run();
  const account=await request('/api/account');assert.equal(account.data.progress.exerciseRoute.groups.chest.today,4);assert.equal(account.data.progress.exerciseRoute.groups.chest.next.mode,'wide-pushup');
  // Failed camera openings / abandoned tickets do not consume completed rounds.
  const tickets=await Promise.all(['wide-pushup','slow-pushup'].map(async mode=>{const r=await request('/api/workouts/start',{mode,goal:5});assert.equal(r.status,200);await DB.prepare('UPDATE workouts SET started_at=? WHERE id=?').bind(now-20000,r.data.id).run();return r.data.id;}));
  const replies=await Promise.all(tickets.map(id=>request('/api/workouts/complete',{id,value:5})));
  assert.deepEqual(replies.map(r=>r.status).sort(),[200,409]);
  assert.equal(replies.find(r=>r.status===409).data.code,'daily_round_limit');
  const winning=tickets[replies.findIndex(r=>r.status===200)];assert.equal((await request('/api/workouts/complete',{id:winning,value:5})).status,200);
  const saved=await request('/api/account');assert.equal(saved.data.progress.exerciseRoute.groups.chest.today,5);assert.equal(saved.data.progress.completedSets,5);
  assert.equal((await request('/api/workouts/start',{mode:'decline-pushup',goal:5})).status,409);
  assert.equal((await request('/api/workouts/start',{mode:'shallow-squat',goal:5})).status,200);
  const tomorrow=await readExerciseRoute(DB,'route-user',saved.data.onboarding,now+86400000);assert.equal(tomorrow.groups.chest.today,0);assert.equal(tomorrow.groups.chest.level,saved.data.progress.exerciseRoute.groups.chest.level);
  const other=await request('/api/account',undefined,'someone-else');assert.equal(other.data.progress.exerciseRoute.groups.chest.today,0);assert.equal(other.data.progress.exerciseRoute.groups.chest.level,1);
  // Progression beyond 600 remains startable when the previous round earned it.
  await DB.prepare('INSERT INTO workouts(id,user_id,mode,goal,started_at,completed_at,value) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),'route-user','overhead-tree',600,now-700000,now-30000,600).run();
  assert.equal((await request('/api/workouts/start',{mode:'overhead-tree',goal:601})).status,200);
 }finally{await mf.dispose();}
});

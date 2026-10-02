// Rank 6c (D9/D25/D28): meditation breathing modes, background slot, and the once-per-day step.
import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {Miniflare} from 'miniflare';
import {EXERCISES} from '../exercise-library.mjs';
import {BREATHING_MS,DAY_MS} from '../combat.mjs';
import {startBreathing,completeBreathing} from '../server/combat.mjs';
import {circuitProgress} from '../circuit.mjs';
import {BREATHING_MODES,MODE_IDS,PENDING_WELLNESS_REVIEW,SEATED_ONLY_NOTICE,NO_MEDICAL_CLAIM,GUIDED_ROUND_MS,GUIDED_ROUND_TIMING,GENTLE_DIALOGUE,buildScript,scriptMs,phaseAt} from '../breathing-modes.mjs';
import {WONDER_BACKGROUNDS,WONDERS_PACK,STARTER_WONDERS,wonderAssetPath,backgroundForDay,resolveBackground,todaysBackground,averageRgb} from '../meditation-backgrounds.mjs';

test('two modes live in one data config, flagged pending wellness review, seated-only on the intense one',()=>{
 assert.deepEqual(MODE_IDS,['wim-hof','tai-chi']);
 assert.equal(PENDING_WELLNESS_REVIEW,true);
 assert.equal(BREATHING_MODES['wim-hof'].seatedOnly,true);
 assert.equal(BREATHING_MODES['tai-chi'].seatedOnly,false);
 assert.match(SEATED_ONLY_NOTICE,/seated or lying down/);for(const word of [/driving/,/water/])assert.match(SEATED_ONLY_NOTICE,word);
 assert.match(NO_MEDICAL_CLAIM,/not medical/);assert.doesNotMatch(NO_MEDICAL_CLAIM,/cure|treats|heal|boost|immun/i);
 for(const mode of Object.values(BREATHING_MODES))for(const [key,value] of Object.entries(mode))if(key.endsWith('Ms')||key==='rounds'||key==='breathsPerRound')assert.ok(Number.isFinite(value)&&value>0,`${mode.id}.${key}`);
});

test('the guided round is data-driven and fits its single 3.5-minute active session',()=>{
 assert.ok(BREATHING_MODES['wim-hof'].holdMs<=30000);
 assert.equal(scriptMs(buildScript('wim-hof')),GUIDED_ROUND_MS);
 assert.equal(GUIDED_ROUND_MS,210000);assert.equal(GUIDED_ROUND_TIMING.breaths,30);
 assert.ok(Math.abs(GUIDED_ROUND_TIMING.inhaleMs+GUIDED_ROUND_TIMING.exhaleMs-110000/30)<0.001);
 for(const id of MODE_IDS.slice(1))assert.ok(scriptMs(buildScript(id))<=BREATHING_MS,`${id} script is cut short by the shared clock`);
 assert.throws(()=>buildScript('handstand'),/Unknown breathing mode/);
});

test('tai chi reuses the existing core/balance exercises, not invented stances',()=>{
 const stances=BREATHING_MODES['tai-chi'].stances;
 assert.equal(stances.length,5);
 for(const s of stances){assert.ok(EXERCISES[s.id],s.id);assert.ok(['core','balance'].includes(EXERCISES[s.id].group),s.id);assert.equal(s.name,EXERCISES[s.id].name);}
 const holds=buildScript('tai-chi').filter(p=>p.key==='hold');
 assert.deepEqual(holds.map(p=>p.stanceId),stances.map(s=>s.id));
});

test('phaseAt follows the measured single round timing with optional holds and a normal-breathing finish',()=>{
 const m=BREATHING_MODES['wim-hof'],script=buildScript('wim-hof'),start=m.settleMs,breatheMs=m.breathMs;
 assert.equal(scriptMs(script),GUIDED_ROUND_MS);
 assert.equal(phaseAt(script,0).key,'settle');assert.equal(phaseAt(script,start).key,'breathe');assert.equal(phaseAt(script,start).breath,'in');assert.equal(phaseAt(script,start+m.inhaleMs+1).breath,'out');
 const hold=phaseAt(script,start+breatheMs+m.transitionMs+1000);assert.equal(hold.key,'optional-hold');assert.equal(hold.breath,null);assert.equal(hold.remainingMs,m.holdMs-1000);
 assert.equal(phaseAt(script,start+breatheMs+m.transitionMs+m.holdMs).key,'recovery');
 assert.equal(phaseAt(script,start+breatheMs+m.transitionMs+m.holdMs+m.recoveryInhaleMs).key,'recovery-hold');
 assert.equal(phaseAt(script,scriptMs(script)-1).key,'rest');assert.equal(phaseAt(script,scriptMs(script)).key,'rest');
 assert.equal(phaseAt(buildScript('tai-chi'),0).stanceId,'low-tree');
});

test('timed original encouragement is phase-based and does not reproduce a video script',()=>{
 const script=buildScript('wim-hof');
 assert.ok(script.every(phase=>phase.dialogue==null||GENTLE_DIALOGUE.includes(phase.dialogue)||['optional-hold','transition','recovery-hold'].includes(phase.key)));
 assert.ok(script.some(phase=>phase.dialogue==='Never force it. Breathe normally.'));
 assert.equal(scriptMs(script),GUIDED_ROUND_MS);
});

test('wonder backgrounds: manifest ids, day rotation, neutral placeholder unless a download resolves',async()=>{
 assert.equal(WONDER_BACKGROUNDS.length,48);assert.equal(new Set(WONDER_BACKGROUNDS).size,48);
 assert.equal(wonderAssetPath('petra'),'backgrounds/clean/petra.webp');
 assert.equal(backgroundForDay(['a','b','c'],4),'b');assert.equal(backgroundForDay(['a','b','c'],-1),'c');assert.equal(backgroundForDay([],4),null);
 assert.equal(await resolveBackground('petra'),null);
 assert.equal(await resolveBackground('petra',async()=>{throw Error('not downloaded');}),null);
 let asked;assert.equal(await resolveBackground('petra',async request=>{asked=request;return 'blob:x';}),'blob:x');
 assert.deepEqual(asked,{pack:WONDERS_PACK,path:'backgrounds/clean/petra.webp',id:'petra'});
 assert.equal(averageRgb(new Uint8ClampedArray([10,20,30,255,30,40,50,255])),'rgb(20,30,40)');
});

test('todays background: the downloaded pack copy wins, otherwise the bundled starter wonder for the day',async()=>{
 const day=20718;
 assert.deepEqual(await todaysBackground(undefined,day),{id:STARTER_WONDERS[day%6],url:`/pod/worlds/starter/${STARTER_WONDERS[day%6]}.webp`});
 assert.deepEqual(await todaysBackground(async()=>null,day+1),{id:STARTER_WONDERS[(day+1)%6],url:`/pod/worlds/starter/${STARTER_WONDERS[(day+1)%6]}.webp`});
 assert.deepEqual(await todaysBackground(async({id})=>'blob:'+id,day),{id:WONDER_BACKGROUNDS[day%48],url:'blob:'+WONDER_BACKGROUNDS[day%48]});
});

let mf,database;
before(async()=>{mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB']});database=await mf.getD1Database('DB');for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())for(const sql of (await readFile('drizzle/'+file,'utf8')).split('--> statement-breakpoint').filter(s=>s.trim()))await database.prepare(sql).run();});
after(async()=>mf?.dispose());

test('completing either mode (twice in one day) is one meditation step via the existing completeBreathing path',async()=>{
 const user='meditator',day=23000,t0=day*DAY_MS+1000;
 // Mode is client-side choreography only: both sessions hit the same start/complete endpoints.
 for(let i=0;i<MODE_IDS.length;i++){const activeMs=MODE_IDS[i]==='wim-hof'?GUIDED_ROUND_MS:BREATHING_MS,start=t0+i*(activeMs+60000),ticket=await startBreathing(database,user,start);await completeBreathing(database,user,{id:ticket.id,activeMs},start+activeMs);}
 // Same distinct-day query as server/worker.mjs dailyCircuitProgress.
 const days=(await database.prepare('SELECT DISTINCT CAST(completed_at/86400000 AS INTEGER) AS day FROM breathing_sessions WHERE user_id=? AND completed_at IS NOT NULL').bind(user).all()).results.map(r=>r.day);
 assert.deepEqual(days,[day]);
 const progress=circuitProgress([],days,[],day);
 assert.equal(progress.today.stepDone.meditation,true);assert.equal(progress.today.stepsToday,1);assert.equal(progress.tracks.meditation.steps,1);
 assert.equal(circuitProgress([],days,[],day+1).today.stepDone.meditation,false);
});

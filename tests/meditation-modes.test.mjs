// Rank 6c (D9/D25/D28): meditation breathing modes, background slot, and the once-per-day step.
import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {Miniflare} from 'miniflare';
import {EXERCISES} from '../exercise-library.mjs';
import {BREATHING_MS,DAY_MS} from '../combat.mjs';
import {startBreathing,completeBreathing} from '../server/combat.mjs';
import {circuitProgress} from '../circuit.mjs';
import {BREATHING_MODES,MODE_IDS,PENDING_WELLNESS_REVIEW,SEATED_ONLY_NOTICE,NO_MEDICAL_CLAIM,buildScript,scriptMs,phaseAt} from '../breathing-modes.mjs';
import {WONDER_BACKGROUNDS,WONDERS_PACK,STARTER_WONDERS,wonderAssetPath,backgroundForDay,resolveBackground,todaysBackground,averageRgb} from '../meditation-backgrounds.mjs';

test('two modes live in one data config, flagged pending wellness review, seated-only on the intense one',()=>{
 assert.deepEqual(MODE_IDS,['wim-hof','tai-chi']);
 assert.equal(PENDING_WELLNESS_REVIEW,true);
 assert.equal(BREATHING_MODES['wim-hof'].seatedOnly,true);
 assert.equal(BREATHING_MODES['tai-chi'].seatedOnly,false);
 assert.match(SEATED_ONLY_NOTICE,/Seated only/);for(const word of [/standing/,/driving/,/water/])assert.match(SEATED_ONLY_NOTICE,word);
 assert.match(NO_MEDICAL_CLAIM,/not medical/);assert.doesNotMatch(NO_MEDICAL_CLAIM,/cure|treats|heal|boost|immun/i);
 for(const mode of Object.values(BREATHING_MODES))for(const [key,value] of Object.entries(mode))if(key.endsWith('Ms')||key==='rounds'||key==='breathsPerRound')assert.ok(Number.isFinite(value)&&value>0,`${mode.id}.${key}`);
});

test('conservative placeholder holds: short, and every script fits inside the one shared 3-minute clock',()=>{
 assert.ok(BREATHING_MODES['wim-hof'].holdMs<=30000);
 for(const id of MODE_IDS)assert.ok(scriptMs(buildScript(id))<=BREATHING_MS,`${id} script is cut short by the session clock`);
 assert.throws(()=>buildScript('handstand'),/Unknown breathing mode/);
});

test('tai chi reuses the existing core/balance exercises, not invented stances',()=>{
 const stances=BREATHING_MODES['tai-chi'].stances;
 assert.equal(stances.length,5);
 for(const s of stances){assert.ok(EXERCISES[s.id],s.id);assert.ok(['core','balance'].includes(EXERCISES[s.id].group),s.id);assert.equal(s.name,EXERCISES[s.id].name);}
 const holds=buildScript('tai-chi').filter(p=>p.key==='hold');
 assert.deepEqual(holds.map(p=>p.stanceId),stances.map(s=>s.id));
});

test('phaseAt walks breathe -> hold -> recover, paces breaths, and rests after the script ends',()=>{
 const m=BREATHING_MODES['wim-hof'],script=buildScript('wim-hof'),breatheMs=m.breathsPerRound*(m.inhaleMs+m.exhaleMs);
 assert.equal(phaseAt(script,0).key,'breathe');assert.equal(phaseAt(script,0).breath,'in');assert.equal(phaseAt(script,m.inhaleMs).breath,'out');
 const hold=phaseAt(script,breatheMs+1000);assert.equal(hold.key,'hold');assert.equal(hold.breath,null);assert.equal(hold.remainingMs,m.holdMs-1000);
 assert.equal(phaseAt(script,breatheMs+m.holdMs).key,'recover');
 assert.match(phaseAt(script,scriptMs(script)-1).label,/Round 3 of 3/);
 assert.equal(phaseAt(script,scriptMs(script)).key,'rest');
 assert.equal(phaseAt(buildScript('tai-chi'),0).stanceId,'low-tree');
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
 for(let i=0;i<MODE_IDS.length;i++){const start=t0+i*(BREATHING_MS+60000),ticket=await startBreathing(database,user,start);await completeBreathing(database,user,{id:ticket.id,activeMs:BREATHING_MS},start+BREATHING_MS);}
 // Same distinct-day query as server/worker.mjs dailyCircuitProgress.
 const days=(await database.prepare('SELECT DISTINCT CAST(completed_at/86400000 AS INTEGER) AS day FROM breathing_sessions WHERE user_id=? AND completed_at IS NOT NULL').bind(user).all()).results.map(r=>r.day);
 assert.deepEqual(days,[day]);
 const progress=circuitProgress([],days,[],day);
 assert.equal(progress.today.stepDone.meditation,true);assert.equal(progress.today.stepsToday,1);assert.equal(progress.tracks.meditation.steps,1);
 assert.equal(circuitProgress([],days,[],day+1).today.stepDone.meditation,false);
});

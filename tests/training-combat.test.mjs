import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import vm from 'node:vm';
import {Miniflare} from 'miniflare';
import {EXERCISES} from '../exercise-library.mjs';
import {TRAINING_TRACKS,WEAPON_TRACK,trainingFromWorkouts,trainingFromDaily} from '../weapon-training.mjs';
import {weaponDamage,dayAt,DAY_MS,BREATHING_MS,BreathingSession} from '../combat.mjs';
import {combatProgress,startBreathing,completeBreathing} from '../server/combat.mjs';
let mf,database;
before(async()=>{mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB']});database=await mf.getD1Database('DB');for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())for(const sql of (await readFile('drizzle/'+file,'utf8')).split('--> statement-breakpoint').filter(s=>s.trim()))await database.prepare(sql).run();});
after(async()=>mf?.dispose());
test('all exercises map to ten tracks and all twenty weapons have one category',()=>{assert.equal(Object.keys(TRAINING_TRACKS).length,10);assert.equal(Object.keys(WEAPON_TRACK).length,20);for(const track of Object.values(TRAINING_TRACKS))assert.equal(track.weapons.length,2);for(const exercise of Object.values(EXERCISES))assert.ok(TRAINING_TRACKS[exercise.group]);assert.equal(WEAPON_TRACK.crossbow,'chest');assert.equal(WEAPON_TRACK.gauntlets,'boxing');assert.equal(WEAPON_TRACK.dagger,'stances');assert.equal(WEAPON_TRACK.axe,'balance');});
test('category XP rewards each completed category day once across exercises, retries and imports',()=>{
 const day=20000*DAY_MS,rows=[{id:'a',mode:'pushup',completed_at:day},{id:'b',mode:'knee-pushup',completed_at:day+1000},{id:'a',mode:'pushup',completed_at:day},{id:'c',mode:'pushup',completed_at:day+DAY_MS},{id:'d',mode:'tree',completed_at:day},{id:'e',mode:'boxing',completed_at:null},{id:'f',mode:'unknown',completed_at:day}];
 const p=trainingFromWorkouts(rows);assert.equal(p.chest.totalXp,200);assert.equal(p.chest.completedSets,3);assert.equal(p.balance.totalXp,100);assert.equal(p.boxing.totalXp,0);assert.equal(p.cardio.totalXp,0);
 assert.deepEqual(trainingFromDaily([{mode:'pushup',sets:2,day:20000},{mode:'pushup',sets:1,day:20001},{mode:'tree',sets:1,day:20000}]),p);
});
test('general XP cannot unlock category upgrades and each day is enough without set grinding',async()=>{
 const context={window:{}};vm.runInNewContext(await readFile('workout-tracks.js','utf8'),context);vm.runInNewContext(await readFile('pod/gala-weapons.js','utf8'),context);const W=context.window.GalaWeapons;
 const p={activeDays:999,totalXp:99900,strength:999,trainingVersion:1,training:trainingFromDaily([{mode:'pushup',day:1,sets:1},{mode:'pushup',day:2,sets:1}])};
 assert.equal(W.unlocked({type:'crossbow',tier:1},p),true);assert.equal(W.unlocked({type:'axe',tier:1},p),false);assert.equal(W.unlocked({type:'crossbow',tier:2},p),false);assert.equal(W.unlocked({type:'crossbow',tier:20},{activeDays:999,totalXp:99900,strength:999}),false);assert.equal(W.unlocked({type:'dagger',tier:0},{}),true);
});
test('login streak deduplicates visits, crosses adjacent days and resets after a gap',async()=>{
 const now=21000*DAY_MS+1000;
 assert.equal((await combatProgress(database,'streak',now)).loginStreak,1);
 assert.equal((await combatProgress(database,'streak',now+1000)).loginStreak,1);
 assert.equal((await combatProgress(database,'streak',now+DAY_MS)).loginStreak,2);
 assert.equal((await combatProgress(database,'streak',now+3*DAY_MS)).loginStreak,1);
 assert.equal((await combatProgress(database,'other',now+DAY_MS)).loginStreak,1);
 assert.equal((await database.prepare('SELECT COUNT(*) AS n FROM workouts WHERE user_id=?').bind('streak').first()).n,0);
});
test('a full breathing session is account-owned, timed, idempotent and expires at the next UTC day',async()=>{
 const now=22000*DAY_MS+1000,ticket=await startBreathing(database,'breather',now),value={id:ticket.id,activeMs:BREATHING_MS};
 await assert.rejects(completeBreathing(database,'other',value,now+BREATHING_MS),/not found/);
 await assert.rejects(completeBreathing(database,'breather',value,now+1000),/full three-minute/);
 await assert.rejects(completeBreathing(database,'breather',{...value,activeMs:100},now+BREATHING_MS),/full three-minute/);
 const results=await Promise.all([completeBreathing(database,'breather',value,now+BREATHING_MS),completeBreathing(database,'breather',value,now+BREATHING_MS)]);assert.ok(results.every(r=>r.breathingCompleted));
 assert.equal((await combatProgress(database,'breather',now+DAY_MS)).breathingCompleted,false);
 assert.equal((await database.prepare('SELECT COUNT(*) AS n FROM breathing_sessions WHERE user_id=? AND completed_at IS NOT NULL').bind('breather').first()).n,1);
});
test('damage uses exactly streak × weapon level × 10, with a single daily ×100 bonus',()=>{
 const now=Date.now(),combat={day:dayAt(now),loginStreak:5,breathingCompleted:false};
 assert.equal(weaponDamage(combat,{tier:0},now),50);assert.equal(weaponDamage(combat,{tier:4},now),250);assert.equal(weaponDamage({...combat,breathingCompleted:true},{tier:4},now),25000);assert.equal(weaponDamage(combat,{tier:4},now+DAY_MS),50);assert.equal(weaponDamage(null,{tier:0},now),10);
});
test('breathing timer requires three active minutes; hidden, paused or suspended time does not count',()=>{
 const s=new BreathingSession();s.sample(0,true);s.sample(1000,true);s.sample(2000,false);s.sample(120000,false);s.sample(121000,true);assert.equal(s.elapsed,1000);let now=121000;while(!s.complete){now+=1000;s.sample(now,true);}assert.equal(s.elapsed,BREATHING_MS);s.sample(now+10000,true);assert.equal(s.elapsed,BREATHING_MS);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {LEVEL_XP,levelFor,playerLevel} from '../player-level.mjs';
import {recordPerformanceSession,recordDailyActivity} from '../performance-progress.mjs';
const store=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
test('cosmetic rank uses the 250-level ledger without device baseline resets',()=>{
 const storage=store(),options={storage};
 recordPerformanceSession({id:'saved',mode:'horse',kind:'hold',difficulty:'easy',activeSeconds:15,continuousSeconds:15,xpBase:100},options);
 assert.equal(playerLevel(undefined,storage).xp,100);
 recordDailyActivity('meditation',{},options);recordDailyActivity('food',{},options);
 assert.equal(playerLevel(undefined,storage).xp,700);
 assert.equal(LEVEL_XP.length,250);assert.equal(levelFor(261600).level,250);
 assert.equal(playerLevel({trainingVersion:1,activeDays:999,completedSets:99999},store()).level,1);
});
test('cosmetic XP cannot unlock weapon tiers; each family requires earned performance',()=>{
 const ctx={window:{},MYR5Training:{weaponTierFor:type=>type==='bow'?4:0}};
 vm.runInNewContext(readFileSync(new URL('../pod/gala-weapons.js',import.meta.url),'utf8'),ctx);
 const W=ctx.window.GalaWeapons;
 assert.equal(W.unlocked({type:'bow',tier:4},{xp:1e9}),true);
 assert.equal(W.unlocked({type:'bow',tier:5},{xp:1e9}),false);
 assert.equal(W.unlocked({type:'cannon',tier:1},{xp:1e9}),false);
 assert.equal(W.unlocked({type:'cannon',tier:0}),true);
 assert.match(W.requirements({type:'bow',tier:6}).label,/Medium performance/);
});

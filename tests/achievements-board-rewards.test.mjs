import test from 'node:test';
import assert from 'node:assert/strict';
import {BOSSES,LEVELS,MAX_LEVEL,levelRewardsForBoss} from '../achievements-board.mjs';
import {BOSSES as PASS_BOSSES,bossRewards} from '../battle-pass-rewards.mjs';

test('board reward data follows the battle-pass definitions for every boss and level',()=>{
 assert.deepEqual(BOSSES.map(b=>b.id),PASS_BOSSES.map(b=>b.id));
 assert.equal(MAX_LEVEL,LEVELS.length);
 for(const boss of BOSSES){
  const rewards=levelRewardsForBoss(boss.id);
  assert.deepEqual(rewards,bossRewards(boss.id),boss.id);
  assert.equal(rewards.length,MAX_LEVEL,boss.id);
 }
 assert.equal(levelRewardsForBoss('unknown-boss'),null);
});

test('the detail data names skin and ship grants while preserving shared-boss rewards',()=>{
 const first=levelRewardsForBoss('strider-1');
 assert(first[0].some(item=>item.kind==='creature-skin'&&item.name==='Starforged Plate'));
 assert(first[2].some(item=>item.kind==='ship'&&item.name==='Supportive Ship'));
 assert(first[4].some(item=>item.kind==='ship'&&item.name==='Direct Ship'));
 assert.deepEqual(levelRewardsForBoss('warden-1').map(items=>items.map(item=>item.kind)),[
  ['palette'],['boss-texture'],['palette'],['palette'],['boss-skin']
 ]);
 assert.deepEqual(levelRewardsForBoss('lume-1').map(items=>items.map(item=>item.kind)),[
  ['palette'],['boss-texture'],['palette'],['palette'],['boss-skin']
 ]);
});

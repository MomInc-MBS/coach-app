import assert from 'node:assert/strict';
import test from 'node:test';
import {CHAPTER_COUNT,chapterForLevel,chapterLevels,chapterWorld,chapterCoach,chapterConstellation} from '../level-map-domain.mjs';

test('250 cosmetic thresholds appear once across 25 ten-level chapters',()=>{
 const thresholds=Array.from({length:250},(_,i)=>i*41);
 const all=Array.from({length:CHAPTER_COUNT},(_,page)=>chapterLevels(page,thresholds)).flat();
 assert.equal(all.length,250);
 assert.deepEqual(all.map(row=>row.level),Array.from({length:250},(_,i)=>i+1));
 assert.deepEqual(all.map(row=>row.xp),thresholds);
 assert.equal(chapterForLevel(1),0);
 assert.equal(chapterForLevel(10),0);
 assert.equal(chapterForLevel(11),1);
 assert.equal(chapterForLevel(250),24);
 assert.equal(all[9].tier,'Legendary');
 assert.equal(all[4].tier,'Rare');
});

test('chapter scenery grows and coach constellations preserve requirement order',()=>{
 const coaches=Array.from({length:49},(_,i)=>({id:`coach-${i}`}));
 const chosen=Array.from({length:25},(_,i)=>chapterCoach(i,coaches));
 assert.equal(chosen[0],coaches[0]);
 assert.equal(chosen.at(-1),coaches.at(-1));
 assert.ok(chosen.every((coach,i)=>i===0||Number(coach.id.slice(6))>Number(chosen[i-1].id.slice(6))));
 assert.equal(chapterWorld(0).intensity,0);
 assert.equal(chapterWorld(24).intensity,1);
});

test('every sector has ten spaced nodes and joins its neighbors',()=>{
 for(let chapter=0;chapter<CHAPTER_COUNT;chapter++){
  const {nodes,main,branch,coach}=chapterConstellation(chapter);
  assert.equal(nodes.length,10);
  assert.match(main,/^M 50 0 L /);
  assert.match(main,/ L 50 100$/);
  assert.match(branch,/^M \d+ /);
  assert.ok(nodes.every(({x,y},i)=>x>=16&&x<=84&&y>=8&&y<=92&&(i===0||y-nodes[i-1].y>=9)));
  assert.ok(coach.x===17||coach.x===83);
 }
});

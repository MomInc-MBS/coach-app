import test from 'node:test';
import assert from 'node:assert/strict';
import {PHASES,startPhase,advance,TIERS,promptAt} from '../drop-pod-opening.mjs';

const run=(phase,...events)=>events.reduce(advance,phase);

test('drop-pod sequence runs sky, drop, landed, opened, reveal and then restarts for the next pack',()=>{
 assert.deepEqual([...PHASES],['sky','drop','landed','opened','reveal']);
 assert.equal(startPhase(),'sky');
 assert.equal(run('sky','fall','land','tap','revealed'),'reveal');
 assert.equal(run('reveal','restart'),'sky','Open another restarts from the sky');
 assert.equal(run('sky','land'),'landed','a landing can skip the drop phase');
});

test('the pod only opens once it has landed, and a failed save returns to landed',()=>{
 for(const phase of ['sky','drop','reveal'])assert.equal(advance(phase,'tap'),phase,`no tap during ${phase}`);
 assert.equal(advance('landed','tap'),'opened');
 assert.equal(advance('opened','fail'),'landed','the pod stays closed so the tap can be retried');
 assert.equal(advance('landed','revealed'),'landed','no reveal without opening the pod');
 assert.equal(advance('reveal','restart'),'sky');assert.equal(advance('landed','restart'),'landed','restart only from the reveal');
});

test('skip always lands on the reveal; reduced motion starts with the pod landed',()=>{
 for(const phase of PHASES)assert.equal(advance(phase,'skip'),'reveal');
 assert.equal(startPhase({reduced:true}),'landed');
});

test('each tier reaches the Tap prompt in 4-6 s, Legendary a bit longer and with the bigger impact',()=>{
 for(const tier of Object.keys(TIERS)){const s=promptAt(tier);assert(s>=4&&s<=6.5,`${tier} prompt at ${s}s`);}
 assert(promptAt('legendary')>promptAt('rare')&&promptAt('rare')>promptAt('uncommon'));
 assert(TIERS.legendary.shake>TIERS.rare.shake&&TIERS.rare.shake>TIERS.uncommon.shake);
 assert.deepEqual(Object.fromEntries(Object.entries(TIERS).map(([k,v])=>[k,v.color])),{uncommon:'#76e356',rare:'#4bafff',legendary:'#ff9c36'});
 assert.equal(promptAt('bogus'),promptAt('uncommon'));
});

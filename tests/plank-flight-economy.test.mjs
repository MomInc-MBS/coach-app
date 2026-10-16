import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB} from 'fake-indexeddb';
import {openFlightWallet} from '../arcade/plank-flight/economy.mjs';
import {applyFlightEvidence} from '../arcade/plank-flight/movement.mjs';
test('device rewards deduplicate, reject changed payload and stay owner scoped',async()=>{
 const name='flight-'+crypto.randomUUID(),a=await openFlightWallet({owner:'guest:a',indexedDB,name}),b=await openFlightWallet({owner:'guest:b',indexedDB,name});
 try{await a.record('run',[{id:'coin1',type:'coin',amount:10}]);await a.record('run',[{id:'coin1',type:'coin',amount:10}]);assert.equal((await a.read()).balance,10);await assert.rejects(a.record('run',[{id:'coin1',type:'coin',amount:11}]),/changed/);assert.equal((await b.read()).balance,0);}finally{a.close();b.close();}
});
test('concurrent tab purchases cannot double spend and finish/spin are idempotent',async()=>{
 const name='flight-'+crypto.randomUUID(),a=await openFlightWallet({owner:'guest:a',indexedDB,name}),b=await openFlightWallet({owner:'guest:a',indexedDB,name}),items=[{id:'a',price:75},{id:'b',price:75}];
 try{await a.record('run',[{id:'fund',type:'coin',amount:100},{id:'token',type:'token'}]);const results=await Promise.allSettled([a.buy('a',items),b.buy('b',items)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await a.read()).balance,25);await a.finish('run',123);await a.spin('run');await b.spin('run');assert.equal((await a.read()).balance,50);await assert.rejects(a.record('run',[{id:'late',type:'coin',amount:20}]),/already saved/);}finally{a.close();b.close();}
});
test('only adjacent eligible active evidence increments hold, never pauses or catch-up gaps',()=>{
 const s={started:null,hold:0,totalHold:0,active:0,bestHold:0},p={controlValid:true,exerciseEligible:true,calibrated:true};
 applyFlightEvidence(s,p,0,{allowed:true});applyFlightEvidence(s,p,100,{allowed:true});assert.equal(s.totalHold,.1);
 applyFlightEvidence(s,p,200,{allowed:false});applyFlightEvidence(s,p,300,{allowed:true});assert.equal(s.totalHold,.1);
 applyFlightEvidence(s,p,2000,{allowed:true});assert.equal(s.totalHold,.1);applyFlightEvidence(s,{...p,exerciseEligible:false},2100,{allowed:true});assert.equal(s.hold,0);
});

test('reward redemption recovers abandoned finalized runs while preserving live tokens across tabs and reload',async()=>{
 const name='flight-'+crypto.randomUUID(),options={owner:'guest:a',indexedDB,name};
 const a=await openFlightWallet(options),b=await openFlightWallet(options);
 try{
  await a.record('old',[{id:'t',type:'token',amount:2}]);await a.finish('old',50);
  await a.finish('current',0);await a.record('live',[{id:'t',type:'token',amount:3}]);
  await assert.rejects(a.spin('live'),/Finish/);
  await Promise.all([a.spin('current'),b.spin('old')]);
  const state=await a.read();assert.equal(state.balance,50);assert.equal(state.tokens,3);
  assert.equal(state.runs.old.spinReward,50);assert.equal(state.runs.live.spun,false);
  await a.finish('live',80);await b.spin('current');assert.equal((await a.read()).balance,125);
 }finally{a.close();b.close();}
 const reopened=await openFlightWallet(options);
 try{await reopened.spin('current');const state=await reopened.read();assert.equal(state.balance,125);assert.equal(state.tokens,0);}finally{reopened.close();}
});

test('rank prestige and achievements derive from earned events rather than spendable balance',async()=>{
 const wallet=await openFlightWallet({owner:'guest:a',indexedDB,name:'flight-'+crypto.randomUUID()});
 try{
  let state=await wallet.read();assert.equal(state.rank,1);assert.equal(state.prestige,0);assert.deepEqual(state.achievements,[]);
  await wallet.record('r',[{id:'coins',type:'coin',amount:100},...Array.from({length:9},(_,i)=>({id:'m'+i,type:'mission',amount:3}))]);
  state=await wallet.read();assert.equal(state.rank,10);assert.equal(state.prestige,0);
  await wallet.buy('look',[{id:'look',price:100}],{receipt:'buy'});
  await wallet.record('r',[{id:'rank',type:'mission',amount:3}]);await wallet.finish('r',250);
  state=await wallet.read();assert.equal(state.balance,0);assert.equal(state.rank,1);assert.equal(state.prestige,1);assert.equal(state.rankStarsProgress,0);
  assert.deepEqual(state.achievements,['first-flight','coins-100','distance-250']);
  assert.ok(!state.achievements.includes('balanced-lean'));
 }finally{wallet.close();}
});

test('component days are UTC, nonconsecutive, owner scoped and reward each five days exactly once',async()=>{
 let clock=Date.parse('2026-01-01T23:59:59Z');
 const name='flight-'+crypto.randomUUID(),options={owner:'guest:a',indexedDB,name,now:()=>clock};
 let a=await openFlightWallet(options);const b=await openFlightWallet({...options,owner:'guest:b'});
 try{
  const event={id:'set',type:'component-set'};
  await a.record('first',[event]);clock+=2000;
  await a.record('first',[event]); // Retry after midnight must not fabricate another qualifying day.
  assert.equal((await a.read()).dailyComponents.totalDays,1);
  await a.record('next',[event]);await a.record('same-day',[event]);
  assert.equal((await a.read()).dailyComponents.totalDays,2);
  a.close();a=await openFlightWallet(options);
  for(let i=2;i<10;i++){
   clock=Date.UTC(2026,0,1+i*7);await a.record('day'+i,[event]);await a.record('duplicate-day'+i,[event]);
   if(i===4){const s=await a.read();assert.equal(s.balance,100);assert.equal(s.dailyComponents.progress,0);}
  }
  const s=await a.read();assert.equal(s.balance,200);assert.equal(s.dailyComponents.totalDays,10);assert.equal(s.dailyComponents.rewards,2);assert.equal(s.dailyComponents.progress,0);
  assert.deepEqual(s.achievements,['component-mech']);assert.equal((await b.read()).dailyComponents.totalDays,0);
  await a.finish('first',1);await a.record('first',[event]);assert.equal((await a.read()).balance,200);
  await assert.rejects(a.record('first',[{id:'late',type:'component-set'}]),/already saved/);
 }finally{a.close();b.close();}
});

test('daily reward and achievement updates roll back with a rejected event batch',async()=>{
 let clock=Date.UTC(2026,0,1);
 const wallet=await openFlightWallet({owner:'guest:a',indexedDB,name:'flight-'+crypto.randomUUID(),now:()=>clock});
 try{
  for(let i=0;i<4;i++){clock=Date.UTC(2026,0,i+1);await wallet.record('r'+i,[{id:'set',type:'component-set'}]);}
  clock=Date.UTC(2026,0,5);
  await assert.rejects(wallet.record('bad',[{id:'set',type:'component-set'},{id:'invalid',type:'invented'}]),/Unknown/);
  let s=await wallet.read();assert.equal(s.balance,0);assert.equal(s.dailyComponents.totalDays,4);assert.equal(s.runs.bad,undefined);
  await wallet.record('valid',[{id:'set',type:'component-set'}]);s=await wallet.read();assert.equal(s.balance,100);assert.equal(s.dailyComponents.totalDays,5);
 }finally{wallet.close();}
});

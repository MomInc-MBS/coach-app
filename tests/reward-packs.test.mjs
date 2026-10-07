import test from 'node:test';
import assert from 'node:assert/strict';
const memory=new Map();
globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value)),removeItem:key=>memory.delete(key),clear:()=>memory.clear()};
globalThis.myr5AuthenticatedAccount={user:{id:'reward-test'}};
const {bossRewards,foodRewards}=await import('../battle-pass-rewards.mjs');
const {grantDailyPack,openRewardPack,rollCategory,openedPack,unopenedPacks,PACK_SIZES,packItem,remainingCosmetics,completeCosmeticCollection,hasCosmetic}=await import('../reward-packs.mjs');
const ledger=await import('../unlock-ledger.mjs');
const store=await import('../creature/source/creator/unlock-store.ts');

test('exact category boundaries for every tier',()=>{
 for(const [tier,low,middle] of [['uncommon',90,97],['rare',80,95],['legendary',70,90],['secret',60,80]]){
  assert.equal(rollCategory(tier,()=>0),'color');
  assert.equal(rollCategory(tier,()=>(low-.001)/100),'color');
  assert.equal(rollCategory(tier,()=>low/100),'64-bit');
  assert.equal(rollCategory(tier,()=>(middle-.001)/100),'64-bit');
  assert.equal(rollCategory(tier,()=>middle/100),'texture');
  assert.equal(rollCategory(tier,()=>1),'texture');
 }
});

test('five-step cycle preserves weapons, pet and boss while replacing cosmetic slots',()=>{
 const levels=bossRewards('strider-1');
 assert(levels[0].some(item=>item.kind==='weapon'&&item.id==='chest-w1'));
 assert(levels[1].some(item=>item.kind==='reward-pack'&&item.tier==='uncommon'));
 assert(levels[2].some(item=>item.kind==='weapon'&&item.id==='chest-w2'));
 assert(levels[3].some(item=>item.kind==='pet'));
 assert(levels[3].some(item=>item.kind==='reward-pack'&&item.tier==='rare'));
 assert(!levels.flat().some(item=>item.kind==='boss-skin'),'64-bit boss skin is pack loot');
 assert(levels[4].some(item=>item.kind==='reward-pack'&&item.tier==='legendary'));
 assert(!levels.flat().some(item=>['palette','texture','boss-skin'].includes(item.kind)));
 assert(levels[4].some(item=>item.kind==='boss-unlock'));
 assert(foodRewards()[0].some(item=>item.kind==='reward-pack'&&item.tier==='uncommon'));
});

test('opening is saved once and unlocks in the existing cosmetic store',()=>{
 memory.clear();const item=bossRewards('strider-1')[1].find(item=>item.tier==='uncommon');
 assert.equal(openRewardPack(item,{random:()=>0}),null,'unearned pack cannot open');
 assert(ledger.grantUnlock('reward-pack',item.id));
 const opened=openRewardPack(item,{random:()=>0});
 assert.equal(opened.category,'color');assert.equal(opened.reward.kind,'palette');
 assert(store.isGranted('palette',opened.reward.id));
 assert.deepEqual(openRewardPack(item,{random:()=>.99}),opened,'reopen never rerolls');
 assert.deepEqual(openedPack(item.id),opened);
});

test('daily login grants one Uncommon pack per local calendar day',()=>{
 memory.clear();const date=new Date(2026,8,24,12);const first=grantDailyPack({date,account:globalThis.myr5AuthenticatedAccount});
 assert.equal(first.tier,'uncommon');assert.equal(grantDailyPack({date,account:globalThis.myr5AuthenticatedAccount}),null);
 assert(grantDailyPack({date:new Date(2026,8,25,12),account:globalThis.myr5AuthenticatedAccount}));
});

test('a saved roll repairs an interrupted cosmetic grant without rerolling',()=>{
 memory.clear();const item=bossRewards('strider-1')[1].find(item=>item.tier==='uncommon');
 assert(ledger.grantUnlock('reward-pack',item.id));
 const original=localStorage.setItem;
 localStorage.setItem=(key,value)=>{if(key.startsWith('myr5-unlocks-v2/'))throw Error('quota');original(key,value);};
 try{assert.equal(openRewardPack(item,{random:()=>0}),null);}finally{localStorage.setItem=original;}
 const saved=openedPack(item.id);assert(saved);
 assert(!store.isGranted('palette',saved.reward.id));
 assert(unopenedPacks().includes(item.id),'failed grant remains visible in pack launcher');
 assert.deepEqual(openRewardPack(item,{random:()=>.999}),saved);
 assert(store.isGranted('palette',saved.reward.id));
 assert(!unopenedPacks().includes(item.id),'completed grant leaves pack launcher');
});

test('64-bit rolls award existing boss skins and do not advance boss progress',async()=>{
 memory.clear();const item=bossRewards('strider-1')[3].find(item=>item.tier==='rare');
 assert(ledger.grantUnlock('reward-pack',item.id));
 const {loadProgress}=await import('../battle-pass.mjs');
 const before=loadProgress({tracks:{},account:{onboarding:{data:{profile:{exercises:[]}}}}});
 const result=openRewardPack(item,{random:(()=>{let n=0;return ()=>n++?0:.82;})()});
 assert.equal(result.category,'64-bit');assert.equal(result.reward.kind,'boss-skin');
 assert(ledger.isGranted('boss-skin',store.cosmeticId(result.reward.coachId,result.reward.id)));
 assert.deepEqual(loadProgress({tracks:{},account:{onboarding:{data:{profile:{exercises:[]}}}}}),before);
});

test('tiers award one, two and three distinct coach-specific items',()=>{
 memory.clear();
 for(const tier of Object.keys(PACK_SIZES)){
  const item=packItem(tier,`reward-pack:${tier}:size-test`);ledger.grantUnlock('reward-pack',item.id);
  const result=openRewardPack(item,{random:()=>0});
  assert.equal(result.rewards.length,PACK_SIZES[tier]);
  assert.equal(new Set(result.rewards.map(r=>r.kind+':'+r.coachId+':'+r.id)).size,PACK_SIZES[tier]);
  for(const reward of result.rewards)assert(hasCosmetic(reward));
 }
});

test('ownership stays with its coach, account and account reset epoch',()=>{
 memory.clear();globalThis.myr5AuthenticatedAccount={user:{id:'owner-a'}};
 assert(store.grantUnlock('texture','chest-plate-steel','myr5'));
 assert(!store.isGranted('texture','chest-plate-steel','another-coach'));
 const item=packItem('rare','reward-pack:rare:owner-test');ledger.grantUnlock('reward-pack',item.id);
 const result=openRewardPack(item,{random:()=>0});
 globalThis.myr5AuthenticatedAccount={user:{id:'owner-b'}};
 assert(!store.isGranted('texture','chest-plate-steel','myr5'));
 assert(!ledger.isGranted('reward-pack',item.id));assert.equal(openedPack(item.id),null);
 globalThis.myr5AuthenticatedAccount={user:{id:'owner-a'},dataEpoch:2};
 assert(!store.isGranted('texture','chest-plate-steel','myr5'));assert.equal(openedPack(item.id),null);
 assert(!ledger.isGranted('reward-pack',item.id));
 globalThis.myr5AuthenticatedAccount={user:{id:'owner-a'}};
 assert.deepEqual(openedPack(item.id),result);
 globalThis.myr5AuthenticatedAccount={user:{id:'reward-test'}};
});

test('guest packs and opened rolls survive reload without crossing into accounts',()=>{
 memory.clear();globalThis.myr5AuthenticatedAccount=null;
 const item=packItem('legendary','reward-pack:legendary:guest-test');assert(ledger.grantUnlock('reward-pack',item.id));
 const result=openRewardPack(item,{random:()=>0});assert.equal(result.rewards.length,3);
 assert.deepEqual(openRewardPack(item,{random:()=>.99}),result);
 globalThis.myr5AuthenticatedAccount={user:{id:'reward-test'}};
 assert(!ledger.isGranted('reward-pack',item.id));assert.equal(openedPack(item.id),null);
});

test('every tier odds sum to 100 and Secret doubles the Legendary texture chance',async()=>{
 const {PACK_ODDS}=await import('../reward-packs.mjs');
 assert.deepEqual(Object.keys(PACK_ODDS),Object.keys(PACK_SIZES));
 for(const [tier,odds] of Object.entries(PACK_ODDS))assert.equal(odds.color+odds['64-bit']+odds.texture,100,tier);
 assert.equal(PACK_ODDS.secret.texture,2*PACK_ODDS.legendary.texture);
});

test('a secret pack (vault-style id) opens with 3 items',()=>{
 memory.clear();const item=packItem('secret','reward-pack:secret:hidden-1');assert.equal(item.name,'Secret Pack');
 assert(ledger.grantUnlock('reward-pack',item.id));
 const result=openRewardPack(item,{random:()=>0});assert.equal(result.tier,'secret');assert.equal(result.rewards.length,3);
 assert.deepEqual(openRewardPack(item,{random:()=>.99}),result);
});

test('category exhaustion awards another unowned category instead of a duplicate',()=>{
 memory.clear();const pending=remainingCosmetics();for(const r of pending.filter(r=>r.category==='64-bit'))ledger.grantUnlock(r.kind,store.cosmeticId(r.coachId,r.id));
 const item=packItem('rare','reward-pack:rare:exhaustion');ledger.grantUnlock('reward-pack',item.id);
 const result=openRewardPack(item,{random:()=>.85});assert.equal(result.rewards.length,2);
 assert(result.rewards.every(r=>r.category!=='64-bit'));
});

test('collection completion grants every remaining eligible cosmetic once',()=>{
 memory.clear();const before=remainingCosmetics();assert(before.length>0);
 const result=completeCosmeticCollection();assert.equal(result.granted,before.length);assert.equal(result.remaining,0);
 assert.deepEqual(completeCosmeticCollection(),{granted:0,remaining:0});
 const item=packItem('legendary','reward-pack:legendary:complete');ledger.grantUnlock('reward-pack',item.id);
 assert.equal(openRewardPack(item).complete,true);assert(!unopenedPacks().includes(item.id));
});


test('completion for all 67 coaches uses bounded storage writes, including pending markers',async()=>{
 memory.clear();const {COACHES}=await import('../performance-catalog.mjs');const {readPerformanceProgress,performanceOwner,PERFORMANCE_KEY}=await import('../performance-progress.mjs');
 const state=readPerformanceProgress();state.coaches=COACHES.map(coach=>coach.id);localStorage.setItem(`${PERFORMANCE_KEY}/${performanceOwner()}`,JSON.stringify(state));
 const before=remainingCosmetics();assert(before.length>10000);const write=localStorage.setItem;let writes=0;
 localStorage.setItem=(key,value)=>{writes++;write(key,value);};
 try{const completed=completeCosmeticCollection();assert.equal(completed.granted,before.length);assert.equal(completed.remaining,0);assert(writes<=6,`${writes} writes should be grouped by ledger`);}finally{localStorage.setItem=write;}
});


test('explicit guest grants remain bound to the guest while an account is globally signed in',()=>{
 memory.clear();globalThis.myr5AuthenticatedAccount={user:{id:'signed-in-account'},dataEpoch:3};
 const id='reward-pack:rare:captured-guest';assert(ledger.grantUnlock('reward-pack',id,{account:null}));
 assert(ledger.isGranted('reward-pack',id,{account:null}));assert(!ledger.isGranted('reward-pack',id));
 globalThis.myr5AuthenticatedAccount={user:{id:'another-account'},dataEpoch:4};
 assert(ledger.isGranted('reward-pack',id,{account:null}));assert(!ledger.isGranted('reward-pack',id));
 globalThis.myr5AuthenticatedAccount=null;assert(ledger.isGranted('reward-pack',id));
 globalThis.myr5AuthenticatedAccount={user:{id:'reward-test'}};
});

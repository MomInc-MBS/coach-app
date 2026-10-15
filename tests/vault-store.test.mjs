import test from 'node:test';
import assert from 'node:assert/strict';
const memory=new Map();
globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k),clear:()=>memory.clear()};
globalThis.myr5AuthenticatedAccount={user:{id:'vault-test'}};
const events=[];globalThis.window={dispatchEvent:e=>events.push(e)};globalThis.CustomEvent=class{constructor(type,init){this.type=type;this.detail=init?.detail;}};
const store=await import('../modules/vault/vault-store.mjs');
const ledger=await import('../unlock-ledger.mjs');
const {openRewardPack,PACK_ODDS,packItem,VAULT_PACK,noteVaultPack}=await import('../reward-packs.mjs');
const {COSMETIC_PACK_ODDS}=await import('../progression-rules.mjs');
const ctr=name=>store.read().counters[name]||0;

test('bump twice on the same day counts once; a new day counts again',()=>{
 memory.clear();
 store.bump('dj-session',1,{day:'2026-10-01'});store.bump('dj-session',1,{day:'2026-10-01'});assert.equal(ctr('dj-session'),1);
 store.bump('dj-session',1,{day:'2026-10-02'});assert.equal(ctr('dj-session'),2);
});
test('keyed and max counters',()=>{
 memory.clear();
 store.bump('armie-ignored',1,{key:'a'});store.bump('armie-ignored',1,{key:'a'});store.bump('armie-ignored',1,{key:'b'});assert.equal(ctr('armie-ignored'),2);
 store.bump('arcade-score',12);store.bump('arcade-score',7);assert.equal(ctr('arcade-score'),12);
});
test('new max quest counters reject out-of-range payloads and never regress',()=>{
 memory.clear();
 store.bump('pyramid-level',21);store.bump('fruit-streak',65);store.bump('aura-tier',3.5);store.bump('yoga-hold-seconds',61);
 assert.equal(ctr('pyramid-level'),0);assert.equal(ctr('fruit-streak'),0);assert.equal(ctr('aura-tier'),0);assert.equal(ctr('yoga-hold-seconds'),0);
 store.bump('pyramid-level',5);store.bump('pyramid-level',3);assert.equal(ctr('pyramid-level'),5);
 store.bump('yoga-hold-seconds',22.5);store.bump('yoga-hold-seconds',18);assert.equal(ctr('yoga-hold-seconds'),22.5);
});
test('retired quest completions and claimed packs remain archived and cannot be awarded again',async()=>{
 memory.clear();
 const oldId='grim-time-1',oldPack=`reward-pack:secret:vault-${oldId}`,owner='account:vault-test';
 const state={counters:{},days:{},keys:{},time:{},timeDay:{},secrets:{},earned:{[oldId]:12345}};
 localStorage.setItem(`myr5-vault-v1/${encodeURIComponent(owner)}`,JSON.stringify(state));
 ledger.grantUnlock('reward-pack',oldPack);
 assert.deepEqual(store.evaluate(),[]);
 assert.equal(store.read().earned[oldId],12345);
 assert.ok(ledger.isGranted('reward-pack',oldPack));
 assert.deepEqual(store.archivedCompletions().map(x=>({id:x.id,earned:x.earned,packId:x.packId})),[{id:oldId,earned:12345,packId:oldPack}]);
 assert.deepEqual(window.myr5Vault.earn(oldId),[]);
 assert.equal(store.read().earned[oldId],12345);
});
test('addTime caps grimoire time at 20 min per local day',()=>{
 memory.clear();
 store.addTime('grim-time',15*60000,{day:'d1'});store.addTime('grim-time',15*60000,{day:'d1'});assert.equal(store.read().time['grim-time'],20*60000);
 store.addTime('grim-time',5*60000,{day:'d2'});assert.equal(store.read().time['grim-time'],25*60000);
});
test('markSecret stores the board, earns the goal, grants a vault pack and fires myr5:vault-earned',()=>{
 memory.clear();events.length=0;
 assert.deepEqual(store.markSecret('pond'),['still-pond']);
 assert.ok(store.read().secrets.pond);
 assert.ok(ledger.isGranted('reward-pack','reward-pack:secret:vault-still-pond'));
 assert.deepEqual(events.at(-1).detail.ids,['still-pond']);
 assert.deepEqual(store.markSecret('pond'),[],'repeat does not re-earn');
 assert.deepEqual(store.markSecret('not-a-board'),[]);
});
test('vault packs are secret packs: rare goals give 2 items, legendary 3 with a texture, never 64-bit; other odds untouched',()=>{
 memory.clear();
 assert.deepEqual(PACK_ODDS,COSMETIC_PACK_ODDS);
 assert.deepEqual(VAULT_PACK.odds.secret,{color:75,'64-bit':0});assert.ok(100-VAULT_PACK.odds.secret.color>=2*PACK_ODDS.legendary.texture);
 for(const tier of ['rare','legendary']){
  const item=packItem('secret',`reward-pack:secret:vault-test-${tier}`);noteVaultPack(item.id,tier);ledger.grantUnlock('reward-pack',item.id);
  const opened=openRewardPack(item,{random:()=>0});
  assert.equal(opened.tier,'secret');assert.equal(opened.rewards.length,tier==='legendary'?3:2,tier);
  assert.ok(opened.rewards.every(r=>r.kind!=='boss-skin'),'vault packs never roll 64-bit');
  if(tier==='legendary')assert.ok(opened.rewards.some(r=>r.kind==='texture'),'legendary has >=1 texture');
 }
 const normal=packItem('rare','reward-pack:rare:ordinary');ledger.grantUnlock('reward-pack',normal.id);
 assert.equal(openRewardPack(normal,{random:()=>0}).rewards.length,2);
 const unc=packItem('uncommon','reward-pack:uncommon:ordinary');ledger.grantUnlock('reward-pack',unc.id);
 assert.equal(openRewardPack(unc,{random:()=>0}).rewards.length,1);
});

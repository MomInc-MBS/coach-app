import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

// Node has no localStorage; one in-memory stand-in shared by every module under test.
const memory=new Map();
globalThis.localStorage={getItem:k=>memory.has(k)?memory.get(k):null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k),clear:()=>memory.clear()};

const {levelsBeaten,loadProgress,selectedTracks,setSelectedTracks,battlePassState,syncBattlePass,STEPS_PER_LEVEL}=await import('../battle-pass.mjs');
const {BOSSES,ROWS,bossRewards}=await import('../battle-pass-rewards.mjs');
const store=await import('../creature/source/creator/unlock-store.ts');
const ledger=await import('../unlock-ledger.mjs');

const nobody={onboarding:{data:{profile:{exercises:[]}}}};
const steps=obj=>Object.fromEntries(Object.entries(obj).map(([t,s])=>[t,{steps:s}])); // circuit.mjs track ids
const row=(progress,id)=>BOSSES.filter(b=>b.row===id).map(b=>progress[b.id]);
const fresh=()=>memory.clear();

test('level math at 4/5/24/25/26 steps (stepsPerLevel defaults to 5)',()=>{
 assert.equal(STEPS_PER_LEVEL,5);
 assert.deepEqual([4,5,24,25,26].map(s=>levelsBeaten(s)),[0,1,4,5,5]);
 fresh();setSelectedTracks(['chest']);
 assert.deepEqual([4,5,24,25,26].map(s=>loadProgress({tracks:steps({chest:s})})['strider-1']),[0,1,4,5,5]);
 assert.deepEqual([24,25,26,30].map(s=>loadProgress({tracks:steps({chest:s})})['strider-2']),[0,0,0,1]);
 assert.equal(loadProgress({tracks:steps({chest:10}),stepsPerLevel:2})['strider-1'],5,'one knob retunes it');
});

test('bosses in a row are consecutive: boss k = clamp(level - 5(k-1), 0, 5)',()=>{
 fresh();setSelectedTracks(['chest']);
 assert.deepEqual(row(loadProgress({tracks:steps({chest:65})}),'strider'),[5,5,3,0,0,0]);
 assert.deepEqual(row(loadProgress({tracks:steps({chest:500})}),'strider'),[5,5,5,5,5,5],'a row caps at its last boss');
});

test('same boss ids and order as the board (38 bosses, Warden/Lume shared)',()=>{
 fresh();
 const progress=loadProgress({tracks:{},account:nobody});
 assert.equal(Object.keys(progress).length,38);
 assert.deepEqual(Object.keys(progress),BOSSES.map(b=>b.id));
 assert.deepEqual(ROWS.filter(r=>!r.track).map(r=>r.id),['warden','lume']);
 assert.deepEqual(ROWS.map(r=>r.bosses),[6,5,5,5,1,4,3,4,4,1]);
});

test('only selected paths + meditation progress; explicit pick beats onboarding movements',()=>{
 fresh();
 const account={onboarding:{data:{profile:{exercises:['squat','pushup','boxing','jumping','tree']}}}};
 assert.deepEqual([...selectedTracks(null)],['meditation']);
 assert.deepEqual([...selectedTracks(account)].sort(),['cardio','chest','martial-arts','meditation','quads']);
 const all=steps({chest:25,legs:25,hips:25,shoulders:25,yoga:25,'martial-arts':25,cardio:25,meditation:25});
 const p=loadProgress({tracks:all,account});
 for(const id of ['strider','ringer','cap','stalk','tanka'])assert.equal(row(p,id)[0],5,id);
 for(const id of ['manyarm','wedge','blob'])assert.equal(row(p,id)[0],0,`${id} is not a selected path`);
 assert.deepEqual(setSelectedTracks(['glutes','meditation','nope','glutes']),['glutes']);
 assert.deepEqual([...selectedTracks(account)],['meditation','glutes']);
 const q=loadProgress({tracks:all,account});
 assert.equal(q['manyarm-1'],5);assert.equal(q['strider-1'],0);assert.equal(q['tanka-1'],5);
});

test('Warden then Lume open only once every available row is beaten, fed by overflow',()=>{
 fresh();setSelectedTracks(['yoga']); // rows: blob (4 bosses = 20 levels) + tanka (20 levels)
 const at=(yoga,med)=>loadProgress({tracks:steps({yoga:yoga*5,meditation:med*5})});
 let p=at(19,40);assert.equal(p['warden-1'],0,'yoga row not finished: meditation overflow waits');
 p=at(20,23);assert.deepEqual([p['warden-1'],p['lume-1']],[3,0]);
 p=at(22,26);assert.deepEqual([p['warden-1'],p['lume-1']],[5,3]);
 p=at(40,40);assert.deepEqual([p['warden-1'],p['lume-1']],[5,5]);
});

test('D22 ladder with D16 textures at L1/L3/L5 and D17 special at L3',()=>{
 const kinds=bossRewards('strider-1').map(l=>l.map(i=>i.kind).sort());
 assert.deepEqual(kinds,[['texture','weapon'],['boss-texture','palette'],['special','texture','weapon'],['pet'],['aura','boss-skin','texture']]);
 for(const b of BOSSES.filter(b=>b.track&&b.index===1)){
  const r=bossRewards(b.id);
  assert.deepEqual(r.map(l=>l.filter(i=>i.kind==='texture').length),[1,0,1,0,1],b.id);
  assert.deepEqual(r.map(l=>l.some(i=>i.kind==='special')),[false,false,true,false,false],b.id);
 }
 assert.deepEqual(bossRewards('wedge-1')[0].map(i=>i.id),['arms-w1','arms-hammered-bronze'],'arms-shoulders uses the catalog arms items');
 // D30: later bosses and the shared ones carry only their own boss looks.
 for(const id of ['strider-2','cap-3','warden-1','lume-1'])assert.deepEqual(bossRewards(id).map(l=>l.map(i=>i.kind)),[[],['boss-texture'],[],[],['boss-skin']],id);
 assert.equal(new Set(BOSSES.flatMap(b=>bossRewards(b.id).flat().filter(i=>i.kind!=='pet').map(i=>i.kind+':'+i.id))).size,BOSSES.flatMap(b=>bossRewards(b.id).flat().filter(i=>i.kind!=='pet')).length,'no item appears twice except family pets');
});

test('texture and palette ids exist in materials-registry.ts at the matching pass level',async()=>{
 const out=await build({stdin:{contents:`export {TEXTURES,PALETTES} from './materials-registry';`,resolveDir:join(dirname(fileURLToPath(import.meta.url)),'..','creature','source','creator'),loader:'ts'},bundle:true,format:'esm',platform:'neutral',write:false,target:'es2022'});
 const reg=await import('data:text/javascript;base64,'+Buffer.from(out.outputFiles[0].text).toString('base64'));
 for(const b of BOSSES)bossRewards(b.id).forEach((items,i)=>{for(const item of items){
  if(item.kind==='texture'){const t=reg.TEXTURES.find(t=>t.id===item.id);assert.ok(t,item.id);assert.equal(t.unlockRule,'battle-pass');assert.equal(t.passLevel,i+1,item.id);}
  if(item.kind==='palette'){const p=reg.PALETTES.find(p=>p.id===item.id);assert.ok(p,item.id);assert.equal(p.displayName,item.name);}
 }});
});

test('D21 pets: one per family; the second row of the family gets a palette at L4 instead',()=>{
 fresh();setSelectedTracks(['chest','arms-shoulders']);
 const s=battlePassState({tracks:steps({chest:25,shoulders:25})});
 const l4=id=>s.bosses.find(b=>b.id===id).rewards[3].items.map(i=>i.kind+':'+i.id);
 assert.deepEqual(l4('strider-1'),['pet:push-pet']);
 assert.deepEqual(l4('wedge-1'),['palette:pal-09']);
 const solo=battlePassState({tracks:steps({shoulders:25})});
 assert.deepEqual(solo.bosses.find(b=>b.id==='wedge-1').rewards[3].items.map(i=>i.id),['push-pet'],'whoever reaches L4 first holds the pet');
});

test('sync grants once into the right store, fires myr5:battle-pass only for new unlocks, and persists',()=>{
 fresh();setSelectedTracks(['chest','arms-shoulders']);
 globalThis.window=new EventTarget();
 const events=[];window.addEventListener('myr5:battle-pass',e=>events.push(e.detail));
 const tracks=steps({chest:25,shoulders:25,meditation:4});
 const first=syncBattlePass({tracks});
 assert.equal(events.length,1);
 assert.equal(first.granted.length,events[0].granted.length);
 // Textures/palettes -> unlock-store.ts; everything else -> the ledger.
 assert.ok(store.isGranted('texture','chest-plate-steel')&&store.isGranted('texture','chest-chain-mail')&&store.isGranted('palette','pal-01')&&store.isGranted('palette','pal-09'));
 for(const [kind,id] of [['weapon','chest-w1'],['weapon','arms-w2'],['special','chest-special'],['aura','arms-aura'],['pet','push-pet'],['boss-texture','strider-1-texture'],['boss-skin','wedge-1-skin']])assert.ok(ledger.isGranted(kind,id),id);
 assert.equal(ledger.isGranted('weapon','meditation-w1'),false,'meditation has 0 levels at 4 steps');
 assert.equal(ledger.grantedIds('pet').filter(id=>id==='push-pet').length,1);
 // Idempotent regrant: same steps, nothing new, no event.
 const again=syncBattlePass({tracks});
 assert.equal(again.granted.length,0);assert.equal(events.length,1);
 assert.ok(again.state.bosses.find(b=>b.id==='strider-1').rewards.every(l=>l.items.every(i=>i.granted)));
 // One more step on meditation -> exactly that level's items, one event.
 const next=syncBattlePass({tracks:{...tracks,meditation:{steps:5}}});
 assert.deepEqual(next.granted.map(i=>i.id).sort(),['meditation-sand-garden','meditation-w1']);
 assert.equal(events.length,2);
 // Persistence: plain JSON under the two keys, readable by a fresh page.
 assert.ok(JSON.parse(memory.get('myr5-unlocks-v1')).texture.includes('meditation-sand-garden'));
 assert.ok(JSON.parse(memory.get('myr5-battle-pass-ledger-v1')).weapon.includes('meditation-w1'));
 assert.deepEqual(JSON.parse(memory.get('myr5-selected-tracks-v1')),['chest','arms-shoulders']);
 delete globalThis.window;
});

test('step source: live coachProgress, else the cached progress snapshot',()=>{
 fresh();setSelectedTracks(['cardio']);
 memory.set('myr5-workout-progress-v1',JSON.stringify({version:1,completedSets:0,circuit:{tracks:steps({cardio:12})}}));
 assert.equal(loadProgress()['stalk-1'],2);
 globalThis.coachProgress={circuit:{tracks:steps({cardio:20})}};
 assert.equal(loadProgress()['stalk-1'],4);
 delete globalThis.coachProgress;
});

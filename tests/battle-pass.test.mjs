import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';

// Node has no localStorage; one in-memory stand-in shared by every module under test.
const memory=new Map();
globalThis.localStorage={getItem:k=>memory.has(k)?memory.get(k):null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k),clear:()=>memory.clear()};

const {levelsBeaten,loadProgress,selectedTracks,setSelectedTracks,battlePassState,syncBattlePass,STEPS_PER_LEVEL}=await import('../battle-pass.mjs');
const {BOSSES,ROWS,TRACKS,FOOD_LEVELS,FOOD_BONUS,bossRewards,foodRewards}=await import('../battle-pass-rewards.mjs');
const {FOOD_BONUS_DAMAGE_MULTIPLIER}=await import('../combat-config.mjs');
const {default:PALETTES}=await import('../creature/source/creator/palettes.json',{with:{type:'json'}});
const D32_PALETTES=new Set(PALETTES.filter(p=>p.reward).map(p=>p.id)); // the D32 fill, board + food
const store=await import('../creature/source/creator/unlock-store.ts');
const ledger=await import('../unlock-ledger.mjs');

const nobody={onboarding:{data:{profile:{exercises:[]}}}};
const steps=obj=>Object.fromEntries(Object.entries(obj).map(([t,s])=>[t,{steps:s}])); // circuit.mjs track ids
const row=(progress,id)=>BOSSES.filter(b=>b.row===id).map(b=>progress[b.id]);
const fresh=()=>{memory.clear();globalThis.myr5AuthenticatedAccount={user:{id:'battle-pass-test'}};};
const ALL_TRACKS=['chest','quads','glutes','arms-shoulders','yoga','martial-arts','cardio'];
const allSteps=n=>steps({chest:n,legs:n,hips:n,shoulders:n,yoga:n,'martial-arts':n,cardio:n,meditation:n,food:n});

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
 const kinds=bossRewards('strider-1').map(l=>l.filter(i=>!['creature-skin','ship'].includes(i.kind)).map(i=>i.kind).sort());
 assert.deepEqual(kinds,[['texture','weapon'],['boss-texture','palette'],['special','texture','weapon'],['pet'],['aura','boss-skin','texture']]);
 for(const b of BOSSES.filter(b=>b.track&&b.index===1)){
  const r=bossRewards(b.id);
  assert.deepEqual(r.map(l=>l.filter(i=>i.kind==='texture').length),[1,0,1,0,1],b.id);
  assert.deepEqual(r.map(l=>l.some(i=>i.kind==='special')),[false,false,true,false,false],b.id);
 }
 assert.deepEqual(bossRewards('wedge-1')[0].filter(i=>!['creature-skin','ship'].includes(i.kind)).map(i=>i.id),['arms-w1','arms-hammered-bronze'],'arms-shoulders uses the catalog arms items');
 // D30: later bosses and the shared ones keep their own boss looks; D32 adds a palette at L1/L3/L4.
 for(const id of ['strider-2','cap-3','warden-1','lume-1'])assert.deepEqual(bossRewards(id).map(l=>l.map(i=>i.kind)),[['palette'],['boss-texture'],['palette'],['palette'],['boss-skin']],id);
 assert.equal(new Set(BOSSES.flatMap(b=>bossRewards(b.id).flat().filter(i=>!['pet','ship'].includes(i.kind)).map(i=>i.kind+':'+i.id))).size,BOSSES.flatMap(b=>bossRewards(b.id).flat().filter(i=>!['pet','ship'].includes(i.kind))).length,'no item appears twice except family pets and cycling ships');
});

test('D32: every board boss level has at least one reward, and the fill sits only in the old empty slots',()=>{
 fresh();
 const s=battlePassState({tracks:{},account:nobody});
 assert.equal(s.bosses.length,38);
 for(const b of s.bosses)b.rewards.forEach(l=>assert.ok(l.items.length>=1,`${b.id} L${l.level} is empty`));
 const filled=BOSSES.filter(b=>!b.track||b.index>1);
 assert.equal(filled.length,30,'bosses 2-6 of each row + Warden + Lume');
 for(const b of filled){
  const r=bossRewards(b.id),fill=r.map(l=>l.filter(i=>D32_PALETTES.has(i.id)).map(i=>i.id));
  assert.deepEqual(fill.map(ids=>ids.length),[1,0,1,1,0],b.id);
  fill.forEach((ids,i)=>ids.forEach(id=>assert.equal(PALETTES.find(p=>p.id===id).reward,`${b.id}:L${i+1}`)));
 }
 for(const b of BOSSES.filter(b=>b.track&&b.index===1))assert.ok(!bossRewards(b.id).flat().some(i=>D32_PALETTES.has(i.id)),`${b.id} keeps its old ladder`);
});

test('D22/D16/D17/D21 grants are unchanged where they already existed',()=>{
 for(const b of BOSSES){
 const old=bossRewards(b.id).map(l=>l.filter(i=>!D32_PALETTES.has(i.id)&&!['creature-skin','ship'].includes(i.kind)));
  if(!b.track||b.index>1){assert.deepEqual(old.map(l=>l.map(i=>i.id)),[[],[`${b.id}-texture`],[],[],[`${b.id}-skin`]],b.id);continue;}
  const c=TRACKS[b.track].catalog;
  assert.deepEqual(old.map(l=>l.map(i=>i.kind)),[['weapon','texture'],['palette','boss-texture'],['weapon','special','texture'],['pet'],['aura','boss-skin','texture']],b.id);
  assert.deepEqual([old[0][0].id,old[1][0].id,old[2][0].id,old[2][1].id,old[4][0].id],[`${c}-w1`,TRACKS[b.track].palette,`${c}-w2`,`${c}-special`,`${c}-aura`],b.id);
 }
 assert.deepEqual(bossRewards('strider-1')[1][0],{kind:'palette',id:'pal-01',name:'Morning Mist',line:'Soft start, steady glow'});
});

test('D32 Food: no weapons anywhere; each food level grants a palette + the bonus; progress is in battlePassState()',()=>{
 const every=[...BOSSES.flatMap(b=>bossRewards(b.id).flat()),...foodRewards().flat()];
 assert.ok(!every.some(i=>/^food-/.test(i.id)&&i.kind!=='bonus'),'no food weapon/pet/boss item');
 assert.deepEqual([...new Set(every.filter(i=>i.kind==='weapon').map(i=>i.id.replace(/-w[12]$/,'')))].sort(),['arms','cardio','chest','glutes','martial-arts','meditation','quads','yoga']);
 assert.equal(FOOD_LEVELS,5);
 foodRewards().forEach((items,i)=>{
  assert.deepEqual(items.map(x=>x.kind),['palette','bonus']);
  assert.equal(PALETTES.find(p=>p.id===items[0].id).reward,`food:L${i+1}`);
  assert.deepEqual([items[1].id,items[1].name,items[1].effect],[`food-bonus-${i+1}`,FOOD_BONUS.name,FOOD_BONUS.effect]);
 });
 assert.deepEqual(FOOD_BONUS.effect,{type:'damage-multiplier',days:1,value:FOOD_BONUS_DAMAGE_MULTIPLIER});
 assert.equal(FOOD_BONUS_DAMAGE_MULTIPLIER,1.1,'owner-changeable default');
 fresh();
 assert.deepEqual([0,4,5,24,25,99].map(n=>battlePassState({tracks:steps({food:n}),account:nobody}).food.levels),[0,0,1,4,5,5]);
 const s=battlePassState({tracks:steps({food:12}),account:nobody});
 assert.deepEqual([s.food.steps,s.food.maxLevel,s.food.rewards.map(l=>l.beaten)],[12,5,[true,true,false,false,false]]);
 assert.ok(!s.bosses.some(b=>b.track==='food'),'food needs no board row');
 const first=syncBattlePass({tracks:steps({food:10}),account:nobody});
 assert.deepEqual(first.granted.map(i=>i.id),['pal-103','food-bonus-1','pal-104','food-bonus-2']);
 assert.ok(store.isGranted('palette','pal-104')&&ledger.isGranted('bonus','food-bonus-2'));
 assert.equal(syncBattlePass({tracks:steps({food:10}),account:nobody}).granted.length,0,'idempotent');
 assert.deepEqual(syncBattlePass({tracks:steps({food:15}),account:nobody}).granted.map(i=>i.id),['pal-105','food-bonus-3']);
});

test('full regrant is idempotent: every item on the board + food is granted exactly once',()=>{
 fresh();setSelectedTracks(ALL_TRACKS);
 const first=syncBattlePass({tracks:allSteps(9999)});
 const ids=first.granted.map(i=>i.kind+':'+i.id);
 assert.equal(new Set(ids).size,ids.length,'nothing granted twice in one sync');
 const expected=new Set([...BOSSES.flatMap(b=>bossRewards(b.id).flat()),...foodRewards().flat()].map(i=>i.kind+':'+i.id));
 // D21: the second row of each two-row family gets its substitute palette instead of a second pet.
 for(const id of ['palette:pal-09','palette:pal-10','palette:pal-11'])expected.add(id);
 assert.deepEqual(new Set(ids),expected);
 assert.equal(syncBattlePass({tracks:allSteps(9999)}).granted.length,0);
 assert.equal(JSON.parse(memory.get('myr5-unlocks-v1')).palette.length,11+90+5,'L2 + D21 substitutes + board fill + food');
});

test('old unlock ledgers (pre-D32, no bonus kind) still load and are not regranted',()=>{
 fresh();setSelectedTracks(['chest']);
 memory.set('myr5-battle-pass-ledger-v1',JSON.stringify({weapon:['chest-w1'],pet:[],'boss-texture':[],'boss-skin':[],special:[],aura:[]}));
 memory.set('myr5-unlocks-v1',JSON.stringify({texture:['chest-plate-steel'],color:[],palette:['pal-01','pal-05']}));
 const s=battlePassState({tracks:steps({chest:5,food:5})});
 assert.ok(s.bosses.find(b=>b.id==='strider-1').rewards[0].items.filter(i=>!['creature-skin','ship'].includes(i.kind)).every(i=>i.granted),'old grants read back as granted');
 const {granted}=syncBattlePass({tracks:steps({chest:5,food:5})});
 assert.deepEqual(granted.map(i=>i.id),['creature-starforged-plate','creature-mirror-knight','pal-103','food-bonus-1'],'only the additive L1 skins and new Food level; old L1 items not regranted');
 const led=JSON.parse(memory.get('myr5-battle-pass-ledger-v1'));
 assert.deepEqual([led.weapon,led.bonus],[['chest-w1'],['food-bonus-1']]);
 assert.deepEqual(JSON.parse(memory.get('myr5-unlocks-v1')).palette,['pal-01','pal-05','pal-103'],'aura-milestone grants kept');
});

test('texture and palette ids exist in materials-registry.ts at the matching pass level',async()=>{
 const registry=await readFile(join(process.cwd(),'creature/source/creator/materials-registry.ts'),'utf8');
 const entries=[...registry.matchAll(/\{ id: '([^']+)', name: '[^']+', slot: '(texture-[123])', track: '([^']+)' \}/g)].map(([,id,slot,track])=>({id,slot,track}));
 const slotLevel={'texture-1':1,'texture-2':3,'texture-3':5},reg={TEXTURES:entries.map(item=>({...item,unlockRule:'battle-pass',passLevel:slotLevel[item.slot]})),PALETTES:PALETTES.map(p=>({...p,displayName:p.name}))};
 assert.equal(reg.TEXTURES.length,24,'source registry contains the 24 existing fitness texture placeholders');
 for(const b of BOSSES)bossRewards(b.id).forEach((items,i)=>{for(const item of items){
  if(item.kind==='texture'){const t=reg.TEXTURES.find(t=>t.id===item.id);assert.ok(t,item.id);assert.equal(t.unlockRule,'battle-pass');assert.equal(t.passLevel,i+1,item.id);}
  if(item.kind==='palette'){const p=reg.PALETTES.find(p=>p.id===item.id);assert.ok(p,item.id);assert.equal(p.displayName,item.name);}
 }});
 // D32: every battle-pass palette in the registry is granted by exactly the slot its `reward` names.
 const slots=new Map([...BOSSES.flatMap(b=>bossRewards(b.id).map((items,i)=>[`${b.id}:L${i+1}`,items])),...foodRewards().map((items,i)=>[`food:L${i+1}`,items])]);
 const bp=reg.PALETTES.filter(p=>p.unlockRule==='battle-pass');
 assert.equal(bp.length,95);
 for(const p of bp)assert.ok(slots.get(p.reward)?.some(i=>i.kind==='palette'&&i.id===p.id),`${p.id} -> ${p.reward}`);
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
 assert.deepEqual(next.granted.map(i=>i.id).sort(),['creature-celestial-mosaic','creature-zen-sand','meditation-sand-garden','meditation-w1']);
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

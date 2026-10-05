// Battle-pass read API (rank 6b, D26/D30) — the logic behind the owner's achievements board.
// No screen here. The board imports selectedTracks() and loadProgress() in place of its two
// stand-ins; battlePassState() is the richer read; syncBattlePass() grants what is newly
// earned and fires `myr5:battle-pass` on window. Usage: plan/reports/battle-pass.md.
import {STEPS_PER_LEVEL,STYLE_OF_GROUP} from './circuit.mjs';
import {exerciseFamily} from './workout-route.mjs';
import {ROWS,BOSSES,TRACKS,LEVELS_PER_BOSS,PET_SUBSTITUTE_PALETTE,FOOD_LEVELS,bossRewards,paletteItem,foodRewards} from './battle-pass-rewards.mjs';
import {readSelectedTracks} from './chosen-styles.mjs';
import * as store from './creature/source/creator/unlock-store.ts';
import * as ledger from './unlock-ledger.mjs';
import {readPerformanceProgress} from './performance-progress.mjs';
import {COACH_REQUIREMENTS} from './performance-catalog.mjs';
import {cosmeticLevel} from './progression-rules.mjs';
import {completeCosmeticCollection} from './reward-packs.mjs';
export {setSelectedTracks} from './chosen-styles.mjs';
// The ONE tuning knob: steps per level. Shared with circuit.mjs so the step meter and the board agree.
export {STEPS_PER_LEVEL};

const CIRCUIT_TRACK=Object.fromEntries(Object.entries(TRACKS).map(([track,meta])=>[meta.circuit,track]));
const clamp=n=>Math.min(LEVELS_PER_BOSS,Math.max(0,n));

/** D30: the rows open to this user = their selected paths + meditation (D9), as a Set of D25
 * track ids. Explicit pick (chosen-styles.mjs) wins; until the oval picker writes one, the
 * movements chosen at onboarding stand in (the board's original rule). */
export function selectedTracks(account=globalThis.myr5AuthenticatedAccount){
 let picked=readSelectedTracks();
 if(!picked.length)picked=(account?.onboarding?.data?.profile?.exercises||[]).map(mode=>CIRCUIT_TRACK[STYLE_OF_GROUP[exerciseFamily(mode)]]).filter(Boolean);
 return new Set(['meditation',...picked]);
}

// Rank-6 step counts, keyed by circuit.mjs track id: live account progress, else the snapshot
// pod.mjs caches for reopen (myr5-workout-progress-v1).
function stepTracks(){
 const live=globalThis.coachProgress?.circuit?.tracks;
 if(live)return live;
 try{return JSON.parse(localStorage.getItem('myr5-workout-progress-v1'))?.circuit?.tracks||{};}catch{return {};}
}

/** Whole levels earned from a step count (uncapped; the row caps it). */
export const levelsBeaten=(steps,stepsPerLevel=STEPS_PER_LEVEL)=>Math.floor(Math.max(0,Number(steps)||0)/stepsPerLevel);

/** `{[bossId]: levelsBeaten 0–5}` for all 38 board bosses. Bosses in a row are consecutive:
 * boss k = clamp(level − 5·(k−1), 0, 5). Rows outside selectedTracks() stay at 0. The shared
 * bosses (Warden, then Lume) are fed by levels earned past each available row's end, and only
 * once every available row is fully beaten.
 * opts: {tracks: circuit `tracks` object, account, stepsPerLevel} — all optional. */
export function loadProgress({tracks=stepTracks(),account,stepsPerLevel=STEPS_PER_LEVEL}={}){
 const performance=readPerformanceProgress({account}),result=Object.fromEntries(BOSSES.map(b=>[b.id,0]));
 for(const row of ROWS){if(!row.track)continue;const coaches=COACH_REQUIREMENTS.filter(c=>c.tracks.includes(TRACKS[row.track].catalog));for(let index=0;index<row.bosses;index++){const coach=coaches[Math.min(coaches.length-1,Math.floor(index*coaches.length/row.bosses))];if(coach)result[`${row.id}-${index+1}`]=performance.goldenCoaches.includes(coach.id)?5:performance.coaches.includes(coach.id)?4:0;}}
 return result;
}

/** Combat kit level (1–5, D8/D22) for the rest-arena boss after a set of `mode`: the levels beaten
 * on that exercise's track = its row's first boss in loadProgress(), so a row outside the user's
 * paths fights at L1, same as the board shows it. Core/balance moves sit on Meditation (board rule). */
export function combatLevel(mode,opts={}){
 const track=CIRCUIT_TRACK[STYLE_OF_GROUP[exerciseFamily(mode)]]??'meditation',row=ROWS.find(r=>r.track===track);
 return Math.max(1,loadProgress(opts)[`${row.id}-1`]);
}

const STORE_KINDS=new Set(['texture','color','palette']);
const isGranted=(item,opts)=>(STORE_KINDS.has(item.kind)?store:ledger).isGranted(item.kind,item.id,opts);
function grant(item,opts){
 if(!STORE_KINDS.has(item.kind))return ledger.grantUnlock(item.kind,item.id,opts);
 if(store.isGranted(item.kind,item.id))return false;
 store.grantUnlock(item.kind,item.id);
 return store.isGranted(item.kind,item.id); // false if storage is unavailable
}

/** Richer read: `{stepsPerLevel, available:[track], progress, bosses:[{id,name,row,track,index,
 * levels, rewards:[{level, beaten, items:[{kind,id,name,line,granted}]}]}], food}` in board order.
 * D21 pets: in a two-row family the first available row (board order) to beat L4 of its
 * first boss holds the pet; the other row shows the family's substitute palette there.
 * `food` (D32, no board row): `{steps, levels, maxLevel, rewards}` from food-photo steps; each
 * level's items are a palette + a bonus (`kind:'bonus'`, with `effect`). */
export function battlePassState(opts={}){
 const stepsPerLevel=opts.stepsPerLevel??STEPS_PER_LEVEL,available=selectedTracks(opts.account),progress=loadProgress({...opts,stepsPerLevel});
 const foodSteps=Math.max(0,Number((opts.tracks??stepTracks())?.food?.steps)||0),foodLevels=Math.min(FOOD_LEVELS,levelsBeaten(foodSteps,stepsPerLevel));
 const petOwner=family=>ROWS.find(row=>row.track&&TRACKS[row.track].family===family&&available.has(row.track)&&progress[`${row.id}-1`]>=4)?.id;
 const bosses=BOSSES.map(boss=>({...boss,levels:progress[boss.id],rewards:bossRewards(boss.id).map((items,i)=>({
  level:i+1,beaten:progress[boss.id]>i,
  items:items.map(item=>{
   const owner=item.kind==='pet'&&PET_SUBSTITUTE_PALETTE[item.family]&&petOwner(item.family);
   const shown=owner&&owner!==boss.row?(()=>{const palette=paletteItem(PET_SUBSTITUTE_PALETTE[item.family]);return {kind:'reward-pack',id:`reward-pack:uncommon:${boss.id}:L4:${palette.id}`,tier:'uncommon',name:'Uncommon Pack',line:'Open for one random cosmetic.'};})():item;
   return {...shown,granted:isGranted(shown,opts)};
  }),
 }))}));
 const food={steps:foodSteps,levels:foodLevels,maxLevel:FOOD_LEVELS,rewards:foodRewards().map((items,i)=>({level:i+1,beaten:foodLevels>i,items:items.map(item=>({...item,granted:isGranted(item)}))}))};
 return {stepsPerLevel,available:[...available],progress,bosses,food};
}

/** Grants every beaten level's items not yet granted (idempotent: replaying the same steps
 * grants nothing twice), then, only if something was new, dispatches `myr5:battle-pass` on
 * window with `{granted:[item], state}`. Returns the same `{granted, state}`. */
export function syncBattlePass(opts={}){
 const state=battlePassState(opts),granted=[];
 const rank=cosmeticLevel(readPerformanceProgress(opts).totalXp);
 for(let level=2;level<=rank.level;level++){const tier=level%10===0?'legendary':level%5===0?'rare':'uncommon',item={kind:'reward-pack',id:`reward-pack:${tier}:cosmetic-pass-v2:L${level}`,tier,name:`${tier} pack`};if(ledger.grantUnlock(item.kind,item.id,opts))granted.push(item);}
 if(rank.max)completeCosmeticCollection(opts);
 if(granted.length&&typeof window!=='undefined'&&window.dispatchEvent)window.dispatchEvent(new CustomEvent('myr5:battle-pass',{detail:{granted,state}}));
 return {granted,state};
}

// Grants follow step progress: pod.mjs/launch.mjs publish it as `myr5:account-progress`.
if(typeof window!=='undefined'&&window.addEventListener){window.addEventListener('myr5:account-progress',()=>syncBattlePass());window.addEventListener('myr5:performance-progress',()=>syncBattlePass());}

import {EXERCISES} from './exercise-library.mjs';
import {COACHES,COACH_REQUIREMENTS,STARTER_COACH_IDS,EXCLUDED_COACH_IDS,PATH_INTRO_COACH_IDS,CHOOSABLE_TRACKS,normalizePaths,pathIntroCoachIds,matchingCoaches,exerciseDifficulty,WEAPON_GROUPS,SHIP_REQUIREMENTS,CADENCE_MILESTONES} from './performance-catalog.mjs';
import {holdXp,repXp,performanceMilestones,performanceWeaponTier,coachXpMultiplier,DIFFICULTIES} from './progression-rules.mjs';
export const PERFORMANCE_KEY='myr5-performance-progress-v2';
export function performanceOwner(storage=globalThis.localStorage,account=globalThis.myr5AuthenticatedAccount){
 const id=account?.user?.id;if(id)return `account:${id}${account.dataEpoch!=null?`:${account.dataEpoch}`:''}`;
 if(!storage)return 'guest:unavailable';
 const key='myr5-local-guest-owner-v1';try{let guest=storage.getItem(key);if(!guest){guest=globalThis.crypto?.randomUUID?.()||`guest-${Date.now()}-${Math.random()}`;storage.setItem(key,guest);}return `guest:${guest}`;}catch{return 'guest:unavailable';}
}
export function localDay(time=Date.now()){const date=new Date(time);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
// accessVersion 3: coaches are only the explicit starters plus earned coaches and the two chosen
// path introductions. Older records also held every unplaced coach as an implicit starter.
export const ACCESS_VERSION=3;
const fresh=()=>({version:2,accessVersion:ACCESS_VERSION,paths:[],sessions:{},days:{},coaches:[...STARTER_COACH_IDS],goldenCoaches:[],weapons:{},ships:[],completions:{},totalXp:0,excludedCoaches:[]});
function scope(options={}){const storage=Object.hasOwn(options,'storage')?options.storage:globalThis.localStorage,account=Object.hasOwn(options,'account')?options.account:globalThis.myr5AuthenticatedAccount;return {storage,owner:options.owner??performanceOwner(storage,account)};}
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const finite=v=>Number.isFinite(v)&&v>=0;
const validDay=day=>typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day)&&new Date(`${day}T12:00:00Z`).toISOString().slice(0,10)===day;
const validPaths=p=>Array.isArray(p)&&(p.length===0||(p.length===2&&new Set(p).size===2&&p.every(id=>CHOOSABLE_TRACKS.includes(id))));
/** Shape check for a stored or synced performance record (client cache and server alike). */
export function validPerformanceState(v){return validState(v);}
function validState(v){return v?.version===2&&(v.accessVersion===undefined||v.accessVersion===ACCESS_VERSION)&&(v.paths===undefined||validPaths(v.paths))&&(v.activities===undefined||(object(v.activities)&&Object.values(v.activities).every(a=>object(a)&&['meditation','food'].includes(a.kind)&&validDay(a.day))))&&object(v.sessions)&&object(v.days)&&object(v.weapons)&&object(v.completions)&&Array.isArray(v.coaches)&&v.coaches.every(id=>COACHES.some(c=>c.id===id)||EXCLUDED_COACH_IDS.includes(id))&&new Set(v.coaches).size===v.coaches.length&&Array.isArray(v.goldenCoaches)&&v.goldenCoaches.every(id=>v.coaches.includes(id))&&Array.isArray(v.ships)&&v.ships.every(id=>SHIP_REQUIREMENTS.some(s=>s.id===id))&&Object.values(v.weapons).every(n=>Number.isInteger(n)&&n>=0&&n<=20)&&Object.values(v.completions).every(n=>Number.isSafeInteger(n)&&n>=0)&&Object.entries(v.days).every(([day,d])=>validDay(day)&&object(d)&&finite(d.workoutXp)&&['workout','meditation','food'].every(k=>typeof d[k]==='boolean'))&&Object.values(v.sessions).every(s=>object(s)&&validDay(s.day)&&finite(s.xp)&&finite(s.value)&&finite(s.continuous));}
// Coaches a record has really earned, rebuilt from its own history: the explicit starters, the
// session milestones recordPerformanceSession applies, and completed meditation days.
const CADENCE_COUNT={sprint:CADENCE_MILESTONES.sprintRounds,gentle:CADENCE_MILESTONES.gentleActiveSeconds,pace:CADENCE_MILESTONES.paceActiveSeconds};
function earnedCoaches(state){
 const earned=new Set(STARTER_COACH_IDS),grant=(group,level)=>{for(const coach of matchingCoaches(group,level))earned.add(coach.id);};
 for(const s of Object.values(state.sessions)){
  if(s.kind==='hold'||s.kind==='reps'){
   for(const [level,performance] of s.kind==='hold'?Object.entries(s.perDifficultyContinuous??{[s.difficulty]:s.continuous}):[[s.difficulty,s.value]])
    if(finite(performance)&&performanceMilestones(s.kind,performance).coach)grant(s.group,level);
  }else if(s.kind in CADENCE_COUNT&&s.value>=CADENCE_COUNT[s.kind])grant(s.group,s.difficulty);
 }
 const days=Object.values(state.days).filter(d=>d.meditation).length;
 DIFFICULTIES.forEach((level,i)=>{if(days>=CADENCE_MILESTONES.meditationDays[i])grant('meditation',level);});
 return earned;
}
/** Brings a validated record (client cache or synced copy) to the current access rules, in place.
 * Pre-v3 records are rebuilt from earnedCoaches() plus the chosen paths, so implicit starters are
 * dropped while sessions, days, XP, weapons and ships are untouched. Uses only the record itself. */
export function migratePerformanceAccess(state){
 state.excludedCoaches??=[];for(const id of EXCLUDED_COACH_IDS)if(!state.excludedCoaches.includes(id))state.excludedCoaches.push(id);
 state.paths??=[];
 if(state.accessVersion!==ACCESS_VERSION){
  const keep=new Set([...earnedCoaches(state),...pathIntroCoachIds(state.paths)]);
  state.coaches=COACHES.map(c=>c.id).filter(id=>keep.has(id));state.accessVersion=ACCESS_VERSION;
 }
 state.coaches=state.coaches.filter(id=>!EXCLUDED_COACH_IDS.includes(id));for(const id of STARTER_COACH_IDS)unique(state.coaches,id);
 state.goldenCoaches=state.goldenCoaches.filter(id=>state.coaches.includes(id));
 return state;
}
export function readPerformanceProgress(options={}){try{const {storage,owner}=scope(options),value=JSON.parse(storage?.getItem(`${PERFORMANCE_KEY}/${owner}`)||'null');return validState(value)?recalculate(migratePerformanceAccess(value)):fresh();}catch{return fresh();}}
/** One-time choice of exactly 2 paths (chosen-styles ids) for the options owner; grants and persists
 * their introductory coaches. The same pair is a no-op, a different pair needs options.reset. A reset
 * swaps the introductions (still exactly two) and never revokes earned coaches. */
export function choosePerformancePaths(ids,options={}){
 const paths=normalizePaths(ids);if(paths.length!==2)throw RangeError('Exactly 2 workout paths must be selected.');
 const state=readPerformanceProgress(options);
 if(state.paths.length){if(paths.every(p=>state.paths.includes(p)))return state;if(!options.reset)throw RangeError('Workout paths are already chosen.');}
 const earned=earnedCoaches(state),previous=pathIntroCoachIds(state.paths);
 state.coaches=state.coaches.filter(id=>!previous.includes(id)||earned.has(id));
 for(const id of pathIntroCoachIds(paths))unique(state.coaches,id);
 state.paths=paths;
 return save(state,options);
}
function save(state,options){const {storage,owner}=scope(options);if(!storage)throw Error('Progress storage is unavailable.');storage.setItem(`${PERFORMANCE_KEY}/${owner}`,JSON.stringify(state));if(typeof globalThis.CustomEvent==='function')globalThis.dispatchEvent?.(new CustomEvent('myr5:performance-progress',{detail:{owner,progress:state}}));return state;}
function dayEntry(state,day){if(!validDay(day))throw RangeError('Invalid workout day.');return state.days[day]??=( {workoutXp:0,workout:false,meditation:false,food:false});}
function recalculate(state){state.totalXp=Object.values(state.days).reduce((sum,d)=>sum+d.workoutXp*(d.meditation?2:1)+(d.workout&&d.meditation&&d.food?500:0),0);return state;}
export function recordDailyActivity(kind,{day=localDay(),id}={},options={}){if(!['meditation','food'].includes(kind))throw RangeError('Unknown daily activity.');const state=readPerformanceProgress(options);
 state.activities??={};if(id!=null){if(typeof id!=='string'||!id||['__proto__','constructor','prototype'].includes(id))throw RangeError('Invalid daily activity ID.');const key=`${kind}:${id}`;if(Object.hasOwn(state.activities,key))return state;state.activities[key]={kind,day};}
 dayEntry(state,day)[kind]=true;
 // Existing meditation coaches use completed-day milestones, separate from XP.
 // Three, six, nine and twelve days cover the four difficulty blocks.
 if(kind==='meditation'){const days=Object.values(state.days).filter(d=>d.meditation).length;for(let i=0;i<4;i++)if(days>=CADENCE_MILESTONES.meditationDays[i])for(const coach of matchingCoaches('meditation',['easy','medium','hard','expert'][i]))unique(state.coaches,coach.id);}
 return save(recalculate(state),options);}
const unique=(list,id)=>{if(!list.includes(id))list.push(id);};
export function recordPerformanceSession(record,options={}){
 if(!record||typeof record.id!=='string'||!record.id||['__proto__','constructor','prototype'].includes(record.id))throw RangeError('Saved workout ID is required.');
 const state=readPerformanceProgress(options);if(Object.hasOwn(state.sessions,record.id)||record.preparation||record.earned===false)return state;
 const exercise=EXERCISES[record.mode],kind=record.kind??(exercise?.kind==='hold'?'hold':'reps'),difficulty=record.difficulty??exerciseDifficulty(record.mode),group=exercise?.group??record.group;
 const day=record.day??localDay(record.completedAt??Date.now()),value=Number(record.value??record.activeSeconds??0),continuous=Number(record.maxContinuousSeconds??record.continuousSeconds??0);
 if(!Number.isFinite(value)||value<0||!Number.isFinite(continuous)||continuous<0)throw RangeError('Invalid saved performance.');
 if(kind==='hold'&&continuous>Number(record.activeSeconds??value))throw RangeError('Continuous time cannot exceed active hold time.');
 const holdPerformances=record.perDifficultyContinuous??{[difficulty]:continuous};
 if(kind==='hold'&&(!object(holdPerformances)||Object.entries(holdPerformances).some(([level,seconds])=>!DIFFICULTIES.includes(level)||!finite(seconds))||Object.values(holdPerformances).reduce((sum,seconds)=>sum+seconds,0)>Number(record.activeSeconds??value)+1e-7))throw RangeError('Invalid per-difficulty hold performance.');
 if(kind==='meditation')return recordDailyActivity('meditation',{day,id:record.id},options);
 const earnedCoachCount=record.earnedCoachCount??state.coaches.filter(id=>!STARTER_COACH_IDS.includes(id)).length;
 if(!Number.isSafeInteger(earnedCoachCount)||earnedCoachCount<0||earnedCoachCount>COACH_REQUIREMENTS.length)throw RangeError('Invalid saved coach bonus.');
 const multiplier=coachXpMultiplier(earnedCoachCount);
 let xp=record.xpBase??record.earnedXp;
 if(xp===undefined)xp=kind==='hold'?holdXp({difficulty,to:record.activeSeconds??value}):kind==='reps'?repXp({difficulty,to:Math.floor(value)}):0;
 if(!Number.isFinite(xp)||xp<0)throw RangeError('Invalid workout XP.');
 // Persisted controller totals may include difficulty switches. Bound the raw
 // total by the expert session cap without reassigning those completed segments.
 if(kind==='reps')xp=Math.min(xp,repXp({difficulty:'expert',to:30}));
 if(kind==='hold')xp=Math.min(xp,holdXp({difficulty:'expert',to:1800}));
 // Controllers provide base XP before coach/daily multipliers. A credited ID never earns twice.
 const entry=dayEntry(state,day);entry.workoutXp+=xp*multiplier;entry.workout=true;
 state.sessions[record.id]={mode:record.mode,group,kind,difficulty,value,continuous,day,xp:xp*multiplier,...(kind==='hold'?{perDifficultyContinuous:{...holdPerformances}}:{})};
 if(kind==='hold'||kind==='reps'){
  for(const [performedDifficulty,performance] of kind==='hold'?Object.entries(holdPerformances):[[difficulty,value]]){
  const milestones=performanceMilestones(kind,performance),matches=matchingCoaches(group,performedDifficulty);
  if(milestones.coach)for(const coach of matches)unique(state.coaches,coach.id);
  if(milestones.golden){for(const coach of matches)unique(state.goldenCoaches,coach.id);if(record.coachId&&state.coaches.includes(record.coachId))unique(state.goldenCoaches,record.coachId);}
  const key=`${group}/${kind}/${performedDifficulty}`;
  if(milestones.coach)state.completions[key]=(state.completions[key]??0)+1;
  // The first coach clear keeps the two milestone tiers. Each re-clear upgrades
  // once within this difficulty's five-tier block; a ten-minute hold earns its special.
  const tier=milestones.special?performanceWeaponTier(performedDifficulty,5):milestones.coach?performanceWeaponTier(performedDifficulty,state.completions[key]+1):milestones.weapon2?performanceWeaponTier(performedDifficulty,0)+2:milestones.weapon1?performanceWeaponTier(performedDifficulty,0)+1:0;
  for(const weapon of WEAPON_GROUPS[group]??[])if(tier)state.weapons[weapon]=Math.max(state.weapons[weapon]??0,Math.min(20,tier));
  if(milestones.coach&&performedDifficulty==='expert')for(const ship of SHIP_REQUIREMENTS.filter(s=>s.group===group&&s.kind===kind))unique(state.ships,ship.id);
  }
 }
 if(['sprint','gentle','pace'].includes(kind)){
  const count=kind==='sprint'?Number(record.rounds??value):Number(record.activeSeconds??value),threshold=kind==='sprint'?CADENCE_MILESTONES.sprintRounds:kind==='gentle'?CADENCE_MILESTONES.gentleActiveSeconds:CADENCE_MILESTONES.paceActiveSeconds;
  if(count>=threshold){for(const coach of matchingCoaches(group,difficulty))unique(state.coaches,coach.id);const key=`${group}/${kind}/${difficulty}`;state.completions[key]=(state.completions[key]??0)+1;for(const weapon of WEAPON_GROUPS[group]??[])state.weapons[weapon]=Math.max(state.weapons[weapon]??0,performanceWeaponTier(difficulty,state.completions[key]));}
 }
 return save(recalculate(state),options);
}
export const unlockedCoachIds=(options={})=>readPerformanceProgress(options).coaches;
export const coachAccess=(id,options={})=>unlockedCoachIds(options).includes(id);
export const goldenCoach=(id,options={})=>readPerformanceProgress(options).goldenCoaches.includes(id);
export const weaponTierFor=(type,options={})=>readPerformanceProgress(options).weapons[type]??0;
export const shipAccess=(id,options={})=>readPerformanceProgress(options).ships.includes(id);
/** Call only with the result of the authenticated account reader, never a
 * CustomEvent or user-supplied profile. Pending device-only sessions survive. */
export function mergeVerifiedPerformance(account,{storage=globalThis.localStorage}={}){
 const remote=account?.progress?.performance;if(!remote)return readPerformanceProgress({storage,account});
 if(!account?.user?.id||!Number.isSafeInteger(account.dataEpoch)||account.dataEpoch<1)throw RangeError('Verified account identity is required.');if(!validState(remote))throw RangeError('Invalid synced performance progress.');
 const options={storage,account},local=readPerformanceProgress(options),before=JSON.stringify(local),next=JSON.parse(before),theirs=migratePerformanceAccess(JSON.parse(JSON.stringify(remote)));
 next.sessions={...local.sessions,...remote.sessions};next.days={};
 for(const [day,d] of [...Object.entries(local.days),...Object.entries(remote.days)]){const entry=dayEntry(next,day);entry.food||=d.food;entry.meditation||=d.meditation;}
 for(const session of Object.values(next.sessions)){const entry=dayEntry(next,session.day);entry.workout=true;entry.workoutXp+=session.xp;}
 // Access is rebuilt from the merged history and paths; only non-introduction coaches carry over.
 next.paths=theirs.paths.length?theirs.paths:local.paths;
 const introductions=Object.values(PATH_INTRO_COACH_IDS),want=new Set([...local.coaches,...theirs.coaches].filter(id=>!introductions.includes(id)));
 for(const id of [...earnedCoaches(next),...pathIntroCoachIds(next.paths)])want.add(id);
 next.coaches=[...new Set([...local.coaches,...theirs.coaches,...COACHES.map(c=>c.id)])].filter(id=>want.has(id));
 next.goldenCoaches=[...new Set([...local.goldenCoaches,...theirs.goldenCoaches])].filter(id=>next.coaches.includes(id));next.ships=[...new Set([...local.ships,...remote.ships])];
 for(const [key,value] of Object.entries(remote.weapons))next.weapons[key]=Math.max(next.weapons[key]??0,value);
 for(const [key,value] of Object.entries(remote.completions))next.completions[key]=Math.max(next.completions[key]??0,value);
 next.activities={...(local.activities??{}),...(remote.activities??{})};migratePerformanceAccess(next);recalculate(next);
 return JSON.stringify(next)===before?local:!storage?next:save(next,options);
}
function priorDay(day,offset){const d=new Date(`${day}T12:00:00`);d.setDate(d.getDate()-offset);return localDay(d.getTime());}
export function workoutEligibility(mode,{day=localDay(),kind,...options}={}){const group=EXERCISES[mode]?.group;if(!group)return {allowed:true,reason:null,group:null};const sessions=Object.values(readPerformanceProgress(options).sessions),trained=d=>sessions.some(s=>s.day===d&&s.group===group);if(trained(priorDay(day,1))&&trained(priorDay(day,2)))return {allowed:false,reason:'Your boss is recovering. Take today off this muscle group.',group};if((kind??EXERCISES[mode].kind)==='reps'&&sessions.some(s=>s.day===day&&s.group===group&&s.kind==='reps'))return {allowed:false,reason:'Working set complete for this muscle group today.',group};return {allowed:true,reason:null,group};}

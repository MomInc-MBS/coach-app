import {EXERCISES} from './exercise-library.mjs';
import {STARTER_COACH_IDS,matchingCoaches,exerciseDifficulty,WEAPON_GROUPS,SHIP_REQUIREMENTS,CADENCE_MILESTONES} from './performance-catalog.mjs';
import {holdXp,repXp,performanceMilestones,performanceWeaponTier,coachXpMultiplier} from './progression-rules.mjs';
export const PERFORMANCE_KEY='myr5-performance-progress-v2';
export function performanceOwner(storage=globalThis.localStorage,account=globalThis.myr5AuthenticatedAccount){
 const id=account?.user?.id;if(id)return `account:${id}${account.dataEpoch!=null?`:${account.dataEpoch}`:''}`;
 const key='myr5-local-guest-owner-v1';let guest=storage?.getItem(key);if(!guest){guest=globalThis.crypto?.randomUUID?.()||`guest-${Date.now()}-${Math.random()}`;storage?.setItem(key,guest);}return `guest:${guest}`;
}
export function localDay(time=Date.now()){const date=new Date(time);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
const fresh=()=>({version:2,sessions:{},days:{},coaches:[...STARTER_COACH_IDS],goldenCoaches:[],weapons:{},ships:[],completions:{},totalXp:0});
function scope(options={}){const storage=options.storage??globalThis.localStorage;return {storage,owner:options.owner??performanceOwner(storage,options.account??globalThis.myr5AuthenticatedAccount)};}
export function readPerformanceProgress(options={}){const {storage,owner}=scope(options);try{const value=JSON.parse(storage?.getItem(`${PERFORMANCE_KEY}/${owner}`)||'null');return value?.version===2&&value.sessions&&value.days?value:fresh();}catch{return fresh();}}
function save(state,options){const {storage,owner}=scope(options);if(!storage)throw Error('Progress storage is unavailable.');storage.setItem(`${PERFORMANCE_KEY}/${owner}`,JSON.stringify(state));if(typeof globalThis.CustomEvent==='function')globalThis.dispatchEvent?.(new CustomEvent('myr5:performance-progress',{detail:{owner,progress:state}}));return state;}
function dayEntry(state,day){if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw RangeError('Invalid workout day.');return state.days[day]??=( {workoutXp:0,workout:false,meditation:false,food:false});}
function recalculate(state){state.totalXp=Object.values(state.days).reduce((sum,d)=>sum+d.workoutXp*(d.meditation?2:1)+(d.workout&&d.meditation&&d.food?500:0),0);return state;}
export function recordDailyActivity(kind,{day=localDay(),id}={},options={}){if(!['meditation','food'].includes(kind))throw RangeError('Unknown daily activity.');const state=readPerformanceProgress(options);dayEntry(state,day)[kind]=true;
 // Existing meditation coaches use completed-day milestones, separate from XP.
 // Three, six, nine and twelve days cover the four difficulty blocks.
 if(kind==='meditation'){const days=Object.values(state.days).filter(d=>d.meditation).length;for(let i=0;i<4;i++)if(days>=CADENCE_MILESTONES.meditationDays[i])for(const coach of matchingCoaches('meditation',['easy','medium','hard','expert'][i]))unique(state.coaches,coach.id);}
 return save(recalculate(state),options);}
const unique=(list,id)=>{if(!list.includes(id))list.push(id);};
export function recordPerformanceSession(record,options={}){
 if(!record||typeof record.id!=='string'||!record.id)throw RangeError('Saved workout ID is required.');
 const state=readPerformanceProgress(options);if(state.sessions[record.id]||record.preparation||record.earned===false)return state;
 const exercise=EXERCISES[record.mode],kind=record.kind??(exercise?.kind==='hold'?'hold':'reps'),difficulty=record.difficulty??exerciseDifficulty(record.mode),group=exercise?.group??record.group;
 const day=record.day??localDay(record.completedAt??Date.now()),value=Number(record.value??record.activeSeconds??0),continuous=Number(record.maxContinuousSeconds??record.continuousSeconds??0);
 if(!Number.isFinite(value)||value<0||!Number.isFinite(continuous)||continuous<0)throw RangeError('Invalid saved performance.');
 if(kind==='hold'&&continuous>Number(record.activeSeconds??value))throw RangeError('Continuous time cannot exceed active hold time.');
 if(kind==='meditation')return recordDailyActivity('meditation',{day,id:record.id},options);
 const multiplier=coachXpMultiplier(state.coaches.filter(id=>!STARTER_COACH_IDS.includes(id)).length);
 let xp=record.xpBase??record.earnedXp;
 if(xp===undefined)xp=kind==='hold'?holdXp({difficulty,to:record.activeSeconds??value}):kind==='reps'?repXp({difficulty,to:Math.floor(value)}):0;
 if(!Number.isFinite(xp)||xp<0)throw RangeError('Invalid workout XP.');
 // Controllers provide base XP before coach/daily multipliers. A credited ID never earns twice.
 const entry=dayEntry(state,day);entry.workoutXp+=xp*multiplier;entry.workout=true;
 state.sessions[record.id]={mode:record.mode,group,kind,difficulty,value,continuous,day,xp:xp*multiplier};
 if(kind==='hold'||kind==='reps'){
  const milestones=performanceMilestones(kind,kind==='hold'?continuous:value),matches=matchingCoaches(group,difficulty);
  if(milestones.coach)for(const coach of matches)unique(state.coaches,coach.id);
  if(milestones.golden){for(const coach of matches)unique(state.goldenCoaches,coach.id);if(record.coachId&&state.coaches.includes(record.coachId))unique(state.goldenCoaches,record.coachId);}
  const key=`${group}/${kind}/${difficulty}`;
  if(milestones.coach)state.completions[key]=(state.completions[key]??0)+1;
  const tier=milestones.coach?performanceWeaponTier(difficulty,state.completions[key]):milestones.weapon2?performanceWeaponTier(difficulty,0)+2:milestones.weapon1?performanceWeaponTier(difficulty,0)+1:0;
  for(const weapon of WEAPON_GROUPS[group]??[])if(tier)state.weapons[weapon]=Math.max(state.weapons[weapon]??0,Math.min(20,tier));
  if(milestones.coach&&difficulty==='expert')for(const ship of SHIP_REQUIREMENTS.filter(s=>s.group===group&&s.kind===kind))unique(state.ships,ship.id);
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
function priorDay(day,offset){const d=new Date(`${day}T12:00:00`);d.setDate(d.getDate()-offset);return localDay(d.getTime());}
export function workoutEligibility(mode,{day=localDay(),kind,...options}={}){const group=EXERCISES[mode]?.group;if(!group)return {allowed:true,reason:null,group:null};const sessions=Object.values(readPerformanceProgress(options).sessions),trained=d=>sessions.some(s=>s.day===d&&s.group===group);if(trained(priorDay(day,1))&&trained(priorDay(day,2)))return {allowed:false,reason:'Your boss is recovering. Take today off this muscle group.',group};if((kind??EXERCISES[mode].kind)==='reps'&&sessions.some(s=>s.day===day&&s.group===group&&s.kind==='reps'))return {allowed:false,reason:'Working set complete for this muscle group today.',group};return {allowed:true,reason:null,group};}

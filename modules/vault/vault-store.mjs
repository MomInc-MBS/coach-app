// Achievement Vault store (owner-scoped localStorage `myr5-vault-v1/<owner>`). Every write re-evaluates the goals,
// grants a vault pack per newly earned goal (unlock-ledger, idempotent) and dispatches `myr5:vault-earned {ids}`. No timers.
// Counters follow vault-goals COUNTER_MODES: once per local day by default (anti-farm), 'max', or distinct keys.
import {GOALS,VAULT_GOALS,COUNTER_MODES,SECRET_BOARDS,COACH_CATEGORIES,newlyEarned} from './vault-goals.mjs';
import {performanceOwner,localDay,unlockedCoachIds} from '../../performance-progress.mjs';
import {COACHES,COACH_REQUIREMENTS,EXCLUDED_COACH_IDS} from '../../performance-catalog.mjs';
import {colourRewardPool,textureRewardPool} from '../../battle-pass-rewards.mjs';
import * as cosmetics from '../../creature/source/creator/unlock-store.ts';
import * as ledger from '../../unlock-ledger.mjs';
import {openedPack,noteVaultPack} from '../../reward-packs.mjs';
export const VAULT_KEY='myr5-vault-v1';
const key=()=>`${VAULT_KEY}/${encodeURIComponent(performanceOwner())}`;
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const empty=()=>({counters:{},days:{},keys:{},time:{},timeDay:{},secrets:{},earned:{}});
export function read(){
 try{const d=obj(JSON.parse(localStorage.getItem(key())||'null')),e=empty();for(const k of Object.keys(e))e[k]=obj(d[k]);return e;}catch{return empty();}
}
const write=d=>{try{localStorage.setItem(key(),JSON.stringify(d));return true;}catch{return false;}};
const finite=n=>Number.isFinite(n)?n:0;
/** Collection facts from the real stores, so goal tests stay pure. */
export function snapshot(){
 const out={coachesHave:0,coachesNeed:0,catsHave:{},texturedCoaches:0,coloursHave:0,coloursNeed:0,texturesHave:0,texturesNeed:0,bossSkins:0,vaultPacksOpened:0};
 try{
  const obtainable=COACHES.map(c=>c.id).filter(id=>!EXCLUDED_COACH_IDS.includes(id)),mine=new Set(unlockedCoachIds());
  out.coachesNeed=obtainable.length;out.coachesHave=obtainable.filter(id=>mine.has(id)).length;
  for(const track of Object.keys(COACH_CATEGORIES))out.catsHave[track]=COACH_REQUIREMENTS.filter(r=>r.tracks[0]===track&&mine.has(r.id)).length;
  const textures=cosmetics.ownerGrantedIds('texture'),coachOf=s=>decodeURIComponent(/^coach:([^:]*):/.exec(s)?.[1]||''),idOf=s=>s.replace(/^coach:[^:]*:/,'');
  out.texturedCoaches=new Set(textures.map(coachOf).filter(id=>obtainable.includes(id))).size;
  const colourIds=new Set(colourRewardPool().map(c=>c.id)),textureIds=new Set(textureRewardPool().map(t=>t.id));
  out.coloursNeed=colourIds.size;out.texturesNeed=textureIds.size;
  out.coloursHave=new Set([...cosmetics.ownerGrantedIds('color'),...cosmetics.ownerGrantedIds('palette')].map(idOf).filter(id=>colourIds.has(id))).size;
  out.texturesHave=new Set(textures.map(idOf).filter(id=>textureIds.has(id))).size;
  out.bossSkins=ledger.grantedIds('boss-skin').length;
  out.vaultPacksOpened=ledger.grantedIds('reward-pack').filter(id=>id.includes(':vault-')&&openedPack(id)).length;
 }catch{/* a missing store leaves zeros: goals just stay locked */}
 return out;
}
export const view=(d=read())=>({counters:d.counters,time:d.time,secrets:d.secrets,earned:d.earned,snap:snapshot()});
export const packId=g=>`reward-pack:secret:vault-${g.id}`;
function grant(ids,d){
 const now=Date.now(),done=[];
 for(const id of ids){if(GOALS.some(g=>g.id===id)&&!d.earned[id]){d.earned[id]=now;done.push(id);}}
 if(!done.length||!write(d))return [];
 for(const id of done){const g=GOALS.find(x=>x.id===id);noteVaultPack(packId(g),g.tier);ledger.grantUnlock('reward-pack',packId(g));}
 try{window.dispatchEvent(new CustomEvent('myr5:vault-earned',{detail:{ids:done}}));}catch{/* no window in node */}
 return done;
}
/** Newly earned ids after this call (also grants their packs and fires myr5:vault-earned). */
export function evaluate(d=read()){return grant(newlyEarned(view(d),d.earned),d);}
export function bump(counter,n=1,{key:k,day=localDay()}={}){
 const d=read(),mode=COUNTER_MODES[counter]||'day',add=Math.max(0,finite(n));
 if(mode==='max')d.counters[counter]=Math.max(finite(d.counters[counter]),add);
 else if(mode==='keyed'){if(k==null)return evaluate(d);const keys=Array.isArray(d.keys[counter])?d.keys[counter]:[];if(!keys.includes(String(k)))keys.push(String(k));d.keys[counter]=keys;d.counters[counter]=keys.length;}
 else{if(d.days[counter]===day)return evaluate(d);d.days[counter]=day;d.counters[counter]=finite(d.counters[counter])+add;}
 write(d);return evaluate(d);
}
/** Visible-time counter in ms, capped per local day (VAULT_GOALS.timeCapMinutesPerDay). */
export function addTime(counter,ms,{day=localDay()}={}){
 const d=read(),cap=VAULT_GOALS.timeCapMinutesPerDay*60000,t=obj(d.timeDay[counter]),used=t.day===day?finite(t.ms):0,add=Math.max(0,Math.min(finite(ms),cap-used));
 if(add>0){d.time[counter]=finite(d.time[counter])+add;d.timeDay[counter]={day,ms:used+add};write(d);}
 return evaluate(d);
}
export function markSecret(board){
 if(!SECRET_BOARDS.includes(board))return [];
 const d=read();if(!d.secrets[board]){d.secrets[board]=Date.now();write(d);}
 return evaluate(d);
}
export const state=()=>view();
// Raw-served files (portal, pond) cannot import this module, and the arcade/war-room pages never load it: they send `myr5:vault-bump`
// {counter,n,key|ms} or queue [counter,n,key] in `myr5-vault-pending`, drained here at load.
export function drainPending(){try{const q=JSON.parse(localStorage.getItem('myr5-vault-pending')||'[]');localStorage.removeItem('myr5-vault-pending');for(const [c,n,k] of Array.isArray(q)?q:[])bump(c,n,{key:k});}catch{/* none */}}
if(typeof window!=='undefined'){window.addEventListener?.('myr5:vault-bump',e=>{const {counter,n,key,ms}=e.detail||{};if(typeof counter!=='string')return;ms!=null?addTime(counter,ms):bump(counter,n,{key});});drainPending();}
if(typeof window!=='undefined')window.myr5Vault={earn:id=>grant([id],read()),reset:()=>{try{localStorage.removeItem(key());}catch{/* private mode */}},state,bump,addTime,markSecret,evaluate};

// Workout progress is earned by completed tracked sets. Rest taps never earn XP.
export const XP_PER_SET=25,XP_PER_LEVEL=100;
export const COACH_HEALTH=1_000_000_000,REST_IDLE_MS=3000;
import {weaponDamage} from '../combat.mjs';
import {EXERCISES} from '../exercise-library.mjs';
import {AbilityCooldown} from './weapon-evolution.mjs';
export const DEFAULT_GOALS={...Object.fromEntries(Object.values(EXERCISES).map(m=>[m.id,m.defaultGoal])),squat:3,pushup:3,tree:9,warrior:9,horse:9,boxing:9,jogging:3,jumping:3};
export const valueOf=m=>m.kind==='hold'?m.totalHold:m.kind==='pace'?(m.active??0):m.count;
export function readProgress(raw){
 // circuit is a cached mirror of the server-computed daily-circuit payload (circuit.mjs),
 // kept alongside completedSets so the circuit meter can render on reopen before the next
 // myr5:account-progress event lands (Rank 6: "progress survives app close/reopen mid-circuit").
 try{const p=typeof raw==='string'?JSON.parse(raw):raw;if(p?.version===1&&Number.isSafeInteger(p.completedSets)&&p.completedSets>=0)return {version:1,completedSets:Math.min(p.completedSets,1000000),circuit:p.circuit&&typeof p.circuit==='object'?p.circuit:null};}catch{}
 return {version:1,completedSets:0,circuit:null};
}
export class SetFlow {
 constructor(progress=null,{cooldown=null,now=Date.now()}={}){this.progress=readProgress(progress);this.phase='pod';this.sequence=0;this.active=null;this.preview=false;this.restUntil=0;this.hits=0;this.damage=0;this.lastTap=-Infinity;this.lastRestInteraction=-Infinity;this.abilities=new AbilityCooldown(cooldown,now);}
 get xp(){return this.progress.completedSets*XP_PER_SET;}
 get level(){return 1+Math.floor(this.xp/XP_PER_LEVEL);}
 get coachHealth(){return Math.max(0,COACH_HEALTH-this.damage);}
 touchRest(now=Date.now()){if(this.phase==='rest')this.lastRestInteraction=Math.max(this.lastRestInteraction,now);}
 shouldEndRest(now=Date.now()){return this.phase==='rest'&&now>=Math.max(this.restUntil,this.lastRestInteraction)+REST_IDLE_MS;}
 get attackDamage(){return weaponDamage(this.combat,this.weapon);}
 start(mode,goal=DEFAULT_GOALS[mode],restSeconds=60){
  if(!Object.hasOwn(DEFAULT_GOALS,mode))throw new Error('Unknown exercise');
  this.active={id:++this.sequence,mode,goal:Math.max(1,Number(goal)||DEFAULT_GOALS[mode]),restSeconds:Math.max(15,Math.min(180,Number(restSeconds)||60))};this.phase='set';this.preview=false;return this.active;
 }
 consume(m,now){
  if(this.phase!=='set'||!this.active||m.mode!==this.active.mode)return null;
  const reached=valueOf(m)>=this.active.goal;
  if(!reached)return null;
  // Timed boxing needs observed hand movement, not simply an unattended timer.
  const earned=m.kind!=='pace'||m.active>0;
  if(earned)this.progress.completedSets++;
  this.phase='rest';this.preview=false;this.restUntil=now+this.active.restSeconds*1000;this.hits=0;this.damage=0;this.lastTap=-Infinity;this.lastRestInteraction=-Infinity;
  return {mode:m.mode,name:m.name,value:valueOf(m),goal:this.active.goal,earned,xp:earned?XP_PER_SET:0,level:this.level,set:this.progress.completedSets};
 }
 previewRest(now,seconds=60){this.phase='rest';this.preview=true;this.restUntil=now+seconds*1000;this.hits=0;this.damage=0;this.lastTap=-Infinity;this.lastRestInteraction=-Infinity;}
 remaining(now){return Math.max(0,Math.ceil((this.restUntil-now)/1000));}
 extend(seconds=30,now=Date.now()){if(this.phase==='rest')this.restUntil=Math.max(this.restUntil,now)+seconds*1000;}
 tap(now,withHand=false){this.touchRest(now);if(this.phase!=='rest'||now-this.lastTap<180)return null;this.lastTap=now;this.hits++;const assisted=withHand&&this.hits%3===0,damage=weaponDamage(this.combat,this.weapon,now);this.damage+=damage;return {hits:this.hits,damage,totalDamage:this.damage,blocked:damage===0,assisted,charge:withHand?this.hits%3:0};}
 special(weapon,{now=Date.now(),progress,catalog}={}){this.touchRest(now);const result=this.abilities.activate(weapon,{now,progress,catalog,inRest:this.phase==='rest'});if(!result.ok)return result;const damage=weaponDamage(this.combat,weapon,now);this.damage+=damage;return {...result,special:true,assisted:false,damage,totalDamage:this.damage,blocked:damage===0,hits:this.hits};}
 leave(){this.phase='pod';this.active=null;}
}

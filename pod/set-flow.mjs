// Workout progress is earned by completed tracked sets. Rest taps never earn XP.
export const DAMAGE_LEVEL=50,XP_PER_SET=25,XP_PER_LEVEL=100;
export const DEFAULT_GOALS={squat:10,pushup:10,tree:30,warrior:30,horse:30,boxing:60,jogging:40,jumping:10};
export const valueOf=m=>m.kind==='hold'?m.totalHold:m.kind==='pace'?m.elapsed:m.count;
export function readProgress(raw){
 try{const p=typeof raw==='string'?JSON.parse(raw):raw;if(p?.version===1&&Number.isSafeInteger(p.completedSets)&&p.completedSets>=0)return {version:1,completedSets:Math.min(p.completedSets,1000000)};}catch{}
 return {version:1,completedSets:0};
}
export class SetFlow {
 constructor(progress=null){this.progress=readProgress(progress);this.phase='pod';this.sequence=0;this.active=null;this.preview=false;this.restUntil=0;this.hits=0;this.damage=0;this.lastTap=-Infinity;}
 get xp(){return this.progress.completedSets*XP_PER_SET;}
 get level(){return 1+Math.floor(this.xp/XP_PER_LEVEL);}
 get attackDamage(){return this.level<DAMAGE_LEVEL?0:1+Math.floor((this.level-DAMAGE_LEVEL)/5);}
 start(mode,goal=DEFAULT_GOALS[mode],restSeconds=60){
  if(!Object.hasOwn(DEFAULT_GOALS,mode))throw new Error('Unknown exercise');
  this.active={id:++this.sequence,mode,goal:Math.max(1,Math.min(600,Number(goal)||DEFAULT_GOALS[mode])),restSeconds:Math.max(15,Math.min(180,Number(restSeconds)||60))};this.phase='set';this.preview=false;return this.active;
 }
 consume(m,now){
  if(this.phase!=='set'||!this.active||m.mode!==this.active.mode)return null;
  const reached=valueOf(m)>=this.active.goal;
  if(!reached)return null;
  // Timed boxing needs observed hand movement, not simply an unattended timer.
  const earned=m.kind!=='pace'||m.active>0;
  if(earned)this.progress.completedSets++;
  this.phase='rest';this.preview=false;this.restUntil=now+this.active.restSeconds*1000;this.hits=0;this.damage=0;this.lastTap=-Infinity;
  return {mode:m.mode,name:m.name,value:valueOf(m),goal:this.active.goal,earned,xp:earned?XP_PER_SET:0,level:this.level,set:this.progress.completedSets};
 }
 previewRest(now,seconds=60){this.phase='rest';this.preview=true;this.restUntil=now+seconds*1000;this.hits=0;this.damage=0;this.lastTap=-Infinity;}
 remaining(now){return Math.max(0,Math.ceil((this.restUntil-now)/1000));}
 extend(seconds=30,now=Date.now()){if(this.phase==='rest')this.restUntil=Math.max(this.restUntil,now)+seconds*1000;}
 tap(now){if(this.phase!=='rest'||now-this.lastTap<180)return null;this.lastTap=now;this.hits++;this.damage+=this.attackDamage;return {hits:this.hits,damage:this.attackDamage,totalDamage:this.damage,blocked:this.attackDamage===0};}
 leave(){this.phase='pod';this.active=null;}
}

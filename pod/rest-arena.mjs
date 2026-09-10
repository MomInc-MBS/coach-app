import {GALA_KEY,loadGala} from './identity.mjs';
import {abilityFor,evolution} from './weapon-evolution.mjs';
import {drawAnimatedWeapon} from './weapon-animator.mjs';
export const MELEE=new Set(['rapier','greatsword','dagger','spear','trident','scythe','gauntlets']);
export function equipmentProgress(value={}){return {activeDays:Math.max(0,Number(value.activeDays)||0),totalXp:Math.max(0,Number(value.activeDays)||0)*100,strength:1+Math.floor(Math.max(0,Number(value.completedSets)||0)/4),...(value.trainingVersion===1?{trainingVersion:1,training:value.training}:{})};}

export function initRestArena(){
 const A=window.GalaAvatar,W=window.GalaWeapons,canvas=document.getElementById('restAvatar'),scene=document.querySelector('.encounter');
 const fx=document.getElementById('restWeaponFx'),type=document.getElementById('weaponType'),tier=document.getElementById('weaponTier'),note=document.getElementById('weaponStatus');
 const body=document.createElement('canvas'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let progress=equipmentProgress(),look=null,equipped={type:'rapier',tier:0},running=false,frame=0,last=0,action=null,queued=false;
 let anchor={x:0,y:0,scale:1},lastWeapon='';
 canvas.width=160;canvas.height=168;
 window.GalaProgress={read:()=>progress};
 for(const item of W.types){const option=document.createElement('option');option.value=item.id;option.textContent=item.name+' · '+W.requirements({type:item.id,tier:0}).label;type.append(option);}
 function measure(){
  const bounds=scene.getBoundingClientRect(),avatar=canvas.getBoundingClientRect();
  if(!bounds.width||!bounds.height)return;
  const ratio=Math.min(1,Math.max(320,Math.round(bounds.width/2))/bounds.width);
  fx.width=Math.round(bounds.width*ratio);fx.height=Math.round(bounds.height*ratio);
  anchor={x:(avatar.left+avatar.width*.78-bounds.left)*ratio,y:(avatar.top+avatar.height*.48-bounds.top)*ratio,scale:ratio*1.15};
 }
 function load(){
  try{look=loadGala(localStorage,A).look;}catch{look=structuredClone(A.defaultLook);}
  const selected=look.weapon||{type:'rapier',tier:0};
  equipped=W.unlocked(selected,progress)?selected:{type:selected.type,tier:0};
  const key=equipped.type+':'+equipped.tier;if(lastWeapon!==key){action=null;queued=false;lastWeapon=key;}
  A.draw(body,look,{base:false,weapon:false,prop:false});type.value=selected.type;tier.replaceChildren();
  for(let i=0;i<W.tiers.length;i++){const item={type:selected.type,tier:i},option=document.createElement('option'),r=W.requirements(item);option.value=i;option.disabled=!W.unlocked(item,progress);option.textContent=W.tiers[i]+(option.disabled?` · ${r.xp} ${r.label} XP`:'');tier.append(option);}
  tier.value=equipped.tier;const ability=abilityFor(equipped);
  const track=W.requirements(equipped),earned=W.trainingProgress(equipped,progress);
  note.textContent=`${track.label} · ${earned.totalXp} XP · `+(ability?`${ability.name} · ${ability.cooldownMs/1000}s`:'Special at tier 4');
  if(selected.tier!==equipped.tier)note.textContent+=' Upgrade not yet earned.';
  document.getElementById('restWeaponName').textContent=W.types.find(w=>w.id===equipped.type).name;
  scene.dataset.weapon=MELEE.has(equipped.type)?'melee':'ranged';scene.classList.add('weapon-evolution');
  scene.style.setProperty('--weapon-energy',evolution(equipped).energy);
  measure();draw(performance.now());
 }
 function equip(){try{const next={type:type.value,tier:Number(tier.value)};if(!W.unlocked(next,progress))return;localStorage.setItem(GALA_KEY,JSON.stringify({...look,weapon:next}));window.dispatchEvent(new Event('mominc-avatar-change'));}catch{note.textContent='Could not save this weapon.';}}
 type.addEventListener('change',()=>{if(!W.unlocked({type:type.value,tier:Number(tier.value)},progress))tier.value='0';equip();});tier.addEventListener('change',equip);
 function duration(){return action?.special?abilityFor(equipped)?.animationMs||1100:evolution(equipped).attackMs;}
 function draw(now){
  if(action&&now-action.startedAt>=duration()){action=queued?{startedAt:now,special:false}:null;queued=false;}
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,160,168);ctx.imageSmoothingEnabled=false;
  const pulse=action&&!reduced.matches?Math.sin(Math.min(1,(now-action.startedAt)/duration())*Math.PI):0;
  ctx.drawImage(body,26+pulse*4,14-pulse*5,96,144);
  const effects=fx.getContext('2d');effects.clearRect(0,0,fx.width,fx.height);
  effects.save();effects.translate(anchor.x,anchor.y);effects.rotate(-Math.PI/2-.13);
  drawAnimatedWeapon(effects,equipped,{weapons:W,x:0,y:0,scale:anchor.scale,now,action,reducedMotion:reduced.matches});
  effects.restore();
 }
 function tick(now){frame=0;if(!running||document.hidden)return;if(now-last>(reduced.matches?100:32)){draw(now);last=now;}frame=requestAnimationFrame(tick);}
 function start(){running=true;load();if(!frame)frame=requestAnimationFrame(tick);}
 function stop(){running=false;action=null;queued=false;if(frame)cancelAnimationFrame(frame);frame=0;scene.classList.remove('team-strike');}
 const visibility=()=>{if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0;}else if(running&&!frame){measure();frame=requestAnimationFrame(tick);}};
 const account=event=>{progress=equipmentProgress(event.detail);load();};
 const resize=new ResizeObserver(measure);resize.observe(scene);
 window.addEventListener('myr5:account-progress',account);window.addEventListener('mominc-avatar-change',load);document.addEventListener('visibilitychange',visibility);load();
 return {load,start,stop,get weapon(){return {...equipped};},get progress(){return {...progress};},attack(hit){
   const now=performance.now();
   // A special finishes even if the user continues tapping. One queued basic
   // preserves follow-through instead of restarting every windup.
   if(!hit.special&&action&&now-action.startedAt<duration()){
    if(action.special||now-action.startedAt<duration()*.6){queued=true;return;}
   }
   action={startedAt:now,special:!!hit.special};queued=false;
   scene.classList.toggle('team-strike',!!hit.assisted);draw(now);
  },dispose(){stop();resize.disconnect();window.removeEventListener('myr5:account-progress',account);window.removeEventListener('mominc-avatar-change',load);document.removeEventListener('visibilitychange',visibility);type.removeEventListener('change',equip);tier.removeEventListener('change',equip);}};
}

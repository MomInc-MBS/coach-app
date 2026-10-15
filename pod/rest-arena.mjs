import {GALA_KEY,loadGala} from './identity.mjs';
import {abilityFor,evolution} from './weapon-evolution.mjs';
import {drawAnimatedWeapon} from './weapon-animator.mjs';
import {createOptionalModuleLoader} from '../arcade/workout-effects-state.mjs';
const loadPowerState=createOptionalModuleLoader('/arcade/power/avatar-power.mjs');
const loadPowerRenderer=createOptionalModuleLoader('/arcade/power/power.mjs');
const loadBlizzardRenderer=createOptionalModuleLoader('/arcade/hold/blizzard.mjs');
export const MELEE=new Set(['rapier','greatsword','dagger','spear','trident','scythe','gauntlets']);
export function equipmentProgress(value={}){return {activeDays:Math.max(0,Number(value.activeDays)||0),totalXp:Math.max(0,Number(value.activeDays)||0)*100,completedSets:Math.max(0,Number(value.completedSets)||0),strength:1+Math.floor(Math.max(0,Number(value.completedSets)||0)/4),...(value.trainingVersion===1?{trainingVersion:1,training:value.training}:{})};}

export function initRestArena(){
 const A=window.GalaAvatar,W=window.GalaWeapons,canvas=document.getElementById('restAvatar'),scene=document.querySelector('.encounter');
 const fx=document.getElementById('restWeaponFx'),type=document.getElementById('weaponType'),tier=document.getElementById('weaponTier'),note=document.getElementById('weaponStatus'),bar=document.getElementById('weaponLevelBar');
 const body=document.createElement('canvas'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let progress=equipmentProgress(),look=null,equipped={type:'rapier',tier:0},running=false,frame=0,last=0,action=null,queued=false;
 let powerRecord={version:1,equipped:null,styles:{}},powerOwnerId=null,powerFingerprint='',powerModule=null,powerRenderer=null,blizzardModule=null,powerSchedule=null,powerLoading=null,powerLoadToken=0,powerTime=0,powerPulse=0,lastPowerAt=0,powerArt=null,powerArtCtx=null;
 let anchor={x:0,y:0,scale:1},lastWeapon='';
 canvas.width=160;canvas.height=168;
 window.GalaProgress={read:()=>progress};
 for(const item of W.types){const option=document.createElement('option');option.value=item.id;option.textContent=item.name;type.append(option);}
 function measure(){
  const bounds=scene.getBoundingClientRect(),avatar=canvas.getBoundingClientRect();
  if(!bounds.width||!bounds.height)return;
  const ratio=Math.min(1,Math.max(320,Math.round(bounds.width/2))/bounds.width);
  fx.width=Math.round(bounds.width*ratio);fx.height=Math.round(bounds.height*ratio);
  anchor={x:(avatar.left+avatar.width*.78-bounds.left)*ratio,y:(avatar.top+avatar.height*.48-bounds.top)*ratio,scale:ratio*1.15};
 }
 const hasPower=()=>!!powerRecord.styles?.[powerRecord.equipped];
 function resetPower(){powerSchedule?.reset();powerTime=0;powerPulse=0;lastPowerAt=0;}
 function makePowerArt(){if(powerArtCtx)return;powerArt=document.createElement('canvas');powerArt.width=160;powerArt.height=168;powerArtCtx=powerArt.getContext('2d',{alpha:true});if(!powerArtCtx){powerArt=null;return;}powerArtCtx.imageSmoothingEnabled=false;}
 function ensurePowerRenderer(){
  if(powerModule&&powerRenderer&&blizzardModule&&powerSchedule){if(running)draw(performance.now());return;}
  if(powerLoading||!hasPower())return;
  const token=++powerLoadToken;
  powerLoading=Promise.all([loadPowerState(),loadPowerRenderer(),loadBlizzardRenderer()])
   .then(([avatar,power,blizzard])=>{if(token!==powerLoadToken||!hasPower())return;powerModule=avatar;powerRenderer=power;blizzardModule=blizzard;powerSchedule=avatar.createAvatarPowerSchedule({seed:0x525354});makePowerArt();resetPower();if(running)draw(performance.now());})
   .catch(()=>{}).finally(()=>{if(token===powerLoadToken)powerLoading=null;});
 }
 function requestPowerSnapshot(){if(typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('myr5:retained-character-power-request'));}
 function retainedPower(event){const detail=event?.detail;if(!detail||typeof detail.ownerId!=='string')return;const next=detail.record&&typeof detail.record==='object'?detail.record:{version:1,equipped:null,styles:{}};const fingerprint=JSON.stringify(next);if(detail.ownerId===powerOwnerId&&fingerprint===powerFingerprint){if(hasPower())ensurePowerRenderer();return;}powerOwnerId=detail.ownerId;powerFingerprint=fingerprint;powerLoadToken++;powerLoading=null;powerRecord=next;resetPower();if(hasPower())ensurePowerRenderer();else if(look)draw(performance.now());}
 function load(){
  try{look=loadGala(localStorage,A).look;}catch{look=structuredClone(A.defaultLook);}
  const selected=look.weapon||{type:'rapier',tier:0};
  equipped=W.unlocked(selected,progress)?selected:{type:selected.type,tier:0};
  const key=equipped.type+':'+equipped.tier;if(lastWeapon!==key){action=null;queued=false;lastWeapon=key;}
  A.draw(body,look,{base:false,weapon:false,prop:false});type.value=selected.type;tier.replaceChildren();
  for(let i=0;i<W.tiers.length;i++){const item={type:selected.type,tier:i},option=document.createElement('option');option.value=i;option.disabled=!W.unlocked(item,progress);option.textContent=`${W.tiers[i]} · Level ${i+1}`;tier.append(option);}
  tier.value=equipped.tier;const ability=abilityFor(equipped);
  const lv=W.level(progress);
  note.textContent=`Level ${lv.level} · `+(lv.max?'max level':`${lv.into}/${lv.need} XP to next`)+' · '+(ability?`${ability.name} · ${ability.cooldownMs/1000}s`:'Special at tier 4');
  if(bar){bar.max=lv.max?1:lv.need;bar.value=lv.max?1:lv.into;bar.setAttribute('aria-valuetext',`Level ${lv.level}`+(lv.max?'':`, ${lv.into} of ${lv.need} XP`));}
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
  if(powerSchedule&&powerModule&&powerRenderer&&blizzardModule){
   const dt=lastPowerAt?Math.max(0,Math.min(.25,(now-lastPowerAt)/1000)):0;lastPowerAt=now;
   const canShow=running&&!document.hidden&&hasPower(),active=canShow?powerSchedule.step(dt,true,reduced.matches):0;
   if(active){powerTime+=reduced.matches?0:dt;if(powerPulse<=0)powerPulse=1;if(reduced.matches)powerPulse=0;else powerPulse=Math.max(0,powerPulse-dt*2.5);
    const feet=[{index:27,x:.46,y:.835,visible:true},{index:28,x:.54,y:.835,visible:true}],state=powerModule.avatarPowerState(powerRecord,160,168,reduced.matches?0:powerTime,reduced.matches?0:powerPulse,false,feet);
    if(state&&powerArtCtx){powerArtCtx.clearRect(0,0,160,168);if(state.blizzard)blizzardModule.renderBlizzard(powerArtCtx,state);else powerRenderer.renderPower(powerArtCtx,state);ctx.save();ctx.globalAlpha=.55;ctx.translate(-6+pulse*4,1-pulse*5);ctx.drawImage(powerArt,0,0);ctx.restore();}
   }else{powerPulse=0;if(!canShow)powerTime=0;}
  }
  const effects=fx.getContext('2d');effects.clearRect(0,0,fx.width,fx.height);
  effects.save();effects.translate(anchor.x,anchor.y);effects.rotate(-Math.PI/2-.13);
  drawAnimatedWeapon(effects,equipped,{weapons:W,x:0,y:0,scale:anchor.scale,now,action,reducedMotion:reduced.matches});
  effects.restore();
 }
 function tick(now){frame=0;if(!running||document.hidden)return;if(now-last>(reduced.matches?100:32)){draw(now);last=now;}frame=requestAnimationFrame(tick);}
 function start(){running=true;load();if(!frame)frame=requestAnimationFrame(tick);}
 function stop(){running=false;action=null;queued=false;if(frame)cancelAnimationFrame(frame);frame=0;resetPower();scene.classList.remove('team-strike');draw(performance.now());}
 const visibility=()=>{if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0;resetPower();draw(performance.now());}else if(running&&!frame){measure();last=0;frame=requestAnimationFrame(tick);}};
 const pageshow=()=>{requestPowerSnapshot();if(running&&!document.hidden&&!frame)frame=requestAnimationFrame(tick);};
 const account=event=>{progress=equipmentProgress(event.detail);load();};
 const resize=new ResizeObserver(measure);resize.observe(scene);
 window.addEventListener('myr5:account-progress',account);window.addEventListener('mominc-avatar-change',load);window.addEventListener('myr5:retained-character-power',retainedPower);window.addEventListener('pageshow',pageshow);document.addEventListener('visibilitychange',visibility);load();requestPowerSnapshot();
 return {load,start,stop,get weapon(){return {...equipped};},get progress(){return {...progress};},attack(hit){
   const now=performance.now();
   // A special finishes even if the user continues tapping. One queued basic
   // preserves follow-through instead of restarting every windup.
   if(!hit.special&&action&&now-action.startedAt<duration()){
    if(action.special||now-action.startedAt<duration()*.6){queued=true;return;}
   }
   action={startedAt:now,special:!!hit.special};queued=false;
   scene.classList.toggle('team-strike',!!hit.assisted);draw(now);
  },dispose(){stop();powerLoadToken++;powerSchedule?.dispose();powerArt=null;powerArtCtx=null;resize.disconnect();window.removeEventListener('myr5:account-progress',account);window.removeEventListener('mominc-avatar-change',load);window.removeEventListener('myr5:retained-character-power',retainedPower);window.removeEventListener('pageshow',pageshow);document.removeEventListener('visibilitychange',visibility);type.removeEventListener('change',equip);tier.removeEventListener('change',equip);}};
}

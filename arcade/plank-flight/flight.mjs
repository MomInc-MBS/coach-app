import {createFlight,advanceFlight,commandFlight} from './sim.mjs';
import {SHOP_ITEMS} from './catalog.mjs';
import {mountFlightView} from './view.mjs';
import {openFlightWallet} from './economy.mjs';
import {PLANK_TUNING} from './pose-input.mjs';
const identity=()=>globalThis.crypto.randomUUID();
const blank=()=>({balance:0,tokens:0,stars:0,bestDistance:0,owned:[],loadout:[]});
export function mountPlankFlight({host,ownerId,owner=()=>ownerId,onExit=()=>{},onRecalibrate=()=>{},sound=()=>{}}){
  let profile=blank(),wallet=null,dead=false,last=0,lastPose=-Infinity,pose=null,countdownUntil=0,raf=0,manualPause=false,error='',pendingCoins=0,renderFailed=false,lastRetry=0,saving=0;
  let saveQueue=Promise.resolve(),walletReady;
  const outbox=new Map(),finalizations=new Map();
  const run=createFlight({seed:Date.now()>>>0,runId:identity()});
  const current=()=>!dead&&owner()===ownerId;
  const say=message=>{error=message;};
  async function flush(w){
    for(const [key,reward] of outbox){profile=await w.record(reward.runId,[reward.event]);outbox.delete(key);}
    pendingCoins=[...outbox.values()].filter(r=>r.event.type==='coin').reduce((s,r)=>s+r.event.amount,0);
    for(const [rid,distance] of finalizations){profile=await w.finish(rid,distance);finalizations.delete(rid);}
  }
  // Captured owner wallet remains the destination for earned events after an account switch.
  const pending=(operation=w=>w.read())=>{saving++;saveQueue=saveQueue.then(async()=>{await walletReady;if(!wallet)throw Error('Device coin storage unavailable. Coins are not saved.');await flush(wallet);profile=await operation(wallet);error='';}).catch(e=>{pendingCoins=[...outbox.values()].filter(r=>r.event.type==='coin').reduce((s,r)=>s+r.event.amount,0);say(e.message);}).finally(()=>{saving--;});return saveQueue;};
  walletReady=openFlightWallet({owner:ownerId}).then(async w=>{wallet=w;profile=await w.read();}).catch(e=>say(e.message));
  function drain(){for(const event of run.events.splice(0)){
    if(['coin','token','mission'].includes(event.type)){
      const amount=event.type==='coin'?(event.amount??event.value??1):event.type==='mission'?(event.stars??1):1;
      if(event.type==='coin')pendingCoins+=amount;
      const reward={id:`${event.type}:${event.id??event.entityId??run.time}`,type:event.type,amount};
      const rid=run.runId;outbox.set(`${rid}:${reward.id}`,{runId:rid,event:reward});pending();
      sound(event.type==='coin'?'dial':'lever');
    }else if(event.type==='vehicle'&&event.origin==='component-set'){
      const reward={id:`component-set:${event.entityId}`,type:'component-set'};
      outbox.set(`${run.runId}:${reward.id}`,{runId:run.runId,event:reward});pending();sound('lever');
    }else if(['hit','crash'].includes(event.type))sound('jelly');else if(['vehicle','powerup'].includes(event.type))sound('lever');
  }}
  function finish(){countdownUntil=0;commandFlight(run,'finish');drain();finalizations.set(run.runId,run.distance);pending();}
  function restart(){if(run.phase!=='finalized')finish();const next=createFlight({seed:(Date.now()>>>0),runId:identity(),loadout:profile.loadout??[]});for(const key of Object.keys(run))delete run[key];Object.assign(run,next);manualPause=false;countdownUntil=0;}
  function action(name,payload={}){
    if(dead)return;
    if(name==='render-error'){renderFailed=true;manualPause=true;commandFlight(run,'pause');say('Flight graphics could not start. End this flight and try again.');return;}
    if(name==='buy'){pending(w=>w.buy(payload.id,SHOP_ITEMS));return;}
    if(name==='equip'){if(run.phase==='flying'){say('Pause before changing your gadgets.');return;}pending(w=>w.equip(payload.id,SHOP_ITEMS));return;}
    if(name==='spin'){if(run.phase!=='finalized'){say('End the flight to open your token reward.');return;}const rid=run.runId;pending(w=>w.spin(rid));return;}
    if(name==='retry-save'){pending();return;}
    if(name==='finish'){finish();return;}
    if(name==='exit'){finish();void saveQueue.then(()=>{if(!current())return;if(outbox.size||finalizations.size){say('Coins are waiting to save. Try End workout again to retry.');return;}onExit();});return;}
    if(name==='new-run'||name==='restart'){restart();return;}
    if(name==='recalibrate'){error='';manualPause=false;countdownUntil=0;commandFlight(run,'pause');pose=null;onRecalibrate();return;}
    if(name==='pause'){manualPause=true;countdownUntil=0;commandFlight(run,'pause');return;}
    if(['start','resume','revive'].includes(name)){
      if(name==='start'&&!renderFailed&&current()&&(!pose?.controlValid||!pose?.calibrated)){error='';manualPause=false;countdownUntil=0;return;}
      if(renderFailed||!current()||!pose?.controlValid||!pose?.calibrated){say('Complete the position check first.');return;}
      if(name==='revive'&&run.phase!=='crashed')return;
      manualPause=false;countdownUntil=performance.now()+3000;
      if(name==='revive'){commandFlight(run,'revive');commandFlight(run,'pause');}
      return;
    }
    if(['headstart','final-blast','event'].includes(name)){if(!commandFlight(run,name,payload))say('This boost is not available in this flight.');}
  }
  const view=mountFlightView({host,run,onAction:action,sound});
  function frame(now){if(dead)return;raf=requestAnimationFrame(frame);
    const dt=last?Math.min(.25,(now-last)/1000):0;last=now;
    const valid=current()&&!renderFailed&&!document.hidden&&pose?.controlValid&&now-lastPose<=PLANK_TUNING.freshnessMs;
    if(!valid&&run.phase==='flying'){commandFlight(run,'pause');countdownUntil=0;}
    if(!current()){manualPause=true;error='Your profile changed. End this flight and start again.';}
    if(valid&&!manualPause&&(run.phase==='ready'||run.phase==='paused')&&!countdownUntil)countdownUntil=now+3000;
    if(!valid||manualPause)countdownUntil=0;
    if(countdownUntil&&now>=countdownUntil){const cmd=run.phase==='ready'?'start':'resume';
      if(run.phase==='ready'){run.loadout=[...(profile.loadout??[])];run.explicitVehicle=profile.selectedVehicle??null;run.upgrades={...(profile.upgrades??{})};}
      commandFlight(run,cmd);countdownUntil=0;}
    advanceFlight(run,dt,{height01:pose?.height01??.5,steer:pose?.steer??0,valid:!!(valid&&!manualPause&&!countdownUntil)});drain();
    if((outbox.size||finalizations.size)&&!saving&&now-lastRetry>5000){lastRetry=now;pending();}
    const message=error||(countdownUntil?`Ready in ${Math.ceil((countdownUntil-now)/1000)}`:(!pose?.controlValid?pose?.reason:null)||pose?.prompt||pose?.reason||'Keep your hands down. Follow the position check.');
    const shopItems=SHOP_ITEMS.map(item=>item.kind==='upgrade'?{...item,currentLevel:profile.upgrades?.[item.id]??0,price:item.price*((profile.upgrades?.[item.id]??0)+1)}:item);
    try{view.render({pose,message,paused:run.phase!=='flying',profile,loadout:profile.loadout,inventory:profile,shopItems,coinsBanked:profile.balance,pendingCoins});}catch{action('render-error');}
  }
  raf=requestAnimationFrame(frame);
  return {run,action,get poseResult(){return pose},get creditAllowed(){return current()&&!renderFailed&&!manualPause&&!countdownUntil&&!document.hidden&&run.phase==='flying'&&performance.now()-lastPose<=PLANK_TUNING.freshnessMs;},
    pose(detail){pose=detail?.flightPose??detail?.motion?.flightPose??null;lastPose=performance.now();if(!pose?.controlValid&&run.phase==='flying'){commandFlight(run,'pause');countdownUntil=0;}},
    stop(){if(dead)return;finish();dead=true;cancelAnimationFrame(raf);view.stop();void saveQueue.finally(()=>{wallet?.close();wallet=null;});},
    get settled(){return saveQueue;}};
}

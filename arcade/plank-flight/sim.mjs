import {GADGETS, POWERUPS, UPGRADES, VEHICLES, vehicleById} from './catalog.mjs';

/**
 * Deterministic, renderer-independent Plank Flight rules.
 * Coordinates use x [-1, 1], y [0, 1], and increasing absolute z ahead of the player.
 * Simulation time is game time only; callers own workout credit and pause/countdown policy.
 */
export const FLIGHT_TUNING = Object.freeze({
  fixedStep: 1 / 60,
  maxFrameDelta: 0.10,
  baseSpeed: 5.2,
  speedPerLevel: 0.08,
  maxSpeed: 5.5,
  levelDistance: 140,
  firstGateDistance: 32,
  gateSpacingMin: 34,
  gateSpacingJitter: 4,
  spawnAhead: 270,
  safeHalfWidth: 0.42,
  safeHalfHeight: 0.34,
  warningLead: 18,
  playerDepth: 0.45,
  graceSeconds: 0.85,
  baseLateralSpeed: 0.82,
  baseVerticalSpeed: 0.62,
  horizontalAcceleration: 3.2,
  verticalAcceleration: 3.4,
  missileWarning: 28,
  missileLock: 14,
  missileLaunch: 7,
  missileRadiusX: 0.20,
  missileRadiusY: 0.18,
  maxObjects: 900
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = value => typeof value === 'number' && Number.isFinite(value);
const moveToward = (value, target, delta) => value < target ? Math.min(target, value + delta) : Math.max(target, value - delta);
const clone = value => ({...value});

/** Small deterministic PRNG (Mulberry32). A run never depends on renderer frame rate. */
export function seededRandom(seed) {
  let state = (Number(seed) >>> 0) || 1;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const gadgetById = new Map(GADGETS.map(gadget => [gadget.id, gadget]));
const powerupById = new Map(POWERUPS.map(powerup => [powerup.id, powerup]));
const upgradeById = new Map(UPGRADES.map(upgrade => [upgrade.id, upgrade]));

function normalizedLoadout(loadout, event) {
  const unique = [...new Set(Array.isArray(loadout) ? loadout.filter(id => typeof id === 'string') : [])];
  return unique.filter(id => {
    if (gadgetById.has(id)) return !(event && gadgetById.get(id).eventBlocked);
    return Boolean(vehicleById(id));
  });
}

function normalizeUpgrades(upgrades) {
  const levels={};
  if (!upgrades || typeof upgrades!=='object') return levels;
  for (const [id,raw] of Object.entries(upgrades)) {
    const item=upgradeById.get(id); if (!item) continue;
    const level=Array.isArray(raw) ? raw.length : Number(raw);
    if (Number.isFinite(level) && level>0) levels[id]=clamp(Math.floor(level),0,item.maxLevel);
  }
  return levels;
}

function effectsFor(loadout, upgrades={}) {
  const effects = {magnetRadius:0,verticalResponse:1,initialShield:0,maxShield:1,impactBuffer:0,warningLead:0,coinBonus:0,crashGrace:0,initialVehicle:null,powerupDuration:0,vehicleDuration:0,coinPreview:0,eventTokenChance:0,componentChance:0,npcBonus:0};
  for (const id of loadout) {
    const vehicle = vehicleById(id);
    if (vehicle) { effects.initialVehicle ||= vehicle.id; continue; }
    const effect = gadgetById.get(id)?.effect;
    if (!effect) continue;
    for (const [key, value] of Object.entries(effect)) {
      if (key === 'initialVehicle') effects.initialVehicle = value;
      else if (finite(value)) effects[key] = (effects[key] || 0) + value;
    }
  }
  for (const [id,level] of Object.entries(normalizeUpgrades(upgrades))) {
    const item=upgradeById.get(id);
    for (const [key,perLevel] of Object.entries(item.effectPerLevel)) effects[key]=(effects[key]||0)+perLevel*level;
  }
  effects.magnetRadius=clamp(effects.magnetRadius,0,0.75);
  effects.verticalResponse=clamp(effects.verticalResponse,0.85,1.35);
  effects.warningLead=clamp(effects.warningLead,0,10);
  effects.maxShield=clamp(effects.maxShield,1,3);
  effects.vehicleDuration=clamp(effects.vehicleDuration,0,6);
  return effects;
}

function vehicleDuration(run,id) { return (VEHICLES.find(vehicle=>vehicle.id===id)?.duration ?? 20)+run.effects.vehicleDuration; }
function vehicleHealthFor(id) { return ['foundry-walker','triad-bulwark'].includes(id) ? 2 : id ? 1 : 0; }

const MISSION_POOL = Object.freeze([
  {id:'coin-comet',name:'Catch the Comets',kind:'coins',target:8},
  {id:'long-orbit',name:'Hold Your Course',kind:'distance',target:180},
  {id:'pickup-trail',name:'Collect the Trail',kind:'pickups',target:5},
  {id:'clean-flight',name:'Clear the Gates',kind:'clean',target:4},
  {id:'vehicle-window',name:'Ride the Shell',kind:'vehicleTime',target:4}
]);

function missionList(seed) {
  const start=(seed>>>0)%MISSION_POOL.length;
  return Array.from({length:3},(_,index)=>{
    const mission=MISSION_POOL[(start+index)%MISSION_POOL.length];
    return {...mission,stars:index+1,progress:0,complete:false};
  });
}

/** Create a fresh mutable run with reproducible IDs and seeded course generation. */
export function createFlight({seed=1,runId,loadout=[],upgrades={},vehicle=null,cosmetic=null,event=false}={}) {
  const normalizedSeed = (Number(seed) >>> 0) || 1;
  const normalizedRunId = typeof runId === 'string' && runId ? runId : `flight-${normalizedSeed}`;
  const acceptedLoadout = normalizedLoadout(loadout, Boolean(event));
  const acceptedUpgrades=normalizeUpgrades(upgrades);
  const effects = effectsFor(acceptedLoadout,acceptedUpgrades);
  const startingVehicle = vehicleById(vehicle)?.id || (vehicle === 'triad-bulwark' ? vehicle : null) || effects.initialVehicle;
  const run = {
    random:seededRandom(normalizedSeed), runId:normalizedRunId, seed:normalizedSeed, event:Boolean(event), phase:'ready', time:0, distance:0, coins:0, score:0, level:0, hits:0,
    continuation:0, x:0, y:0.5, vx:0, vy:0, speed:FLIGHT_TUNING.baseSpeed, objects:[], events:[], vehicle:startingVehicle,
    explicitVehicle:vehicleById(vehicle)?.id || (vehicle === 'triad-bulwark' ? vehicle : null),
    vehicleUntil:startingVehicle ? vehicleDuration({effects},startingVehicle) : 0,
    vehicleHealth:vehicleHealthFor(startingVehicle), shield:effects.initialShield, powerup:null, missions:missionList(normalizedSeed),
    loadout:acceptedLoadout, upgrades:acceptedUpgrades, cosmetic, effects, collectedIds:new Set(), eventIds:new Set(), entitySequence:0, eventSequence:0,
    simTick:0, accumulator:0, graceUntil:0, nextPatternAt:FLIGHT_TUNING.firstGateDistance, patternIndex:0,
    safeRoute:[], gateGroups:new Map(), warnedGroups:new Set(), componentParts:0, componentMechDeployed:false,
    eventTokens:0, eventRewardProgress:0, eventRewardTarget:3, eventRewardClaimed:false, cleanGates:0, impactBuffer:effects.impactBuffer, lastCashDashCoinAt:-Infinity, crashEventEmitted:false, finishEventEmitted:false,
  };
  return run;
}

function emit(run, type, data={}) {
  const eventId = `${run.runId}:event:${++run.eventSequence}`;
  if (run.eventIds.has(eventId)) return null;
  run.eventIds.add(eventId);
  const event = {runId:run.runId,eventId,entityId:data.entityId ?? null,simTick:run.simTick,type,origin:data.origin ?? 'simulation',...data};
  run.events.push(event);
  if (type === 'mission') return event;
  return event;
}

function addObject(run, object) {
  const id = object.id || `${run.runId}:entity:${++run.entitySequence}`;
  run.objects.push({id,type:'coin',z:run.distance+40,x:0,y:0.5,w:0.08,h:0.08,value:1,active:true,collected:false,...object,id});
  return id;
}

function maxAxisRates(run) {
  const handling = vehicleById(run.vehicle)?.handling;
  return {
    x:FLIGHT_TUNING.baseLateralSpeed * (handling?.lateral ?? 1),
    y:FLIGHT_TUNING.baseVerticalSpeed * (handling?.vertical ?? 1) * run.effects.verticalResponse
  };
}

/** Check conservative movement-time reachability of one authored safe waypoint. */
export function safeRouteReachable(from, to, seconds, rates={x:0.55,y:0.38}, margin=0.8) {
  if (![from?.x,from?.y,to?.x,to?.y,seconds,rates?.x,rates?.y].every(finite) || seconds <= margin || rates.x <= 0 || rates.y <= 0) return false;
  const need = Math.max(Math.abs(to.x-from.x)/rates.x, Math.abs(to.y-from.y)/rates.y);
  return need <= seconds - margin;
}

function chooseSafePoint(run, spacing) {
  const latticeX = [-0.50,-0.25,0,0.25,0.50];
  const latticeY = [0.28,0.39,0.50,0.61,0.72];
  const previous = run.safeRoute.at(-1) || {x:run.x,y:run.y};
  const travelSeconds = spacing / Math.min(FLIGHT_TUNING.maxSpeed, run.speed);
  const rates = {x:0.54,y:0.38};
  const reachable = [];
  for (const x of latticeX) for (const y of latticeY) {
    const candidate = {x,y};
    if (Math.abs(x-previous.x) <= 0.55 && Math.abs(y-previous.y) <= 0.24 && safeRouteReachable(previous,candidate,travelSeconds,rates,0.85)) reachable.push(candidate);
  }
  const candidates = reachable.length ? reachable : [{x:clamp(previous.x,-0.5,0.5),y:clamp(previous.y,0.28,0.72)}];
  return candidates[Math.floor(run.random()*candidates.length)] || {x:0,y:0.5};
}

function addGatePanel(run, pattern, geometry, kind) {
  const {x,y,w,h} = geometry;
  if (w <= 0.015 || h <= 0.015) return;
  addObject(run,{id:`${pattern.id}:panel:${pattern.panels++}`,type:kind,kind:'gate-panel',patternId:pattern.id,z:pattern.z,x,y,w,h,radius:0,active:true,
    safePoint:clone(pattern.safePoint),gateStyle:pattern.style,basePanel:{x,y,w,h},warningLead:FLIGHT_TUNING.warningLead+run.effects.warningLead,laserState:'idle'});
}

function makeGate(run, z, safePoint, index) {
  const id = `${run.runId}:gate:${index}`;
  const hx = FLIGHT_TUNING.safeHalfWidth, hy = FLIGHT_TUNING.safeHalfHeight;
  const x = clamp(safePoint.x,-0.58,0.58), y = clamp(safePoint.y,0.08,0.92);
  const kind = index % 3 === 1 ? 'laser' : 'zapper';
  const pattern = {id,z,safePoint:{x,y},panels:0,style:['fixed','sweeping','orbiting'][index%3],kind};
  const leftEdge = x-hx, rightEdge=x+hx, lowEdge=y-hy, highEdge=y+hy;
  addGatePanel(run,pattern,{x:0,y:(highEdge+1)/2,w:1,h:(1-highEdge)/2},kind);
  addGatePanel(run,pattern,{x:0,y:lowEdge/2,w:1,h:lowEdge/2},kind);
  addGatePanel(run,pattern,{x:(-1+leftEdge)/2,y,w:(leftEdge+1)/2,h:hy},kind);
  addGatePanel(run,pattern,{x:(rightEdge+1)/2,y,w:(1-rightEdge)/2,h:hy},kind);
  run.gateGroups.set(id,{id,z,safePoint:{x,y},kind,hit:false,cleared:false,style:pattern.style});
  run.safeRoute.push({patternId:id,z,x,y,spacing:z-(run.safeRoute.at(-1)?.z ?? 0),kind,style:pattern.style});
  if (run.safeRoute.length > 100) run.safeRoute.shift();
  if (run.events) emit(run,'course',{entityId:id,kind:'safe-gate',style:pattern.style,safePoint:{x,y},origin:'pattern-generator'});
  return pattern;
}

function addCoinPattern(run, gate, index) {
  const type = ['ribbon','stair','wave','split'][index%4];
  const offsets = type === 'stair'
    ? [[-0.16,-0.08],[-0.08,-0.03],[0.08,0.03],[0.16,0.08]]
    : type === 'wave'
      ? [[-0.12,0.07],[-0.05,-0.06],[0.05,0.06],[0.12,-0.07]]
      : type === 'split'
        ? [[-0.20,0],[0.20,0],[-0.14,0.10],[0.14,-0.10]]
        : [[-0.13,0],[-0.04,0],[0.04,0],[0.13,0]];
  offsets.forEach(([dx,dy],i)=>{
    const z=gate.z-3+i*2;
    addObject(run,{id:`${gate.id}:coin:${type}:${i}`,type:'coin',kind:'coin',pattern:type,z,
      x:clamp(gate.safePoint.x+dx,-0.9,0.9),y:clamp(gate.safePoint.y+dy,0.08,0.92),radius:0.105,value:1+(index%5===4?1:0),
      revealAt:Math.max(0,z-4-run.effects.coinPreview),active:true,origin:'course'});
  });
}

function addMissile(run, gate, index) {
  addObject(run,{id:`${gate.id}:missile`,type:'missile',kind:'seeking-orb',patternId:gate.id,z:gate.z+14,
    x:gate.safePoint.x,y:gate.safePoint.y,w:FLIGHT_TUNING.missileRadiusX,h:FLIGHT_TUNING.missileRadiusY,
    state:'approach',warningLead:FLIGHT_TUNING.missileWarning+run.effects.warningLead,lockDistance:FLIGHT_TUNING.missileLock,launchDistance:FLIGHT_TUNING.missileLaunch,
    targetX:null,targetY:null,active:true,sourceIndex:index});
}

function spawnExtras(run, gate, index) {
  const z=gate.z+5, point=gate.safePoint;
  // The first three authored sectors guarantee a full component set on every seeded run.
  if (index < 3 || run.random() < run.effects.componentChance) {
    addObject(run,{id:`${gate.id}:component`,type:'component',kind:`core-${(run.componentParts+index)%3+1}`,z:gate.z-5,x:point.x,y:point.y,radius:0.13,value:1,active:true});
  }
  if (!run.vehicle && run.random() < 0.50) {
    const pick=POWERUPS[Math.floor(run.random()*POWERUPS.length)];
    addObject(run,{id:`${gate.id}:powerup`,type:'powerup',kind:pick.id,z,x:point.x,y:point.y,radius:0.14,value:1,active:true});
  }
  const missionVehicle=index===0&&run.missions.some(mission=>mission.kind==='vehicleTime');
  if (!run.vehicle && (missionVehicle || run.random() < 0.17)) {
    const options=VEHICLES.filter(vehicle=>vehicle.tier==='default');
    const pick=options[Math.floor(run.random()*options.length)];
    addObject(run,{id:`${gate.id}:vehicle`,type:'vehicle',kind:pick.id,z:gate.z+10,x:point.x,y:point.y,radius:0.15,value:1,active:true});
  }
  if ((run.event && index%2===0) || run.random()<run.effects.eventTokenChance) {
    addObject(run,{id:`${gate.id}:token`,type:'token',kind:'event-shard',z:gate.z+2,x:point.x,y:point.y,radius:0.12,value:1,active:true});
  }
  if (index%2===1 || run.random()<0.30) {
    addObject(run,{id:`${gate.id}:npc`,type:'npc',kind:'coach-flyby',z:gate.z+7,x:point.x,y:point.y,radius:0.18,value:1,active:true});
  }
  if (index%3===2) addMissile(run,gate,index);
}

function spawnPattern(run) {
  const index=run.patternIndex++;
  const spacing=FLIGHT_TUNING.gateSpacingMin+run.random()*FLIGHT_TUNING.gateSpacingJitter;
  const safePoint=chooseSafePoint(run,spacing);
  const z=run.nextPatternAt;
  const gate=makeGate(run,z,safePoint,index);
  addCoinPattern(run,gate,index);
  spawnExtras(run,gate,index);
  run.nextPatternAt=z+spacing;
}

function ensureCourse(run) {
  const limit=run.distance+FLIGHT_TUNING.spawnAhead;
  let guard=0;
  while (run.nextPatternAt <= limit && guard++ < 12) spawnPattern(run);
  if (run.objects.length > FLIGHT_TUNING.maxObjects) {
    run.objects=run.objects.filter(object => object.active && object.z >= run.distance-6).slice(-FLIGHT_TUNING.maxObjects);
  }
}

function safePointAt(run,z) {
  let best=run.safeRoute[0];
  for (const point of run.safeRoute) if (point.z <= z) best=point; else break;
  return best ? {x:best.x,y:best.y} : {x:0,y:0.5};
}

function updateMissions(run, kind, amount=1) {
  for (const mission of run.missions) {
    if (mission.complete || mission.kind !== kind) continue;
    mission.progress=Math.min(mission.target,mission.progress+amount);
    if (mission.progress >= mission.target) {
      mission.complete=true;
      emit(run,'mission',{entityId:mission.id,kind:mission.id,amount:mission.stars,stars:mission.stars,progress:mission.progress,target:mission.target,origin:'mission'});
    }
  }
}

function collect(run, object) {
  if (!object.active || object.collected || run.collectedIds.has(object.id)) return false;
  if (object.type==='powerup' && run.vehicle) return false;
  object.active=false; object.collected=true; run.collectedIds.add(object.id);
  switch (object.type) {
    case 'coin': {
      const amount=Math.max(1,Math.floor(object.value||1)+run.effects.coinBonus+(run.powerup?.family==='cash-dash'?1:0));
      run.coins+=amount;
      emit(run,'coin',{id:`${run.runId}:coin:${object.id}`,entityId:object.id,amount,origin:object.origin||'course'});
      updateMissions(run,'coins',amount);
      updateMissions(run,'pickups',1);
      return true;
    }
    case 'vehicle': {
      const next=vehicleById(object.kind);
      if (!next) return false;
      run.vehicle=next.id; run.vehicleUntil=run.time+vehicleDuration(run,next.id); run.vehicleHealth=vehicleHealthFor(next.id);
      emit(run,'vehicle',{entityId:object.id,kind:next.id,origin:'pickup'});
      updateMissions(run,'pickups',1);
      return true;
    }
    case 'powerup': {
      const power=powerupById.get(object.kind);
      if (!power || run.vehicle) return false;
      if (power.family==='shield') run.shield=Math.min(run.effects.maxShield,run.shield+power.effect.shield);
      else run.powerup={id:power.id,family:power.family,startedAt:run.time,until:run.time+power.duration+run.effects.powerupDuration,effect:clone(power.effect)};
      emit(run,'powerup',{entityId:object.id,kind:power.id,origin:'pickup'});
      updateMissions(run,'pickups',1);
      return true;
    }
    case 'component': {
      run.componentParts=Math.min(3,run.componentParts+1);
      emit(run,'component',{entityId:object.id,kind:object.kind,amount:1,parts:run.componentParts,origin:'pickup'});
      updateMissions(run,'pickups',1);
      if (run.componentParts>=3 && !run.componentMechDeployed) {
        run.componentMechDeployed=true; run.vehicle='triad-bulwark'; run.vehicleUntil=run.time+vehicleDuration(run,'triad-bulwark'); run.vehicleHealth=vehicleHealthFor('triad-bulwark');
        emit(run,'vehicle',{entityId:`${run.runId}:component-mech`,kind:'triad-bulwark',origin:'component-set'});
      } else if (run.componentParts>=3 && run.effects.componentChance>0) {
        run.coins++; emit(run,'coin',{id:`${run.runId}:coin:${object.id}:salvage`,entityId:`${object.id}:salvage`,amount:1,origin:'component-salvage'});
        updateMissions(run,'coins',1);
      }
      return true;
    }
    case 'token':
      run.eventTokens+=Math.max(1,object.value||1);
      emit(run,'token',{entityId:object.id,kind:object.kind,amount:object.value||1,origin:'event'});
      if(run.event){
        run.eventRewardProgress=Math.min(run.eventRewardTarget,run.eventRewardProgress+Math.max(1,object.value||1));
        if(run.eventRewardProgress>=run.eventRewardTarget&&!run.eventRewardClaimed){
          run.eventRewardClaimed=true; run.coins+=15;
          emit(run,'coin',{id:`${run.runId}:event-signal-cache`,entityId:`${run.runId}:event-signal-cache`,amount:15,origin:'event-track'});
        }
      }
      updateMissions(run,'pickups',1);
      return true;
    case 'npc':
      emit(run,'npc',{entityId:object.id,kind:object.kind,amount:run.effects.npcBonus,origin:'flyby'});
      updateMissions(run,'pickups',1);
      if (run.effects.npcBonus>0) {
        run.coins+=run.effects.npcBonus;
        emit(run,'coin',{id:`${run.runId}:coin:${object.id}:companion`,entityId:`${object.id}:companion`,amount:run.effects.npcBonus,origin:'companion-gadget'});
        updateMissions(run,'coins',run.effects.npcBonus);
      }
      return true;
    default: return false;
  }
}

function currentVehicle(run) { return vehicleById(run.vehicle); }

function hazardActive(run,object) {
  if (!object.active || object.type!=='zapper' && object.type!=='laser' && object.type!=='missile') return false;
  // Expiration is resolved after contacts for this bounded 1/60 s step, then
  // grants a clear exit. Never remove protection before an already-overlapping hit.
  if (run.powerup?.family==='cash-dash') return false;
  if (object.type==='laser') return object.laserState==='active';
  return true;
}

function overlapAt(run,object,x,y) {
  const handling=currentVehicle(run)?.handling;
  const playerRadius=handling?.radius ?? 0.085;
  if (object.type==='zapper' || object.type==='laser') {
    return Math.abs(x-object.x) <= object.w+playerRadius && Math.abs(y-object.y) <= object.h+playerRadius;
  }
  return Math.abs(x-object.x) <= object.w+playerRadius && Math.abs(y-object.y) <= object.h+playerRadius;
}

function takeHit(run, object) {
  object.active=false;
  const group=object.patternId && run.gateGroups.get(object.patternId);
  if (group) group.hit=true;
  if (run.time < run.graceUntil) return;
  const vehicle=currentVehicle(run);
  if (vehicle && run.vehicleHealth>0) {
    run.vehicleHealth--;
    emit(run,'hit',{entityId:object.id,kind:object.type,protection:'vehicle',origin:'collision'});
    if (run.vehicleHealth<=0) {
      const old=run.vehicle; run.vehicle=null; run.vehicleUntil=0;
      emit(run,'vehicle',{entityId:object.id,kind:old,action:'damaged-exit',origin:'collision'});
    }
  } else if (run.shield>0) {
    run.shield--;
    emit(run,'hit',{entityId:object.id,kind:object.type,protection:'shield',origin:'collision'});
  } else if (run.impactBuffer>0) {
    run.impactBuffer--;
    emit(run,'hit',{entityId:object.id,kind:object.type,protection:'rescue-buffer',origin:'collision'});
  } else {
    run.hits++;
    run.phase='crashed';
    if (!run.crashEventEmitted) {
      run.crashEventEmitted=true;
      emit(run,'crash',{entityId:object.id,kind:object.type,origin:'collision'});
    }
  }
  run.graceUntil=run.time+FLIGHT_TUNING.graceSeconds+run.effects.crashGrace;
}

function updateThreatStates(run) {
  for (const object of run.objects) {
    if (!object.active) continue;
    if(object.basePanel&&object.gateStyle!=='fixed') {
      const b=object.basePanel,point=object.safePoint,phase=run.time*.9;
      const outward=(1+Math.sin(phase))*.5;
      const vertical=Math.abs(b.x)<1e-8;
      // Panels move only OUT of the reserved aperture. The guaranteed opening
      // never shrinks; orbiting is motion of the panels, not a claimed rotating beam.
      object.x=b.x+(vertical ? object.gateStyle==='orbiting'?.035*Math.cos(phase):0 : Math.sign(b.x-point.x)*.075*outward);
      object.y=b.y+(vertical ? Math.sign(b.y-point.y)*.055*outward : object.gateStyle==='orbiting'?.035*Math.cos(phase):0);
    }
    const ahead=object.z-run.distance;
    if ((object.type==='zapper'||object.type==='laser') && ahead <= object.warningLead && ahead >= -1 && !run.warnedGroups.has(object.patternId)) {
      run.warnedGroups.add(object.patternId);
      emit(run,'course',{entityId:object.patternId,kind:'hazard-warning',hazard:object.type,origin:'telegraph'});
    }
    if (object.type==='laser') {
      object.laserState = ahead > object.warningLead ? 'idle' : ahead > 10 ? 'telegraph' : ahead > 3 ? 'charging' : ahead >= -1 ? 'active' : 'cooldown';
    } else if (object.type==='missile') {
      if (ahead <= object.warningLead && object.state==='approach') {
        object.state='warning';
        emit(run,'course',{entityId:object.id,kind:'missile-warning',origin:'telegraph'});
      }
      const slow=run.powerup?.family==='rocket-time' && run.time < run.powerup.until ? run.powerup.effect.threatSlow : 1;
      if (ahead <= object.lockDistance*slow && object.targetX===null) {
        object.targetX=run.x; object.targetY=run.y; object.x=run.x; object.y=run.y; object.state='locked';
        emit(run,'course',{entityId:object.id,kind:'missile-locked',targetX:object.targetX,targetY:object.targetY,origin:'telegraph'});
      }
      if (ahead <= object.launchDistance*slow && object.state==='locked') {
        object.state='launched';
        emit(run,'course',{entityId:object.id,kind:'missile-launched',origin:'telegraph'});
      }
    }
  }
}

function spawnDashCoin(run) {
  if (run.time-run.lastCashDashCoinAt < 0.55) return;
  run.lastCashDashCoinAt=run.time;
  const point=safePointAt(run,run.distance+8);
  const id=`${run.runId}:dash-coin:${Math.floor(run.time*2)}`;
  if (run.objects.some(object=>object.id===id)) return;
  addObject(run,{id,type:'coin',kind:'coin',pattern:'cash-dash',z:run.distance+7.5,x:point.x,y:point.y,radius:0.12,value:1,active:true,origin:'cash-dash'});
}

const isHazard = object => ['zapper','laser','missile'].includes(object.type);
const contactPriority = object => ['powerup','vehicle','component'].includes(object.type) ? 0 : isHazard(object) ? 2 : 1;

// Intersect the swept player with the object's complete depth slab and 2D
// collision region. Looking only at its central z plane misses lateral entries.
function contactTime(run,object,from,to,after=0) {
  let first=after,last=1;
  const radius=currentVehicle(run)?.handling.radius ?? .085;
  let hx,hy;
  if (isHazard(object)) {hx=object.w+radius;hy=object.h+radius;}
  else if (object.type==='coin') {
    const magnet=run.powerup?.family==='cash-dash' ? run.powerup.effect.magnetRadius : run.effects.magnetRadius;
    hx=hy=(object.radius||.09)+magnet;
  } else hx=hy=(object.radius||.12)+radius;
  for (const [a,b,center,half] of [[from.z,to.z,object.z,FLIGHT_TUNING.playerDepth],[from.x,to.x,object.x,hx],[from.y,to.y,object.y,hy]]) {
    const delta=b-a;
    if (Math.abs(delta)<1e-12) {if(Math.abs(a-center)>half)return null;continue;}
    const p=(center-half-a)/delta,q=(center+half-a)/delta;
    first=Math.max(first,Math.min(p,q));last=Math.min(last,Math.max(p,q));
    if(first>last+1e-10)return null;
  }
  return first<=1 && last>=0 ? clamp(first,0,1) : null;
}

function resolveContacts(run,from,to) {
  const visited=new Set();let after=0;
  while(run.phase==='flying') {
    let next=null;
    for(const object of run.objects) {
      if(!object.active||visited.has(object.id))continue;
      if(object.z<from.z-FLIGHT_TUNING.playerDepth||object.z>to.z+FLIGHT_TUNING.playerDepth)continue;
      if(isHazard(object)&&!hazardActive(run,object))continue;
      const time=contactTime(run,object,from,to,after);if(time===null)continue;
      const candidate={object,time,priority:contactPriority(object)};
      if(!next||time<next.time-1e-9||Math.abs(time-next.time)<=1e-9&&(candidate.priority<next.priority||candidate.priority===next.priority&&object.id<next.object.id))next=candidate;
    }
    if(!next)break;
    visited.add(next.object.id);after=next.time;
    if(isHazard(next.object))takeHit(run,next.object);else collect(run,next.object);
    // Recompute after pickups: shields, vehicle radius and coin attraction may
    // have changed. IDs make a still-excluded pickup impossible to loop on.
  }
}

function expireProtection(run) {
  let exit=false;
  if(run.vehicle&&run.vehicleUntil>0&&run.time>=run.vehicleUntil) {
    const old=run.vehicle;run.vehicle=null;run.vehicleUntil=0;run.vehicleHealth=0;exit=true;
    emit(run,'vehicle',{entityId:`${run.runId}:vehicle-expiry:${run.simTick}`,kind:old,action:'expired',origin:'timer'});
  }
  if(run.powerup&&run.time>=run.powerup.until) {exit ||= run.powerup.family==='cash-dash';run.powerup=null;}
  if(exit) {
    const horizon=Math.max(12,run.speed*2);
    for(const object of run.objects)if(object.active&&isHazard(object)&&object.z-run.distance<=horizon)object.active=false;
    for(const group of run.gateGroups.values())if(group.z-run.distance<=horizon)group.cleared=true;
    run.graceUntil=Math.max(run.graceUntil,run.time+FLIGHT_TUNING.graceSeconds);
    emit(run,'course',{kind:'protection-exit',origin:'timer',message:'Protection ended. Clear corridor ahead.'});
  }
}

const VEHICLE_HINTS = {
  'polarity-shell':'Polarity Shell: an optional comfortable low-to-high cycle switches a gentle virtual gravity pull. Rise still means up.',
  foldwing:'Foldwing: hold a gentle lean to preview a short fold. Return to center to commit only when the route is clear.',
  pipwing:'Pipwing: a comfortable rise adds a small flap. Slow rises work; rapid repetitions are not needed.',
  'comet-hopper':'Comet Hopper: rise to climb and lean to steer. Your usual comfortable controls still work.',
  'foundry-walker':'Foundry Walker: heavier handling and two armor hits. Allow extra time to change direction.',
  'ribbon-skimmer':'Ribbon Skimmer: smooth steering with longer drift. Return to center early to settle.',
  'tide-glider':'Tide Glider: smooth rise and dip handling. Follow the coin waves at your own pace.',
  'triad-bulwark':'Triad Bulwark: two armor hits; steer with a gentle lean and keep both hands down.',
};

function foldDestinationClear(run,x,y) {
  const radius=currentVehicle(run)?.handling.radius??.085;
  return !run.objects.some(o=>o.active&&isHazard(o)&&o.z>=run.distance-FLIGHT_TUNING.playerDepth&&o.z-run.distance<=24
    && Math.abs(o.x-x)<=o.w+radius+.10&&Math.abs(o.y-y)<=o.h+radius+.08);
}

function vehicleControls(run,input,dt) {
  if(!run.vehicle){run.vehicleControl=null;run.foldPreview=null;run.vehicleHint='';return {height:input.height01,impulse:0};}
  if(run.vehicleControl?.id!==run.vehicle){
    run.vehicleControl={id:run.vehicle,entered:run.time,lowDwell:0,highDwell:0,armed:false,polarity:1,lastCycle:-Infinity,
      leanDwell:0,leanSign:0,neutralDwell:0,lastFold:-Infinity,lastHeight:input.height01,rise:0,lastFlap:-Infinity};
    run.vehicleHint=VEHICLE_HINTS[run.vehicle]??'Use your comfortable height and lean controls.';
    emit(run,'course',{kind:'vehicle-instruction',vehicle:run.vehicle,message:run.vehicleHint,origin:'tutorial'});
  }
  const c=run.vehicleControl;let height=input.height01,impulse=0;
  if(c.resetPending){c.lowDwell=0;c.highDwell=0;c.armed=false;c.leanDwell=0;c.neutralDwell=0;c.rise=0;c.lastHeight=height;c.resetPending=false;run.foldPreview=null;}
  if(run.time-c.entered<2){c.lastHeight=height;return {height,impulse};}
  // Tutorials and comfortable movements are virtual adaptations. They do not
  // certify physical reachability or alter the real exercise clock.
  if(run.vehicle==='polarity-shell') {
    c.lowDwell=height<.35?c.lowDwell+dt:0;if(c.lowDwell>=.25)c.armed=true;
    c.highDwell=c.armed&&height>.7?c.highDwell+dt:0;
    if(c.highDwell>=.25&&run.time-c.lastCycle>=2){
      c.polarity*=-1;c.armed=false;c.highDwell=0;c.lastCycle=run.time;
      emit(run,'vehicle',{kind:run.vehicle,action:'gravity-switched',polarity:c.polarity,origin:'comfortable-cycle'});
    }
    height=clamp(height+c.polarity*.045,0,1);
  } else if(run.vehicle==='foldwing') {
    const sign=Math.sign(input.steer),lean=Math.abs(input.steer);
    if(lean>=.45&&height>=.3&&height<=.75&&run.time-c.lastFold>=2){
      c.leanDwell=sign===c.leanSign?c.leanDwell+dt:dt;c.leanSign=sign;c.neutralDwell=0;
      if(c.leanDwell>=.6){const x=clamp(run.x+sign*.22,-.85,.85),y=run.y;
        run.foldPreview={x,y,clear:foldDestinationClear(run,x,y)};
      }
    }else if(lean<=.12&&run.foldPreview){
      c.neutralDwell+=dt;
      if(c.neutralDwell>=.18){
        const target=run.foldPreview;
        if(foldDestinationClear(run,target.x,target.y)){
          run.x=target.x;run.vx=0;c.lastFold=run.time;
          emit(run,'vehicle',{kind:run.vehicle,action:'fold',targetX:run.x,targetY:run.y,origin:'comfortable-cycle'});
        }
        run.foldPreview=null;c.leanDwell=0;c.neutralDwell=0;
      }
    }else {c.leanDwell=0;c.neutralDwell=0;run.foldPreview=null;}
  }else if(run.vehicle==='pipwing') {
    const rise=height-c.lastHeight;c.lastHeight=height;
    c.rise=rise>=0?c.rise+rise:0;
    if(c.rise>=.16&&run.time-c.lastFlap>=1.2){
      impulse=.10;c.rise=0;c.lastFlap=run.time;
      emit(run,'vehicle',{kind:run.vehicle,action:'flap',origin:'comfortable-rise'});
    }
  }
  return {height,impulse};
}

function stepFlight(run, dt, input) {
  expireProtection(run);
  const virtual=vehicleControls(run,input,dt);
  const oldDistance=run.distance, oldX=run.x, oldY=run.y;
  const handling=currentVehicle(run)?.handling || {lateral:1,vertical:1,acceleration:1,damping:1,radius:0.085};
  run.level=Math.floor(run.distance/FLIGHT_TUNING.levelDistance);
  run.speed=Math.min(FLIGHT_TUNING.maxSpeed,FLIGHT_TUNING.baseSpeed+run.level*FLIGHT_TUNING.speedPerLevel);
  const rates=maxAxisRates(run), steer=clamp(input.steer,-1,1), height=clamp(virtual.height,0,1);
  const desiredVx=steer*rates.x;
  const horizontalDamping=steer===0 ? handling.damping : 1;
  run.vx=moveToward(run.vx,desiredVx,FLIGHT_TUNING.horizontalAcceleration*handling.acceleration*horizontalDamping*dt);
  run.x=clamp(run.x+run.vx*dt,-1,1);
  if (run.x===-1 || run.x===1) run.vx=0;
  const maxVy=FLIGHT_TUNING.baseVerticalSpeed*handling.vertical;
  const vyAcceleration=((height-run.y)*FLIGHT_TUNING.verticalAcceleration-run.vy*1.55*handling.damping)*handling.acceleration*run.effects.verticalResponse;
  run.vy=clamp(run.vy+vyAcceleration*dt+virtual.impulse,-maxVy,maxVy);
  run.y=clamp(run.y+run.vy*dt,0,1);
  if (run.y===0 || run.y===1) run.vy=0;
  run.time+=dt; run.distance+=run.speed*dt; run.score=Math.floor(run.distance); run.simTick++;
  if(run.vehicle)updateMissions(run,'vehicleTime',dt);
  run.level=Math.floor(run.distance/FLIGHT_TUNING.levelDistance);
  if (run.powerup?.family==='cash-dash' && run.time<run.powerup.until) spawnDashCoin(run);
  ensureCourse(run);
  updateThreatStates(run);

  resolveContacts(run,{z:oldDistance,x:oldX,y:oldY},{z:run.distance,x:run.x,y:run.y});
  expireProtection(run);

  for (const group of run.gateGroups.values()) {
    if (!group.cleared && run.distance > group.z+FLIGHT_TUNING.playerDepth) {
      group.cleared=true;
      if (!group.hit) { run.cleanGates++; updateMissions(run,'clean',1); }
    }
  }
  updateMissions(run,'distance',Math.max(0,run.distance-oldDistance));
  for (const object of run.objects) if (object.active && object.z < run.distance-FLIGHT_TUNING.playerDepth-2) object.active=false;
  run.objects=run.objects.filter(object=>object.active || object.z>=run.distance-8);
}

/** Advance only on fresh, valid controls. Invalid pose freezes physics and all collectible credit. */
export function advanceFlight(run, dt, input={height01:0.5,steer:0,valid:false}) {
  if (!run || run.phase!=='flying') return run;
  if (!finite(dt) || dt<=0 || input?.valid!==true || !finite(input.height01) || !finite(input.steer)) return run;
  const safeDt=Math.min(dt,FLIGHT_TUNING.maxFrameDelta);
  run.accumulator+=safeDt;
  const step=FLIGHT_TUNING.fixedStep;
  let ticks=0;
  while (run.accumulator+1e-10>=step && run.phase==='flying' && ticks<7) {
    stepFlight(run,step,input);
    run.accumulator-=step; ticks++;
  }
  if (run.accumulator<0) run.accumulator=0;
  return run;
}

function clearThreatHorizon(run, horizon=24) {
  for (const object of run.objects) {
    if (!object.active || object.z-run.distance>horizon) continue;
    if (object.type==='zapper'||object.type==='laser'||object.type==='missile') object.active=false;
  }
  for (const group of run.gateGroups.values()) if (group.z-run.distance<=horizon) group.cleared=true;
  run.warnedGroups.clear(); run.graceUntil=run.time+1.1; run.accumulator=0;
}

/** Explicit arcade lifecycle. Fitness/workout lifecycle remains owned by the caller. */
export function commandFlight(run, command, payload={}) {
  if (!run || run.phase==='finalized') return false;
  switch (command) {
    case 'start':
      if (run.phase!=='ready') return false;
      run.loadout=normalizedLoadout(run.loadout,run.event); run.upgrades=normalizeUpgrades(run.upgrades); run.effects=effectsFor(run.loadout,run.upgrades);
      run.shield=run.effects.initialShield; run.impactBuffer=run.effects.impactBuffer;
      run.vehicle=run.explicitVehicle || run.effects.initialVehicle || null;
      run.vehicleUntil=run.vehicle ? vehicleDuration(run,run.vehicle) : 0;
      run.vehicleHealth=vehicleHealthFor(run.vehicle);
      run.phase='flying'; run.startedAt=run.time; run.accumulator=0; ensureCourse(run);
      emit(run,'course',{entityId:`${run.runId}:start`,kind:'run-start',origin:'lifecycle'});
      return true;
    case 'pause':
      if (run.phase!=='flying') return false;
      if(run.vehicleControl)run.vehicleControl.resetPending=true;run.foldPreview=null;
      run.phase='paused'; run.accumulator=0; emit(run,'course',{entityId:`${run.runId}:pause:${run.continuation}`,kind:'run-pause',reason:payload.reason||'user',origin:'lifecycle'}); return true;
    case 'resume':
      if (run.phase!=='paused') return false;
      clearThreatHorizon(run); run.phase='flying';
      emit(run,'course',{entityId:`${run.runId}:resume:${run.continuation}`,kind:'run-resume',origin:'lifecycle'}); return true;
    case 'revive':
      if (run.phase!=='crashed') return false;
      if(run.vehicleControl)run.vehicleControl.resetPending=true;run.foldPreview=null;
      run.continuation++; run.crashEventEmitted=false; clearThreatHorizon(run); run.phase='flying';
      emit(run,'course',{entityId:`${run.runId}:continuation:${run.continuation}`,kind:'run-revive',continuation:run.continuation,origin:'lifecycle'}); return true;
    case 'headstart':
      if (run.phase!=='ready' || run.headstartUsed) return false;
      run.headstartUsed=true; run.distance+=Math.max(0,Math.min(24,finite(payload.distance)?payload.distance:12));
      run.score=Math.floor(run.distance); run.nextPatternAt=run.distance+FLIGHT_TUNING.firstGateDistance;
      emit(run,'course',{entityId:`${run.runId}:headstart`,kind:'headstart',distance:run.distance,origin:'utility'}); return true;
    case 'final-blast':
      if (run.phase!=='crashed' || run.finalBlastUsed) return false;
      run.finalBlastUsed=true; run.distance+=Math.max(0,Math.min(30,finite(payload.distance)?payload.distance:15));
      run.score=Math.floor(run.distance);
      emit(run,'course',{entityId:`${run.runId}:final-blast`,kind:'final-blast',distance:run.distance,origin:'utility'}); return true;
    case 'event':
      if (run.phase!=='ready' && run.phase!=='paused') return false;
      run.event=payload.enabled===undefined ? true : Boolean(payload.enabled);
      run.loadout=normalizedLoadout(run.loadout,run.event); run.upgrades=normalizeUpgrades(run.upgrades); run.effects=effectsFor(run.loadout,run.upgrades);
      emit(run,'course',{entityId:`${run.runId}:event-mode:${run.continuation}`,kind:'event-mode',enabled:run.event,origin:'utility'}); return true;
    case 'finish':
      if (run.phase==='finalized') return false;
      run.phase='finalized'; run.accumulator=0;
      if (!run.finishEventEmitted) { run.finishEventEmitted=true; emit(run,'course',{entityId:`${run.runId}:finish`,kind:'run-finish',coins:run.coins,distance:run.distance,origin:'lifecycle'}); }
      return true;
    default: return false;
  }
}

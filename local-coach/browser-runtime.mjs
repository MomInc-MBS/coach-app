import {openLocalCoach,LocalCoachStorageError} from './repository.mjs';

export {openLocalCoach,LocalCoachStorageError};

export function accountProbeFallsBackToLocal(error){
 if(error instanceof LocalCoachStorageError)return false;
 const status=Number(error?.status);if(status>=400&&status<500)return false;
 return error instanceof TypeError||error?.name==='TimeoutError'||error?.code==='optional_probe_timeout'||status>=500&&status<=599;
}
async function boundedOptionalProbe(load,{timeoutMs=4000,setTimeoutFn=setTimeout,clearTimeoutFn=clearTimeout}={}){
 if(!Number.isFinite(timeoutMs)||timeoutMs<=0)throw RangeError('Invalid optional probe deadline.');
 const controller=new AbortController();let timer;
 try{return await Promise.race([
  Promise.resolve().then(()=>load({signal:controller.signal})),
  new Promise((_,reject)=>{timer=setTimeoutFn(()=>{const error=Object.assign(Error('Optional account service timed out.'),{code:'optional_probe_timeout',status:503});controller.abort(error);reject(error);},timeoutMs);}),
 ]);}finally{clearTimeoutFn(timer);}
}
export async function probeOptionalAccount(load,options){try{return await boundedOptionalProbe(load,options);}catch(error){if(error?.status===401&&error?.code!=='auth-config'||accountProbeFallsBackToLocal(error))return null;throw error;}}
export async function probeOptionalTransfer(load,options){try{return await boundedOptionalProbe(load,options);}catch(error){if(accountProbeFallsBackToLocal(error))return null;throw error;}}

const HEARTBEAT_MS=20_000,STALE_MS=60_000,CHANNEL='myr5-local-workout-lease-v1';
const defaultChannel=name=>typeof BroadcastChannel==='function'?new BroadcastChannel(name):null;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const json=value=>{try{return JSON.parse(value||'null');}catch{return null;}};

export async function openGuestWorkoutAdapter({
 exerciseKeys,
 open=openLocalCoach,
 storage=globalThis.localStorage,
 channelFactory=defaultChannel,
 now=()=>Date.now(),
 setIntervalFn=globalThis.setInterval?.bind(globalThis),
 clearIntervalFn=globalThis.clearInterval?.bind(globalThis),
 wait=delay,
 heartbeatMs=HEARTBEAT_MS,
 staleMs=STALE_MS,
 tabId=globalThis.crypto?.randomUUID?.(),
}={}){
 if(!tabId)throw new LocalCoachStorageError('missing-randomness','Secure tab identifiers are unavailable.',{recoverable:false});
 const repository=await open({exerciseKeys}),scope=repository.forOwner(repository.guestOwnerId);
 const key=`myr5-local-workout-heartbeat:${scope.ownerId}:${scope.deviceId}`,channel=channelFactory?.(CHANNEL);
 const peers=new Map();let timer=0,disposed=false,held=false,active=null,leaseToken=null,fence=0;
 const current=value=>value&&Number.isFinite(value.at)&&value.at>now()-staleMs;
 const fresh=value=>current(value)&&value.tabId!==tabId;
 const readHeartbeat=()=>{try{return json(storage?.getItem(key));}catch{return null;}};
 const foreignHeartbeat=()=>{const stored=readHeartbeat();return fresh(stored)&&stored.type==='heartbeat'||[...peers.values()].some(value=>fresh(value)&&value.type==='heartbeat');};
 const foreign=()=>fresh(readHeartbeat())||[...peers.values()].some(fresh);
 const removeHeartbeat=token=>{try{const value=readHeartbeat();if(value?.tabId===tabId&&(!token||value.token===token))storage?.removeItem(key);}catch{}};
 const loseLease=()=>{if(timer)clearIntervalFn?.(timer);timer=0;held=false;const token=leaseToken;leaseToken=null;removeHeartbeat(token);};
 const writeHeartbeat=()=>{if(!held||disposed||!leaseToken)return false;const stored=readHeartbeat();if(fresh(stored)||[...peers.values()].some(value=>fresh(value)&&value.type==='heartbeat')){loseLease();return false;}const value={type:'heartbeat',tabId,token:leaseToken,at:now(),ownerId:scope.ownerId,deviceId:scope.deviceId};try{storage?.setItem(key,JSON.stringify(value));}catch{loseLease();return false;}if(readHeartbeat()?.token!==leaseToken){loseLease();return false;}channel?.postMessage?.(value);return true;};
 const receive=event=>{const value=event?.data;if(value?.ownerId!==scope.ownerId||value?.deviceId!==scope.deviceId||value.tabId===tabId)return;if(value.type==='release'){if(!value.token||peers.get(value.tabId)?.token===value.token)peers.delete(value.tabId);}else if(value.type==='heartbeat'||value.type==='claim'||value.type==='probe'){peers.set(value.tabId,value);if(value.type==='probe'&&held)writeHeartbeat();}};
 channel?.addEventListener?.('message',receive);
 const acquire=async()=>{
  if(disposed)throw Error('Local workout storage is closed.');if(held){try{assertLease();return true;}catch{return false;}}
  channel?.postMessage?.({type:'probe',tabId,at:now(),ownerId:scope.ownerId,deviceId:scope.deviceId});await wait(25);
  if(foreignHeartbeat())return false;
  const token=`${tabId}:${now()}:${++fence}`,claim={type:'claim',tabId,token,at:now(),ownerId:scope.ownerId,deviceId:scope.deviceId};
  const beforeClaim=readHeartbeat();if(fresh(beforeClaim)&&beforeClaim.type==='heartbeat')return false;
  try{storage?.setItem(key,JSON.stringify(claim));}catch{return false;}channel?.postMessage?.(claim);await wait(25);
  if(foreignHeartbeat()){removeHeartbeat(token);return false;}
  const stored=readHeartbeat(),contenders=[claim,...[...peers.values()].filter(value=>fresh(value)&&value.type==='claim'),...(fresh(stored)&&stored.type==='claim'?[stored]:[])];
  contenders.sort((a,b)=>String(a.tabId).localeCompare(String(b.tabId))||String(a.token).localeCompare(String(b.token)));
  if(contenders[0]?.token!==token){removeHeartbeat(token);return false;}
  const value={...claim,type:'heartbeat',at:now()};try{storage?.setItem(key,JSON.stringify(value));}catch{return false;}channel?.postMessage?.(value);await wait(25);
  const owner=readHeartbeat();if(owner?.type!=='heartbeat'||owner.tabId!==tabId||owner.token!==token||foreignHeartbeat()){removeHeartbeat(token);return false;}
  try{await scope.claimWorkoutLease(token);}catch(error){removeHeartbeat(token);throw error;}
  const confirmed=readHeartbeat();if(confirmed?.type!=='heartbeat'||confirmed.tabId!==tabId||confirmed.token!==token||foreignHeartbeat()){removeHeartbeat(token);return false;}
  leaseToken=token;held=true;timer=setIntervalFn?.(writeHeartbeat,heartbeatMs)??0;return true;
 };
 const assertLease=()=>{const owner=readHeartbeat(),blocked=disposed||!held||owner?.type!=='heartbeat'||owner.tabId!==tabId||owner.token!==leaseToken||!current(owner)||[...peers.values()].some(value=>fresh(value)&&value.type==='heartbeat');if(blocked){loseLease();throw new LocalCoachStorageError('lease','This workout is active in another tab.',{recoverable:true});}return leaseToken;};
 const release=()=>{const token=leaseToken;loseLease();channel?.postMessage?.({type:'release',tabId,token,at:now(),ownerId:scope.ownerId,deviceId:scope.deviceId});};
 try{const bootForeign=foreign();if(!bootForeign&&await acquire()){try{await scope.interruptActiveWorkouts({leaseToken:assertLease()});}finally{release();}}}
 catch(error){release();channel?.removeEventListener?.('message',receive);channel?.close?.();repository.close();throw error;}
 async function resumable(mode){const rows=await scope.listWorkouts();return rows.filter(row=>row.status==='paused'&&(mode===undefined||row.mode===mode)&&row.metadata?.control==='manual').at(-1)??null;}
 return Object.freeze({
  ownerId:scope.ownerId,deviceId:scope.deviceId,
  hasForeignLease:foreign,
  async paused(mode){return resumable(mode);},
  async start({mode,goal,restSeconds,progress={},metadata={},control='camera'}){
   if(!await acquire())throw new LocalCoachStorageError('lease','This workout is active in another tab.',{recoverable:true});const token=assertLease();
   try{if(control==='manual'){const paused=await resumable(mode);if(paused){await scope.resumeWorkout(paused.id,{leaseToken:token});active={id:paused.id,control};return {...paused,status:'active',resumed:true};}}const workout=await scope.startWorkout({mode,goal,restSeconds,progress,metadata:{...metadata,control}},{leaseToken:token});active={id:workout.id,control};return workout;}catch(error){release();throw error;}
  },
  async update(id,progress){const token=assertLease();return scope.updateWorkout(id,{progress},{leaseToken:token});},
  async pause(id,progress){const token=assertLease();if(progress)await scope.updateWorkout(id,{progress},{leaseToken:token});const workout=await scope.pauseWorkout(id,{leaseToken:token});active={id,control:'manual'};return workout;},
  async resume(id){const token=assertLease(),workout=await scope.resumeWorkout(id,{leaseToken:token});active={id,control:'manual'};return workout;},
  async complete(id,completion){const token=assertLease(),result=await scope.completeWorkout(id,completion,{leaseToken:token});active=null;release();return {local:true,queued:!!result.outbox,workout:result.workout,duplicate:result.duplicate};},
  async interrupt(id,progress){const token=assertLease();if(progress)await scope.updateWorkout(id,{progress},{leaseToken:token});const workout=await scope.interruptWorkout(id,{leaseToken:token});active=null;release();return workout;},
  async history(){return (await scope.listWorkouts()).filter(row=>row.status==='completed').sort((a,b)=>(b.completedAt??0)-(a.completedAt??0)||b.id.localeCompare(a.id));},
  snapshot(){return {held,active,foreign:foreign()};},
  close(){if(disposed)return;disposed=true;release();channel?.removeEventListener?.('message',receive);channel?.close?.();repository.close();},
 });
}

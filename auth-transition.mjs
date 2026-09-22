export const AUTH_TRANSITION_KEY='myr5-auth-transition-v1';
export const AUTH_PROVIDER_KEY='myr5-login-provider';
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
export class AuthTransitionError extends Error{
 constructor(code='auth_transition'){super(code==='auth_unavailable'?'Account synchronization is unavailable. Reload to retry.':'Account changed. Refresh to continue.');this.name='AuthTransitionError';this.code=code;}
}
// This coordinator owns no tokens, credentials or account data. All authority
// tickets bind the persisted random transition and an in-memory revision.
export function createAuthTransition({storage,events,channelFactory,randomUUID}){
 let token,revision=0,refreshGeneration=0,controller=new AbortController(),refreshController,channel,blocked=false,identity;
 const listeners=new Set();
 const notify=()=>{for(const listener of listeners){try{listener();}catch{}}};
 const cancel=()=>{revision++;refreshGeneration++;controller.abort();refreshController?.abort();controller=new AbortController();notify();};
 const block=()=>{if(!blocked){blocked=true;cancel();}throw new AuthTransitionError('auth_unavailable');};
 const read=()=>{try{const value=storage.getItem(AUTH_TRANSITION_KEY);if(!uuid(value))return block();return value;}catch{return block();}};
 const current=()=>{if(blocked)throw new AuthTransitionError('auth_unavailable');const value=read();if(value!==token){token=value;cancel();}return value;};
 const invalidate=()=>{
  if(blocked)throw new AuthTransitionError('auth_unavailable');
  cancel();
  try{const next=randomUUID();if(!uuid(next))return block();storage.setItem(AUTH_TRANSITION_KEY,next);if(storage.getItem(AUTH_TRANSITION_KEY)!==next)return block();token=next;channel.postMessage({type:'transition',token:next});return next;}catch{return block();}
 };
 const onStorage=event=>{try{if(event.key===AUTH_TRANSITION_KEY||event.key===null)current();else if(event.key===AUTH_PROVIDER_KEY)invalidate();}catch{}};
 const onMessage=()=>{try{current();}catch{}};
 try{
  if(!storage||!events?.addEventListener||typeof channelFactory!=='function'||typeof randomUUID!=='function')throw Error();
  token=storage.getItem(AUTH_TRANSITION_KEY);
  if(token===null){token=randomUUID();if(!uuid(token))throw Error();storage.setItem(AUTH_TRANSITION_KEY,token);token=storage.getItem(AUTH_TRANSITION_KEY);}
  if(!uuid(token))throw Error();
  channel=channelFactory('myr5-auth-transition-v1');
  if(!channel?.addEventListener||!channel?.postMessage)throw Error();
  channel.addEventListener('message',onMessage);channel.addEventListener('messageerror',()=>{try{block();}catch{}});events.addEventListener('storage',onStorage);
 }catch{blocked=true;controller.abort();}
 const capture=()=>{const value=current();return Object.freeze({token:value,revision,signal:controller.signal});};
 const isCurrent=ticket=>{try{return !!ticket&&current()===ticket.token&&ticket.revision===revision&&!ticket.signal.aborted&&(ticket.refreshGeneration===undefined||ticket.refreshGeneration===refreshGeneration);}catch{return false;}};
 return Object.freeze({
  capture,isCurrent,invalidate,
  assertCurrent(ticket){if(!isCurrent(ticket))throw new AuthTransitionError(blocked?'auth_unavailable':'auth_transition');},
  beginRefresh(){const ticket=capture();refreshController?.abort();refreshController=new AbortController();return Object.freeze({...ticket,refreshGeneration:++refreshGeneration,signal:refreshController.signal});},
  observeIdentity(provider,sessionId,userId){const next=JSON.stringify([provider,sessionId??null,userId??null]);if(identity===undefined){identity=next;return;}if(identity!==next){identity=next;invalidate();}},
  subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
  close(){if(!blocked){blocked=true;cancel();}events?.removeEventListener?.('storage',onStorage);channel?.close?.();},
 });
}
let browserCoordinator;
export function authTransitions(){
 if(!browserCoordinator){let storage;try{storage=globalThis.localStorage;}catch{}
  browserCoordinator=createAuthTransition({storage,events:globalThis.window,channelFactory:typeof globalThis.BroadcastChannel==='function'?name=>new BroadcastChannel(name):undefined,randomUUID:()=>globalThis.crypto.randomUUID()});
 }
 return browserCoordinator;
}

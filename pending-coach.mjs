import {validRecipe} from './onboarding-domain.mjs';
export const INCOMING_KEY='myr5-incoming-coach-v1';
export function validIncomingCoach(value){return !!(value&&value.version===1&&value.armieCompleted===true&&value.customizationConfirmed===true&&validRecipe(value.appearance?.['myr5-recipe-v1']));}
export function saveIncomingCoach(value,session=sessionStorage,local=localStorage){
 const raw=typeof value==='string'?value:JSON.stringify(value);
 if(new TextEncoder().encode(raw).length>55000)throw Error('This saved coach is too large to transfer. Return to the website and try again.');
 const data=JSON.parse(raw);
 if(!validIncomingCoach(data))throw Error('Your saved coach could not be read. Return to the creature studio and tap Use this coach again.');
 // Durable storage keeps the handoff available when the next app tab is opened.
 local.setItem(INCOMING_KEY,raw);
 try{session.setItem(INCOMING_KEY,raw);}catch{}
 return data;
}
export function readIncomingCoach(session=sessionStorage,local=localStorage){
 for(const storage of [session,local])try{const value=JSON.parse(storage.getItem(INCOMING_KEY)||'null');if(validIncomingCoach(value))return value;}catch{}
 return null;
}
export function clearIncomingCoach(session=sessionStorage,local=localStorage){for(const storage of [session,local])try{storage.removeItem(INCOMING_KEY);}catch{}}

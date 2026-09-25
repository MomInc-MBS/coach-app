// The cage's device-local preference. A pet must also be a currently granted
// battle-pass reward; this module never grants one or changes a coach recipe.
import {BOSSES,bossRewards} from './battle-pass-rewards.mjs';
import * as unlockLedger from './unlock-ledger.mjs';

export const PET_CHOICE_KEY='myr5-cage-selection-v1';
export const PET_CHOICE_SCOPE_LABEL='Selected on this device';

const canonicalPets=Object.freeze([...new Map(BOSSES.flatMap(boss=>bossRewards(boss.id).flat()).filter(item=>item.kind==='pet').map(item=>[item.id,Object.freeze({id:item.id,name:item.name})])).values()]);
const canonicalIds=new Set(canonicalPets.map(pet=>pet.id));
const empty=()=>({version:1,petId:null});
const storageFor=options=>{try{return options.storage??globalThis.localStorage;}catch{return null;}};
const ledgerFor=options=>options.ledger??unlockLedger;
const granted=(id,options)=>{try{return canonicalIds.has(id)&&ledgerFor(options).isGranted('pet',id)===true;}catch{return false;}};
const write=(selection,options)=>{try{const storage=storageFor(options);if(!storage)return false;storage.setItem(PET_CHOICE_KEY,JSON.stringify(selection));return true;}catch{return false;}};

/** Includes None and only canonical battle-pass pets currently granted. */
export function availablePetChoices(options={}){
 return [{id:null,name:'None'},...canonicalPets.filter(pet=>granted(pet.id,options))];
}

/** Revalidates a saved preference against current grants on every read. */
export function selectedPetChoice(options={}){
 let saved;
 try{saved=storageFor(options)?.getItem(PET_CHOICE_KEY);if(saved===null||saved===undefined)return empty();saved=JSON.parse(saved);}catch{return empty();}
 if(saved?.version===1&&(saved.petId===null||typeof saved.petId==='string'&&granted(saved.petId,options)))return {version:1,petId:saved.petId};
 const selection=empty();write(selection,options);return selection;
}

/** Returns true only when the allowed choice was saved on this device. */
export function selectPetChoice(petId,options={}){
 if(petId!==null&&!(typeof petId==='string'&&granted(petId,options)))return false;
 return write({version:1,petId},options);
}

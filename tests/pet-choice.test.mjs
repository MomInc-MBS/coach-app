import test from 'node:test';
import assert from 'node:assert/strict';
import {availablePetChoices,selectedPetChoice,selectPetChoice,PET_CHOICE_KEY,PET_CHOICE_SCOPE_LABEL} from '../pet-choice.mjs';
import {grantUnlock,LEDGER_KEY} from '../unlock-ledger.mjs';

function device(){
 const data=new Map();
 return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
}

function withDevice(run){
 const prior=globalThis.localStorage,storage=device();globalThis.localStorage=storage;
 try{return run(storage);}finally{if(prior===undefined)delete globalThis.localStorage;else globalThis.localStorage=prior;}
}

test('only canonical currently granted pets are offered; None remains available',()=>withDevice(storage=>{
 storage.setItem(LEDGER_KEY,JSON.stringify({pet:['forged-pet']}));
 assert.deepEqual(availablePetChoices(),[{id:null,name:'None'}]);
 assert.equal(selectPetChoice('forged-pet'),false);
 assert.equal(selectPetChoice('push-pet'),false);
 assert.equal(storage.getItem(PET_CHOICE_KEY),null);
 assert.equal(PET_CHOICE_SCOPE_LABEL,'Selected on this device');
}));

test('a granted canonical pet can be selected and None can clear it',()=>withDevice(storage=>{
 assert.equal(grantUnlock('pet','push-pet'),true);
 assert(availablePetChoices().some(pet=>pet.id==='push-pet'));
 assert.equal(selectPetChoice('push-pet'),true);
 assert.deepEqual(selectedPetChoice(),{version:1,petId:'push-pet'});
 assert.deepEqual(JSON.parse(storage.getItem(PET_CHOICE_KEY)),{version:1,petId:'push-pet'});
 assert.equal(selectPetChoice(null),true);
 assert.deepEqual(selectedPetChoice(),{version:1,petId:null});
}));

test('reads revalidate after an unlock is removed',()=>withDevice(storage=>{
 grantUnlock('pet','push-pet');selectPetChoice('push-pet');
 storage.setItem(LEDGER_KEY,JSON.stringify({pet:[]}));
 assert.deepEqual(selectedPetChoice(),{version:1,petId:null});
 assert.deepEqual(JSON.parse(storage.getItem(PET_CHOICE_KEY)),{version:1,petId:null});
 assert.deepEqual(availablePetChoices(),[{id:null,name:'None'}]);
}));

test('unavailable storage fails closed without throwing',()=>withDevice(()=>{
 const storage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
 grantUnlock('pet','push-pet');
 assert.deepEqual(selectedPetChoice({storage}),{version:1,petId:null});
 assert.equal(selectPetChoice('push-pet',{storage}),false);
 assert.equal(selectPetChoice(null,{storage}),false);
}));

test('selection writes only its device key and leaves the coach recipe intact',()=>withDevice(storage=>{
 const recipe='{"name":"Existing coach","parts":{"pet":39}}';
 storage.setItem('myr5-recipe-v1',recipe);
 grantUnlock('pet','push-pet');
 const beforeLedger=storage.getItem(LEDGER_KEY);
 assert.equal(selectPetChoice('push-pet'),true);
 assert.equal(storage.getItem('myr5-recipe-v1'),recipe);
 assert.equal(storage.getItem(LEDGER_KEY),beforeLedger);
 assert.deepEqual([...storage.data.keys()].sort(),[LEDGER_KEY,PET_CHOICE_KEY,'myr5-recipe-v1'].sort());
}));

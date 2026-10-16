// Device-only, owner-scoped arcade coins. Fitness XP is owned by PerformanceWorkout.
// A readwrite transaction over the owner row serializes competing tabs and purchases.
const fresh=()=>({version:1,balance:0,tokens:0,stars:0,bestDistance:0,owned:[],loadout:[],selectedVehicle:null,selectedCosmetic:null,upgrades:{},runs:{},receipts:{}});
const clone=v=>structuredClone(v);
function integer(v,max=1000000){if(!Number.isSafeInteger(v)||v<0||v>max)throw Error('Invalid game reward.');return v;}
// Original device-only MYR5 progression rules, not reference-game reward odds.
function progress(s){
  const runs=Object.values(s.runs);
  s.rank=1+Math.floor(s.stars/3)%10;s.prestige=Math.floor(s.stars/30);s.rankStarsProgress=s.stars%3;
  s.achievements=[];
  if(runs.some(r=>r.finalized))s.achievements.push('first-flight');
  if(runs.reduce((sum,r)=>sum+(r.coins??0),0)>=100)s.achievements.push('coins-100');
  if(s.bestDistance>=250)s.achievements.push('distance-250');
  if(runs.some(r=>r.componentSets>0))s.achievements.push('component-mech');
  s.dailyComponents??={days:[]};
  const daily=s.dailyComponents;daily.totalDays=daily.days.length;daily.progress=daily.totalDays%5;daily.rewards=Math.floor(daily.totalDays/5);
  return s;
}
export async function openFlightWallet({owner,indexedDB=globalThis.indexedDB,name='myr5-plank-flight-v1',now=()=>Date.now()}={}){
  if(typeof owner!=='string'||!owner||owner==='guest:unavailable')throw Error('Device coin storage needs an available profile.');
  if(!indexedDB)throw Error('Device coin storage is unavailable.');
  const db=await new Promise((resolve,reject)=>{const request=indexedDB.open(name,1);request.onupgradeneeded=()=>request.result.createObjectStore('wallets');request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('Close another Coach tab to update coin storage.'));request.onsuccess=()=>resolve(request.result);});
  let closed=false;db.onversionchange=()=>{closed=true;db.close();};
  const transact=operation=>new Promise((resolve,reject)=>{
    if(closed){reject(Error('Coin storage closed. Reopen Coach.'));return;}
    const tx=db.transaction('wallets','readwrite'),store=tx.objectStore('wallets'),get=store.get(owner);let result,error;
    get.onsuccess=()=>{try{const state=progress(get.result??fresh());result=operation(state);progress(state);store.put(state,owner);}catch(e){error=e;tx.abort();}};
    tx.oncomplete=()=>resolve(clone(result));tx.onerror=()=>reject(error??tx.error);tx.onabort=()=>reject(error??tx.error??Error('Coin save interrupted.'));
  });
  return {owner,read:()=>transact(s=>s),
    record(runId,events=[]){if(typeof runId!=='string'||!runId)return Promise.reject(Error('Missing game identity.'));
      return transact(s=>{const run=s.runs[runId]??={events:{},coins:0,tokens:0,finalized:false,spun:false};
        for(const event of events){if(!event?.id)throw Error('Missing reward identity.');
          const value=JSON.stringify({type:event.type,amount:event.amount??0});
          if(run.events[event.id]){if(run.events[event.id]!==value)throw Error('A saved reward changed.');continue;}
          if(run.finalized)throw Error('This game is already saved.');
          if(event.type==='coin'){const amount=integer(event.amount,10000);s.balance+=amount;run.coins+=amount;}
          else if(event.type==='token'){const amount=integer(event.amount??1,10);s.tokens+=amount;run.tokens+=amount;}
          else if(event.type==='mission')s.stars+=integer(event.amount??1,3);
          else if(event.type==='component-set'){
            const day=new Date(now()).toISOString().slice(0,10),daily=s.dailyComponents;
            run.componentSets=(run.componentSets??0)+1;
            if(!daily.days.includes(day)){
              daily.days.push(day);
              if(daily.days.length%5===0)s.balance+=100;
            }
          }
          else throw Error('Unknown game reward.');
          run.events[event.id]=value;
        }return s;});},
    finish(runId,distance){return transact(s=>{const run=s.runs[runId]??={events:{},coins:0,tokens:0,spun:false};run.finalized=true;s.bestDistance=Math.max(s.bestDistance,Math.max(0,Number(distance)||0));return s;});},
    spin(runId){return transact(s=>{if(!s.runs[runId]?.finalized)throw Error('Finish this flight before opening the reward.');
      // Redeem all completed runs atomically, including rewards left behind before a restart.
      for(const run of Object.values(s.runs))if(run.finalized&&!run.spun){
        const reward=(run.tokens??0)*25;s.tokens=Math.max(0,s.tokens-(run.tokens??0));s.balance+=reward;run.spun=true;run.spinReward=reward;
      }return s;});},
    buy(id,catalog,{receipt=crypto.randomUUID()}={}){const item=catalog.find(i=>i.id===id);if(!item)return Promise.reject(Error('That item is unavailable.'));
      return transact(s=>{const previous=s.receipts[receipt];if(previous){if(previous!==id)throw Error('Purchase identity changed.');return s;}
        const level=item.kind==='upgrade'?(s.upgrades?.[id]??0):0;if(item.kind==='upgrade'&&level>=(item.maxLevel??1))return s;if(item.kind!=='upgrade'&&s.owned.includes(id))return s;
        const price=integer(item.price*(level+1),1000000);if(s.balance<price)throw Error('Collect more device coins first.');s.balance-=price;if(!s.owned.includes(id))s.owned.push(id);if(item.kind==='upgrade'){s.upgrades??={};s.upgrades[id]=level+1;}s.receipts[receipt]=id;return s;});},
    equip(id,catalog){return transact(s=>{const item=catalog.find(i=>i.id===id);if(!item||!s.owned.includes(id))throw Error('Unlock this item first.');
      if(item.kind==='vehicle'){s.selectedVehicle=s.selectedVehicle===id?null:id;return s;}
      if(item.kind==='cosmetic'){s.selectedCosmetic=s.selectedCosmetic===id?null:id;return s;}
      if(item.kind==='upgrade')return s;
      if(s.loadout.includes(id))s.loadout=s.loadout.filter(x=>x!==id);else{const max=2;if(s.loadout.length>=max)throw Error('Choose up to two gadgets.');s.loadout.push(id);}return s;});},
    close(){closed=true;db.close();}};
}

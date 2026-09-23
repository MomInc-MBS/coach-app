const COLLECTIONS=Object.freeze({
 'creature-forged-realms':'Forged Realms',
 'creature-celestial-rift':'Celestial Rift',
});
const OWNER=/^[A-Za-z0-9](?:[A-Za-z0-9._:-]{0,127})$/;
const STYLE_ID='creatureSkinRewardRevealStyle';
const CSS=`
.creature-skin-reward{position:fixed;z-index:10020;top:calc(env(safe-area-inset-top,0px) + 14px);right:14px;width:min(360px,calc(100vw - 28px));padding:18px 18px 14px;border:1px solid #e5c778;border-radius:16px;background:linear-gradient(145deg,#2e2037f5,#17131cf7);box-shadow:0 16px 48px #0008;color:#fff8e9;font:500 15px/1.45 system-ui,sans-serif;pointer-events:auto;animation:skin-reward-in .34s cubic-bezier(.16,1,.3,1) both}
.creature-skin-reward h2{margin:0 28px 8px 0;color:#ffe39a;font:700 18px/1.2 Georgia,serif}
.creature-skin-reward ul{margin:8px 0 14px;padding-left:20px}.creature-skin-reward li+li{margin-top:5px}
.creature-skin-reward .skin-reward-collection{display:block;color:#d9c9ef;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-top:10px}
.creature-skin-reward button{border:1px solid #d8c9a1;border-radius:999px;background:#f2dfb0;color:#241b2b;padding:7px 14px;font:700 13px system-ui,sans-serif;cursor:pointer}
.creature-skin-reward button:focus-visible{outline:3px solid #fff;outline-offset:3px}
@keyframes skin-reward-in{from{opacity:0;transform:translateY(-8px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
@media(prefers-reduced-motion:reduce){.creature-skin-reward{animation:none}}
`;
const ownerOf=account=>{const id=account?.user?.id;return typeof id==='string'&&OWNER.test(id)?id:null;};

/** A small, non-blocking notice for newly granted post-download creature skins. */
export function mountCreatureSkinRewardReveal(){
 const initial=window.myr5AuthenticatedAccount;
 let disposed=false,activeOwner=Number.isSafeInteger(initial?.dataEpoch)&&initial.dataEpoch>0?ownerOf(initial):null,activeEpoch=activeOwner?initial.dataEpoch:null;
 let style=null,card=null;const queue=[],seen=new Set();
 function clear(){queue.length=0;seen.clear();card?.remove();card=null;style?.remove();style=null;}
 function ensureStyle(){if(style?.isConnected)return;style=document.getElementById(STYLE_ID)||document.createElement('style');style.id=STYLE_ID;style.textContent=CSS;if(!style.isConnected)document.head.append(style);}
 function showNext(){
  if(disposed||card||!queue.length)return;
  const groups=queue.shift();ensureStyle();const next=document.createElement('aside');next.className='creature-skin-reward';next.setAttribute('role','status');next.setAttribute('aria-live','polite');next.setAttribute('aria-atomic','true');
  const title=document.createElement('h2');title.textContent='New creature skin';next.append(title);
  for(const [collection,names] of groups){const label=document.createElement('span');label.className='skin-reward-collection';label.textContent=collection;next.append(label);const list=document.createElement('ul');for(const name of names){const item=document.createElement('li');item.textContent=name;list.append(item);}next.append(list);}
  const dismiss=document.createElement('button');dismiss.type='button';dismiss.textContent='Dismiss';dismiss.setAttribute('aria-label','Dismiss creature skin reward');dismiss.addEventListener('click',()=>{next.remove();card=null;showNext();});next.append(dismiss);document.body.append(next);card=next;
 }
 function onReward(event){
  if(disposed||!activeOwner||activeEpoch===null||ownerOf(window.myr5AuthenticatedAccount)!==activeOwner||window.myr5AuthenticatedAccount?.dataEpoch!==activeEpoch)return;
  const granted=Array.isArray(event.detail?.granted)?event.detail.granted:[],groups=new Map();
  for(const reward of granted){
   if(reward?.kind!=='creature-skin'||typeof reward.id!=='string'||!/^creature-[a-z0-9-]{1,80}$/.test(reward.id)||seen.has(reward.id))continue;
   const collection=COLLECTIONS[reward.collection];if(!collection)continue;
   const name=typeof reward.name==='string'&&reward.name.trim()?reward.name.trim().slice(0,100):reward.id;
   seen.add(reward.id);if(!groups.has(collection))groups.set(collection,[]);groups.get(collection).push(name);
  }
  if(groups.size){queue.push(groups);showNext();}
 }
 function onAccountReady(event){
  const next=event.detail,epoch=Number.isSafeInteger(next?.dataEpoch)&&next.dataEpoch>0?next.dataEpoch:null,id=epoch?ownerOf(next):null;
  if(id!==activeOwner||epoch!==activeEpoch){clear();activeOwner=id;activeEpoch=epoch;}
 }
 function onAccountCleared(){clear();activeOwner=null;activeEpoch=null;}
 function dispose(){if(disposed)return;disposed=true;clear();window.removeEventListener('myr5:battle-pass',onReward);window.removeEventListener('myr5:account-ready',onAccountReady);window.removeEventListener('myr5:account-cleared',onAccountCleared);window.removeEventListener('pagehide',dispose);}
 window.addEventListener('myr5:battle-pass',onReward);window.addEventListener('myr5:account-ready',onAccountReady);window.addEventListener('myr5:account-cleared',onAccountCleared);window.addEventListener('pagehide',dispose,{once:true});
 return {dispose};
}

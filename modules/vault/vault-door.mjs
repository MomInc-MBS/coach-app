// STUB (lane L0; L7 replaces this file with the mechanical door). Contract: openVault() returns the open #vaultPanel dialog.
// Shows the earned count and every clue; "Enter" lazy-imports ./vault-hall.mjs (L8) when it exists.
import {GOALS} from './vault-goals.mjs';
import * as vault from './vault-store.mjs';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
export async function openVault(){
 let dialog=document.getElementById('vaultPanel');
 if(!dialog){
  dialog=document.createElement('dialog');dialog.id='vaultPanel';dialog.setAttribute('aria-label','Vault');
  dialog.style.cssText='background:#171020;color:#ffd36e;border:2px solid #7a2fc4;max-width:min(92vw,420px);max-height:80vh;overflow:auto';
  document.body.append(dialog);
 }
 const {earned}=vault.read(),got=GOALS.filter(g=>earned[g.id]);
 const list=el('ol');for(const g of GOALS)list.append(el('li',earned[g.id]?g.title:g.clue));
 const enter=el('button','Enter');enter.type='button';
 const note=el('p','');note.setAttribute('role','status');
 enter.onclick=()=>import('./vault-hall.mjs').then(m=>(m.enterHall||m.openHall||m.default)?.(),()=>{note.textContent='The hall is not built yet.';});
 const close=el('button','Close');close.type='button';close.onclick=()=>dialog.close();
 dialog.replaceChildren(el('h2',`Vault ${got.length} / ${GOALS.length}`),list,note,enter,close);
 if(!dialog.open)dialog.showModal();
 return dialog;
}

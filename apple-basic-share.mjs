// Settings "Share Apple basic": navigator.share when present, clipboard copy otherwise. Hidden until
// APPLE_BASIC_SHARE_URL is configured.
import {APPLE_BASIC_SHARE_URL} from './apple-basic-share-config.mjs';

const TEXT='Try MOM Inc Coach — the Apple basic version.';

export async function shareAppleBasic(url=APPLE_BASIC_SHARE_URL,nav=globalThis.navigator){
 if(!url)return 'unavailable';
 if(nav?.share){
  try{await nav.share({title:'MOM Inc Coach',text:TEXT,url});return 'shared';}
  catch(error){if(error?.name==='AbortError')return 'cancelled';}
 }
 try{await nav.clipboard.writeText(url);return 'copied';}catch{return 'failed';}
}

const MESSAGES={shared:'Shared.',copied:'Link copied. Paste it to a friend.',cancelled:'',failed:'Could not share or copy the link.',unavailable:''};

export function mountAppleBasicShare(settings,{url=APPLE_BASIC_SHARE_URL,nav=globalThis.navigator}={}){
 if(!url)return null;
 const wrap=document.createElement('div');wrap.className='settings-share';
 const button=document.createElement('button');button.type='button';button.textContent='Share Apple basic';
 const status=document.createElement('p');status.setAttribute('role','status');
 button.onclick=async()=>{button.disabled=true;const result=await shareAppleBasic(url,nav);if(['shared','copied'].includes(result))void import('./modules/vault/vault-store.mjs').then(m=>m.bump('share')).catch(()=>{});status.textContent=MESSAGES[result];button.disabled=false;};
 wrap.append(button,status);settings.append(wrap);
 return wrap;
}

// Device-local portal appearance: metal colours, light-strip colour, board. Shared by the portal and War Room; guests included.
export const LOOK_KEYS={portal:'myr5.portalMetal',strip:'myr5.portalStrip'};
export const LOOK_DEFAULTS={portal:'#4d3d4f',strip:'#b026ff'};
const LEGACY_FRAME_KEY='myr5.portalFrameMetal';
export const BOARD_CHOICES=[['quilt','Quilt'],['ice','Crystal'],['grass','Grass'],['cogs','Cogs'],['jelly','Jelly'],['wood','Wood']];
export const cleanColor=(v,fallback)=>/^#[0-9a-f]{6}$/i.test(v)?v.toLowerCase():fallback;
const get=k=>{try{return localStorage.getItem(k)}catch{return null}};
export const readLook=()=>({portal:cleanColor(get(LOOK_KEYS.portal),cleanColor(get(LEGACY_FRAME_KEY),LOOK_DEFAULTS.portal)),strip:cleanColor(get(LOOK_KEYS.strip),LOOK_DEFAULTS.strip)});
// The default (or junk) removes the key, so "reset" leaves nothing behind.
export function saveLook(name,value){try{if(!Object.hasOwn(LOOK_KEYS,name))return;if(name==='portal')localStorage.removeItem(LEGACY_FRAME_KEY);const c=cleanColor(value,null);c&&c!==LOOK_DEFAULTS[name]?localStorage.setItem(LOOK_KEYS[name],c):localStorage.removeItem(LOOK_KEYS[name]);}catch{}}
// Flowing strip in one colour: bright, dim, bright, pale.
export const stripSeq=c=>{const mix=(t,to)=>'#'+[1,3,5].map(i=>Math.round(parseInt(c.slice(i,i+2),16)*(1-t)+to*t).toString(16).padStart(2,'0')).join('');return [c,mix(.6,0),c,mix(.55,255)];};
// Sets the CSS variables portal.css reads; defaults leave them unset so the stock look is untouched.
export function applyLookVars(el=document.documentElement,look=readLook()){
 if(look.portal===LOOK_DEFAULTS.portal){el.style.removeProperty('--portal-metal');el.style.removeProperty('--frame-metal');}
 else{el.style.setProperty('--portal-metal',look.portal);el.style.setProperty('--frame-metal',look.portal);}
 el.style.setProperty('--portal-strip-glow',`${look.strip}40`);
}
export const readBoard=()=>get('myr5.portalBoard')||'quilt';
export const saveBoard=id=>{try{localStorage.setItem('myr5.portalBoard',id);}catch{}};

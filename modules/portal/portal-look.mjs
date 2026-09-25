// Device-local portal appearance: metal colours, light-strip colour, board. Shared by the portal and War Room; guests included.
export const LOOK_KEYS={portal:'myr5.portalMetal',frame:'myr5.portalFrameMetal',strip:'myr5.portalStrip'};
export const LOOK_DEFAULTS={portal:'#4d3d4f',frame:'#4d3d4f',strip:'#b026ff'};
export const BOARD_CHOICES=[['quilt','Quilt'],['ice','Ice'],['grass','Grass'],['cogs','Cogs'],['jelly','Jelly'],['wood','Wood']];
export const cleanColor=(v,fallback)=>/^#[0-9a-f]{6}$/i.test(v)?v.toLowerCase():fallback;
const get=k=>{try{return localStorage.getItem(k)}catch{return null}};
export const readLook=()=>Object.fromEntries(Object.keys(LOOK_KEYS).map(k=>[k,cleanColor(get(LOOK_KEYS[k]),LOOK_DEFAULTS[k])]));
// The default (or junk) removes the key, so "reset" leaves nothing behind.
export function saveLook(name,value){try{const c=cleanColor(value,null);c&&c!==LOOK_DEFAULTS[name]?localStorage.setItem(LOOK_KEYS[name],c):localStorage.removeItem(LOOK_KEYS[name]);}catch{}}
// Flowing strip in one colour: bright, dim, bright, pale.
export const stripSeq=c=>{const mix=(t,to)=>'#'+[1,3,5].map(i=>Math.round(parseInt(c.slice(i,i+2),16)*(1-t)+to*t).toString(16).padStart(2,'0')).join('');return [c,mix(.6,0),c,mix(.55,255)];};
// Sets the CSS variables portal.css reads; defaults leave them unset so the stock look is untouched.
export function applyLookVars(el=document.documentElement,look=readLook()){
 for(const [name,prop] of [['portal','--portal-metal'],['frame','--frame-metal']])look[name]===LOOK_DEFAULTS[name]?el.style.removeProperty(prop):el.style.setProperty(prop,look[name]);
}
export const readBoard=()=>get('myr5.portalBoard')||'quilt';
export const saveBoard=id=>{try{localStorage.setItem('myr5.portalBoard',id);}catch{}};

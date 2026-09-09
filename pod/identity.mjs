export const GALA_KEY='mominc-avatar-v1';
export const LIVE_GALA='https://mominc-mbs.github.io/gala/';
export function loadGala(storage,avatar){
 try{const raw=storage.getItem(GALA_KEY);if(raw)return {look:avatar.normalize(JSON.parse(raw)),linked:true};}catch{}
 return {look:structuredClone(avatar.defaultLook),linked:false};
}
export function importGala(text,avatar){if(typeof text!=='string'||new TextEncoder().encode(text).length>30000)throw Error('Choose a Gala look file smaller than 30 KB.');return avatar.normalize(JSON.parse(text));}
export const POWERS={shield:{name:'Shield',line:'The shield holds.'},ember:{name:'Ember',line:'The ember field holds.'},arc:{name:'Arc',line:'The arc field holds.'},frost:{name:'Frost',line:'The frost field holds.'}};
export function loadPower(storage){try{const p=storage.getItem('myr5-pod-power-v1');if(POWERS[p])return p;}catch{}return 'shield';}

// The user's selected paths (D25 track ids). Nothing in the app stores them yet: the oval
// section picker (D25/PLAN §3a) isn't built, and onboarding only stores movements
// (account.onboarding.data.profile.exercises), which battle-pass.mjs uses as the fallback.
// This is the smallest store for an explicit pick — one localStorage key, no DOM. The oval
// screen should write here (setSelectedTracks) instead of growing its own storage.
// Meditation is never stored: it is always available (D9) and added by selectedTracks().
export const SELECTED_TRACKS_KEY='myr5-selected-tracks-v1';
export const CHOOSABLE_TRACKS=Object.freeze(['chest','quads','glutes','arms-shoulders','yoga','martial-arts','cardio']);

const clean=ids=>[...new Set((Array.isArray(ids)?ids:[]).filter(id=>CHOOSABLE_TRACKS.includes(id)))];

/** Stored pick, validated; [] when nothing was chosen or storage is unavailable. */
export function readSelectedTracks(){
 try{return clean(JSON.parse(localStorage.getItem(SELECTED_TRACKS_KEY)||'[]'));}catch{return [];}
}
/** Saves the pick (unknown ids and duplicates dropped); returns what was stored. */
export function setSelectedTracks(ids){
 const picked=clean(ids);
 try{localStorage.setItem(SELECTED_TRACKS_KEY,JSON.stringify(picked));}catch{/* no storage: pick lasts this page only via the fallback */}
 return picked;
}

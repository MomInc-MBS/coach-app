// Public shell download policy. Anyone with the installed app can enter every
// optional room (Ian, v61 correction: no second Coach Army gate); optional
// editor/pocket assets are only kept out of the first install precache.
export const OPTIONAL_PRECACHE_PREFIXES = Object.freeze(['/handborne/','/war-room','/warroom','/character-editor/','/editor/','/pocket-hardware.css','/hardware-launch.css','/pod/hardware.css','/pod/hardware.mjs','/pod/whiteboard.css']);
// Still read by the War Room lane (war-room/war-room.mjs); nothing outside it gates on this.
export function coachArmyComplete(account){
 const entitlement=account?.entitlements?.coachArmy;
 return entitlement?.status==='completed'&&Number.isSafeInteger(entitlement.completedAt)&&entitlement.completedAt>0;
}
export function filterInitialPrecache(files){return files.filter(file=>!OPTIONAL_PRECACHE_PREFIXES.some(prefix=>file===prefix||file.startsWith(prefix)));}

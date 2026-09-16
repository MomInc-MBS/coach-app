// Public shell access policy. The server/account remains the authority for
// entitlements; this only prevents optional UI routes from being entered
// before durable Coach setup is present.
export const OPTIONAL_ROUTE_PREFIXES = Object.freeze(['/war-room','/warroom','/handborne','/creature','/character-editor','/editor']);
export const OPTIONAL_PRECACHE_PREFIXES = Object.freeze(['/handborne/','/creature/','/war-room','/warroom','/character-editor/','/editor/','/pocket-hardware.css','/hardware-launch.css','/pod/hardware.css','/pod/hardware.mjs','/pod/whiteboard.css']);
// This is deliberately a narrow integration seam, not an inference from
// onboarding. The eventual account response must carry the authoritative
// Coach Army/Gala entitlement issued by the completion event (server/gala.mjs
// completes a run only after the armie_at checkpoint and all required pages).
// Until that field is wired through, optional editors remain locked.
export function coachArmyComplete(account){
 const entitlement=account?.entitlements?.coachArmy;
 return entitlement?.status==='completed'&&Number.isSafeInteger(entitlement.completedAt)&&entitlement.completedAt>0;
}
export function isOptionalPublicRoute(pathname){const path=String(pathname||'/');return OPTIONAL_ROUTE_PREFIXES.some(prefix=>path===prefix||path.startsWith(prefix+'/'));}
export function canEnterPublicRoute(pathname,complete){return !!complete||!isOptionalPublicRoute(pathname);}
export function filterInitialPrecache(files){return files.filter(file=>!OPTIONAL_PRECACHE_PREFIXES.some(prefix=>file===prefix||file.startsWith(prefix)));}

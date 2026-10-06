// The user's two chosen workout paths. They live in the owner's performance progress
// (owner-scoped storage, never a global key), so another account on the same device never sees them
// and the server can persist and derive them from the same record.
import {CHOOSABLE_TRACKS,normalizePaths} from './performance-catalog.mjs';
import {readPerformanceProgress,choosePerformancePaths} from './performance-progress.mjs';
export {CHOOSABLE_TRACKS};
/** Legacy global key. Nothing reads or writes it any more: it leaked paths between accounts. */
export const SELECTED_TRACKS_KEY='myr5-selected-tracks-v1';

/** Chosen path ids (canonical, arms-shoulders for arms) for options.owner/storage/account; [] until chosen. */
export const readSelectedTracks=(options={})=>readPerformanceProgress(options).paths;
/** One-time choice of exactly 2 paths. Grants each path's introductory coach and persists both.
 * Repeating the same pair is a no-op; a different pair throws unless options.reset is true. */
export function chooseWorkoutPaths(trackIds,options={}){
 const picked=normalizePaths(trackIds);
 if(picked.length!==2)throw RangeError('Exactly 2 workout paths must be selected.');
 return choosePerformancePaths(picked,options).paths;
}
export const setSelectedTracks=chooseWorkoutPaths;

// The user's two chosen workout paths. They live in the owner's performance progress
// (owner-scoped storage, never a global key), so another account on the same device never sees them
// and the server can persist and derive them from the same record.
import {CHOOSABLE_TRACKS,COACH_REQUIREMENTS,normalizePaths} from './performance-catalog.mjs';
import {EXERCISES} from './exercise-library.mjs';
import {readPerformanceProgress,choosePerformancePaths} from './performance-progress.mjs';
export {CHOOSABLE_TRACKS};
export const GROUP_PATH=Object.freeze({chest:'chest',legs:'quads',hips:'glutes',shoulders:'arms-shoulders',core:'yoga',balance:'yoga',yoga:'yoga',stances:'martial-arts',boxing:'martial-arts',cardio:'cardio'});
const pathTrack=path=>path==='arms-shoulders'?'arms':path;
/** Legacy global key. Nothing reads or writes it any more: it leaked paths between accounts. */
export const SELECTED_TRACKS_KEY='myr5-selected-tracks-v1';

/** Chosen path ids (canonical, arms-shoulders for arms) for options.owner/storage/account; [] until chosen. */
export const readSelectedTracks=(options={})=>readPerformanceProgress(options).paths;
/** A selected path is open; an already owned coach also keeps every one of its mapped paths open. */
export function workoutPathAccess(mode,options={}){
 const group=EXERCISES[mode]?.group,path=GROUP_PATH[group];
 if(!path)return {allowed:false,path:null,reason:'Choose a movement in an available workout path.'};
 const progress=readPerformanceProgress(options);
 if(progress.paths.includes(path))return {allowed:true,path,reason:null};
 const owned=new Set(progress.coaches);
 if(COACH_REQUIREMENTS.some(coach=>owned.has(coach.id)&&coach.tracks.includes(pathTrack(path))))return {allowed:true,path,reason:null};
 return {allowed:false,path,reason:`${path.replaceAll('-',' ')} is locked. Choose it as one of your two paths or earn its coach.`};
}
export function workoutGroupAccess(group,options={}){
 const first=Object.values(EXERCISES).find(exercise=>exercise.group===group);
 return workoutPathAccess(first?.id,options);
}
/** One-time choice of exactly 2 paths. Grants each path's introductory coach and persists both.
 * Repeating the same pair is a no-op; a different pair throws unless options.reset is true. */
export function chooseWorkoutPaths(trackIds,options={}){
 const picked=normalizePaths(trackIds);
 if(picked.length!==2)throw RangeError('Exactly 2 workout paths must be selected.');
 return choosePerformancePaths(picked,options).paths;
}
export const setSelectedTracks=chooseWorkoutPaths;

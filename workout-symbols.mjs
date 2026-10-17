import {EXERCISES} from './exercise-library.mjs';
import {PATH_SYMBOLS} from './coach-path-symbols.mjs';

// Same path symbols used by the coach picker, with a rung number for exercise identity.
const PATH={chest:'chest',legs:'quads',hips:'glutes',core:'yoga',shoulders:'arms-shoulders',balance:'yoga',yoga:'yoga',stances:'martial-arts',boxing:'martial-arts',cardio:'cardio'};
export function workoutSymbol(id){
 const exercise=EXERCISES[id];
 return (PATH_SYMBOLS[PATH[exercise?.group??id]??id]??PATH_SYMBOLS.original)+(exercise?` ${exercise.difficulty}`:'');
}
export function paintWorkoutSymbol(node,id,label=EXERCISES[id]?.name??id){
 node.textContent=workoutSymbol(id);node.setAttribute('aria-label',label);node.title=label;
}

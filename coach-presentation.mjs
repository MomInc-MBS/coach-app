import {COACH_NAME_META} from './coach-names.mjs';
import {PATH_SYMBOLS} from './coach-path-symbols.mjs';
export function coachPresentation(id){
 const track=COACH_NAME_META[id]?.track||'original';
 return {track,symbol:PATH_SYMBOLS[track]||PATH_SYMBOLS.original};
}

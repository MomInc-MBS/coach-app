# R18 lane F3a

## Goal
Remove the Coach (personality) tab's logic from creature/source/editor-workbench.ts; it moves to the Reminders page (coach-hub.mjs, handled separately). I delete the HTML myself, so the ids coach, coachTone, coachSituation and coachLine do NOT exist after this edit: no code may call $() on them. KEEP the recipe field `coach` itself (Design.coach is still stored/loaded/exported; only the UI is gone).
1. L5: the `import {SITUATIONS,getCoach,type Situation} from './creator/coaching';` line is no longer needed: delete it.
2. L62: delete the coachPreview() function.
3. L112: remove 'coach' from the key list in sync() (keep the others).
4. L122: remove the `coachPreview();` call at the end of that line (keep the undo/redo disabled code).
5. L152: remove `options('coachSituation',SITUATIONS);` and `options('coach',COACHES.map(c=>[c.id,c.name]));` and remove COACHES from the L4 import if it becomes unused (keep REGIONS,LABELS,PICKER_BODIES,EYE_LAYOUTS,PUPILS,RECIPE_KEY,MOTION_KEY,MAX_IMPORT_BYTES,fresh,importCreature,loadRecipe,motionSettings).
6. L154: delete the coachSituation change listener.
7. L190: remove 'coach' from the id list in the `for(const id of ['body','eyeLayout','fingers','toes','eye','pupil','coach'])` loop.

Another card edits lines 4 and others for different reasons: in line 4 change ONLY the COACHES token (a separate SEARCH of `PUPILS,COACHES,RECIPE_KEY` -> `PUPILS,RECIPE_KEY`).

## Current source (real, line-numbered)
File creature/source/editor-workbench.ts, lines 4-5:
```
4: import {REGIONS,LABELS,PICKER_BODIES,EYE_LAYOUTS,PUPILS,COACHES,RECIPE_KEY,MOTION_KEY,MAX_IMPORT_BYTES,fresh,importCreature,loadRecipe,motionSettings} from './profile';
5: import {SITUATIONS,getCoach,type Situation} from './creator/coaching';
```

File creature/source/editor-workbench.ts, lines 62-62:
```
62: function coachPreview(){const coach=getCoach(shown().coach);$('coachTone').textContent=coach.tone;$('coachLine').textContent=coach.lines[($('coachSituation') as HTMLSelectElement).value as Situation||'start'];}
```

File creature/source/editor-workbench.ts, lines 110-112:
```
110: function sync(){
111:  const look=shown();
112:  for(const key of ['body','eyeLayout','fingers','toes','eye','pupil','coach','fur','iris','pupilSize','detail']){const input=$(key) as HTMLInputElement;input.value=String(look[key as keyof Design]);const out=document.getElementById(key+'Value');if(out)out.textContent=Number(input.value).toFixed(2);}
```

File creature/source/editor-workbench.ts, lines 122-122:
```
122:  ($('undo') as HTMLButtonElement).disabled=!undo.length&&!previewing();($('redo') as HTMLButtonElement).disabled=!redo.length;coachPreview();
```

File creature/source/editor-workbench.ts, lines 152-154:
```
152: options('eyeLayout',Object.entries(EYE_LAYOUTS).map(([key,value])=>[key,value.label]));options('pupil',PUPILS);options('coach',COACHES.map(c=>[c.id,c.name]));options('coachSituation',SITUATIONS);
153: for(const [id,min,max] of [['fingers',2,6],['toes',1,6]] as const)options(id,Array.from({length:max-min+1},(_,i)=>[i+min,String(i+min)]));
154: $('coachSituation').addEventListener('change',coachPreview);
```

File creature/source/editor-workbench.ts, lines 190-190:
```
190: for(const id of ['body','eyeLayout','fingers','toes','eye','pupil','coach'])$(id).addEventListener('change',()=>{const input=$(id) as HTMLInputElement,value=['fingers','toes'].includes(id)?Number(input.value):input.value;
```

## Reply format (strict)
Reply ONLY with SEARCH/REPLACE blocks. Each SEARCH must be a verbatim, UNIQUE substring of the current file (copy it exactly from the excerpt WITHOUT the "N: " line-number prefixes; keep it as short as is still unique; whole lines are fine). Do not rewrite code you are not changing. No commentary.
FILE: path
<<<<<<< SEARCH
<exact existing text>
=======
<new text>
>>>>>>> REPLACE

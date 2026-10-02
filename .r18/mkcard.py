import sys,pathlib
def ex(path,a,b=None):
    b=b or a;L=pathlib.Path(path).read_text(encoding='utf-8').split('\n')
    return f"File {path}, lines {a}-{b}:\n```\n"+'\n'.join(f"{i}: {L[i-1]}" for i in range(a,b+1))+"\n```\n"
FMT="""
## Reply format (strict)
Reply ONLY with SEARCH/REPLACE blocks. Each SEARCH must be a verbatim, UNIQUE substring of the current file (copy it exactly from the excerpt WITHOUT the "N: " line-number prefixes; keep it as short as is still unique; whole lines are fine). Do not rewrite code you are not changing. No commentary.
FILE: path
<<<<<<< SEARCH
<exact existing text>
=======
<new text>
>>>>>>> REPLACE
"""
def card(name,goal,parts,rules=''):
    t=f"# R18 lane {name}\n\n## Goal\n{goal}\n\n"+rules+"\n## Current source (real, line-numbered)\n"+'\n'.join(parts)+FMT
    pathlib.Path(f'.r18/cards/{name}.md').write_text(t,encoding='utf-8');print(name,len(t))
W='creature/source/editor-workbench.ts'
# ---- F5
card('F5',"""Remove the war-room cage background and its bay buttons from the CUSTOMIZER ONLY (creature/source/editor-workbench.ts). The customizer must no longer import or mount cage.ts at all (cage.ts and the War Room page stay untouched). Remove: the `import {mountCage,cagePacketReady,cageStyle} from './cage';` line; the bayPanel/closeBay/cageBay/cageOpen machinery; the cageOffer paragraph and cageButton; the `let cage` variable, the `get cage()` getter on window.myr5Companion, the cagePacketReady().then(...) block and the `pagehide` listener for cage. openMenu() must keep working for tabs (drop its closeBay()/bayPanel references and the `frame` comment about the cage; keep the `frame` parameter). Keep everything else byte-identical (the ship preview, skins, tabs, etc). Also keep `tabs.forEach(b=>{b.onclick=...` exactly. Delete the now-unneeded comment lines above removed code.""",
[ex(W,19),ex(W,268,286),ex(W,287,287),ex(W,295,295),ex(W,320,329)],
"Notes: `[data-cage-download]` in line 295's selector may stay or go (the anchor no longer exists); remove it from the selector. Do not touch lines other than those excerpted.\n")
# ---- F2
card('F2',"""Remove the Sparkle and Metallic sliders and the Motion tab's logic from the customizer workbench (creature/source/editor-workbench.ts). I (the conductor) delete the matching HTML myself, so after your edit the ids sparkle, sparkleValue, metallic, metallicValue, gestures, ambient and reduced do NOT exist in the page: no code may call $() on them.
1. syncMaterials(): drop the two sparkle/metallic input lines (L102-103). Keep the rest.
2. Remove the sparkle/metallic range handler loop (L188) and the gestures-button loop (L189).
3. Stored sparkle and metallic are forced to 0: in pickTexture (L88-94) stop applying the texture's preset metalness (no `metallic:` patch at all; new regions get sparkle 0 / metallic 0 from DEFAULT_MATERIAL; existing regions keep their value but see rule 4). Add a tiny helper `zeroFinish=(d:Design):Design=>d.materials?{...d,materials:Object.fromEntries(Object.entries(d.materials).map(([r,c])=>[r,c&&{...c,sparkle:0,metallic:0}])) as Design['materials']}:d` placed right after DEFAULT_MATERIAL (L65), and apply it once to the recipe loaded at start (inside the existing try on L49: `recipe=zeroFinish(loadRecipe(localStorage))`), and inside commit() to `next` as its first statement (`next=zeroFinish(next);`) so nothing with a non-zero finish is ever stored, and old saves still load fine. Do not remove the `textureDefaultMetalness` import if it becomes unused: DO remove it from the import list if unused to keep the bundle clean.
4. Motion tab removal: delete applyMotion's checkbox sync lines (L303 sets #ambient/#reduced checked) and changeMotion + its listener loop (L304-305). KEEP `settings`, MOTION_KEY loading on L49 (old data must still be read harmlessly), `systemMotion` and a working `applyMotion()` + the systemMotion change listener (the viewer still gets settings={...settings,reduced:settings.reduced||systemMotion.matches}). In the motionIndicator interval (L308) keep updating #motionLabel but delete the `document.querySelectorAll('[data-gesture]')...` button-pressed part. Remove the now-unused `GESTURES` button building but KEEP the `export {CreatureViewer,GESTURES,importCreature}` line and the GESTURES import (it is still used for labels).""",
[ex(W,4,4),ex(W,7,7),ex(W,49,49),ex(W,63,67),ex(W,88,94),ex(W,96,105),ex(W,134,141),ex(W,188,189),ex(W,302,309)],
"")
# ---- F3 workbench
card('F3a',"""Remove the Coach (personality) tab's logic from creature/source/editor-workbench.ts; it moves to the Reminders page (coach-hub.mjs, handled separately). I delete the HTML myself, so the ids coach, coachTone, coachSituation and coachLine do NOT exist after this edit: no code may call $() on them. KEEP the recipe field `coach` itself (Design.coach is still stored/loaded/exported; only the UI is gone).
1. L5: the `import {SITUATIONS,getCoach,type Situation} from './creator/coaching';` line is no longer needed: delete it.
2. L62: delete the coachPreview() function.
3. L112: remove 'coach' from the key list in sync() (keep the others).
4. L122: remove the `coachPreview();` call at the end of that line (keep the undo/redo disabled code).
5. L152: remove `options('coachSituation',SITUATIONS);` and `options('coach',COACHES.map(c=>[c.id,c.name]));` and remove COACHES from the L4 import if it becomes unused (keep REGIONS,LABELS,PICKER_BODIES,EYE_LAYOUTS,PUPILS,RECIPE_KEY,MOTION_KEY,MAX_IMPORT_BYTES,fresh,importCreature,loadRecipe,motionSettings).
6. L154: delete the coachSituation change listener.
7. L190: remove 'coach' from the id list in the `for(const id of ['body','eyeLayout','fingers','toes','eye','pupil','coach'])` loop.""",
[ex(W,4,5),ex(W,62,62),ex(W,110,112),ex(W,122,122),ex(W,152,154),ex(W,190,190)],
"Another card edits lines 4 and others for different reasons: in line 4 change ONLY the COACHES token (a separate SEARCH of `PUPILS,COACHES,RECIPE_KEY` -> `PUPILS,RECIPE_KEY`).\n")

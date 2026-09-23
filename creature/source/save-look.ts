// #1 / #102 trust boundary: the customizer's only writer of the coach recipe. Whatever reaches it
// (a preview, devtools, an imported file) leaves with no locked texture, colour, palette or body,
// so the account sync that reads storage never sees one either. Nothing here grants anything.
import type {Design,Region,MaterialChoice} from './creator/design';
import {lockSource} from './creator/materials-registry';
import {bodyLockSection} from './creator/track-placements';
import {loadProgress} from '../../battle-pass.mjs';
import {RECIPE_KEY} from './profile';

const ownedChoice=(c?:MaterialChoice):c is MaterialChoice=>!!c&&!lockSource(c.textureId)&&!lockSource(c.colorId);
export const BODY_KEYS=['body','headFrom','armsFrom','feetFrom'] as const;

/** Locked material regions fall back to `lastOwned`'s choice for that region (or the original style);
 * locked bodies to `lastOwned`'s body (or Original MYR5). `grandfathered` bodies were already saved
 * before their section locked, so they stay usable. Returns `d` itself when nothing is locked. */
export function keepOwned(d:Design,lastOwned?:Design,grandfathered:ReadonlySet<string>=new Set(),progress:Record<string,number>=loadProgress()):Design{
 const bodyOk=(id?:string):id is string=>!!id&&(grandfathered.has(id)||!bodyLockSection(id,progress));
 let next=d;
 if(d.materials&&!Object.values(d.materials).every(ownedChoice)){
  const materials:Design['materials']={};
  for(const [region,choice] of Object.entries(d.materials) as [Region,MaterialChoice][]){const keep=ownedChoice(choice)?choice:lastOwned?.materials?.[region];if(ownedChoice(keep))materials[region]=keep;}
  next={...next,materials:Object.keys(materials).length?materials:undefined};
 }
 for(const key of BODY_KEYS)if(!bodyOk(next[key])){const fallback=lastOwned?.[key];next={...next,[key]:bodyOk(fallback)?fallback:'myr5'};}
 return next;
}

export function saveRecipe(storage:Storage,next:Design,lastOwned?:Design,grandfathered?:ReadonlySet<string>){
 const owned=keepOwned(next,lastOwned,grandfathered);storage.setItem(RECIPE_KEY,JSON.stringify(owned));return owned;
}

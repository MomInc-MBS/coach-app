// #1 / #102 trust boundary: the customizer's only writer of the coach recipe. Whatever reaches it
// (a preview, devtools, an imported file) leaves with no locked texture, colour, palette or body,
// so the account sync that reads storage never sees one either. Nothing here grants anything.
import type {Design,Region,MaterialChoice} from './creator/design';
import {isLocked as idLocked} from './creator/materials-registry';
import {bodyLockSection} from './creator/track-placements';
import {loadProgress,selectedTracks} from '../../battle-pass.mjs';
import {ownedShipIds} from '../../modules/ships/ship-access.mjs';
import {RECIPE_KEY} from './profile';
import {normalizeStyleId,normalizeTextureId} from './creator/texture-policy.mjs';

const ownedChoice=(c:MaterialChoice|undefined,coachId:string):c is MaterialChoice=>!!c&&!idLocked(c.textureId,coachId)&&!idLocked(c.colorId,coachId,'color');
export const BODY_KEYS=['body','headFrom','armsFrom','feetFrom'] as const;

/** Locked material regions fall back to the last earned choice or original style. Body sources
 * must pass the live performance access gate, including bodies present in an older saved recipe.
 * The legacy grandfathered argument is accepted only to keep existing editor callers compatible. */
export function keepOwned(d:Design,lastOwned?:Design,_grandfathered:ReadonlySet<string>=new Set(),progress:Record<string,number>=loadProgress(),tracks:Iterable<string>=selectedTracks()):Design{
 const bodyOk=(id?:string):id is string=>!!id&&!bodyLockSection(id,progress,tracks);
 let next=d;
 const retired=Object.values(d.styles).some(style=>normalizeStyleId(style)!==style)||Object.values(d.materials??{}).some(choice=>choice&&normalizeTextureId(choice.textureId)!==choice.textureId);
 if(retired)next={...d,styles:Object.fromEntries(Object.entries(d.styles).map(([region,style])=>[region,normalizeStyleId(style)])) as Design['styles'],materials:d.materials&&Object.fromEntries(Object.entries(d.materials).map(([region,choice])=>[region,choice&&{...choice,textureId:normalizeTextureId(choice.textureId)}])) as Design['materials']};
 for(const key of BODY_KEYS)if(!bodyOk(next[key])){const fallback=lastOwned?.[key];next={...next,[key]:bodyOk(fallback)?fallback:'myr5'};}
 const ownedShips=new Set(ownedShipIds());
 const shipOk=(id:Design['shipId']):id is NonNullable<Design['shipId']>=>!!id&&(id==='supportive'||ownedShips.has(id));
 const chosenShip=next.shipId??next.coach;
 if(!shipOk(chosenShip)){
  const fallback=lastOwned?.shipId??lastOwned?.coach;
  next={...next,shipId:shipOk(fallback)?fallback:'supportive'};
 }
 if(next.materials&&!Object.values(next.materials).every(choice=>ownedChoice(choice,next.body))){
  const materials:Design['materials']={};
  for(const [region,choice] of Object.entries(next.materials) as [Region,MaterialChoice][]){const keep=ownedChoice(choice,next.body)?choice:lastOwned?.materials?.[region];if(ownedChoice(keep,next.body))materials[region]=keep;}
  next={...next,materials:Object.keys(materials).length?materials:undefined};
 }
 return next;
}

export function saveRecipe(storage:Storage,next:Design,lastOwned?:Design,_grandfathered?:ReadonlySet<string>){
 const owned=keepOwned(next,lastOwned);storage.setItem(RECIPE_KEY,JSON.stringify(owned));return owned;
}

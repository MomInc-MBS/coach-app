import {coachPresentation} from '../../coach-presentation.mjs';
import {coachName} from '../../coach-names.mjs';
import {coachRequirements} from '../../achievements-board.mjs';
import {goldenCoach} from '../../performance-progress.mjs';
import {PERFORMANCE_KEY,readPerformanceProgress} from '../../performance-progress.mjs';
import {pathIntroCoachIds} from '../../performance-catalog.mjs';
import {loadCoachSpritePreviews} from './war-room-coaches';
import {createStandaloneAccountContext} from '../../standalone-account-context.mjs';
import {CreatureViewer} from './viewer';
import {LatestPreview} from './latest-preview';
import {GESTURES,type Gesture} from './motion';
import {REGIONS,PICKER_BODIES,EYE_LAYOUTS,PUPILS,RECIPE_KEY,MOTION_KEY,MAX_IMPORT_BYTES,fresh,importCreature,loadRecipe,motionSettings} from './profile';

import {COLOUR_CHANNELS,type Design,type Region,type MaterialChoice} from './creator/design';
import {EYE_STYLES} from '../../eye-styles.mjs';
import {TEXTURES,COLORS,PALETTES,isLocked as registryLocked,regionChoice,FREE_COLOURS,resolveRegionMaterial,colorTriad} from './creator/materials-registry';
import {TRACK_PLACEMENTS,bodyLockSection,sectionComplete} from './creator/track-placements';
import {isGranted,cosmeticId} from './creator/unlock-store';
import {sparkle,isUnseen,watchSelect} from '../../unlock-seen.mjs';
import {noteUnlocked} from '../../unlock-pending.mjs';
import {saveRecipe,keepOwned,selectOwnedBody,BODY_KEYS} from './save-look';
import {loadProgress} from '../../battle-pass.mjs';
import {texturePreviewDataURL} from './creator/swatches';
import {acceptShipRevealComplete,coachEditorShips,ownedShipIds} from '../../modules/ships/ship-access.mjs';
import {createInstalledCreatureSkinSource} from '../../modules/materials/installed-creature-skins.mjs';
import {SHIP_GATE,SHIP_GATE_TOKEN,SHIP_HISTORY_ADMISSION} from '../../modules/ships/ship-scene-domain.mjs';

import {localVerifiedBridge} from '../../modules/ships/verified-ship-assets.mjs';
import {mountShipPreview} from './ship-preview';
import {SHIP_CATALOG,shipDetails} from '../../modules/ships/ship-catalog.mjs';
import {FREE_COLOUR_NAMES} from '../../battle-pass-rewards.mjs';
export {CreatureViewer,GESTURES,importCreature};
// #148: the ship's admission is single-use. A reload can resume this exact editor history entry, but
// navigating here again (including Back/Forward) needs another completed ship reveal and tap.
const shipReload=performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming|undefined;
const admitShipEditor=(()=>{
 try{
  const admitted=sessionStorage.getItem(SHIP_GATE)===SHIP_GATE_TOKEN;
  sessionStorage.removeItem(SHIP_GATE);
  if(shipReload?.type==='reload'&&history.state?.[SHIP_HISTORY_ADMISSION]===true)return true;
  if(!admitted)return false;
  history.replaceState({...history.state,[SHIP_HISTORY_ADMISSION]:true},'');
  return true;
 }catch{return false;}
})();
if(!admitShipEditor){location.replace('/pose.html#select');await new Promise(()=>{});}
const standaloneAccount=createStandaloneAccountContext();
await standaloneAccount.refresh();
// Safari can restore this document from its back-forward cache without rerunning the admission
// check above. A restored editor must return through the ship instead of reviving its old state.
window.addEventListener('pageshow',event=>{if(event.persisted)location.replace('/pose.html#select');});
const download=(blob:Blob,name:string)=>{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);};
const $=(id:string)=>document.getElementById(id)!;

// D2 / audit-customizer.md C8: the one mom-approved coach. Finger/toe count and collar fluff
// (Rank 5, handoff §6) are anatomy controls carved only for this body's own rig.
const MOM_APPROVED_BODY_ID='myr5';
const MOM_ONLY_FIELD_IDS=['fingersField','toesField','furField','digitsHelp'];
let recipe:Design=fresh(),undo:Design[]=[],redo:Design[]=[],selected:Region='body',ready=false,activeRange:string|null=null;
let settings=motionSettings(null),initialError='';
try{recipe=zeroFinish(loadRecipe(localStorage));settings=motionSettings(localStorage.getItem(MOTION_KEY));}catch{initialError='Your saved coach could not be read. Load a recipe in Files to restore it.';}
let saved=recipe; // last owned look written to storage; locked imports remain preview-only.
recipe=saved=keepOwned(recipe);
let progress=loadProgress(),bodyLock=(id:string)=>bodyLockSection(id,progress);
const unlockedFirst=<T,>(items:readonly T[],locked:(x:T)=>boolean):T[]=>[...items.filter(x=>!locked(x)),...items.filter(locked)];
// Body unlocks are derived from section completion, so record them here: first use snapshots, later ones sparkle.
const noteBodyUnlocks=()=>{const state=loadProgress();noteUnlocked('body',TRACK_PLACEMENTS.filter(p=>p.tracks.some(t=>sectionComplete(t,state))).map(p=>p.stableId));};
noteBodyUnlocks();window.addEventListener('myr5:battle-pass',noteBodyUnlocks);
const systemMotion=matchMedia('(prefers-reduced-motion: reduce)');
const base=document.body.dataset.modelBase?new URL(document.body.dataset.modelBase,location.href).href:new URL('../',import.meta.url).href;
let viewer:CreatureViewer|undefined;
function tell(text:string){$('creatureStatus').textContent=text;}

// Texture/colour/sparkle/metallic override for the selected part (Rank 4 registry, Rank 5 UI).
// No override -> renders exactly like the legacy `styles[region]` index (old saves keep working).
const DEFAULT_MATERIAL:MaterialChoice={textureId:'clay',colorId:'#7f7d78',sparkle:0,metallic:0};
function zeroFinish(d:Design):Design{return d.materials?{...d,materials:Object.fromEntries(Object.entries(d.materials).map(([r,c])=>[r,c&&{...c,sparkle:0,metallic:0}])) as Design['materials']}:d;} // hoisted: used by the load on L49
function materialChoice():MaterialChoice{return shown().materials?.[selected]??DEFAULT_MATERIAL;}
function setMaterial(patch:Partial<MaterialChoice>,rangeId:string|null=null){const base=shown();commit({...base,materials:{...base.materials,[selected]:{...materialChoice(),...patch}}},rangeId);}
// #1/#102 Preview locked looks: a design that contains a locked body or locked material paints the
// model from this draft only. It never enters `recipe`, undo/redo or storage -- commit() below is the
// one shared guard every caller routes through (saveRecipe() also rejects locked ids as a backstop).
let previewDraft:Design|null=null,lastShown='';
const strip=document.createElement('p');strip.className='preview-strip';strip.hidden=true;document.querySelector('.preview-bay')!.append(strip); // over the LIVE PREVIEW readout, clear of the model
const previewing=()=>previewDraft!==null;
function clearPreview(){previewDraft=null;}
function shown():Design{return previewDraft??recipe;}
const idLocked=(id:string)=>registryLocked(id,shown().body);
const colorLocked=(id:string)=>registryLocked(id,shown().body,'color');
function isLocked(design:Design):boolean{
 if(BODY_KEYS.some(key=>bodyLock(design[key])))return true;
 const ship=design.shipId??design.coach;if(ship!=='supportive'&&!ownedShipIds().includes(ship))return true;
 for(const r of REGIONS){const mc=regionChoice(design.materials,r);if(mc&&(registryLocked(mc.textureId,design.body)||registryLocked(mc.colorId,design.body,'color')))return true;}
 return false;
}
function previewMessage(design:Design):string{
 const body=bodyLock(design.body);if(body)return `Preview only · How to unlock ${PICKER_BODIES.find(b=>b.id===design.body)?.label||'this coach'}: ${body}.`;
 for(const region of [selected,...REGIONS.filter(r=>r!==selected)]){const choice=regionChoice(design.materials,region);if(!choice)continue;for(const [id,kind] of [[choice.textureId,'adaptation'],[choice.colorId,'colour']] as const)if(kind==='colour'?colorLocked(id):idLocked(id)){
  const texture=kind==='adaptation'?TEXTURES.find(t=>t.id===id):undefined,palette=PALETTES.find(p=>p.id===id),color=COLORS.find(c=>c.id===id);
  const detail=texture?.id==='coach-64-bit'?'Open the 64-bit Pixel Finish in a texture pack and complete this coach’s boss skin milestone':texture?'Open a texture pack':palette?.unlockRule==='aura-milestone'?`Reach aura day ${palette.unlockAtDay}`:'Earn it through the battle pass';
  return `Preview only · How to unlock ${texture?.displayName||palette?.displayName||color?.displayName||kind}: ${detail}.`;
 }}return 'Preview only';
}
// Locked choices remain drafts. Available colors on owned bodies use an earned-material
// baseline, so switching away from a locked preview can save without granting that preview.
function pick(patch:Partial<MaterialChoice>){const base=shown();commit({...base,materials:{...base.materials,[selected]:{...(base.materials?.[selected]??DEFAULT_MATERIAL),...patch}}});}
// #139: an Adaptation (texture) covers the whole coach: every part gets the same textureId, colours stay
// per part. A part with no material of its own yet takes the texture's own colour (TextureDef.defaultColorId).
function pickTexture(textureId:string){
 const base=shown(),texture=TEXTURES.find(t=>t.id===textureId);
 const defaultColor=texture&&!colorLocked(texture.defaultColorId)?texture.defaultColorId:DEFAULT_MATERIAL.colorId;
 const patch=(r:Region):Partial<MaterialChoice>=>{const current=base.materials?.[r];return {...(!current?{colorId:defaultColor}:{}),textureId};};
 commit({...base,materials:Object.fromEntries(REGIONS.map(r=>[r,{...(base.materials?.[r]??DEFAULT_MATERIAL),...patch(r)}])) as Design['materials']});
}
function endPreview(){if(!previewing())return false;clearPreview();render('Back to your look');return true;}
function syncMaterials(){
 const mc=materialChoice();
 ($('textureId') as HTMLSelectElement).value=mc.textureId;
 for(const button of textureGrid.querySelectorAll<HTMLButtonElement>('[data-texture]'))button.setAttribute('aria-pressed',String(button.dataset.texture===mc.textureId));
 const texture=TEXTURES.find(t=>t.id===mc.textureId);
 ($('texturePreview') as HTMLImageElement).src=texture?texturePreviewDataURL(texture.familyId):'';
 // R20: the toggle shows each part's current colour as a dot; the single grid marks the active part's colour.
 const partColour=(c:typeof COLOUR_CHANNELS[number])=>regionChoice(shown().materials,c.regions[0])?.colorId??DEFAULT_MATERIAL.colorId;
 for(const b of document.querySelectorAll<HTMLButtonElement>('#colorSwatches [data-part]')){const c=COLOUR_CHANNELS.find(x=>x.id===b.dataset.part)!,on=c===activeChannel;b.setAttribute('aria-checked',String(on));b.tabIndex=on?0:-1;(b.firstElementChild as HTMLElement).style.background=colorTriad(partColour(c),false,shown().body)?.primary??partColour(c);}
 for(const b of document.querySelectorAll<HTMLButtonElement>('#colorSwatches [data-color]'))b.setAttribute('aria-pressed',String(b.dataset.color===partColour(activeChannel)));
 ($('materialClear') as HTMLButtonElement).disabled=!activeChannel.regions.some(r=>shown().materials?.[r]);
}
function syncMomOnly(){
 const show=shown().body===MOM_APPROVED_BODY_ID;
 for(const id of MOM_ONLY_FIELD_IDS){const el=document.getElementById(id);if(el)el.style.display=show?'':'none';}
}

const coachRequirementDialog=document.createElement('dialog');coachRequirementDialog.className='coach-requirement-dialog';coachRequirementDialog.setAttribute('aria-labelledby','coachRequirementTitle');document.body.append(coachRequirementDialog);
function showCoachRequirement(id:string){const info=coachRequirements(id);coachRequirementDialog.replaceChildren();const title=document.createElement('h2');title.id='coachRequirementTitle';title.textContent=coachName(id);const text=document.createElement('p');text.textContent=info.unlock;const close=document.createElement('button');close.type='button';close.textContent='Close';close.onclick=()=>coachRequirementDialog.close();coachRequirementDialog.append(title,text,close);if(!coachRequirementDialog.open)coachRequirementDialog.showModal();}
function syncCoachIdentity(){const id=shown().body,locked=!!bodyLock(id),p=coachPresentation(id);$('coachDisplayName').textContent=coachName(id);$('coachPathSymbol').textContent=p.symbol;$('coachPathSymbol').title=p.track;$('coachUnlock').hidden=!locked;$('coachUnlock').onclick=()=>showCoachRequirement(id);}

let cosmeticCoach='';
function sync(){
 const look=shown();
 if(cosmeticCoach!==look.body){cosmeticCoach=look.body;fillTextures();fillColours();}
 for(const key of ['body','eyeLayout','fingers','toes','eye','pupil','fur','iris','pupilSize','detail']){const input=$(key) as HTMLInputElement;input.value=String(look[key as keyof Design]);const out=document.getElementById(key+'Value');if(out)out.textContent=Number(input.value).toFixed(2);}

 for(const key of ['blackSclera','colourPupil'] as const)($(key) as HTMLInputElement).checked=look[key]===true;
 syncMomOnly();syncCoachIdentity();
 for(const button of bodyGrid.querySelectorAll<HTMLButtonElement>('[data-body]'))button.setAttribute('aria-pressed',String(button.dataset.body===look.body));
 syncShipRow();
 syncMaterials();
 syncSkinChoice();
 // R18: no unlock hints. The strip says only "Preview" (and flags a catalogue entry with no pattern yet).
 const notes:string[]=[],mc=look.materials?.[selected];
 if(mc?.textureId){const t=TEXTURES.find(x=>x.id===mc.textureId);if(t&&t.familyId<0)notes.push(`${t.displayName} pattern is coming`);}
 strip.hidden=!previewing()&&!notes.length;strip.textContent=[...(previewing()?['Preview']:[]),...notes].join(' · ');
 ($('undo') as HTMLButtonElement).disabled=!undo.length&&!previewing();($('redo') as HTMLButtonElement).disabled=!redo.length;
}
const queue=new LatestPreview<{recipe:Design;message:string;preview:boolean}>(async job=>{if(!viewer)throw Error('3D is unavailable.');if(!await viewer.setRecipe(job.recipe,job.preview))throw Error('Preview was interrupted.');},(job,error)=>{
 if(error){tell('Could not update the preview. '+(error instanceof Error?error.message:String(error)));return;}
 ready=true;($('exportGLB') as HTMLButtonElement).disabled=job.preview;tell(job.message);
});
function render(message:string,persist=false){
 ready=false;($('exportGLB') as HTMLButtonElement).disabled=true;
 if(persist)try{persistSkinSettings();const owned=saveRecipe(localStorage,recipe,saved);message=owned===recipe?'Saved on this device':'Locked looks stay in preview until you unlock them';recipe=saved=owned;persistRecipeShip();window.dispatchEvent(new CustomEvent('myr5:recipe',{detail:recipe}));}catch{message='Storage unavailable. Download your recipe in Files to keep this design.';}
 sync();const look=shown();lastShown=JSON.stringify(look);
 tell('Updating preview…');queue.request({recipe:look,message,preview:previewing()});
}
function commit(next:Design,rangeId:string|null=null){
 next=zeroFinish(next);
 // Every writer shares this guard: any remaining locked choice stays a draft.
 // A completely earned design ends preview before entering undo history and storage.
 if(isLocked(next)){previewDraft=next;render(previewMessage(next));return;}
 clearPreview();
 if(JSON.stringify(next)===JSON.stringify(recipe)){if(JSON.stringify(shown())!==lastShown)render('Back to your look');return;}
 if(!rangeId||activeRange!==rangeId){undo.push(recipe);undo=undo.slice(-40);}activeRange=rangeId;redo=[];recipe=next;render('Coach updated',true);
}
function options(id:string,entries:ReadonlyArray<readonly [unknown,string]>){for(const [value,label] of entries){const o=document.createElement('option');o.value=String(value);o.textContent=label;$(id).append(o);}}
// Keep the chosen workout introductions and every owned shape ahead of locked shapes. The
// native select provides a name-only fallback; the sprite grid uses the same selection path.
const orderedBodies=()=>{const introductory=new Set(pathIntroCoachIds(readPerformanceProgress().paths));return [...PICKER_BODIES].sort((a,b)=>Number(!!bodyLock(a.id))-Number(!!bodyLock(b.id))||Number(introductory.has(b.id))-Number(introductory.has(a.id)));};
let spritePreviews:Awaited<ReturnType<typeof loadCoachSpritePreviews>>|null=null;
const bodyGrid=document.createElement('div');bodyGrid.className='material-grid coach-sprite-grid';bodyGrid.setAttribute('role','group');bodyGrid.setAttribute('aria-label','Creature shapes');
function fillBodySprites(){if(!spritePreviews)return;bodyGrid.replaceChildren();for(const b of orderedBodies()){
 const sprite=spritePreviews.sprites.find(s=>s.id===b.id);if(!sprite)continue;
 const locked=!!bodyLock(b.id),presentation=coachPresentation(b.id);
 const card=document.createElement('div');card.className='coach-choice';card.dataset.locked=String(locked);
 const button=document.createElement('button');button.type='button';button.dataset.body=b.id;button.setAttribute('aria-label',`${b.label}, ${locked?'locked preview':'available'}`);button.setAttribute('aria-pressed',String(shown().body===b.id));
 const source=spritePreviews.art(sprite),canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;canvas.getContext('2d')!.drawImage(source,0,0);
 const caption=document.createElement('span');caption.textContent=`${presentation.symbol} ${b.label}`;button.append(canvas,caption);button.onclick=()=>{const select=$('body') as HTMLSelectElement;select.value=b.id;select.dispatchEvent(new Event('change',{bubbles:true}));};if(!locked)sparkle(button,'body',b.id);card.append(button);
 const state=document.createElement('span');state.className='coach-choice-state';state.textContent=locked?'Locked':'Available';card.append(state);
 if(locked){const lock=document.createElement('button');lock.type='button';lock.className='coach-choice-lock';lock.textContent='\u{1f512}';lock.setAttribute('aria-label',`How to unlock ${b.label}`);lock.onclick=()=>showCoachRequirement(b.id);card.append(lock);}bodyGrid.append(card);
 }}
function fillBodies(){$('body').replaceChildren();for(const b of orderedBodies()){
 const o=document.createElement('option');o.value=b.id;o.textContent=b.label+(bodyLock(b.id)?' (Locked)':'');if(!bodyLock(b.id)&&isUnseen('body',b.id))o.dataset.sparkle=`body:${b.id}`;$('body').append(o);
 }fillBodySprites();}
options('eyeLayout',Object.entries(EYE_LAYOUTS).map(([key,value])=>[key,value.label]));options('eye',EYE_STYLES);options('pupil',PUPILS);
for(const [id,min,max] of [['fingers',2,6],['toes',1,6]] as const)options(id,Array.from({length:max-min+1},(_,i)=>[i+min,String(i+min)]));

function focusPart(_region:Region,_frame=true){sync();}

for(const [id,region] of Object.entries({body:'body',eyeLayout:'eye',eye:'eye',pupil:'eye',iris:'eye',pupilSize:'eye',fingers:'arms',toes:'feet',fur:'collar',detail:'body'}))$(id).addEventListener('focus',()=>focusPart(region as Region));
// Rank 4: texture dropdown (registry-driven) and colour/palette swatch grid, separate axes. #1: locked
// entries keep a lock mark and their unlock source, and picking one previews it (see pick()).
const textureGrid=document.createElement('div');textureGrid.className='material-grid texture-grid';textureGrid.setAttribute('role','group');textureGrid.setAttribute('aria-label','Adaptation textures');
function fillTextures(){$('textureId').replaceChildren();textureGrid.replaceChildren();for(const t of unlockedFirst(TEXTURES,t=>idLocked(t.id))){
 const o=document.createElement('option');o.value=t.id;o.textContent=t.displayName;const id=cosmeticId(shown().body,t.id);if(isGranted('texture',t.id,shown().body)&&isUnseen('texture',id))o.dataset.sparkle=`texture:${id}`;$('textureId').append(o);
 const locked=idLocked(t.id),button=document.createElement('button'),preview=document.createElement('img'),name=document.createElement('span');button.type='button';button.dataset.texture=t.id;button.setAttribute('aria-label',`${t.displayName}${locked?', locked':''}`);button.setAttribute('aria-pressed',String(materialChoice().textureId===t.id));preview.src=texturePreviewDataURL(t.familyId);preview.alt='';name.textContent=t.displayName;button.append(preview,name);if(locked){const icon=document.createElement('i');icon.className='texture-tile-lock';icon.textContent='🔒';icon.setAttribute('aria-hidden','true');button.append(icon);}button.onclick=()=>{const select=$('textureId') as HTMLSelectElement;select.value=t.id;select.dispatchEvent(new Event('change',{bubbles:true}));};textureGrid.append(button);
}}
fillBodies();fillTextures();
($('textureId') as HTMLSelectElement).parentElement!.after(textureGrid);
void loadCoachSpritePreviews(document).then(previews=>{
 spritePreviews=previews;fillBodySprites();
 if(bodyGrid.childElementCount)($('body') as HTMLSelectElement).parentElement!.after(bodyGrid);
}).catch(()=>{}); // Native name-only select remains available if sprite sheets cannot load.
const goldenToggle=document.createElement('button');goldenToggle.type='button';goldenToggle.textContent='Golden coach';goldenToggle.title='Unlocked by a ten-minute uninterrupted hold';
function syncGolden(){goldenToggle.disabled=!goldenCoach(shown().body);goldenToggle.setAttribute('aria-pressed',String(shown().golden!==false&&goldenCoach(shown().body)));}
goldenToggle.onclick=()=>{if(goldenCoach(shown().body)){commit({...shown(),golden:shown().golden===false});syncGolden();}};$('body').after(goldenToggle);$('body').addEventListener('change',()=>queueMicrotask(syncGolden));window.addEventListener('myr5:performance-progress',()=>{refreshLists();syncGolden();});syncGolden();
watchSelect($('body') as HTMLSelectElement);watchSelect($('textureId') as HTMLSelectElement);
$('textureId').addEventListener('change',()=>pickTexture(($('textureId') as HTMLSelectElement).value));
const colorSwatches=[
 ...COLORS.map(c=>({kind:'color' as const,id:c.id,name:c.displayName,background:c.primary})),
 ...PALETTES.map(p=>({kind:'palette' as const,id:p.id,name:p.displayName,background:`linear-gradient(90deg,${p.colors.join(',')})`})),
];
function swatchButton(s:{kind:'color'|'palette';id:string;name:string;background:string},onPick:()=>void){const locked=colorLocked(s.id),b=document.createElement('button');b.type='button';b.dataset.color=s.id;b.title=s.name;b.setAttribute('aria-label',s.name+(locked?', locked':''));b.style.background=s.background;if(locked){b.dataset.locked='';const icon=document.createElement('span');icon.className='swatch-lock';icon.textContent='\u{1f512}';icon.setAttribute('aria-hidden','true');b.append(icon);}b.onclick=onPick;if(isGranted(s.kind,s.id,shown().body))sparkle(b,s.kind,cosmeticId(shown().body,s.id));return b;}
function swatchGrid(grid:HTMLElement,onPick:(id:string)=>void){for(const s of unlockedFirst(colorSwatches,s=>colorLocked(s.id)))grid.append(swatchButton(s,()=>onPick(s.id)));}
// R18 G3 colours; R20: one part toggle (Body/Head/Eyes) over a single colour grid, then a palette grid
// that blends its colours across the selected part. Every colour def plus the free hexes no def starts with.
const rowColours=[...FREE_COLOURS.map((h,n)=>({id:h,name:FREE_COLOUR_NAMES[n],hex:h})),...COLORS.filter(c=>!FREE_COLOURS.includes(c.primary.toLowerCase())).map(c=>({id:c.id,name:c.displayName,hex:c.primary}))]; // free hexes first, then the locked defs
let activeChannel:typeof COLOUR_CHANNELS[number]=COLOUR_CHANNELS[0];
function setChannel(channel:typeof COLOUR_CHANNELS[number],colorId:string){
 const draft=shown(),base=!colorLocked(colorId)&&BODY_KEYS.every(key=>!bodyLock(draft[key]))?keepOwned(draft,recipe):draft;
 commit({...base,materials:{...base.materials,...Object.fromEntries(channel.regions.map(r=>[r,{...(base.materials?.[r]??DEFAULT_MATERIAL),colorId}]))}});
}
function choosePart(channel:typeof COLOUR_CHANNELS[number]){activeChannel=channel;selected=channel.regions[0];sync();}
const colorRoot=$('colorSwatches');
function fillColours(){colorRoot.replaceChildren();
const toggle=document.createElement('div');toggle.className='part-toggle';toggle.setAttribute('role','radiogroup');toggle.setAttribute('aria-label','Part to colour');
for(const channel of COLOUR_CHANNELS){const b=document.createElement('button');b.type='button';b.dataset.part=channel.id;b.setAttribute('role','radio');b.append(document.createElement('i'),channel.label);b.onclick=()=>choosePart(channel);
 b.onkeydown=e=>{const n=COLOUR_CHANNELS.indexOf(channel),d=e.key==='ArrowRight'||e.key==='ArrowDown'?1:e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:0;if(!d)return;e.preventDefault();const next=COLOUR_CHANNELS[(n+d+COLOUR_CHANNELS.length)%COLOUR_CHANNELS.length];choosePart(next);(toggle.querySelector(`[data-part="${next.id}"]`) as HTMLElement).focus();};
 toggle.append(b);}
const grid=document.createElement('div');grid.className='material-grid';grid.id='colourGrid';grid.setAttribute('role','group');grid.setAttribute('aria-label','Colours');
for(const c of unlockedFirst(rowColours,c=>colorLocked(c.id))){const b=swatchButton({kind:'color',id:c.id,name:c.name,background:c.hex},()=>setChannel(activeChannel,c.id));b.dataset.kind='color';grid.append(b);}
const label=document.createElement('strong');label.textContent='Multicolor palettes';
const palettes=document.createElement('div');palettes.className='material-grid';palettes.id='paletteGrid';palettes.setAttribute('role','group');palettes.setAttribute('aria-label','Palettes');
for(const p of unlockedFirst(PALETTES,p=>colorLocked(p.id))){const b=swatchButton({kind:'palette',id:p.id,name:p.displayName,background:`linear-gradient(90deg,${p.colors.join(',')})`},()=>setChannel(activeChannel,p.id));b.dataset.kind='palette';palettes.append(b);}
const paletteHelp=document.createElement('p');paletteHelp.className='help';paletteHelp.textContent='Map palette colors to the selected texture?s dark, middle and light areas. Other parts keep their own colors.';
colorRoot.append(toggle,grid,label,palettes,paletteHelp);}
fillColours();
// The Ship tab edits the recipe's existing shipId/shipColor and mirrors it to the arrival scene.
const shipRow=$('shipColourRow'),shipPick=$('shipPick') as HTMLSelectElement;
const shipLocked=(id:string)=>id!=='supportive'&&!coachEditorShips().includes(id);
function saveShip(patch:{shipId?:Design['coach'];shipColor?:string|null}){
 const draft=shown(),base=BODY_KEYS.every(key=>!bodyLock(draft[key]))?keepOwned(draft,recipe):draft;
 commit({...base,...patch});
}
function persistRecipeShip(){const owner=editorOwner(),ship=recipe.shipId??recipe.coach;if(owner&&(ship==='supportive'||ownedShipIds().includes(ship))){const choice={ownerId:owner,ship,tint:recipe.shipColor??'#ffffff',colorId:rowColours.find(c=>c.hex===recipe.shipColor)?.id};localStorage.setItem(`${SHIP_SETTINGS_KEY}/${owner}`,JSON.stringify(choice));window.dispatchEvent(new CustomEvent('myr5:ship-customization',{detail:choice}));}}
function fillShipRow(){
 shipPick.replaceChildren(...unlockedFirst(SHIP_CATALOG,c=>shipLocked(c.id)).map(c=>{const o=document.createElement('option');o.value=c.id;o.textContent=(shipLocked(c.id)?'\u{1f512} ':'')+c.name;return o;}));
 shipRow.replaceChildren();const grid=document.createElement('div');grid.className='material-grid';grid.id='shipColourGrid';
 const original=document.createElement('button');original.type='button';original.dataset.ship='original';original.textContent='Orig.';original.title='Original ship colours';original.setAttribute('aria-label','Original ship colours');original.onclick=()=>saveShip({shipColor:null});grid.append(original);
 for(const c of unlockedFirst(rowColours,c=>colorLocked(c.id))){const b=swatchButton({kind:'color',id:c.id,name:c.name,background:c.hex},()=>{if(colorLocked(c.id)){tell('Locked for your ship too');return;}saveShip({shipColor:c.hex});});b.dataset.hex=c.hex;grid.append(b);}
 shipRow.append(grid);syncShipRow();
}
function syncShipRow(){const look=shown();shipPick.value=look.shipId??look.coach;const color=look.shipColor??null;for(const b of shipRow.querySelectorAll<HTMLButtonElement>('button')){b.setAttribute('aria-pressed',String(b.dataset.ship==='original'?color===null:b.dataset.hex===color));}queueMicrotask(()=>void previewShip());}
shipPick.onchange=()=>{if(shipLocked(shipPick.value)){const name=SHIP_CATALOG.find(c=>c.id===shipPick.value)?.name||'this ship';tell(`Preview only · How to unlock ${name}: complete its workout milestone.`);syncShipRow();return;}saveShip({shipId:shipPick.value as Design['coach']});};
fillShipRow();
function refreshLists(){progress=loadProgress();fillBodies();fillTextures();fillColours();fillShipRow();sync();}window.addEventListener('myr5:battle-pass',refreshLists);
window.addEventListener('storage',event=>{if(event.key?.startsWith(PERFORMANCE_KEY+'/')||event.key?.startsWith('myr5-unlocks-v2/'))refreshLists();});
 window.addEventListener('myr5:account-ready',()=>{recipe=saved=keepOwned(recipe);cosmeticCoach='';refreshLists();render('Account cosmetics connected');});
 // R26: account-bridge clears before every re-verify (focus, visibilitychange), so a clear is often a blink, not a
 // sign-out. Keep the saved look: ownership is re-applied on account-ready, and commit() keeps any locked edit a preview.
 window.addEventListener('myr5:account-cleared',()=>{undo=[];redo=[];clearPreview();cosmeticCoach='';refreshLists();render('Account changed. Showing current ownership.');});
 window.addEventListener('myr5:login-ready',()=>void standaloneAccount.refresh());
 window.addEventListener('focus',()=>{if(!standaloneAccount.account)void standaloneAccount.refresh();});
$('materialClear').onclick=()=>{const base=shown(),materials={...base.materials};for(const r of activeChannel.regions)delete materials[r];commit({...base,materials:Object.keys(materials).length?materials:undefined});};

for(const id of ['body','eyeLayout','fingers','toes','eye','pupil'])$(id).addEventListener('change',()=>{const input=$(id) as HTMLInputElement,value=['fingers','toes'].includes(id)?Number(input.value):input.value;
 // #102: a locked body previews like a locked texture (commit()'s guard below catches it). An owned
 // body is one of the three ways to leave a preview, so it starts from `recipe` (the last saved
 // look), not from `shown()` -- any locked tweaks made mid-preview are discarded, never carried
 // into the save. Other fields (face etc.) build on `shown()` so they keep an active preview going.
 if(id==='body'){const chosen=String(value),section=bodyLock(chosen);if(!section)clearPreview();
  // Choosing a body always resets head, arms and legs to match it — Rank 5 removed the UI that
  // let them diverge. A recipe saved before this change (with mismatched headFrom/armsFrom/feetFrom)
  // still loads and renders mixed (assemble.ts/parseRecipe are unchanged); picking a body here just
  // normalizes it going forward.
  commit(section?{...shown(),body:chosen,headFrom:chosen,armsFrom:chosen,feetFrom:chosen}:selectOwnedBody(recipe,chosen));return;}
 commit({...shown(),[id]:value});});
for(const id of ['blackSclera','colourPupil'] as const)$(id).addEventListener('change',()=>{const next={...shown()};if(($(id) as HTMLInputElement).checked)next[id]=true;else delete next[id];commit(next);});
for(const id of ['fur','iris','pupilSize','detail']){
 const input=$(id) as HTMLInputElement;
 input.addEventListener('input',()=>commit({...shown(),[id]:Number(input.value)},id));
 for(const event of ['change','blur','pointercancel'])input.addEventListener(event,()=>{activeRange=null;});
}
const tabs=[...document.querySelectorAll<HTMLButtonElement>('[data-menu]')];
const skinTab=document.createElement('button');skinTab.type='button';skinTab.id='tab-skin';skinTab.setAttribute('role','tab');skinTab.setAttribute('aria-controls','panel-skin');skinTab.setAttribute('aria-selected','false');skinTab.tabIndex=-1;skinTab.dataset.menu='skin';skinTab.textContent='Skins';skinTab.hidden=true;
const skinPanel=document.createElement('div');skinPanel.id='panel-skin';skinPanel.setAttribute('role','tabpanel');skinPanel.setAttribute('aria-labelledby','tab-skin');skinPanel.tabIndex=0;skinPanel.hidden=true;skinPanel.innerHTML='<div class="panel-heading"><h2>Creature skins</h2></div><label>Installed skin<select id="skinChoice"></select></label>';
// #146: Skins and Ship sit after the option tabs, just above Files (Ian's "Downloads" tab).
const filesTab=$('tab-files') as HTMLButtonElement;filesTab.before(skinTab);document.querySelector('.console-scroll')?.append(skinPanel);tabs.splice(tabs.indexOf(filesTab),0,skinTab);
const shipTab=$('tab-ship') as HTMLButtonElement;
const shipPanel=$('panel-ship') as HTMLElement;
const SHIP_SETTINGS_KEY='myr5-ship-customization-v1';
const SKIN_SETTINGS_PREFIX='myr5-editor-skins-v1/account/';let skinOwner:string|null=null;
// Persist from the current recipe for every edit, including Undo and Redo.
function persistSkinSettings(){if(skinOwner)localStorage.setItem(SKIN_SETTINGS_PREFIX+skinOwner,JSON.stringify(Object.fromEntries(REGIONS.flatMap(region=>{const id=recipe.materials?.[region]?.textureId;return id?.startsWith('creature-')?[[region,id]]:[]}))));}
function skinSettings(){if(!skinOwner)return{};try{const value=JSON.parse(localStorage.getItem(SKIN_SETTINGS_PREFIX+skinOwner)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}catch{return{}}}
const editorOwner=()=>{const account=window.myr5AuthenticatedAccount;return typeof account==='string'?account:account?.user?.id;};
function syncShipEditor(){shipTab.hidden=false;shipTab.setAttribute('aria-hidden','false');shipTab.tabIndex=shipTab.getAttribute('aria-selected')==='true'?0:-1;fillShipRow();}
// The Ship tab's preview: only while that tab is open, only from this account's verified local ship bytes (never a
// download). The choice itself is saved either way; the preview just shows it.
let shipPreview:ReturnType<typeof mountShipPreview>|null=null,shipPreviewOwner:string|null=null,shipPreviewEpoch=0;
function closeShipPreview(){++shipPreviewEpoch;shipPreview?.dispose();shipPreview=null;shipPreviewOwner=null;}
async function previewShip(){
 const active=!shipTab.hidden&&shipTab.getAttribute("aria-selected")==="true";
 const owner=editorOwner()||null,ship=shipPick.value,status=$('shipPreviewStatus'),retry=$('shipPreviewRetry') as HTMLButtonElement;
 const description=document.getElementById('shipDescription');if(description&&ship)description.textContent=shipDetails(ship).description;
 retry.hidden=true;
 // Leaving the tab (or the account) frees the preview: the bridge holds every owned ship's bytes.
 if(shipPreviewOwner!==owner||!active||!ship||(shipPreview&&!shipPreview.ids().includes(ship)))closeShipPreview();
 const run=++shipPreviewEpoch;
 if(!active||!ship){status.textContent='';return;}
 status.textContent='Loading your ship…';
 try{
  if(!shipPreview){
   const bridge=ship==='supportive'?{ownedShipIds:()=>['supportive'],getShipUrl:()=>'/pod/worlds/starter/supportive.glb'}:await localVerifiedBridge().catch(()=>null);
   if(run!==shipPreviewEpoch||(editorOwner()||null)!==owner){bridge?.dispose?.();return;}
   if(!bridge){status.textContent='3D model unavailable on this phone.';return;}
   shipPreview=mountShipPreview($('shipPreview'),bridge);shipPreviewOwner=owner;
  }
  if(!shipPreview.ids().includes(ship)){status.textContent='3D model unavailable on this phone.';return;}
  if(await shipPreview.show(ship,shown().shipColor??'#ffffff')&&run===shipPreviewEpoch)status.textContent='';
 }catch{if(run!==shipPreviewEpoch)return;status.textContent='Ship preview unavailable.';retry.hidden=false;}
}
$('shipPreviewRetry').onclick=()=>{closeShipPreview();void previewShip();};
syncShipEditor();watchSelect(shipPick);watchSelect($('skinChoice') as HTMLSelectElement);window.addEventListener('myr5:ship-scene-ready',event=>{if(acceptShipRevealComplete(event))syncShipEditor()});window.addEventListener('myr5:account-ready',syncShipEditor);window.addEventListener('myr5:account-cleared',syncShipEditor);window.addEventListener('storage',event=>{if(event.key?.startsWith(SHIP_SETTINGS_KEY+'/')||event.key==='myr5-ship-reveal-seen-v1')syncShipEditor()});document.addEventListener('visibilitychange',()=>{if(document.hidden)closeShipPreview();else if(shipTab.getAttribute('aria-selected')==='true')void previewShip();});
let skinSource:ReturnType<typeof createInstalledCreatureSkinSource>|null=null,pendingSkinSource:ReturnType<typeof createInstalledCreatureSkinSource>|null=null,skinEpoch=0,skinChoices:{id:string;displayName:string}[]=[];
function syncSkinChoice(){const choice=$('skinChoice') as HTMLSelectElement,current=recipe.materials?.[selected]?.textureId||'';choice.value=skinChoices.some(s=>s.id===current)?current:'';}
function renderSkinChoices(){const select=$('skinChoice') as HTMLSelectElement;select.replaceChildren(...skinChoices.map(skin=>{const option=document.createElement('option');option.value=skin.id;option.textContent=skin.displayName;if(isUnseen('creature-skin',skin.id))option.dataset.sparkle=`creature-skin:${skin.id}`;return option}));select.value='';syncSkinChoice();}
async function refreshSkinEditor(account=window.myr5AuthenticatedAccount){
 const run=++skinEpoch,owner=typeof account==='string'?account:typeof account?.user?.id==='string'?account.user.id:null,ownerChanged=owner!==skinOwner;
 const hadAppliedSkin=!ownerChanged&&Object.values(recipe.materials??{}).some(choice=>choice?.textureId.startsWith('creature-'));skinOwner=owner;
 if(ownerChanged){undo=[];redo=[];activeRange=null;skinSource?.dispose();skinSource=null;pendingSkinSource?.dispose();pendingSkinSource=null;skinChoices=[];viewer?.clearSkinState();viewer?.setSkinResolver(undefined);if(recipe.materials)recipe={...recipe,materials:Object.fromEntries(Object.entries(recipe.materials).map(([region,choice])=>[region,choice.textureId.startsWith('creature-')?{...choice,textureId:'clay'}:choice])) as Design['materials']};skinTab.hidden=true;skinTab.tabIndex=-1;skinTab.setAttribute('aria-hidden','true');if(skinTab.getAttribute('aria-selected')==='true')openMenu(document.getElementById('tab-body') as HTMLButtonElement);}
 renderSkinChoices();if(!owner){pendingSkinSource?.dispose();pendingSkinSource=null;render('Your coach is ready');return;}
 pendingSkinSource?.dispose();const source=createInstalledCreatureSkinSource({account});pendingSkinSource=source;tell('Checking installed skins');
 let rows:{id:string;displayName:string}[];try{rows=await source.list();}catch{const active=window.myr5AuthenticatedAccount,activeOwner=typeof active==='string'?active:active?.user?.id;if(run!==skinEpoch||activeOwner!==owner||skinOwner!==owner){source.dispose();if(pendingSkinSource===source)pendingSkinSource=null;return;}if(pendingSkinSource===source)pendingSkinSource=null;source.dispose();skinSource?.dispose();skinSource=null;skinChoices=[];viewer?.clearSkinState();viewer?.setSkinResolver(undefined);if(recipe.materials)recipe={...recipe,materials:Object.fromEntries(Object.entries(recipe.materials).map(([region,choice])=>[region,choice.textureId.startsWith('creature-')?{...choice,textureId:'clay'}:choice])) as Design['materials']};skinTab.hidden=true;skinTab.tabIndex=-1;skinTab.setAttribute('aria-hidden','true');if(skinTab.getAttribute('aria-selected')==='true')openMenu(document.getElementById('tab-body') as HTMLButtonElement);renderSkinChoices();render('Could not verify installed skins. Check your connection and try again.');return;}
 const active=window.myr5AuthenticatedAccount,activeOwner=typeof active==='string'?active:active?.user?.id;if(run!==skinEpoch||activeOwner!==owner||skinOwner!==owner){source.dispose();if(pendingSkinSource===source)pendingSkinSource=null;return;}if(pendingSkinSource===source)pendingSkinSource=null;
 if(!rows.length){source.dispose();skinSource?.dispose();skinSource=null;skinChoices=[];viewer?.clearSkinState();viewer?.setSkinResolver(undefined);if(recipe.materials)recipe={...recipe,materials:Object.fromEntries(Object.entries(recipe.materials).map(([region,choice])=>[region,choice.textureId.startsWith('creature-')?{...choice,textureId:'clay'}:choice])) as Design['materials']};skinTab.hidden=true;skinTab.setAttribute('aria-hidden','true');if(skinTab.getAttribute('aria-selected')==='true')openMenu(document.getElementById('tab-body') as HTMLButtonElement);renderSkinChoices();render(hadAppliedSkin?'No verified installed skins. Check your extra packs and try again.':'Your coach is ready');return;}
 const previous=skinSource;skinSource=source;previous?.dispose();skinChoices=rows.map(({id,displayName})=>({id,displayName}));viewer?.setSkinResolver(source.resolve);skinTab.hidden=false;skinTab.tabIndex=-1;skinTab.setAttribute('aria-hidden','false');const remembered=skinSettings();for(const region of REGIONS){const id=remembered[region];if(typeof id==='string'&&skinChoices.some(s=>s.id===id))recipe={...recipe,materials:{...recipe.materials,[region]:{...(recipe.materials?.[region]??DEFAULT_MATERIAL),textureId:id}}};}renderSkinChoices();render('Installed skins ready');
}
skinTab.onclick=()=>openMenu(skinTab);($('skinChoice') as HTMLSelectElement).addEventListener('change',()=>{const id=($('skinChoice') as HTMLSelectElement).value;if(!skinOwner||!skinChoices.some(s=>s.id===id))return;pickTexture(id);});
window.addEventListener('myr5:account-ready',event=>void refreshSkinEditor((event as CustomEvent).detail));window.addEventListener('myr5:account-cleared',()=>void refreshSkinEditor(null));window.addEventListener('myr5:battle-pass',()=>void refreshSkinEditor());window.addEventListener('storage',event=>{if(event.key?.startsWith('myr5-battle-pass-ledger-v1/account/')||event.key==='myr5-battle-pass-ledger-v1')void refreshSkinEditor();});
const installedSections=(event:Event)=>{const detail=(event as CustomEvent).detail;if(!detail||typeof detail!=='object'||typeof detail.ownerId!=='string'||!Array.isArray(detail.sections)||!detail.sections.every((section:unknown)=>typeof section==='string'))return;const active=window.myr5AuthenticatedAccount,owner=typeof active==='string'?active:active?.user?.id;if(owner&&detail.ownerId===owner&&detail.sections.some((section:string)=>section.startsWith('track-')))void refreshSkinEditor(active);};window.addEventListener('myr5:sections-installed',installedSections);
function openMenu(tab:HTMLButtonElement,frame=true){if(tab.hidden)return;activeRange=null;for(const b of tabs){const active=b===tab;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;$(b.getAttribute('aria-controls')!).hidden=!active;}if(tab!==shipTab){shipTab.setAttribute('aria-selected','false');shipPanel.hidden=true;}if(tab.dataset.menu==='face')focusPart('eye',frame);else if(tab.dataset.menu==='body')focusPart('body',frame);else if(tab.dataset.menu==='materials')focusPart(selected,frame);else if(tab.dataset.menu==='skin')syncSkinChoice();void previewShip();(document.querySelector('.console-scroll') as HTMLElement).scrollTop=0;}
tabs.forEach(b=>{b.onclick=()=>openMenu(b);b.onkeydown=event=>{const enabled=tabs.filter(tab=>!tab.hidden),index=enabled.indexOf(b);let next=index;if(event.key==='ArrowRight')next=(index+1)%enabled.length;else if(event.key==='ArrowLeft')next=(index+enabled.length-1)%enabled.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=enabled.length-1;else return;event.preventDefault();openMenu(enabled[next]);enabled[next].focus();};});
// Rank 5: the grid's "apply to all parts" copied a legacy style index; with the grid gone, this
// copies the selected part's actual texture+colour+sparkle+metallic choice to every part instead.
$('applyAll').onclick=()=>{const mc=materialChoice();commit({...shown(),materials:Object.fromEntries(REGIONS.map(r=>[r,mc])) as Design['materials']});};
$('undo').onclick=()=>{if(endPreview()||!undo.length)return;activeRange=null;redo.push(recipe);recipe=undo.pop()!;render('Undo applied',true);};
$('redo').onclick=()=>{if(!redo.length)return;activeRange=null;clearPreview();undo.push(recipe);recipe=redo.pop()!;render('Redo applied',true);};
$('original').onclick=()=>{clearPreview();commit(fresh());};
// Done (or the brand link) leaves on the owned look; the preview was never saved.
for(const a of document.querySelectorAll('.editor-header a,.coach-dock a'))a.addEventListener('click',()=>{endPreview();try{sessionStorage.removeItem(SHIP_GATE);}catch{}});
$('importFile').addEventListener('change',async event=>{const input=event.target as HTMLInputElement,file=input.files?.[0];if(!file)return;try{if(file.size>MAX_IMPORT_BYTES)throw Error('Choose a MYR5 recipe smaller than 64 KB.');clearPreview();commit(importCreature(await file.text()));}catch(error){tell((error as Error).message);}finally{input.value='';}});
$('exportRecipe').onclick=()=>download(new Blob([JSON.stringify(recipe,null,2)],{type:'application/json'}),'myr5-recipe.json');
$('exportGLB').onclick=async()=>{if(!ready||!viewer||previewing())return;try{tell('Preparing your animated model…');download(await viewer.exportGLB(),'myr5-animated.glb');tell('Animated model downloaded');}catch(error){tell((error as Error).message);}};
$('front').onclick=()=>viewer?.resetView();
$('back').onclick=()=>viewer?.resetView(-1);
const zoom=$('zoom') as HTMLInputElement,setZoom=(z:number)=>{zoom.value=String(viewer?.setZoom(z)??z);};zoom.addEventListener('input',()=>setZoom(Number(zoom.value)));$('zoomIn').onclick=()=>setZoom(Number(zoom.value)+.1);$('zoomOut').onclick=()=>setZoom(Number(zoom.value)-.1);
$('pauseMotion').onclick=()=>{if(!viewer)return;viewer.setPaused(!viewer.paused);$('pauseMotion').textContent=viewer.paused?'Play motion':'Pause motion';$('pauseMotion').setAttribute('aria-pressed',String(viewer.paused));};
function applyMotion(){viewer?.setSettings({...settings,reduced:settings.reduced||systemMotion.matches});}
systemMotion.addEventListener('change',applyMotion);
window.addEventListener('storage',event=>{if(event.key===RECIPE_KEY&&event.newValue){try{recipe=saved=keepOwned(importCreature(event.newValue));undo=[];redo=[];activeRange=null;render('Coach updated from another app tab');}catch{tell('An invalid coach update was ignored.');}}});
const motionIndicator=setInterval(()=>{const current=viewer?.motion?.current;if(!current)return;$('motionLabel').textContent=GESTURES[current].label;},250);
window.addEventListener('pagehide',()=>{standaloneAccount.dispose();closeShipPreview();skinEpoch++;skinSource?.dispose();pendingSkinSource?.dispose();skinSource=null;pendingSkinSource=null;window.removeEventListener('myr5:sections-installed',installedSections);clearInterval(motionIndicator);queue.dispose();viewer?.dispose();});
// D34 post-download: listen for body download state from service worker
const pendingBodyUrls=new Set<string>();let bodyDownloadTimer=0;const originalStatus='Your coach is ready';
navigator.serviceWorker?.addEventListener('message',({data})=>{
 if(data?.type!=='BODY_DOWNLOAD')return;
 clearTimeout(bodyDownloadTimer);
 if(data.state==='start')pendingBodyUrls.add(data.url);else pendingBodyUrls.delete(data.url);
 if(data.state==='unavailable'){tell('This body isn\'t on this phone yet. Connect to the internet to download it.');bodyDownloadTimer=setTimeout(()=>{tell(originalStatus);},6000);}
 else if(pendingBodyUrls.size)tell('Downloading this body…');
 else tell(originalStatus);
});
try{viewer=new CreatureViewer($('creatureStage'),base);applyMotion();viewer.resetView();render(initialError||originalStatus);void refreshSkinEditor();(window as any).myr5Companion={get recipe(){return recipe;},get viewer(){return viewer;},get ready(){return ready;},importRecipe:(raw:string)=>commit(importCreature(raw))};}
catch(error){tell('3D could not start. '+(error as Error).message);}

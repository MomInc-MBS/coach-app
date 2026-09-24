import {CreatureViewer} from './viewer';
import {LatestPreview} from './latest-preview';
import {GESTURES,type Gesture} from './motion';
import {REGIONS,LABELS,PICKER_BODIES,EYE_LAYOUTS,PUPILS,COACHES,RECIPE_KEY,MOTION_KEY,MAX_IMPORT_BYTES,fresh,importCreature,loadRecipe,motionSettings} from './profile';
import {SITUATIONS,getCoach,type Situation} from './creator/coaching';
import type {Design,Region,MaterialChoice} from './creator/design';
import {TEXTURES,COLORS,PALETTES,lockSource,resolveRegionMaterial,colorTriad} from './creator/materials-registry';
import {TRACK_IDS,TRACK_PLACEMENTS,SECTION_NAMES,bodyLockSection,type TrackId} from './creator/track-placements';
import {saveRecipe,BODY_KEYS} from './save-look';
import {loadProgress,selectedTracks} from '../../battle-pass.mjs';
import {texturePreviewDataURL} from './creator/swatches';
import {acceptShipRevealComplete,coachEditorShips,canShowCoachEditorShipSection} from '../../modules/ships/ship-access.mjs';
import {createInstalledCreatureSkinSource} from '../../modules/materials/installed-creature-skins.mjs';
import {productionMaterialTrust} from '../../modules/materials/material-config.mjs';
import {SHIP_GATE,SHIP_GATE_TOKEN,SHIP_HISTORY_ADMISSION} from '../../modules/ships/ship-scene-domain.mjs';
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
const download=(blob:Blob,name:string)=>{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);};
const $=(id:string)=>document.getElementById(id)!;
const SHORT:Record<Region,string>={head:'Crown',eye:'Eyes',collar:'Collar',body:'Body',arms:'Hands',feet:'Feet'};
// D2 / audit-customizer.md C8: the one mom-approved coach. Finger/toe count and collar fluff
// (Rank 5, handoff §6) are anatomy controls carved only for this body's own rig.
const MOM_APPROVED_BODY_ID='myr5';
const MOM_ONLY_FIELD_IDS=['fingersField','toesField','furField','digitsHelp'];
let recipe:Design=fresh(),undo:Design[]=[],redo:Design[]=[],selected:Region='body',ready=false,activeRange:string|null=null;
let settings=motionSettings(null),initialError='';
try{recipe=loadRecipe(localStorage);settings=motionSettings(localStorage.getItem(MOTION_KEY));}catch{initialError='Your saved coach could not be read. Load a recipe in Files to restore it.';}
let saved=recipe; // the last recipe written to storage: the owned look saveRecipe() falls back to
// #102: bodies already saved stay usable even if their section is locked (only new picks lock).
const grandfathered=new Set<string>(BODY_KEYS.map(key=>recipe[key]));
// #138: the new-user allowance (first bodies of the user's picked paths) lives inside the same lock.
const progress=loadProgress(),tracks=selectedTracks(),bodyLock=(id:string)=>grandfathered.has(id)?null:bodyLockSection(id,progress,tracks);
const systemMotion=matchMedia('(prefers-reduced-motion: reduce)');
const base=document.body.dataset.modelBase?new URL(document.body.dataset.modelBase,location.href).href:new URL('../',import.meta.url).href;
let viewer:CreatureViewer|undefined;
function tell(text:string){$('creatureStatus').textContent=text;}
function coachPreview(){const coach=getCoach(shown().coach);$('coachTone').textContent=coach.tone;$('coachLine').textContent=coach.lines[($('coachSituation') as HTMLSelectElement).value as Situation||'start'];}
// Texture/colour/sparkle/metallic override for the selected part (Rank 4 registry, Rank 5 UI).
// No override -> renders exactly like the legacy `styles[region]` index (old saves keep working).
const DEFAULT_MATERIAL:MaterialChoice={textureId:'flat',colorId:'default-slate',sparkle:0,metallic:0};
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
function isLocked(design:Design):boolean{
 if(bodyLock(design.body))return true;
 for(const mc of Object.values(design.materials??{}))if(lockSource(mc.textureId)||lockSource(mc.colorId))return true;
 return false;
}
function previewMessage(design:Design):string{
 const section=bodyLock(design.body);if(section)return'Preview only · unlocks when you complete '+section;
 for(const mc of Object.values(design.materials??{})){const source=lockSource(mc.textureId)||lockSource(mc.colorId);if(source)return'Preview only · unlocks at '+source;}
 return'Preview only';
}
// A locked pick starts or continues the draft. #1 bug: while already previewing, even an unlocked pick
// must stay in the draft too -- otherwise a texture/colour tweak silently drops the body being previewed
// and falls through to commit(), which would save. commit() below enforces this for every caller.
function pick(patch:Partial<MaterialChoice>){const base=shown();commit({...base,materials:{...base.materials,[selected]:{...(base.materials?.[selected]??DEFAULT_MATERIAL),...patch}}});}
// #139: an Adaptation (texture) covers the whole coach: every part gets the same textureId, colours stay
// per part. A part with no material of its own yet takes the texture's own colour (TextureDef.defaultColorId).
function pickTexture(textureId:string){
 const base=shown(),texture=TEXTURES.find(t=>t.id===textureId);
 const patch=(r:Region):Partial<MaterialChoice>=>base.materials?.[r]?{textureId}:{textureId,colorId:texture?.defaultColorId??DEFAULT_MATERIAL.colorId};
 commit({...base,materials:Object.fromEntries(REGIONS.map(r=>[r,{...(base.materials?.[r]??DEFAULT_MATERIAL),...patch(r)}])) as Design['materials']});
}
function endPreview(){if(!previewing())return false;clearPreview();render('Back to your look');return true;}
function syncMaterials(){
 const mc=materialChoice();
 ($('textureId') as HTMLSelectElement).value=mc.textureId;
 const texture=TEXTURES.find(t=>t.id===mc.textureId);
 ($('texturePreview') as HTMLImageElement).src=texture?texturePreviewDataURL(texture.familyId):'';
 for(const b of document.querySelectorAll<HTMLButtonElement>('#colorSwatches [data-color]'))b.setAttribute('aria-pressed',String(b.dataset.color===mc.colorId));
 ($('sparkle') as HTMLInputElement).value=String(mc.sparkle);$('sparkleValue').textContent=mc.sparkle.toFixed(2);
 ($('metallic') as HTMLInputElement).value=String(mc.metallic);$('metallicValue').textContent=mc.metallic.toFixed(2);
 ($('materialClear') as HTMLButtonElement).disabled=!shown().materials?.[selected];
}
function syncMomOnly(){
 const show=shown().body===MOM_APPROVED_BODY_ID;
 for(const id of MOM_ONLY_FIELD_IDS){const el=document.getElementById(id);if(el)el.style.display=show?'':'none';}
}
function sync(){
 const look=shown();
 for(const key of ['body','eyeLayout','fingers','toes','eye','pupil','coach','fur','iris','pupilSize','detail']){const input=$(key) as HTMLInputElement;input.value=String(look[key as keyof Design]);const out=document.getElementById(key+'Value');if(out)out.textContent=Number(input.value).toFixed(2);}
 for(const b of document.querySelectorAll<HTMLButtonElement>('[data-region]')){const region=b.dataset.region as Region;b.setAttribute('aria-pressed',String(region===selected));b.querySelector('i')!.style.background=resolveRegionMaterial(recipe.styles[region],recipe.materials?.[region]).primary;}
 $('partLabel').textContent=LABELS[selected];
 syncMomOnly();
 syncMaterials();
 syncSkinChoice();
 // #1: a locked texture with no pattern files yet (familyId -1) previews Flat regardless -- say so,
 // instead of leaving the strip's "unlocks at X" as the only clue something is off about the preview.
 // #140: the same check covers an owned pick too, since `look` is `recipe` itself when not previewing.
 const unlocks:string[]=[],mc=look.materials?.[selected];
 if(mc?.textureId){const t=TEXTURES.find(x=>x.id===mc.textureId);if(t&&t.familyId<0)unlocks.push(`${t.displayName} pattern is coming`);const source=lockSource(mc.textureId);if(source)unlocks.push('unlocks at '+source);}
 if(mc?.colorId){const source=lockSource(mc.colorId);if(source)unlocks.push('unlocks at '+source);}
 const bodySection=bodyLock(look.body);if(bodySection)unlocks.push('unlocks when you complete '+bodySection);
 strip.hidden=!unlocks.length;strip.textContent=(previewing()?'Preview · ':'')+unlocks.join(' · ');
 ($('undo') as HTMLButtonElement).disabled=!undo.length&&!previewing();($('redo') as HTMLButtonElement).disabled=!redo.length;coachPreview();
}
const queue=new LatestPreview<{recipe:Design;message:string;preview:boolean}>(async job=>{if(!viewer)throw Error('3D is unavailable.');if(!await viewer.setRecipe(job.recipe,job.preview))throw Error('Preview was interrupted.');},(job,error)=>{
 if(error){tell('Could not update the preview. '+(error instanceof Error?error.message:String(error)));return;}
 ready=true;($('exportGLB') as HTMLButtonElement).disabled=job.preview;tell(job.message);
});
function render(message:string,persist=false){
 ready=false;($('exportGLB') as HTMLButtonElement).disabled=true;
 if(persist)try{persistSkinSettings();const owned=saveRecipe(localStorage,recipe,saved,grandfathered);message=owned===recipe?'Saved on this device':'Locked looks stay in preview until you unlock them';recipe=saved=owned;window.dispatchEvent(new CustomEvent('myr5:recipe',{detail:recipe}));}catch{message='Storage unavailable. Download your recipe in Files to keep this design.';}
 sync();const look=shown();lastShown=JSON.stringify(look);
 tell('Updating preview…');queue.request({recipe:look,message,preview:previewing()});
}
function commit(next:Design,rangeId:string|null=null){
 // #1 root fix: the one guarded path every caller (materials, body, sliders, selects, applyAll,
 // import) routes through. A locked pick, or any further edit made while a locked pick is already
 // only being previewed, becomes a draft -- never `recipe`, never undo/redo, never storage -- until
 // the draft ends via an owned body, Done, or close (those callers clearPreview() first).
 if(previewing()||isLocked(next)){previewDraft=next;render(previewMessage(next));return;}
 if(JSON.stringify(next)===JSON.stringify(recipe)){if(JSON.stringify(shown())!==lastShown)render('Back to your look');return;}
 if(!rangeId||activeRange!==rangeId){undo.push(recipe);undo=undo.slice(-40);}activeRange=rangeId;redo=[];recipe=next;render('Coach updated',true);
}
function options(id:string,entries:ReadonlyArray<readonly [unknown,string]>){for(const [value,label] of entries){const o=document.createElement('option');o.value=String(value);o.textContent=label;$(id).append(o);}}
// #102: creatures grouped by workout section in dial order, after a Starter group (Original MYR5 and
// unplaced bodies, never locked). A locked section's bodies show a lock and preview when picked.
// Rank 5: body is the only body-family select left — head/arms/legs mixing is gone from the UI
// (see the 'body' change handler below, which still forces headFrom/armsFrom/feetFrom to match).
// #138: a section lists its bodies in placement order, so the one a new user may use comes first.
{const placed=new Set(TRACK_PLACEMENTS.map(p=>p.stableId)),inSection=(track:TrackId)=>TRACK_PLACEMENTS.filter(p=>p.tracks.includes(track)).flatMap(p=>PICKER_BODIES.filter(b=>b.id===p.stableId));
 for(const [label,bodies] of [['Starter',PICKER_BODIES.filter(b=>!placed.has(b.id))],...TRACK_IDS.map(t=>[SECTION_NAMES[t],inSection(t)])] as [string,typeof PICKER_BODIES][]){
  const g=document.createElement('optgroup');g.label=label;for(const b of bodies){const o=document.createElement('option'),section=bodyLock(b.id);o.value=b.id;o.textContent=section?`🔒 ${b.label} (locked — complete ${section})`:b.label;g.append(o);}$('body').append(g);}}
options('eyeLayout',Object.entries(EYE_LAYOUTS).map(([key,value])=>[key,value.label]));options('pupil',PUPILS);options('coach',COACHES.map(c=>[c.id,c.name]));options('coachSituation',SITUATIONS);
for(const [id,min,max] of [['fingers',2,6],['toes',1,6]] as const)options(id,Array.from({length:max-min+1},(_,i)=>[i+min,String(i+min)]));
$('coachSituation').addEventListener('change',coachPreview);
function focusPart(region:Region){selected=region;sync();viewer?.focusRegion(region);}
for(const region of REGIONS){const b=document.createElement('button'),dot=document.createElement('i');dot.setAttribute('aria-hidden','true');b.append(dot,SHORT[region]);b.title=LABELS[region];b.dataset.region=region;b.onclick=()=>focusPart(region);$('parts').append(b);}
for(const [id,region] of Object.entries({body:'body',eyeLayout:'eye',eye:'eye',pupil:'eye',iris:'eye',pupilSize:'eye',fingers:'arms',toes:'feet',fur:'collar',detail:'body'}))$(id).addEventListener('focus',()=>focusPart(region as Region));
// Rank 4: texture dropdown (registry-driven) and colour/palette swatch grid, separate axes. #1: locked
// entries keep a lock mark and their unlock source, and picking one previews it (see pick()).
const lockedLabel=(name:string,id:string)=>{const source=lockSource(id);return source?`${name} (locked — ${source})`:name;};
for(const t of TEXTURES){const o=document.createElement('option');o.value=t.id;o.textContent=(lockSource(t.id)?'🔒 ':'')+lockedLabel(t.displayName,t.id);$('textureId').append(o);}
$('textureId').addEventListener('change',()=>pickTexture(($('textureId') as HTMLSelectElement).value));
const colorSwatches=[
 ...COLORS.map(c=>({id:c.id,name:c.displayName,background:c.primary})),
 ...PALETTES.map(p=>({id:p.id,name:p.displayName,background:`linear-gradient(90deg,${p.colors.join(',')})`})),
];
function swatchGrid(grid:HTMLElement,onPick:(id:string)=>void){for(const s of colorSwatches){const b=document.createElement('button');b.type='button';b.dataset.color=s.id;b.title=lockedLabel(s.name,s.id);b.setAttribute('aria-label',b.title);b.style.background=s.background;b.style.height='34px';if(lockSource(s.id)){b.dataset.locked='';b.textContent='🔒';}b.onclick=()=>onPick(s.id);grid.append(b);}}
swatchGrid($('colorSwatches'),id=>pick({colorId:id}));
$('materialClear').onclick=()=>{const base=shown(),materials={...base.materials};delete materials[selected];commit({...base,materials:Object.keys(materials).length?materials:undefined});};
for(const id of ['sparkle','metallic'] as const){const input=$(id) as HTMLInputElement;input.addEventListener('input',()=>setMaterial({[id]:Number(input.value)},id));for(const event of ['change','blur','pointercancel'])input.addEventListener(event,()=>{activeRange=null;});}
Object.entries(GESTURES).forEach(([id,gesture])=>{const b=document.createElement('button');b.textContent=gesture.label;b.dataset.gesture=id;b.setAttribute('aria-pressed',String(id==='idle'));b.onclick=()=>{viewer?.play(id as Gesture);$('motionLabel').textContent=gesture.label;};$('gestures').append(b);});
for(const id of ['body','eyeLayout','fingers','toes','eye','pupil','coach'])$(id).addEventListener('change',()=>{const input=$(id) as HTMLInputElement,value=['fingers','toes'].includes(id)?Number(input.value):input.value;
 // #102: a locked body previews like a locked texture (commit()'s guard below catches it). An owned
 // body is one of the three ways to leave a preview, so it starts from `recipe` (the last saved
 // look), not from `shown()` -- any locked tweaks made mid-preview are discarded, never carried
 // into the save. Other fields (face etc.) build on `shown()` so they keep an active preview going.
 if(id==='body'){const chosen=String(value),section=bodyLock(chosen);if(!section)clearPreview();
  // Choosing a body always resets head, arms and legs to match it — Rank 5 removed the UI that
  // let them diverge. A recipe saved before this change (with mismatched headFrom/armsFrom/feetFrom)
  // still loads and renders mixed (assemble.ts/parseRecipe are unchanged); picking a body here just
  // normalizes it going forward.
  commit({...(section?shown():recipe),body:chosen,headFrom:chosen,armsFrom:chosen,feetFrom:chosen});return;}
 commit({...shown(),[id]:value});});
for(const id of ['fur','iris','pupilSize','detail']){
 const input=$(id) as HTMLInputElement;
 input.addEventListener('input',()=>commit({...shown(),[id]:Number(input.value)},id));
 for(const event of ['change','blur','pointercancel'])input.addEventListener(event,()=>{activeRange=null;});
}
const tabs=[...document.querySelectorAll<HTMLButtonElement>('[data-menu]')];
const skinTab=document.createElement('button');skinTab.type='button';skinTab.id='tab-skin';skinTab.setAttribute('role','tab');skinTab.setAttribute('aria-controls','panel-skin');skinTab.setAttribute('aria-selected','false');skinTab.tabIndex=-1;skinTab.dataset.menu='skin';skinTab.textContent='Skins';skinTab.hidden=true;
const skinPanel=document.createElement('div');skinPanel.id='panel-skin';skinPanel.setAttribute('role','tabpanel');skinPanel.setAttribute('aria-labelledby','tab-skin');skinPanel.tabIndex=0;skinPanel.hidden=true;skinPanel.innerHTML='<div class="panel-heading"><div><small>INSTALLED REWARDS</small><h2>Creature skins</h2></div></div><label>Owned and installed skin<select id="skinChoice"></select></label><p class="help">Only this account’s unlocked skins with verified offline files appear here. A skin covers every part of your coach, like an Adaptation in Species.</p>';
// #146: Skins and Ship sit after the option tabs, just above Files (Ian's "Downloads" tab).
const filesTab=$('tab-files') as HTMLButtonElement;filesTab.before(skinTab);document.querySelector('.console-scroll')?.append(skinPanel);tabs.splice(tabs.indexOf(filesTab),0,skinTab);
const shipTab=document.createElement('button');shipTab.type='button';shipTab.id='tab-ship';shipTab.setAttribute('role','tab');shipTab.setAttribute('aria-controls','panel-ship');shipTab.setAttribute('aria-selected','false');shipTab.tabIndex=-1;shipTab.dataset.menu='ship';shipTab.textContent='Ship';shipTab.hidden=true;
const shipPanel=document.createElement('div');shipPanel.id='panel-ship';shipPanel.setAttribute('role','tabpanel');shipPanel.setAttribute('aria-labelledby','tab-ship');shipPanel.tabIndex=0;shipPanel.hidden=true;shipPanel.innerHTML='<div class="panel-heading"><div><small>YOUR ARRIVAL</small><h2>Ship</h2></div></div><div class="field-grid"><label>Owned ship<select id="shipChoice"></select></label></div><div id="shipSwatches" class="material-grid" aria-label="Ship colours"></div><p class="help">Your ship takes any colour your coach has unlocked. It is saved separately from the coach recipe.</p>';
filesTab.before(shipTab);document.querySelector('.console-scroll')?.append(shipPanel);tabs.splice(tabs.indexOf(filesTab),0,shipTab);
const SHIP_SETTINGS_KEY='myr5-ship-customization-v1';
const SKIN_SETTINGS_PREFIX='myr5-editor-skins-v1/account/';let skinOwner:string|null=null;
// Persist from the current recipe for every edit, including Undo and Redo.
function persistSkinSettings(){if(skinOwner)localStorage.setItem(SKIN_SETTINGS_PREFIX+skinOwner,JSON.stringify(Object.fromEntries(REGIONS.flatMap(region=>{const id=recipe.materials?.[region]?.textureId;return id?.startsWith('creature-')?[[region,id]]:[]}))));}
function skinSettings(){if(!skinOwner)return{};try{const value=JSON.parse(localStorage.getItem(SKIN_SETTINGS_PREFIX+skinOwner)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}catch{return{}}}
const editorOwner=()=>{const account=window.myr5AuthenticatedAccount;return typeof account==='string'?account:account?.user?.id;};
function shipSettings(){try{const owner=editorOwner();if(!owner)return{};const value=JSON.parse(localStorage.getItem(`${SHIP_SETTINGS_KEY}/${owner}`)||'{}');return value&&typeof value==='object'?value:{}}catch{return{}}}
function syncShipEditor(){const owned=productionMaterialTrust()?coachEditorShips():[],visible=owned.length>0&&canShowCoachEditorShipSection();shipTab.hidden=!visible;shipTab.tabIndex=-1;shipTab.setAttribute('aria-hidden',String(!visible));if(!visible&&shipTab.getAttribute('aria-selected')==='true')openMenu(document.getElementById('tab-body') as HTMLButtonElement);const select=document.getElementById('shipChoice') as HTMLSelectElement;if(!select)return;const current=shipSettings();select.replaceChildren(...owned.map(id=>{const option=document.createElement('option');option.value=id;option.textContent=id[0].toUpperCase()+id.slice(1);return option}));const selected=owned.includes(current.ship)?current.ship:owned[0]||'';select.value=selected;for(const b of document.querySelectorAll<HTMLButtonElement>('#shipSwatches [data-color]'))b.setAttribute('aria-pressed',String(b.dataset.color===current.colorId));}
// #147: the ship takes one of the coach's unlocked colours/palettes; `tint` stays its primary hex, so the ship scene reads it unchanged.
function persistShipEditor(colorId?:string){const ownerId=editorOwner(),owned=coachEditorShips(),ship=($('shipChoice') as HTMLSelectElement).value,current=shipSettings();colorId??=current.colorId;const tint=colorId?colorTriad(colorId)?.primary:/^#[0-9a-f]{6}$/i.test(current.tint||'')?current.tint:'#ffffff';if(!ownerId||shipTab.hidden||!owned.includes(ship)||!tint||!/^#[0-9a-f]{6}$/i.test(tint))return;const choice={ownerId,ship,tint,colorId};try{localStorage.setItem(`${SHIP_SETTINGS_KEY}/${ownerId}`,JSON.stringify(choice));window.dispatchEvent(new CustomEvent('myr5:ship-customization',{detail:choice}));}catch{tell('Ship tint changed for this visit. Storage is unavailable.');}}
swatchGrid($('shipSwatches'),id=>{const source=lockSource(id);if(source){tell('Locked for your ship too · unlocks at '+source);return;}persistShipEditor(id);syncShipEditor();});
syncShipEditor();$('shipChoice').addEventListener('change',()=>persistShipEditor());
window.addEventListener('myr5:ship-scene-ready',event=>{if(acceptShipRevealComplete(event))syncShipEditor()});window.addEventListener('myr5:account-ready',syncShipEditor);window.addEventListener('myr5:account-cleared',syncShipEditor);window.addEventListener('storage',event=>{if(event.key?.startsWith(SHIP_SETTINGS_KEY+'/')||event.key==='myr5-ship-reveal-seen-v1')syncShipEditor()});
let skinSource:ReturnType<typeof createInstalledCreatureSkinSource>|null=null,skinEpoch=0,skinChoices:{id:string;displayName:string}[]=[];
function syncSkinChoice(){const choice=$('skinChoice') as HTMLSelectElement,current=recipe.materials?.[selected]?.textureId||'';choice.value=skinChoices.some(s=>s.id===current)?current:'';}
function renderSkinChoices(){const select=$('skinChoice') as HTMLSelectElement;select.replaceChildren(...skinChoices.map(skin=>{const option=document.createElement('option');option.value=skin.id;option.textContent=skin.displayName;return option}));select.value='';syncSkinChoice();}
async function refreshSkinEditor(account=window.myr5AuthenticatedAccount){
 const run=++skinEpoch,owner=typeof account==='string'?account:account?.user?.id||null;if(owner!==skinOwner){undo=[];redo=[];activeRange=null;}skinOwner=owner;skinSource?.dispose();skinSource=null;skinChoices=[];viewer?.clearSkinState();viewer?.setSkinResolver(undefined);renderSkinChoices();
 if(recipe.materials)recipe={...recipe,materials:Object.fromEntries(Object.entries(recipe.materials).map(([region,choice])=>[region,choice.textureId.startsWith('creature-')?{...choice,textureId:'flat'}:choice])) as Design['materials']};
 skinTab.hidden=true;skinTab.tabIndex=-1;skinTab.setAttribute('aria-hidden','true');if(skinTab.getAttribute('aria-selected')==='true')openMenu(document.getElementById('tab-body') as HTMLButtonElement);
 if(!owner){render('Your coach is ready');return;}
 const source=createInstalledCreatureSkinSource({account});skinSource=source;render('Checking installed skins');const rows=await source.list();const active=window.myr5AuthenticatedAccount,activeOwner=typeof active==='string'?active:active?.user?.id;if(run!==skinEpoch||activeOwner!==owner){source.dispose();return;}
 if(!rows.length){source.dispose();render('Your coach is ready');return;}
 skinSource=source;skinChoices=rows.map(({id,displayName})=>({id,displayName}));viewer?.setSkinResolver(source.resolve);skinTab.hidden=false;skinTab.tabIndex=-1;skinTab.setAttribute('aria-hidden','false');const remembered=skinSettings();for(const region of REGIONS){const id=remembered[region];if(typeof id==='string'&&skinChoices.some(s=>s.id===id))recipe={...recipe,materials:{...recipe.materials,[region]:{...(recipe.materials?.[region]??DEFAULT_MATERIAL),textureId:id}}};}renderSkinChoices();render('Installed skins ready');
}
skinTab.onclick=()=>openMenu(skinTab);($('skinChoice') as HTMLSelectElement).addEventListener('change',()=>{const id=($('skinChoice') as HTMLSelectElement).value;if(!skinOwner||!skinChoices.some(s=>s.id===id))return;pickTexture(id);});
window.addEventListener('myr5:account-ready',event=>void refreshSkinEditor((event as CustomEvent).detail));window.addEventListener('myr5:account-cleared',()=>void refreshSkinEditor(null));window.addEventListener('myr5:battle-pass',()=>void refreshSkinEditor());window.addEventListener('storage',event=>{if(event.key?.startsWith('myr5-battle-pass-ledger-v1/account/')||event.key==='myr5-battle-pass-ledger-v1')void refreshSkinEditor();});
function openMenu(tab:HTMLButtonElement){if(tab.hidden)return;activeRange=null;for(const b of tabs){const active=b===tab;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;$(b.getAttribute('aria-controls')!).hidden=!active;}if(tab!==shipTab){shipTab.setAttribute('aria-selected','false');shipPanel.hidden=true;}if(tab.dataset.menu==='face')focusPart('eye');else if(tab.dataset.menu==='body')focusPart('body');else if(tab.dataset.menu==='materials')focusPart(selected);else if(tab.dataset.menu==='skin')syncSkinChoice();(document.querySelector('.console-scroll') as HTMLElement).scrollTop=0;}
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
$('pauseMotion').onclick=()=>{if(!viewer)return;viewer.setPaused(!viewer.paused);$('pauseMotion').textContent=viewer.paused?'Play motion':'Pause motion';$('pauseMotion').setAttribute('aria-pressed',String(viewer.paused));};
function applyMotion(){viewer?.setSettings({...settings,reduced:settings.reduced||systemMotion.matches});}
($('amount') as HTMLInputElement).value=String(settings.amount);$('amountValue').textContent=settings.amount.toFixed(2);($('ambient') as HTMLInputElement).checked=settings.ambient;($('reduced') as HTMLInputElement).checked=settings.reduced;
function changeMotion(){settings={amount:Number(($('amount') as HTMLInputElement).value),ambient:($('ambient') as HTMLInputElement).checked,reduced:($('reduced') as HTMLInputElement).checked};$('amountValue').textContent=settings.amount.toFixed(2);applyMotion();try{localStorage.setItem(MOTION_KEY,JSON.stringify(settings));}catch{tell('Motion changed for this visit. Storage is unavailable.');}}
$('amount').addEventListener('input',changeMotion);for(const id of ['ambient','reduced'])$(id).addEventListener('change',changeMotion);
systemMotion.addEventListener('change',applyMotion);
window.addEventListener('storage',event=>{if(event.key===RECIPE_KEY&&event.newValue){try{recipe=saved=importCreature(event.newValue);for(const key of BODY_KEYS)grandfathered.add(recipe[key]);undo=[];redo=[];activeRange=null;render('Coach updated from another app tab');}catch{tell('An invalid coach update was ignored.');}}});
const motionIndicator=setInterval(()=>{const current=viewer?.motion?.current;if(!current)return;$('motionLabel').textContent=GESTURES[current].label;document.querySelectorAll<HTMLButtonElement>('[data-gesture]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.gesture===current)));},250);
window.addEventListener('pagehide',()=>{skinEpoch++;skinSource?.dispose();skinSource=null;clearInterval(motionIndicator);queue.dispose();viewer?.dispose();});
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
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
try{viewer=new CreatureViewer($('creatureStage'),base);applyMotion();viewer.focusRegion(selected);render(initialError||originalStatus);void refreshSkinEditor();(window as any).myr5Companion={get recipe(){return recipe;},get viewer(){return viewer;},get ready(){return ready;},importRecipe:(raw:string)=>commit(importCreature(raw))};}
catch(error){tell('3D could not start. '+(error as Error).message);}

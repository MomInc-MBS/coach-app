import {CreatureViewer} from './viewer';
import {LatestPreview} from './latest-preview';
import {GESTURES,type Gesture} from './motion';
import {REGIONS,LABELS,PICKER_BODIES,EYE_LAYOUTS,PUPILS,COACHES,RECIPE_KEY,MOTION_KEY,MAX_IMPORT_BYTES,fresh,importCreature,loadRecipe,motionSettings} from './profile';
import {SITUATIONS,getCoach,type Situation} from './creator/coaching';
import type {Design,Region,MaterialChoice} from './creator/design';
import {TEXTURES,COLORS,PALETTES,isTextureUnlocked,isColorUnlocked,isPaletteUnlocked,resolveRegionMaterial,type TextureDef} from './creator/materials-registry';
import {texturePreviewDataURL} from './creator/swatches';
import {acceptShipRevealComplete,coachEditorShips,canShowCoachEditorShipSection} from '../../modules/ships/ship-access.mjs';
export {CreatureViewer,GESTURES,importCreature};
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
const systemMotion=matchMedia('(prefers-reduced-motion: reduce)');
const base=document.body.dataset.modelBase?new URL(document.body.dataset.modelBase,location.href).href:new URL('../',import.meta.url).href;
let viewer:CreatureViewer|undefined;
function tell(text:string){$('creatureStatus').textContent=text;}
function coachPreview(){const coach=getCoach(recipe.coach);$('coachTone').textContent=coach.tone;$('coachLine').textContent=coach.lines[($('coachSituation') as HTMLSelectElement).value as Situation||'start'];}
// Texture/colour/sparkle/metallic override for the selected part (Rank 4 registry, Rank 5 UI).
// No override -> renders exactly like the legacy `styles[region]` index (old saves keep working).
const DEFAULT_MATERIAL:MaterialChoice={textureId:'flat',colorId:'default-slate',sparkle:0,metallic:0};
function materialChoice():MaterialChoice{return recipe.materials?.[selected]??DEFAULT_MATERIAL;}
function setMaterial(patch:Partial<MaterialChoice>,rangeId:string|null=null){commit({...recipe,materials:{...recipe.materials,[selected]:{...materialChoice(),...patch}}},rangeId);}
function syncMaterials(){
 const mc=materialChoice();
 ($('textureId') as HTMLSelectElement).value=mc.textureId;
 const texture=TEXTURES.find(t=>t.id===mc.textureId);
 ($('texturePreview') as HTMLImageElement).src=texture?texturePreviewDataURL(texture.familyId):'';
 for(const b of document.querySelectorAll<HTMLButtonElement>('#colorSwatches [data-color]'))b.setAttribute('aria-pressed',String(b.dataset.color===mc.colorId));
 ($('sparkle') as HTMLInputElement).value=String(mc.sparkle);$('sparkleValue').textContent=mc.sparkle.toFixed(2);
 ($('metallic') as HTMLInputElement).value=String(mc.metallic);$('metallicValue').textContent=mc.metallic.toFixed(2);
 ($('materialClear') as HTMLButtonElement).disabled=!recipe.materials?.[selected];
}
function syncMomOnly(){
 const show=recipe.body===MOM_APPROVED_BODY_ID;
 for(const id of MOM_ONLY_FIELD_IDS){const el=document.getElementById(id);if(el)el.style.display=show?'':'none';}
}
function sync(){
 for(const key of ['body','eyeLayout','fingers','toes','eye','pupil','coach','fur','iris','pupilSize','detail']){const input=$(key) as HTMLInputElement;input.value=String(recipe[key as keyof Design]);const out=document.getElementById(key+'Value');if(out)out.textContent=Number(input.value).toFixed(2);}
 for(const b of document.querySelectorAll<HTMLButtonElement>('[data-region]')){const region=b.dataset.region as Region;b.setAttribute('aria-pressed',String(region===selected));b.querySelector('i')!.style.background=resolveRegionMaterial(recipe.styles[region],recipe.materials?.[region]).primary;}
 $('partLabel').textContent=LABELS[selected];
 syncMomOnly();
 syncMaterials();
 ($('undo') as HTMLButtonElement).disabled=!undo.length;($('redo') as HTMLButtonElement).disabled=!redo.length;coachPreview();
}
const queue=new LatestPreview<{recipe:Design;message:string}>(async job=>{if(!viewer)throw Error('3D is unavailable.');if(!await viewer.setRecipe(job.recipe))throw Error('Preview was interrupted.');},(job,error)=>{
 if(error){tell('Could not update the preview. '+(error instanceof Error?error.message:String(error)));return;}
 ready=true;($('exportGLB') as HTMLButtonElement).disabled=false;tell(job.message);
});
function render(message:string,persist=false){
 ready=false;($('exportGLB') as HTMLButtonElement).disabled=true;sync();
 if(persist)try{localStorage.setItem(RECIPE_KEY,JSON.stringify(recipe));window.dispatchEvent(new CustomEvent('myr5:recipe',{detail:recipe}));message='Saved on this device';}catch{message='Storage unavailable. Download your recipe in Files to keep this design.';}
 tell('Updating preview…');queue.request({recipe,message});
}
function commit(next:Design,rangeId:string|null=null){
 if(JSON.stringify(next)===JSON.stringify(recipe))return;
 if(!rangeId||activeRange!==rangeId){undo.push(recipe);undo=undo.slice(-40);}activeRange=rangeId;redo=[];recipe=next;render('Coach updated',true);
}
function options(id:string,entries:ReadonlyArray<readonly [unknown,string]>){for(const [value,label] of entries){const o=document.createElement('option');o.value=String(value);o.textContent=label;$(id).append(o);}}
// Creatures grouped by design family so 70+ bodies stay scannable in a phone picker.
// Rank 5: body is the only body-family select left — head/arms/legs mixing is gone from the UI
// (see the 'body' change handler below, which still forces headFrom/armsFrom/feetFrom to match).
{const groups=new Map<string,HTMLOptGroupElement>();for(const b of PICKER_BODIES){if(!groups.has(b.group)){const g=document.createElement('optgroup');g.label=b.group;groups.set(b.group,g);$('body').append(g);}const o=document.createElement('option');o.value=b.id;o.textContent=b.label;groups.get(b.group)!.append(o);}}
options('eyeLayout',Object.entries(EYE_LAYOUTS).map(([key,value])=>[key,value.label]));options('pupil',PUPILS);options('coach',COACHES.map(c=>[c.id,c.name]));options('coachSituation',SITUATIONS);
for(const [id,min,max] of [['fingers',2,6],['toes',1,6]] as const)options(id,Array.from({length:max-min+1},(_,i)=>[i+min,String(i+min)]));
$('coachSituation').addEventListener('change',coachPreview);
function focusPart(region:Region){selected=region;sync();viewer?.focusRegion(region);}
for(const region of REGIONS){const b=document.createElement('button'),dot=document.createElement('i');dot.setAttribute('aria-hidden','true');b.append(dot,SHORT[region]);b.title=LABELS[region];b.dataset.region=region;b.onclick=()=>focusPart(region);$('parts').append(b);}
for(const [id,region] of Object.entries({body:'body',eyeLayout:'eye',eye:'eye',pupil:'eye',iris:'eye',pupilSize:'eye',fingers:'arms',toes:'feet',fur:'collar',detail:'body'}))$(id).addEventListener('focus',()=>focusPart(region as Region));
// Rank 4: texture dropdown (registry-driven; battle-pass entries show locked and can't be
// picked - there are no files behind them yet) and colour/palette swatch grid, separate axes.
const textureLabel=(t:TextureDef)=>t.displayName+(isTextureUnlocked(t)?'':` (locked — ${t.unlockRule}${t.track?' · '+t.track+' L'+t.passLevel:''})`);
for(const t of TEXTURES){const o=document.createElement('option');o.value=t.id;o.textContent=textureLabel(t);o.disabled=!isTextureUnlocked(t);$('textureId').append(o);}
$('textureId').addEventListener('change',()=>setMaterial({textureId:($('textureId') as HTMLSelectElement).value}));
type Swatch={id:string;title:string;background:string;unlocked:boolean};
const colorSwatches:Swatch[]=[
 ...COLORS.map(c=>({id:c.id,title:c.displayName+(isColorUnlocked(c)?'':' (locked)'),background:c.primary,unlocked:isColorUnlocked(c)})),
 ...PALETTES.map(p=>({id:p.id,title:p.displayName+(isPaletteUnlocked(p)?'':` (locked — ${p.unlockAtDay?`aura day ${p.unlockAtDay}`:'battle pass'})`),background:`linear-gradient(90deg,${p.colors.join(',')})`,unlocked:isPaletteUnlocked(p)})),
];
for(const s of colorSwatches){const b=document.createElement('button');b.type='button';b.dataset.color=s.id;b.title=s.title;b.style.background=s.background;b.style.height='34px';b.disabled=!s.unlocked;b.onclick=()=>setMaterial({colorId:s.id});$('colorSwatches').append(b);}
$('materialClear').onclick=()=>{const materials={...recipe.materials};delete materials[selected];commit({...recipe,materials:Object.keys(materials).length?materials:undefined});};
for(const id of ['sparkle','metallic'] as const){const input=$(id) as HTMLInputElement;input.addEventListener('input',()=>setMaterial({[id]:Number(input.value)},id));for(const event of ['change','blur','pointercancel'])input.addEventListener(event,()=>{activeRange=null;});}
Object.entries(GESTURES).forEach(([id,gesture])=>{const b=document.createElement('button');b.textContent=gesture.label;b.dataset.gesture=id;b.setAttribute('aria-pressed',String(id==='idle'));b.onclick=()=>{viewer?.play(id as Gesture);$('motionLabel').textContent=gesture.label;};$('gestures').append(b);});
for(const id of ['body','eyeLayout','fingers','toes','eye','pupil','coach'])$(id).addEventListener('change',()=>{const input=$(id) as HTMLInputElement,value=['fingers','toes'].includes(id)?Number(input.value):input.value;
 // Choosing a body always resets head, arms and legs to match it — Rank 5 removed the UI that
 // let them diverge. A recipe saved before this change (with mismatched headFrom/armsFrom/feetFrom)
 // still loads and renders mixed (assemble.ts/parseRecipe are unchanged); picking a body here just
 // normalizes it going forward.
 commit(id==='body'?{...recipe,body:String(value),headFrom:String(value),armsFrom:String(value),feetFrom:String(value)}:{...recipe,[id]:value});});
for(const id of ['fur','iris','pupilSize','detail']){
 const input=$(id) as HTMLInputElement;
 input.addEventListener('input',()=>commit({...recipe,[id]:Number(input.value)},id));
 for(const event of ['change','blur','pointercancel'])input.addEventListener(event,()=>{activeRange=null;});
}
const tabs=[...document.querySelectorAll<HTMLButtonElement>('[data-menu]')];
const shipTab=document.createElement('button');shipTab.type='button';shipTab.id='tab-ship';shipTab.setAttribute('role','tab');shipTab.setAttribute('aria-controls','panel-ship');shipTab.setAttribute('aria-selected','false');shipTab.tabIndex=-1;shipTab.dataset.menu='ship';shipTab.textContent='Ship';shipTab.hidden=true;
const shipPanel=document.createElement('div');shipPanel.id='panel-ship';shipPanel.setAttribute('role','tabpanel');shipPanel.setAttribute('aria-labelledby','tab-ship');shipPanel.tabIndex=0;shipPanel.hidden=true;shipPanel.innerHTML='<div class="panel-heading"><div><small>YOUR ARRIVAL</small><h2>Ship</h2></div></div><div class="field-grid"><label>Owned ship<select id="shipChoice"></select></label><label>Ship tint<input id="shipTint" type="color" value="#ffffff"></label></div><p class="help">Choose an owned ship and tint. Your choice is saved separately from the coach recipe.</p>';
document.querySelector('.menu-tabs')?.append(shipTab);document.querySelector('.console-scroll')?.append(shipPanel);tabs.push(shipTab);
const SHIP_SETTINGS_KEY='myr5-ship-customization-v1';
function shipSettings(){try{const value=JSON.parse(localStorage.getItem(SHIP_SETTINGS_KEY)||'{}');return value&&typeof value==='object'?value:{}}catch{return{}}}
function syncShipEditor(){const owned=coachEditorShips(),visible=canShowCoachEditorShipSection();shipTab.hidden=!visible;shipTab.setAttribute('aria-hidden',String(!visible));if(!visible&&shipTab.getAttribute('aria-selected')==='true')openMenu(document.getElementById('tab-body') as HTMLButtonElement);const select=document.getElementById('shipChoice') as HTMLSelectElement;if(!select)return;const current=shipSettings();select.replaceChildren(...owned.map(id=>{const option=document.createElement('option');option.value=id;option.textContent=id[0].toUpperCase()+id.slice(1);return option}));const selected=owned.includes(current.ship)?current.ship:owned[0]||'';select.value=selected;($('shipTint') as HTMLInputElement).value=/^#[0-9a-f]{6}$/i.test(current.tint||'')?current.tint:'#ffffff';}
function persistShipEditor(){const owned=coachEditorShips(),ship=($('shipChoice') as HTMLSelectElement).value,tint=($('shipTint') as HTMLInputElement).value;if(!owned.includes(ship)||!/^#[0-9a-f]{6}$/i.test(tint))return;const choice={ship,tint};try{localStorage.setItem(SHIP_SETTINGS_KEY,JSON.stringify(choice));window.dispatchEvent(new CustomEvent('myr5:ship-customization',{detail:choice}));}catch{tell('Ship tint changed for this visit. Storage is unavailable.');}}
syncShipEditor();$('shipChoice').addEventListener('change',persistShipEditor);$('shipTint').addEventListener('input',persistShipEditor);
window.addEventListener('myr5:ship-scene-ready',event=>{if(acceptShipRevealComplete(event))syncShipEditor()});window.addEventListener('myr5:account-ready',syncShipEditor);window.addEventListener('myr5:account-cleared',syncShipEditor);window.addEventListener('storage',event=>{if(event.key===SHIP_SETTINGS_KEY)syncShipEditor()});
function openMenu(tab:HTMLButtonElement){activeRange=null;for(const b of tabs){const active=b===tab;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;$(b.getAttribute('aria-controls')!).hidden=!active;}if(tab.dataset.menu==='face')focusPart('eye');else if(tab.dataset.menu==='body')focusPart('body');else if(tab.dataset.menu==='materials')focusPart(selected);(document.querySelector('.console-scroll') as HTMLElement).scrollTop=0;}
tabs.forEach((b,index)=>{b.onclick=()=>openMenu(b);b.onkeydown=event=>{let next=index;if(event.key==='ArrowRight')next=(index+1)%tabs.length;else if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;event.preventDefault();openMenu(tabs[next]);tabs[next].focus();};});
// Rank 5: the grid's "apply to all parts" copied a legacy style index; with the grid gone, this
// copies the selected part's actual texture+colour+sparkle+metallic choice to every part instead.
$('applyAll').onclick=()=>commit({...recipe,materials:Object.fromEntries(REGIONS.map(r=>[r,materialChoice()])) as Design['materials']});
$('undo').onclick=()=>{if(!undo.length)return;activeRange=null;redo.push(recipe);recipe=undo.pop()!;render('Undo applied',true);};
$('redo').onclick=()=>{if(!redo.length)return;activeRange=null;undo.push(recipe);recipe=redo.pop()!;render('Redo applied',true);};
$('original').onclick=()=>commit(fresh());
$('importFile').addEventListener('change',async event=>{const input=event.target as HTMLInputElement,file=input.files?.[0];if(!file)return;try{if(file.size>MAX_IMPORT_BYTES)throw Error('Choose a MYR5 recipe smaller than 64 KB.');commit(importCreature(await file.text()));}catch(error){tell((error as Error).message);}finally{input.value='';}});
$('exportRecipe').onclick=()=>download(new Blob([JSON.stringify(recipe,null,2)],{type:'application/json'}),'myr5-recipe.json');
$('exportGLB').onclick=async()=>{if(!ready||!viewer)return;try{tell('Preparing your animated model…');download(await viewer.exportGLB(),'myr5-animated.glb');tell('Animated model downloaded');}catch(error){tell((error as Error).message);}};
$('front').onclick=()=>viewer?.resetView();
$('back').onclick=()=>{if(!viewer)return;viewer.resetView();viewer.camera.position.set(0,2.65,-8.9);viewer.orbit.update();};
$('pauseMotion').onclick=()=>{if(!viewer)return;viewer.setPaused(!viewer.paused);$('pauseMotion').textContent=viewer.paused?'Play motion':'Pause motion';$('pauseMotion').setAttribute('aria-pressed',String(viewer.paused));};
function applyMotion(){viewer?.setSettings({...settings,reduced:settings.reduced||systemMotion.matches});}
($('amount') as HTMLInputElement).value=String(settings.amount);$('amountValue').textContent=settings.amount.toFixed(2);($('ambient') as HTMLInputElement).checked=settings.ambient;($('reduced') as HTMLInputElement).checked=settings.reduced;
function changeMotion(){settings={amount:Number(($('amount') as HTMLInputElement).value),ambient:($('ambient') as HTMLInputElement).checked,reduced:($('reduced') as HTMLInputElement).checked};$('amountValue').textContent=settings.amount.toFixed(2);applyMotion();try{localStorage.setItem(MOTION_KEY,JSON.stringify(settings));}catch{tell('Motion changed for this visit. Storage is unavailable.');}}
$('amount').addEventListener('input',changeMotion);for(const id of ['ambient','reduced'])$(id).addEventListener('change',changeMotion);
systemMotion.addEventListener('change',applyMotion);
window.addEventListener('storage',event=>{if(event.key===RECIPE_KEY&&event.newValue){try{recipe=importCreature(event.newValue);undo=[];redo=[];activeRange=null;render('Coach updated from another app tab');}catch{tell('An invalid coach update was ignored.');}}});
const motionIndicator=setInterval(()=>{const current=viewer?.motion?.current;if(!current)return;$('motionLabel').textContent=GESTURES[current].label;document.querySelectorAll<HTMLButtonElement>('[data-gesture]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.gesture===current)));},250);
window.addEventListener('pagehide',()=>{clearInterval(motionIndicator);queue.dispose();viewer?.dispose();});
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
try{viewer=new CreatureViewer($('creatureStage'),base);applyMotion();viewer.focusRegion(selected);render(initialError||'Your coach is ready');(window as any).myr5Companion={get recipe(){return recipe;},get viewer(){return viewer;},get ready(){return ready;},importRecipe:(raw:string)=>commit(importCreature(raw))};}
catch(error){tell('3D could not start. '+(error as Error).message);}

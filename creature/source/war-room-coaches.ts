import {goldenCoach,performanceOwner} from '../../performance-progress.mjs';
import {BODIES,parseRecipe,fresh} from './creator/design';
import {bodyLockSection} from './creator/track-placements';
import {resolveRegionMaterial,regionChoice} from './creator/materials-registry';
import {loadProgress,selectedTracks} from '../../battle-pass.mjs';

const KEY='myr5-war-room-coaches-v2';
const selectionKey=()=>`${KEY}/${encodeURIComponent(performanceOwner())}`;
type Sprite={id:string;family:string;kind:'body'|'pet';sheet:string;frame:number[]};
type Selection={body:string|null;pet:string|null;goldenBody:boolean};
export async function loadWarRoomCoaches(doc:Document){
 const response=await fetch('/pod/gala-coaches/manifest.json');if(!response.ok)throw Error('Coach sprites are unavailable.');
 const manifest=await response.json(),sprites:Sprite[]=manifest.sprites;
 const sheets=new Map<string,{image:HTMLImageElement;mask:HTMLImageElement}>();
 const image=async(name:string)=>{const img=new Image();img.src='/pod/gala-coaches/'+name;await img.decode();return img;};
 await Promise.all(Object.entries(manifest.sheets).map(async([id,s]:[string,any])=>{const [art,mask]=await Promise.all([image(s.image),image(s.mask)]);sheets.set(id,{image:art,mask});}));
 const recipe=()=>{try{return parseRecipe(localStorage.getItem('myr5-recipe-v1')||'null');}catch{return fresh();}};
 const lock=(id:string)=>{const r=recipe();return [r.body,r.headFrom,r.armsFrom,r.feetFrom].includes(id)?null:bodyLockSection(id,loadProgress(),selectedTracks());};
 let selection:Selection={body:null,pet:null,goldenBody:false},selectionOwner='';
 function readSelection(){const owner=selectionKey();if(owner===selectionOwner)return;selectionOwner=owner;selection={body:null,pet:null,goldenBody:false};
  try{const saved=JSON.parse(localStorage.getItem(owner)||'null');for(const kind of ['body','pet'] as const)if(sprites.some(s=>s.id===saved?.[kind]&&(kind==='body'||s.kind===kind))&&!lock(saved[kind]))selection[kind]=saved[kind];selection.goldenBody=saved?.goldenBody===true&&!!selection.body&&goldenCoach(selection.body);}catch{}
 }
 readSelection();
 const cache=new Map<string,HTMLCanvasElement>();
 function art(sprite:Sprite,silhouette=false,look?:any,golden=false){
  const r=recipe(),skin=look&&(globalThis as any).GalaAvatar?.skinColor?.(look),colours=golden&&goldenCoach(sprite.id)?['#e8bc4d','#ffe4a1','#6b4214']:skin?[skin,skin,'#fff9df']:['body','head','eye'].map(region=>resolveRegionMaterial(r.styles[region],regionChoice(r.materials,region),false,r.body).primary);
  const key=JSON.stringify([sprite.id,silhouette,colours]);if(cache.has(key))return cache.get(key)!;
  const [x,y,w,h]=sprite.frame,canvas=doc.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d',{willReadFrequently:true})!,mask=doc.createElement('canvas');mask.width=w;mask.height=h;
  const sheet=sheets.get(sprite.sheet)!;ctx.drawImage(sheet.image,x,y,w,h,0,0,w,h);const pixels=ctx.getImageData(0,0,w,h);
  const mc=mask.getContext('2d',{willReadFrequently:true})!;mc.drawImage(sheet.mask,x,y,w,h,0,0,w,h);const regions=mc.getImageData(0,0,w,h).data;
  const rgb=(hex:string)=>{const n=parseInt(hex.slice(1),16);return [n>>16,n>>8&255,n&255];};
  for(let i=0;i<pixels.data.length;i+=4){if(!pixels.data[i+3])continue;const region=regions[i],tone=region===0?[33,23,46]:rgb(colours[Math.min(2,Math.round(region/64)-1)]);
   const shade=pixels.data[i]/184;for(let c=0;c<3;c++)pixels.data[i+c]=silhouette?35:region===0?tone[c]:Math.min(255,Math.round(tone[c]*shade));}
  ctx.putImageData(pixels,0,0);cache.set(key,canvas);return canvas;
 }
 function picker(kind:'body'|'pet',changed:()=>void){
  readSelection();
  const group=doc.createElement('fieldset'),legend=doc.createElement('legend');legend.textContent=kind==='body'?'Coach body':'Coach pets';group.append(legend);group.className='gala-coach-choices';
  const note=doc.createElement('p');note.className='help';note.textContent=kind==='body'?'Choose a coach character, then change its colour in the mirror. Choose Gala body to show your Gala wardrobe.':'Coach pets unlock with their coach bodies.';group.append(note);
  const choose=(id:string|null,golden=false)=>{if(id&&lock(id))return;const next={...selection,[kind]:id,...(kind==='body'?{goldenBody:golden}: {})};try{localStorage.setItem(selectionKey(),JSON.stringify(next));selection=next;changed();}catch{group.setAttribute('aria-label','This choice could not be saved. Storage is unavailable.');}};
  const standard=doc.createElement('button');standard.type='button';standard.textContent=kind==='body'?'Gala body':'Gala pet';standard.setAttribute('aria-pressed',String(!selection[kind]));standard.onclick=()=>choose(null);group.append(standard);
  for(const sprite of sprites.filter(s=>kind==='body'||s.kind===kind)){
   const locked=lock(sprite.id),button=doc.createElement('button'),name=(BODIES.find(b=>b.id===sprite.id)?.label||sprite.family);
   button.type='button';button.disabled=!!locked;button.dataset.coachSprite=sprite.id;button.setAttribute('aria-label',name+(locked?' · Complete '+locked:''));button.setAttribute('aria-pressed',String(selection[kind]===sprite.id&&(kind!=='body'||!selection.goldenBody)));
   const preview=art(sprite,!!locked).cloneNode() as HTMLCanvasElement;preview.width=sprite.frame[2];preview.height=sprite.frame[3];preview.getContext('2d')!.drawImage(art(sprite,!!locked),0,0);
   const label=doc.createElement('span');label.textContent=(locked?'🔒 ':'')+name;button.append(preview,label);button.onclick=()=>choose(sprite.id);group.append(button);
   if(kind==='body'&&goldenCoach(sprite.id)&&!locked){const gold=doc.createElement('button');gold.type='button';gold.dataset.coachSprite=sprite.id;gold.dataset.goldenCoach='true';gold.setAttribute('aria-label','Golden '+name);gold.setAttribute('aria-pressed',String(selection.body===sprite.id&&selection.goldenBody));const artPreview=art(sprite,false,undefined,true),goldCanvas=doc.createElement('canvas');goldCanvas.width=artPreview.width;goldCanvas.height=artPreview.height;goldCanvas.getContext('2d')!.drawImage(artPreview,0,0);const text=doc.createElement('span');text.textContent='Golden '+name;gold.append(goldCanvas,text);gold.onclick=()=>choose(sprite.id,true);group.append(gold);}
  }return group;
 }
 function draw(avatarDraw:any,canvas:HTMLCanvasElement,look:any,options:any={}){
  readSelection();
  const id=options.petOnly?selection.pet:selection.body,sprite=sprites.find(s=>s.id===id);
  if(!sprite||lock(sprite.id)){avatarDraw(canvas,look,options);return;}
  canvas.width=64;canvas.height=96;const ctx=canvas.getContext('2d')!;ctx.imageSmoothingEnabled=false;
  if(options.petOnly)ctx.drawImage(art(sprite,false,look,!options.petOnly&&selection.goldenBody),0,0,48,36,0,60,48,36);else if(sprite.kind==='pet')ctx.drawImage(art(sprite,false,look,!options.petOnly&&selection.goldenBody),0,0,48,36,0,48,64,48);else ctx.drawImage(art(sprite,false,look,!options.petOnly&&selection.goldenBody),0,0);
 }
 return {picker,draw,get hasBody(){readSelection();return !!selection.body&&!lock(selection.body);},get hasPet(){readSelection();return !!selection.pet&&!lock(selection.pet);}};
}

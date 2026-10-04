import {BODIES,parseRecipe,fresh} from './creator/design';
import {bodyLockSection} from './creator/track-placements';
import {resolveRegionMaterial,regionChoice} from './creator/materials-registry';
import {loadProgress,selectedTracks} from '../../battle-pass.mjs';

const KEY='myr5-war-room-coaches-v1';
type Sprite={id:string;family:string;kind:'body'|'pet';sheet:string;frame:number[]};
type Selection={body:string|null;pet:string|null};
export async function loadWarRoomCoaches(doc:Document){
 const response=await fetch('/pod/gala-coaches/manifest.json');if(!response.ok)throw Error('Coach sprites are unavailable.');
 const manifest=await response.json(),sprites:Sprite[]=manifest.sprites;
 const sheets=new Map<string,{image:HTMLImageElement;mask:HTMLImageElement}>();
 const image=async(name:string)=>{const img=new Image();img.src='/pod/gala-coaches/'+name;await img.decode();return img;};
 await Promise.all(Object.entries(manifest.sheets).map(async([id,s]:[string,any])=>{const [art,mask]=await Promise.all([image(s.image),image(s.mask)]);sheets.set(id,{image:art,mask});}));
 const recipe=()=>{try{return parseRecipe(localStorage.getItem('myr5-recipe-v1')||'null');}catch{return fresh();}};
 const lock=(id:string)=>{const r=recipe();return [r.body,r.headFrom,r.armsFrom,r.feetFrom].includes(id)?null:bodyLockSection(id,loadProgress(),selectedTracks());};
 let selection:Selection={body:null,pet:null};
 try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');for(const kind of ['body','pet'] as const)if(sprites.some(s=>s.id===saved?.[kind]&&s.kind===kind)&&!lock(saved[kind]))selection[kind]=saved[kind];}catch{}
 const cache=new Map<string,HTMLCanvasElement>();
 function art(sprite:Sprite,silhouette=false){
  const r=recipe(),colours=['body','head','eye'].map(region=>resolveRegionMaterial(r.styles[region],regionChoice(r.materials,region)).primary);
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
  const group=doc.createElement('fieldset'),legend=doc.createElement('legend');legend.textContent=kind==='body'?'Coach body':'Coach pets';group.append(legend);group.className='gala-coach-choices';
  const note=doc.createElement('p');note.className='help';note.textContent=kind==='body'?'Coach colours follow your coach design. Choose Gala body to show your Gala wardrobe.':'Coach pets unlock with their coach bodies.';group.append(note);
  const choose=(id:string|null)=>{if(id&&lock(id))return;const next={...selection,[kind]:id};try{localStorage.setItem(KEY,JSON.stringify(next));selection=next;changed();}catch{group.setAttribute('aria-label','This choice could not be saved. Storage is unavailable.');}};
  const standard=doc.createElement('button');standard.type='button';standard.textContent=kind==='body'?'Gala body':'Gala pet';standard.setAttribute('aria-pressed',String(!selection[kind]));standard.onclick=()=>choose(null);group.append(standard);
  for(const sprite of sprites.filter(s=>s.kind===kind)){
   const locked=lock(sprite.id),button=doc.createElement('button'),name=BODIES.find(b=>b.id===sprite.id)?.label||sprite.family;
   button.type='button';button.disabled=!!locked;button.dataset.coachSprite=sprite.id;button.setAttribute('aria-label',name+(locked?' · Complete '+locked:''));button.setAttribute('aria-pressed',String(selection[kind]===sprite.id));
   const preview=art(sprite,!!locked).cloneNode() as HTMLCanvasElement;preview.width=sprite.frame[2];preview.height=sprite.frame[3];preview.getContext('2d')!.drawImage(art(sprite,!!locked),0,0);
   const label=doc.createElement('span');label.textContent=(locked?'🔒 ':'')+name;button.append(preview,label);button.onclick=()=>choose(sprite.id);group.append(button);
  }return group;
 }
 function draw(avatarDraw:any,canvas:HTMLCanvasElement,look:any,options:any={}){
  const id=options.petOnly?selection.pet:selection.body,sprite=sprites.find(s=>s.id===id);
  if(!sprite||lock(sprite.id)){avatarDraw(canvas,look,options);return;}
  canvas.width=64;canvas.height=96;const ctx=canvas.getContext('2d')!;ctx.imageSmoothingEnabled=false;
  if(options.petOnly)ctx.drawImage(art(sprite),0,0,48,36,0,60,48,36);else ctx.drawImage(art(sprite),0,0);
 }
 return {picker,draw,get hasPet(){return !!selection.pet&&!lock(selection.pet);}};
}

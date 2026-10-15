import { EFFECT_GROUPS, AURA_OPTIONS, EFFECT_CHOICES_KEY, readEffectChoices, saveEffectChoice } from '../arcade/power/aura-options.mjs';

const animalFrames = {
  rabbit:[32,26], fox:[64,36], bear:[64,33], deer:[48,52], wolf:[64,40], boar:[64,40],
};
const plantCells = { fern:1, vine:14, flower:48, mushroom:70, grass:0, reed:6 };
const crystalAssets = {
  blue:'crystal-blue.png', ice:'crystal-icy.png', red:'crystal-red-small.png',
  green:'crystal-green-alt.png', gold:'crystal-gold.png', purple:'crystal-purple.png',
};
const imageCache = new Map();

function sourceFor(option) {
  const id=option.id, ecology=option.ecology;
  if (ecology?.kind==='plant') return {url:'/arcade/hold/assets/flowers-plants_2.png',sx:plantCells[ecology.variant]*12,sy:0,sw:12,sh:24};
  if (ecology?.kind==='animal') {
    const [sw,sh]=animalFrames[ecology.variant]||[64,40],name=ecology.variant[0].toUpperCase()+ecology.variant.slice(1);
    const action=ecology.variant==='wolf'?'Walk':'Idle';
    return {url:`/arcade/hold/assets/${ecology.variant}/${name}/${name}_${action}.png`,sx:0,sy:0,sw,sh};
  }
  if (ecology?.kind==='mineral'&&ecology.variant==='rock') return {url:'/arcade/hold/assets/rocks-original.png',sx:0,sy:0,sw:32,sh:32};
  if (ecology?.kind==='mineral'&&ecology.variant==='crystal') return {url:`/arcade/hold/assets/crystals/PNG/32x32/${crystalAssets[ecology.palette]||crystalAssets.blue}`};
  if (option.asset) return {url:`/arcade/${id==='blizzard'?'hold':'power'}/assets/${option.asset}`,sx:0,sy:0,sw:100,sh:100};
  if (id==='lightning') return {url:'/arcade/power/assets/pixelated_tilesheet.png',sx:0,sy:0,sw:64,sh:64};
  if (id==='floor') return {url:'/arcade/power/assets/11_fire_spritesheet.png',sx:0,sy:0,sw:100,sh:100};
  // Random and Classic keep a real, familiar effect swatch without generating emoji art.
  return {url:'/arcade/power/assets/9_brightfire_spritesheet.png',sx:0,sy:0,sw:100,sh:100,frame:24};
}
function loadImage(url) {
  if(imageCache.has(url)) return imageCache.get(url);
  const promise=new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error(`Could not load effect preview ${url}`));image.src=url;});
  imageCache.set(url,promise);return promise;
}
async function paint(canvas,option) {
  const ctx=canvas.getContext('2d');if(!ctx)return false;
  const spec=sourceFor(option);
  try {
    const image=await loadImage(spec.url);if(!canvas.isConnected)return false;
    const sx=spec.sx??0,sy=spec.sy??0,sw=spec.sw??image.naturalWidth,sh=spec.sh??image.naturalHeight;
    let frame=spec.frame??0,columns=option.columns;
    if(option.asset&&columns){const count=columns*(option.rows||columns);frame=Math.min(count-1,Math.floor(count/3));}
    else if(option.id==='floor')frame=9;
    if(option.asset&&columns){const size=100;spec.sx=(frame%columns)*size;spec.sy=Math.floor(frame/columns)*size;}
    if(option.id==='floor'){spec.sx=(frame%8)*100;spec.sy=Math.floor(frame/8)*100;}
    ctx.clearRect(0,0,40,40);ctx.imageSmoothingEnabled=false;
    const cropX=spec.sx??sx,cropY=spec.sy??sy;
    const scale=Math.min(34/(spec.sw||sw),34/(spec.sh||sh));
    const w=(spec.sw||sw)*scale,h=(spec.sh||sh)*scale;
    ctx.drawImage(image,cropX,cropY,spec.sw||sw,spec.sh||sh,(40-w)/2,(40-h)/2,w,h);
    if(option.ecology?.kind==='plant'){
      const pixels=ctx.getImageData(0,0,40,40),data=pixels.data;
      for(let i=0;i<data.length;i+=4)if(data[i]===34&&data[i+1]===32&&data[i+2]===52)data[i+3]=0;
      ctx.putImageData(pixels,0,0);
    }
    return true;
  } catch { ctx.clearRect(0,0,40,40);return false; }
}

export function mountEffectPicker(anchor, {document:doc=anchor?.ownerDocument||globalThis.document}={}) {
  if(!anchor||!doc)return {element:null,dispose(){}};
  const old=anchor.parentElement?.querySelector(':scope > .war-room-effects');old?.remove();
  const id=`war-room-aura-menu-${Math.random().toString(36).slice(2)}`;
  const root=doc.createElement('details');root.className='war-room-effects';root.dataset.effectsMenu='';
  root.setAttribute('aria-label','Exercise effects');
  const summary=doc.createElement('summary');summary.id=`${id}-trigger`;summary.textContent='Auras';summary.setAttribute('aria-label','Choose an aura by exercise');summary.setAttribute('aria-controls',id);root.append(summary);
  const menu=doc.createElement('div');menu.id=id;menu.className='effect-picker-menu';menu.setAttribute('role','group');menu.setAttribute('aria-labelledby',summary.id);menu.setAttribute('popover','manual');menu.hidden=true;
  const status=doc.createElement('p');status.className='effect-picker-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  let choices=readEffectChoices(),disposed=false;
  const optionMap=new Map(AURA_OPTIONS.map(option=>[option.id,option]));
  const groupLabels=new Map();
  function drawGroup(group,section) {
    const list=doc.createElement('fieldset');list.className='effect-choice-list';list.setAttribute('role','radiogroup');list.setAttribute('aria-label',`${group.label} effect`);
    const legend=doc.createElement('legend');legend.textContent=`${group.label} effect`;list.append(legend);
    const selected=choices[group.id]||group.defaultEffect||'random';
    for(const id of group.options){
      const option=optionMap.get(id);if(!option)continue;
      const label=doc.createElement('label');label.className='effect-choice';
      const radio=doc.createElement('input');radio.type='radio';radio.name=`war-room-effect-${group.id}`;radio.value=id;radio.checked=id===selected;radio.dataset.effectGroup=group.id;radio.dataset.effectChoice=id;
      const thumb=doc.createElement('canvas');thumb.className='effect-thumb';thumb.width=thumb.height=40;thumb.setAttribute('aria-hidden','true');thumb.dataset.effectThumb=id;
      const text=doc.createElement('span');text.textContent=option.label;label.append(radio,thumb,text);list.append(label);
      radio.addEventListener('change',()=>{
        if(!radio.checked)return;
        if(!saveEffectChoice(group.id,id)){status.textContent='This effect could not be saved on this device.';return;}
        choices={...choices,[group.id]:id};groupLabels.get(group.id).textContent=option.label;status.textContent=`Saved on this device · ${group.label}: ${option.label}.`;
      });
    }
    section.append(list);
    const load=()=>{for(const id of group.options){const item=optionMap.get(id),canvas=section.querySelector(`[data-effect-thumb="${id}"]`);if(canvas&&!canvas.dataset.loaded&&!canvas.dataset.loading&&item){canvas.dataset.loading='true';void paint(canvas,item).then(ok=>{delete canvas.dataset.loading;if(ok)canvas.dataset.loaded='true';});}}};
    section.addEventListener('toggle',()=>{if(section.open)load();});
  }
  for(const group of EFFECT_GROUPS){
    const section=doc.createElement('details');section.className='effect-group';
    const title=doc.createElement('summary'),groupLabel=doc.createElement('span'),current=doc.createElement('span');
    title.append(groupLabel,current);groupLabel.textContent=group.label;current.className='effect-current';current.textContent=optionMap.get(choices[group.id]||group.defaultEffect)?.label||'Random';groupLabels.set(group.id,current);section.dataset.effectGroup=group.id;section.append(title);drawGroup(group,section);menu.append(section);
  }
  menu.append(status);doc.body.append(menu);anchor.insertAdjacentElement('afterend',root);
  const hideMenu=()=>{try{if(menu.matches(':popover-open'))menu.hidePopover();}catch{}menu.hidden=true;};
  const showMenu=()=>{menu.hidden=false;try{if(typeof menu.showPopover==='function')menu.showPopover();}catch{menu.dataset.fallbackOpen='';}};
  const syncMenu=()=>{if(root.open)showMenu();else hideMenu();};
  const onOutside=event=>{if(root.open&&!root.contains(event.target)&&!menu.contains(event.target)){root.open=false;hideMenu();}};
  const onKeydown=event=>{if(event.key==='Escape'&&root.open){event.preventDefault();root.open=false;hideMenu();summary.focus();}};
  root.addEventListener('toggle',syncMenu);
  doc.addEventListener('pointerdown',onOutside,true);doc.addEventListener('keydown',onKeydown,true);
  const onStorage=event=>{if(event.key===EFFECT_CHOICES_KEY){choices=readEffectChoices();for(const radio of root.querySelectorAll('input[type=radio]'))radio.checked=choices[radio.dataset.effectGroup]===radio.value;for(const group of EFFECT_GROUPS)groupLabels.get(group.id).textContent=optionMap.get(choices[group.id]||group.defaultEffect)?.label||'Random';status.textContent='Exercise effect choices updated in another MYR5 tab.';}};
  doc.defaultView?.addEventListener('storage',onStorage);
  return {element:root,dispose(){if(disposed)return;disposed=true;doc.defaultView?.removeEventListener('storage',onStorage);root.removeEventListener('toggle',syncMenu);doc.removeEventListener('pointerdown',onOutside,true);doc.removeEventListener('keydown',onKeydown,true);hideMenu();menu.remove();root.remove();}};
}

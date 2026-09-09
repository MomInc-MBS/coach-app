const displays=new WeakMap();
const whole=value=>Number.isFinite(Number(value))?Math.max(0,Math.floor(Number(value))):0;
export const countDigits=value=>String(whole(value)).padStart(2,'0');
export const clockDigits=value=>`${String(Math.floor(whole(value)/60)).padStart(2,'0')}:${String(whole(value)%60).padStart(2,'0')}`;

function tile(character){
 const cell=document.createElement('span');
 cell.className=character===':'?'flip-colon':'flip-tile';
 if(character===':'){cell.textContent=character;return cell;}
 for(const name of ['top','bottom','falling','landing']){
  const half=document.createElement('span'),ink=document.createElement('span');
  half.className=`flip-half flip-${name}`;ink.textContent=character;half.append(ink);cell.append(half);
 }
 cell.value=character;
 return cell;
}
function settle(cell){
 clearTimeout(cell.timer);cell.classList.remove('is-flipping');
 for(const half of cell.children)half.firstChild.textContent=cell.value;
}
function turn(cell,next,animate){
 if(cell.value===next)return;
 settle(cell);const previous=cell.value;cell.value=next;
 if(!animate){settle(cell);return;}
 const [top,bottom,falling,landing]=cell.children;
 top.firstChild.textContent=landing.firstChild.textContent=next;
 bottom.firstChild.textContent=falling.firstChild.textContent=previous;
 // Restart only a changing digit; pose updates never restart the same second.
 void cell.offsetWidth;cell.classList.add('is-flipping');
 cell.timer=setTimeout(()=>settle(cell),420);
}
export function setFlipValue(element,value,label=''){
 const text=String(value),format=text.includes(':')?'clock':'count';
 let state=displays.get(element);
 if(state?.text===text&&state.label===label)return;
 element.classList.add('flip-display');element.setAttribute('role','img');element.setAttribute('aria-label',`${text} ${label}`.trim());
 const animate=!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches&&!document.hidden;
 if(!state||state.format!==format||state.text.length!==text.length){
  const previous=state?.format===format&&format==='count'&&state.text.length<=text.length?state.text.padStart(text.length,'0'):text;
  for(const cell of state?.cells||[])clearTimeout(cell.timer);
  const cells=[...previous].map(tile);for(const cell of cells)cell.setAttribute('aria-hidden','true');
  element.replaceChildren(...cells);state={cells,format};
 }
 [...text].forEach((character,index)=>{if(character!==':')turn(state.cells[index],character,animate);});
 state.text=text;state.label=label;displays.set(element,state);
}

import {OFFICE_STYLES,officeLine} from './office-domain.mjs';
const node=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
export function mountOfficeAppearance(form,data){
 const panel=node('aside');panel.className='office-supervisor';panel.setAttribute('aria-label','Your bored paperwork supervisor');
 const mascot=node('div');mascot.className='office-mascot';mascot.setAttribute('aria-hidden','true');
 const eye=node('span');eye.className='office-eye';mascot.append(eye,node('i'));
 const speech=node('div'),badge=node('strong','COACH / TEMPORARILY ASSIGNED TO ADMIN'),line=node('p');line.setAttribute('aria-live','polite');speech.append(badge,line);panel.append(mascot,speech);form.append(panel);
 const appearance=node('fieldset');appearance.append(node('legend','I. Coach equipment requisition'));
 appearance.append(node('p','Choose the look your coach will wear in the app. This office sketch is your bored supervisor; the app uses your selected creature parts.'));
 const grid=node('div');grid.className='setup-fields';const recipe=data.appearance['myr5-recipe-v1'];
 for(const [key,title] of Object.entries({head:'Crown & scales',eye:'Eye style',collar:'Shaggy collar',body:'Body',arms:'Arms & hands',feet:'Legs & feet'})){
  const label=node('label',title),select=node('select');select.name='appearance.'+key;
  OFFICE_STYLES.forEach((text,i)=>select.append(new Option(text,String(i))));select.value=String(recipe.styles[key]);label.append(select);grid.append(label);
 }
 const expression=node('label','Expression'),eyes=node('select');eyes.name='appearance.expression';for(const [id,title] of [['sleepy','Bored by paperwork'],['open','Trying to look interested'],['wide','Shocked you picked paperwork']])eyes.append(new Option(title,id));eyes.value=recipe.eye;expression.append(eyes);grid.append(expression);appearance.append(grid);
 const confirmation=node('label');confirmation.className='office-check';const confirmed=node('input');confirmed.type='checkbox';confirmed.name='appearance.confirmed';confirmed.checked=data.customizationConfirmed===true;confirmation.append(confirmed,document.createTextNode('I approve this coach appearance.'));appearance.append(confirmation);
 const banterLabel=node('label');banterLabel.className='office-check';const banter=node('input');banter.type='checkbox';banter.name='officeBanter';banter.checked=data.officeBanter===true;banterLabel.append(banter,document.createTextNode('Let my coach roast my choice of paperwork.'));appearance.append(banterLabel,node('p','Uncheck for quiet paperwork. “Quiet” guidance and requests for no teasing also silence the jokes.'));
 appearance.addEventListener('change',e=>{if(e.target.name.startsWith('appearance.')&&e.target!==confirmed)confirmed.checked=false;});
 return {appearance,collect(){for(const k of Object.keys(recipe.styles))recipe.styles[k]=Number(form.elements.namedItem('appearance.'+k).value);recipe.eye=eyes.value;recipe.coach=data.profile.coach||'supportive';data.customizationConfirmed=confirmed.checked;data.officeBanter=banter.checked;},paint(missing,total){mascot.dataset.eye=recipe.eye;line.textContent=officeLine(data,missing===0?4:Math.min(3,Math.floor((1-missing/total)*4)));}};
}

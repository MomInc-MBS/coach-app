import {FIELDS,missingFields} from './onboarding-domain.mjs?v=quick-install-v1';
import {withQuickDefaults} from './quick-setup.mjs';
const node=(tag,text)=>{const el=document.createElement(tag);if(text)el.textContent=text;return el;};
export function mountQuickSetup(host,initial,{save,label='Start my coach',changed=()=>{}}){
 const data=withQuickDefaults(initial),form=node('form');form.className='setup-form quick-setup';
 const controls={};
 for(const key of ['goal','sessionMinutes','limits']){
  const field=FIELDS.find(f=>f.key===key),label=node('label',key==='goal'?'What’s your main goal?':key==='sessionMinutes'?'How many minutes per session?':'Any injuries or movement limits?');let input;
  if(key==='goal'){input=node('select');input.append(new Option('Choose your goal',''));for(const value of field.options)input.append(new Option(value,value));}
  else if(key==='sessionMinutes'){input=node('input');input.type='number';input.min=1;input.max=180;input.step=1;input.inputMode='numeric';}
  else{input=node('textarea');input.rows=2;input.maxLength=2000;input.placeholder='Write “none” if there are none.';}
  input.name=key;input.required=true;input.value=key==='limits'?data.answers.armie?.q3||'':data.profile[key]??'';controls[key]=input;label.append(input);form.append(label);
 }
 const status=node('p');status.role='status';const button=node('button',label);button.type='submit';button.className='setup-submit';form.append(status,button);host.replaceChildren(form);
 function collect(){data.profile.goal=controls.goal.value;data.profile.sessionMinutes=controls.sessionMinutes.value===''?null:Number(controls.sessionMinutes.value);data.answers.armie??={};data.answers.armie.q3=controls.limits.value.trim();return data;}
 function paint(){collect();const missing=missingFields(data);button.disabled=missing.length>0;status.textContent=missing.length?'': 'You’re ready.';changed(structuredClone(data));}
 form.addEventListener('input',paint);form.addEventListener('change',paint);
 form.onsubmit=async event=>{event.preventDefault();collect();if(missingFields(data).length||!form.reportValidity())return;button.disabled=true;status.textContent='Starting your coach…';try{await save(structuredClone(data));}catch(error){status.textContent=error.message;button.disabled=false;}};
 paint();return {form,collect};
}

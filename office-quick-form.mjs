import {FIELDS,missingFields} from './onboarding-domain.mjs?v=office-short-v1';
import {OFFICE_REQUIRED_FIELDS,withOfficeDefaults} from './office-domain.mjs?v=office-short-v1';
import {mountOfficeAppearance} from './office-form.mjs?v=office-short-v1';
const node=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
export function mountOfficeQuickForm(host,initial,{save,label='Unlock my Coach',changed=()=>{}}){
 const data=withOfficeDefaults(initial),form=node('form');form.className='setup-form';
 const customizer=mountOfficeAppearance(form,data,{optional:true});
 const essentials=node('fieldset');essentials.append(node('legend','Six answers. One coach.'));
 const grid=node('div');grid.className='setup-fields';const controls=new Map();
 const keys=['goal','goalWeightLbs','experience','limits','sessionMinutes','coach'];
 keys.forEach((key,index)=>{
  const field=FIELDS.find(f=>f.key===key),wrap=node('label',(index+1)+'. '+(field?.label||'Any injuries or movement limitations?'));let input;
  if(key==='limits'){input=node('textarea');input.rows=2;input.maxLength=2000;input.name='armie.q3';input.value=data.answers.armie?.q3||'';input.placeholder='Write “none” if there are none.';}
  else if(field.options){input=node('select');input.append(new Option('Choose…',''));for(const value of field.options)input.append(new Option(value[0].toUpperCase()+value.slice(1),value));input.value=data.profile[key]??'';}
  else{input=node('input');input.type=field.type;input.min=field.min;input.max=field.max;input.step=key==='goalWeightLbs'?'0.1':'1';input.value=data.profile[key]??'';}
  input.required=true;input.name||=key;controls.set(key,input);wrap.append(input);grid.append(wrap);
 });
 essentials.append(grid);form.append(essentials,customizer.banterLabel);
 const options=node('details');options.append(node('summary','Name & appearance (optional)'));
 const nameLabel=node('label','What should your coach call you?'),name=node('input');name.name='name';name.maxLength=60;name.value=data.profile.name==='You'?'':data.profile.name||'';name.placeholder='Optional';nameLabel.append(name);options.append(nameLabel,customizer.appearance);form.append(options);
 const targets=node('p');targets.className='setup-targets';
 const defaults=node('p','We’ll start with balanced coaching, gradual progression and 60-second rests. Choose movements and adjust any setting in Coach.');
 const status=node('p');status.role='status';const submit=node('button',label);submit.type='submit';submit.className='setup-submit';form.append(targets,defaults,status,submit);host.replaceChildren(form);
 function collect(){for(const key of OFFICE_REQUIRED_FIELDS){const input=controls.get(key);data.profile[key]=input.type==='number'?(input.value===''?null:Number(input.value)):input.value;}data.profile.name=name.value.trim();data.answers.armie??={};data.answers.armie.q3=controls.get('limits').value.trim();customizer.collect();return data;}
 function paint(){collect();const missing=missingFields(data);status.textContent=missing.length?`${missing.length} answer${missing.length===1?'':'s'} still needed. ${missing[0]}`:'Six answers filed. Your coach is ready.';submit.disabled=missing.length>0;const weight=data.profile.goalWeightLbs;targets.textContent=`Start at 3 reps and 9-second holds, adding 1 each day.${weight>0?` Daily targets: ${weight} g protein · ${weight} oz water.`:''}`;customizer.paint(missing.length,6);changed(structuredClone(data));}
 form.addEventListener('input',paint);form.addEventListener('change',paint);
 form.onsubmit=async event=>{event.preventDefault();collect();if(missingFields(data).length||!form.reportValidity()){paint();return;}submit.disabled=true;status.textContent='Filing your six answers…';try{await save(structuredClone(data));}catch(error){status.textContent=error.message;submit.disabled=false;}};
 paint();return {form,collect};
}

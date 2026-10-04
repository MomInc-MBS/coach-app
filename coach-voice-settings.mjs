import {COACH_VOICE_VARIANTS,DEFAULT_COACH_VOICE} from './robot-audio.mjs';

export const COACH_VOICE_PREFERENCE='myr5-coach-voice-v1';

// Standalone initializer so the app shell can mount this beside its existing
// Test voice control without coupling preference UI to app.mjs.
export function mountCoachVoiceSettings({voice,settings=globalThis.document?.getElementById('settings'),testButton=globalThis.document?.getElementById('testVoice')}={}){
 if(!voice)throw new TypeError('A CoachVoice instance is required');
 if(!settings)return ()=>{};
 const group=[...settings.querySelectorAll('details.settings-group')].find(item=>item.querySelector('summary')?.textContent.trim().toLowerCase()==='voice');
 if(!group)return ()=>{};
 const row=group.querySelector('.voice-row')??group;
 let selected=DEFAULT_COACH_VOICE;
 try{const saved=globalThis.localStorage?.getItem(COACH_VOICE_PREFERENCE);if(COACH_VOICE_VARIANTS[saved])selected=saved;}catch{}
 voice.setVariant?.(selected);
 const wrap=document.createElement('label');wrap.className='coach-voice-choice';wrap.style.cssText='display:flex;flex:1 1 100%;flex-direction:column;gap:6px;font-size:11px;color:inherit';
 const label=document.createElement('span');label.textContent='Voice style';label.style.cssText='font-size:11px;color:inherit';
 const select=document.createElement('select');select.name='coachVoice';select.setAttribute('aria-label','Coach voice style');
 select.style.cssText='width:100%;font-size:12px;padding:9px';
 for(const [id,variant] of Object.entries(COACH_VOICE_VARIANTS)){
  const option=document.createElement('option');option.value=id;option.textContent=variant.label;select.append(option);
 }
 select.value=selected;wrap.append(label,select);
 const hint=document.createElement('small');hint.className='coach-voice-note';hint.textContent='Choose a style, then tap Test voice.';hint.style.cssText='flex:1 1 100%;font-size:10px;color:inherit';
 row.append(wrap,hint);
 const change=()=>{
  const next=COACH_VOICE_VARIANTS[select.value]?select.value:DEFAULT_COACH_VOICE;
  voice.setVariant?.(next);
  try{globalThis.localStorage?.setItem(COACH_VOICE_PREFERENCE,next);}catch{}
 };
 select.addEventListener('change',change);
 // Keep this explicit relationship visible to assistive technology. The app's
 // existing handler still owns the button action and chooses its test sentence.
 if(testButton)testButton.setAttribute('aria-describedby',hint.id||(hint.id='coach-voice-note'));
 return ()=>{select.removeEventListener('change',change);wrap.remove();hint.remove();};
}

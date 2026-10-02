# R18 lane F3b

## Goal
Move the Coach "personality" chooser from the customizer into the Reminders page, right next to the existing "Coach tone" control, in coach-hub.mjs. Behaviour to port (the old customizer panel): a select "Coaching style" listing COACHES (id -> name) bound to the saved recipe's `coach` field; a line showing the chosen coach's `tone`; a select "Preview a situation" listing SITUATIONS (value,label pairs); and a quote showing `coach.lines[situation]` (default situation 'start').
Storage: the SAME key as before, localStorage 'myr5-recipe-v1' (JSON recipe, field `coach`). Reading: parse the stored JSON (try/catch; none stored means no recipe yet -> selected coach 'supportive'). Writing on change: only if a recipe is already stored, write `{...parsed,coach:id}` back with JSON.stringify and dispatch `window.dispatchEvent(new CustomEvent('myr5:recipe',{detail:updated}))`. If no recipe is stored yet, never create one; just keep the choice in a module-local variable so the preview still works. Use only ids that exist in COACHES (ignore unknown values).
Imports: add `import {COACHES,SITUATIONS,getCoach} from './creature/source/creator/coaching.ts';` at the top (that file has no imports of its own).
UI: inside the existing form (`form.innerHTML` on L111) put the new controls immediately after the `<label>Coach tone ...</label>` and before `<div class="plan-quiet">`, as: `<label>Coach personality<select name="personality"></select></label><p class="coach-tone" data-personality-tone></p><label>Preview a situation<select name="situation"></select></label><blockquote data-personality-line aria-live="polite"></blockquote>`. Fill both selects with options after the form is created (near L112-116), wire change handlers, and run once. The personality select must NOT be part of the "SAVE ORDERS" submit payload (the PUT body on L120 lists its fields explicitly, leave it unchanged). Style: add to coach-hub.css small rules for `.coach-reminder-plan blockquote{margin:0 0 12px;padding:10px;border-left:3px solid #bbf293;background:#0a1a11;font-size:.9rem}` and `.coach-reminder-plan .coach-tone{margin:0 0 12px;font-size:.85rem;opacity:.85}`.

Hint for L111: the form HTML is one long single-quoted JS string; make a SEARCH of just `<label>Coach tone<select name="tone"><option value="cheeky">Drill coach</option><option value="direct">Direct</option><option value="gentle">Gentle</option></select></label>` and re-emit it plus the new markup (use single-quote-safe markup; no apostrophes). For L116 use a SEARCH of `form.elements.count.onchange=timeFields;` and prepend/append your wiring statements around it.

## Current source (real, line-numbered)
File coach-hub.mjs, lines 1-7:
```
1: import {weaponDamage} from './combat.mjs';
2: import {TRAINING_TRACKS} from './weapon-training.mjs';
3: import {coachReminder} from './reminder-plan.mjs';
4: import {RELEASE} from './release-info.mjs';
5: import {mountSettingsCrt} from './settings-crt.mjs';
6: import {mountAppleBasicShare} from './apple-basic-share.mjs';
7: import {dailyGuideDue,markDailyGuide,guideOwner} from './daily-guide.mjs';
```

File coach-hub.mjs, lines 111-116:
```
111:  const form=document.createElement('form');form.className='coach-reminder-plan';form.innerHTML='<h3>YOUR DAILY ORDERS</h3><label>Messages per day<select name="count"><option value="1">1 message</option><option value="2">2 messages</option><option value="3" selected>3 messages</option></select></label><div data-times></div><label>Coach tone<select name="tone"><option value="cheeky">Drill coach</option><option value="direct">Direct</option><option value="gentle">Gentle</option></select></label><div class="plan-quiet"><label>Quiet from<input name="quietStart" type="time" value="22:00" required></label><label>Until<input name="quietEnd" type="time" value="07:00" required></label></div><label class="plan-enabled"><input name="enabled" type="checkbox"> Reminders armed</label><button type="submit">SAVE ORDERS</button><p data-plan-status role="status"></p><details><summary>When training is missed</summary><p data-escalation></p></details>';
112:  hub.after(form);
113:  const old=document.getElementById('reminderForm'),details=document.createElement('details');details.innerHTML='<summary>Individual reminders</summary>';old.before(details);details.append(old);
114:  let times=['09:00','14:00','19:00'],timezone=Intl.DateTimeFormat().resolvedOptions().timeZone;
115:  function timeFields(){const host=form.querySelector('[data-times]');for(const [i,input] of [...host.querySelectorAll('input')].entries())times[i]=input.value;host.replaceChildren();for(let i=0;i<Number(form.elements.count.value);i++){const label=document.createElement('label');label.textContent='Check-in '+(i+1);const input=document.createElement('input');input.type='time';input.required=true;input.value=times[i]||['09:00','14:00','19:00'][i];label.append(input);host.append(label);}}
116:  form.elements.count.onchange=timeFields;form.elements.tone.onchange=()=>{form.querySelector('[data-escalation]').textContent=coachReminder(3,form.elements.tone.value);};timeFields();form.elements.tone.onchange();
```

File coach-hub.mjs, lines 120-120:
```
120:  form.onsubmit=async event=>{event.preventDefault();const button=form.querySelector('[type=submit]');button.disabled=true;try{const p=await api('/api/reminders/plan','PUT',{count:Number(form.elements.count.value),times:[...form.querySelectorAll('[data-times] input')].map(i=>i.value),tone:form.elements.tone.value,enabled:form.elements.enabled.checked,timezone,daysPerWeek:7,quietStart:form.elements.quietStart.value,quietEnd:form.elements.quietEnd.value});showPlan(p);form.querySelector('[data-plan-status]').textContent=p.enabled?'Orders saved. Turn on notifications for this device below.':'Orders paused.';}catch(error){form.querySelector('[data-plan-status]').textContent=error.message;}finally{button.disabled=false;}};
```

File coach-hub.css: append the two new rules on a new last line (use a SEARCH that is the final existing rule `.coach-reminder-plan [type=submit]{width:100%;background:#bbf293;color:#0f2314;font-weight:900}` and re-emit it followed by the new rules).

## Reply format (strict)
Reply ONLY with SEARCH/REPLACE blocks. Each SEARCH must be a verbatim, UNIQUE substring of the current file (copy it exactly from the excerpt WITHOUT the "N: " line-number prefixes; keep it as short as is still unique; whole lines are fine). Do not rewrite code you are not changing. No commentary.
FILE: path
<<<<<<< SEARCH
<exact existing text>
=======
<new text>
>>>>>>> REPLACE

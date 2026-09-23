import {weaponDamage} from './combat.mjs';
import {TRAINING_TRACKS} from './weapon-training.mjs';
import {coachReminder} from './reminder-plan.mjs';
import {RELEASE} from './release-info.mjs';

// #107: military-satcom frame around the Settings dialog. Adds a top SATCOM status strip (with a
// short acquiring -> locked animation each time the dialog opens), a bottom clock/BUILD strip, a
// corner radar trace and corner bolts. Doesn't touch the dialog's existing items/nav.
function mountSatcomFrame(settings){
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const top=document.createElement('div');top.className='satcom-strip satcom-top';top.setAttribute('aria-hidden','true');
 top.innerHTML='<svg class="satcom-sat" viewBox="0 0 24 24"><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M9 12H3M15 12h6M12 9V3M12 15v6"/><path d="m4.5 4.5 2.5 2.5M19.5 4.5 17 7"/></svg><span class="satcom-label">SATCOM // <em data-link>ACQUIRING…</em></span><span class="satcom-bars" data-bars><i></i><i></i><i></i><i></i></span>';
 const bottom=document.createElement('div');bottom.className='satcom-strip satcom-bottom';bottom.setAttribute('aria-hidden','true');
 bottom.innerHTML='<span class="satcom-clock" data-clock>--:--:--</span><span class="satcom-build" data-build></span><i class="satcom-radar"></i>';
 const build=bottom.querySelector('[data-build]');build.textContent='BUILD '+RELEASE.id;build.title=RELEASE.id;
 settings.prepend(top);settings.append(bottom);
 for(const pos of ['tl','tr','bl','br']){const bolt=document.createElement('i');bolt.className='satcom-bolt satcom-bolt-'+pos;bolt.setAttribute('aria-hidden','true');settings.append(bolt);}
 const clock=bottom.querySelector('[data-clock]');
 const tick=()=>clock.textContent=new Date().toLocaleTimeString('en-GB',{hour12:false});
 tick();setInterval(tick,1000);
 const link=top.querySelector('[data-link]'),bars=[...top.querySelectorAll('[data-bars] i')];
 let lockTimer=null;
 function acquire(){
  clearTimeout(lockTimer);top.classList.remove('locked');link.textContent='ACQUIRING…';
  // The locked intake theme disables animation with !important; inline !important keeps this
  // moving there too, same trick as the portal (modules/portal/portal.mjs).
  if(!reduced())for(const [i,bar] of bars.entries())bar.style.setProperty('animation',`satcom-blink .5s ease ${i*110}ms infinite`,'important');
  const settle=()=>{
   top.classList.add('locked');link.textContent='UPLINK ESTABLISHED';
   for(const bar of bars)bar.style.removeProperty('animation');
   if(!reduced())top.style.setProperty('animation','satcom-flash .5s ease','important');
  };
  reduced()?settle():lockTimer=setTimeout(settle,900);
 }
 document.getElementById('openSettings').addEventListener('click',acquire);
}

const guide=[
 ['train','Train','SHOW UP. COMPLETE A CATEGORY.',[['Daily XP','Finish a tracked set to earn 100 XP for that category. More sets that day do not multiply category XP.'],['Build the whole arsenal','Train different sections to evolve their weapons. General XP stays separate for future cosmetics and stands.']]],
 ['weapons','Weapons','TEN TRACKS. TWENTY WEAPONS.',[]],
 ['combat','Damage','YOUR STREAK IS YOUR POWER.',[['Every hit','10 × consecutive login days × weapon level. Starter weapons are level 1; the final tier is level 21.'],['Daily boost','Finish the full breathing session for ×100 damage that day. Five login days with a level-3 weapon: 150 damage, or 15,000 with breathing.'],['Specials','Earn specials at tiers 4, 8, 12, 16 and 20. One shared cooldown prevents switching weapons to skip the wait. Team strikes change the animation; the damage formula stays the same.']]],
 ['breathing','Breathing','THREE MINUTES. POWER RESTORED.',[['Start in the still room','Open Meditation and start the three-minute session. Follow a comfortable breathing pace.'],['Finish the session','Paused time, closed rooms and hidden tabs do not count. The bonus starts after completion and does not stack. Daily XP, login streaks and breathing bonuses use UTC days.']]],
 ['rooms','Side rooms','OFF DUTY. STILL IN THE POD.',[['Rest arena','Coach has 1 billion HP per encounter. After the timer reaches zero, three seconds without a tap ends rest. Keep tapping to stay. Rest attacks and specials never earn workout XP.'],['Helping Hand','Customize your hand from your avatar. Every third hand-assisted hit triggers a team strike.'],['Meditation arcade','Keep tapping the meditating character to discover Tub Flight. Its minigame rewards do not replace a breathing session.'],['Gala & War Room','Import your latest Coach data in Gala to bring category XP and today’s damage with you. War Room access still requires the completed Gala run and app installation.']]],
 ['reminders','Reminders','MOM WILL FOLLOW UP.',[['Choose the pressure','Set one, two or three messages per day. Missed scheduled training days make the next message firmer. Gentle tone, pause, frequency and quiet hours remain under your control.'],['Connect this device','Allow notifications on each device. On iPhone, add Coach to your home screen first. The live sender works while Coach is closed; local previews do not send notifications.'],['App updates','Updates download while connected and install when the app is idle. Older installs may need Update now once. A What’s new notice appears after releases.']]]
];

export function mountCoachHub({api}){
 const hub=document.createElement('section');hub.className='coach-mission';hub.setAttribute('aria-label','Coach reminders and daily power');
 hub.innerHTML='<div class="mission-tag">MOM INC // DAILY ORDERS</div><div class="mission-head"><div><h1>CHECK IN.<br>POWER UP.</h1><p data-hub-line>MOM has your next move.</p></div><div class="mission-streak"><strong data-streak>—</strong><span>DAY STREAK</span></div></div><button class="mission-arm" type="button">ARM YOUR REMINDERS <span>→</span></button><div class="mission-readouts"><span data-message-count>1–3 messages / day</span><span data-damage>Sign in to power up</span></div><button class="mission-guide" type="button">HOW TO PLAY</button>';
 document.querySelector('.deck-strip').after(hub);
 hub.querySelector('.mission-arm').onclick=()=>document.querySelector('.coach-dock [data-panel=reminders]').click();
 const dialog=document.createElement('dialog');dialog.className='how-to-play terminal-menu';dialog.setAttribute('aria-labelledby','howToPlayTitle');dialog.innerHTML='<header><h2 id="howToPlayTitle">MOM://FIELD MANUAL</h2><button type="button" data-close-guide>Close</button></header><div role="tablist" aria-label="How to play"></div><section role="tabpanel" tabindex="0"></section>';
 document.body.append(dialog);const tabs=dialog.querySelector('[role=tablist]'),panel=dialog.querySelector('[role=tabpanel]');let current=0,opener=null;
 function choose(index,focus=false){current=(index+guide.length)%guide.length;for(const [i,tab] of [...tabs.children].entries()){tab.setAttribute('aria-selected',String(i===current));tab.tabIndex=i===current?0:-1;}const [id,,title,items]=guide[current];panel.id='guide-panel';panel.setAttribute('aria-labelledby','guide-tab-'+id);panel.replaceChildren();const h=document.createElement('h3');h.textContent=title;panel.append(h);
  if(id==='weapons')for(const track of Object.values(TRAINING_TRACKS)){const row=document.createElement('div');row.className='guide-track';const label=document.createElement('strong');label.textContent=track.name;row.append(label);for(const type of track.weapons){const item=document.createElement('span'),canvas=document.createElement('canvas');canvas.width=40;canvas.height=72;canvas.setAttribute('aria-hidden','true');window.GalaWeapons.draw(canvas.getContext('2d'),{type,tier:4});item.append(canvas,document.createTextNode(window.GalaWeapons.types.find(w=>w.id===type).name));row.append(item);}panel.append(row);}
  else for(const [label,text] of items){const block=document.createElement('article'),heading=document.createElement('h4'),p=document.createElement('p');heading.textContent=label;p.textContent=text;block.append(heading,p);panel.append(block);}if(focus)tabs.children[current].focus();
 }
 guide.forEach(([id,label],index)=>{const button=document.createElement('button');button.type='button';button.id='guide-tab-'+id;button.setAttribute('role','tab');button.setAttribute('aria-controls','guide-panel');button.textContent=label;button.onclick=()=>choose(index);tabs.append(button);});
 tabs.onkeydown=event=>{const move={ArrowRight:current+1,ArrowLeft:current-1,Home:0,End:guide.length-1};if(Object.hasOwn(move,event.key)){event.preventDefault();choose(move[event.key],true);}};
 function openGuide(){opener=document.activeElement;choose(0);dialog.showModal();tabs.children[0].focus();}
 hub.querySelector('.mission-guide').onclick=openGuide;dialog.querySelector('[data-close-guide]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>opener?.focus());
 const settings=document.getElementById('settings');settings.classList.add('terminal-menu','satcom-frame');document.getElementById('settingsTitle').textContent='MOM://POD CONTROL';
 const nav=document.createElement('nav');nav.className='terminal-links';nav.setAttribute('aria-label','Behind the scenes');
 // D30: Achievements opens through the same window.myr5Menus hook the owner's portal will call (app.mjs).
 for(const [label,target] of [['PORTAL','portal'],['ACHIEVEMENTS','achievements'],['REMINDERS','reminders'],['ACCOUNT','account'],['DEVICE + UPDATES','install'],['HOW TO PLAY','guide']]){const b=document.createElement('button');b.type='button';b.textContent='> '+label;b.onclick=()=>{settings.close();target==='guide'?openGuide():['achievements','portal'].includes(target)?window.myr5Menus?.[target]():document.querySelector('.coach-dock [data-panel='+target+']').click();};nav.append(b);}settings.append(nav);
 mountSatcomFrame(settings);
 for(const id of ['installPanel','remindersPanel'])document.getElementById(id).classList.add('terminal-menu');
 let progress=null;
 function paint(){hub.querySelector('[data-streak]').textContent=progress?.combat?.loginStreak??'—';let weapon={type:'rapier',tier:0};try{weapon=window.GalaWeapons.normalize(JSON.parse(localStorage.getItem('mominc-avatar-v1'))?.weapon||weapon);}catch{}if(!window.GalaWeapons.unlocked(weapon,progress))weapon={type:weapon.type,tier:0};const damage=weaponDamage(progress?.combat,weapon);hub.querySelector('[data-damage]').textContent=damage?damage.toLocaleString()+' DMG / HIT':'Sign in to power up';hub.dataset.boost=String(!!progress?.combat?.breathingCompleted);}
 window.addEventListener('myr5:account-progress',event=>{progress=event.detail;paint();});window.addEventListener('mominc-avatar-change',paint);
 const form=document.createElement('form');form.className='coach-reminder-plan';form.innerHTML='<h3>YOUR DAILY ORDERS</h3><label>Messages per day<select name="count"><option value="1">1 message</option><option value="2">2 messages</option><option value="3" selected>3 messages</option></select></label><div data-times></div><label>Coach tone<select name="tone"><option value="cheeky">Drill coach</option><option value="direct">Direct</option><option value="gentle">Gentle</option></select></label><div class="plan-quiet"><label>Quiet from<input name="quietStart" type="time" value="22:00" required></label><label>Until<input name="quietEnd" type="time" value="07:00" required></label></div><label class="plan-enabled"><input name="enabled" type="checkbox"> Reminders armed</label><button type="submit">SAVE ORDERS</button><p data-plan-status role="status"></p><details><summary>When training is missed</summary><p data-escalation></p></details>';
 document.querySelector('#remindersPanel header').after(form);
 const old=document.getElementById('reminderForm'),details=document.createElement('details');details.innerHTML='<summary>Individual reminders</summary>';old.before(details);details.append(old);
 let times=['09:00','14:00','19:00'],timezone=Intl.DateTimeFormat().resolvedOptions().timeZone;
 function timeFields(){const host=form.querySelector('[data-times]');for(const [i,input] of [...host.querySelectorAll('input')].entries())times[i]=input.value;host.replaceChildren();for(let i=0;i<Number(form.elements.count.value);i++){const label=document.createElement('label');label.textContent='Check-in '+(i+1);const input=document.createElement('input');input.type='time';input.required=true;input.value=times[i]||['09:00','14:00','19:00'][i];label.append(input);host.append(label);}}
 form.elements.count.onchange=timeFields;form.elements.tone.onchange=()=>{form.querySelector('[data-escalation]').textContent=coachReminder(3,form.elements.tone.value);};timeFields();form.elements.tone.onchange();
 function showPlan(p){times=p.times||times;timezone=p.timezone||timezone;form.elements.count.value=p.count;form.elements.tone.value=p.tone;form.elements.enabled.checked=!!p.enabled;form.elements.quietStart.value=p.quietStart||'22:00';form.elements.quietEnd.value=p.quietEnd||'07:00';form.querySelector('[data-times]').replaceChildren();timeFields();form.elements.tone.onchange();hub.querySelector('[data-message-count]').textContent=p.enabled?p.count+' messages / day':'Reminders paused';hub.querySelector('.mission-arm').firstChild.textContent=p.enabled?'YOUR ORDERS ARE ARMED ':'ARM YOUR REMINDERS ';}
 async function load(){try{showPlan(await api('/api/reminders/plan'));}catch(error){form.querySelector('[data-plan-status]').textContent=error.message;}}
 document.querySelector('.coach-dock [data-panel=reminders]').addEventListener('click',load);
 form.onsubmit=async event=>{event.preventDefault();const button=form.querySelector('[type=submit]');button.disabled=true;try{const p=await api('/api/reminders/plan','PUT',{count:Number(form.elements.count.value),times:[...form.querySelectorAll('[data-times] input')].map(i=>i.value),tone:form.elements.tone.value,enabled:form.elements.enabled.checked,timezone,daysPerWeek:7,quietStart:form.elements.quietStart.value,quietEnd:form.elements.quietEnd.value});showPlan(p);form.querySelector('[data-plan-status]').textContent=p.enabled?'Orders saved. Turn on notifications for this device below.':'Orders paused.';}catch(error){form.querySelector('[data-plan-status]').textContent=error.message;}finally{button.disabled=false;}};
 paint();
}

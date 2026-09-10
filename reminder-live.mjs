import {scheduledDay} from './reminder-settings.mjs';
const formatters=new Map();
function localParts(now,timezone){if(!formatters.has(timezone))formatters.set(timezone,new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}));const parts=Object.fromEntries(formatters.get(timezone).formatToParts(now).map(p=>[p.type,p.value]));return {day:`${parts.year}-${parts.month}-${parts.day}`,time:`${parts.hour}:${parts.minute}`};}
export function quietReminder(r){const a=r.quiet_start,b=r.quiet_end,t=r.time;return a!==b&&(a<b?t>=a&&t<b:t>=a||t<b);}
export function nextReminderAt(r,now=Date.now()){
 if(!r.enabled||quietReminder(r))return null;
 const today=localParts(now,r.timezone).day;
 for(let day=0;day<9;day++){
  const date=new Date(Date.parse(today+'T12:00:00Z')+day*86400000).toISOString().slice(0,10);if(!scheduledDay(date,r.days_per_week??7))continue;
  const target=Date.parse(date+'T'+r.time+':00Z');let guess=target;
  for(let i=0;i<3;i++){const local=localParts(guess,r.timezone);guess+=target-Date.parse(local.day+'T'+local.time+':00Z');}
  // Validate the wall time; a spring-forward gap must not become a different hour.
  const candidates=[guess-3600000,guess,guess+3600000].filter(t=>{const p=localParts(t,r.timezone);return p.day===date&&p.time===r.time&&t>now-600000;}).sort((a,b)=>a-b);
  if(candidates.length)return candidates[0];
 }
 return null;
}
export function reminderCountdown(time,now=Date.now()){if(time==null)return '';const seconds=Math.ceil((time-now)/1000);if(seconds<=0)return 'Scheduled now';if(seconds<60)return `In ${seconds}s`;if(seconds<3600)return `In ${Math.ceil(seconds/60)} min`;if(seconds<86400)return `In ${Math.floor(seconds/3600)}h ${Math.ceil((seconds%3600)/60)}m`;return `In ${Math.ceil(seconds/86400)} days`;}
export function mountLiveReminders({refresh,read,getAccount,deviceReady=()=>true}){
 const status=document.getElementById('reminderLiveStatus'),panel=document.getElementById('remindersPanel');let rows=[],schedule=[],busy=false,stopped=false,lastRead=0;
 function update(items){rows=items;schedule=items.map(r=>({r,next:nextReminderAt(r)}));render();}
 function render(){
  if(!panel.open||document.hidden)return;
  const now=Date.now();for(const entry of schedule)if(entry.next!=null&&entry.next<=now-600000)entry.next=nextReminderAt(entry.r,now);
  for(const {r,next}of schedule){const label=document.getElementById('reminder-next-'+r.id);if(label)label.textContent=!r.enabled?'Paused':quietReminder(r)?'This time is inside quiet hours':reminderCountdown(next,now);}
  const account=getAccount(),on=document.getElementById('notificationSwitch').getAttribute('aria-checked')==='true';
  const fresh=account&&Date.now()-account.syncedAt<90000;
  const connected=navigator.onLine&&fresh&&account?.push?.configured&&account?.push?.schedulerActive&&on&&deviceReady();
  status.dataset.state=connected?'live':'waiting';
  const next=schedule.filter(x=>x.next!=null).sort((a,b)=>a.next-b.next)[0];
  status.textContent=!navigator.onLine?'Offline · reminders resume when connected':!account?'Sign in to receive reminders':account.push.environment==='preview'?'Local preview · notifications run in the live app':!fresh?'Checking the reminder connection…':!account.push.configured?'Notification service is unavailable':!account.push.schedulerActive?'Reminder sender is reconnecting':!on?'Turn on notifications for this device':!deviceReady()?'Reconnecting this device…':!rows.some(r=>r.enabled)?'Connected · save or enable a reminder':next?`Live · ${next.r.kind} · ${reminderCountdown(next.next,now)}`:'Connected · choose a time outside quiet hours';
 }
 async function sync(){if(stopped||busy||document.hidden||!panel.open)return;busy=true;try{await refresh();await read();lastRead=Date.now();}finally{busy=false;render();}}
 const timer=setInterval(()=>{render();if(Date.now()-lastRead>=15000)sync();},1000);
 window.addEventListener('online',sync);window.addEventListener('offline',render);document.addEventListener('visibilitychange',sync);
 window.addEventListener('pagehide',()=>{stopped=true;clearInterval(timer);});
 return {update,sync,render};
}

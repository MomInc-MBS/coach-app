import {runReminders,subscriptionInput} from '../server/push.mjs';
import {reminderInput,fail} from '../server/domain.mjs';
import {emailSubscription,emailLinkAction,runReleaseEmails} from '../server/release-email.mjs';
import {syncTrainingStatus} from '../server/reminder-plan.mjs';
import {runReleasePush} from '../server/release-push.mjs';
import {epochFencedBatch,reconcileRemoteEpoch} from '../server/remote-epochs.mjs';
import {remoteAccountDeletionStatements} from '../server/remote-deletion-data.mjs';
import {remoteAccountOperation} from '../server/remote-account-operations.mjs';
import {validatedReminderProof} from '../server/remote-reminders.mjs';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
async function authorized(request,env){
 const token=request.headers.get('Authorization')||'';if(!env.REMINDER_SERVICE_TOKEN||token.length>200)return false;
 const hash=value=>crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
 const [a,b]=await Promise.all([hash(token),hash(`Bearer ${env.REMINDER_SERVICE_TOKEN}`)]);
 let diff=0;const left=new Uint8Array(a),right=new Uint8Array(b);for(let i=0;i<left.length;i++)diff|=left[i]^right[i];return diff===0;
}
async function body(request){const text=await request.text();if(text.length>60000)fail('Too much reminder data.',413);try{return JSON.parse(text);}catch{fail('Invalid reminder data.');}}
function proofFromHeaders(request,user){
 const epoch=request.headers.get('X-Coach-Data-Epoch'),through=request.headers.get('X-Coach-Deleted-Through');
 if(epoch===null||through===null)throw Object.assign(Error('Account generation is required.'),{status:428,code:'epoch_required'});
 if(!/^[1-9][0-9]*$/.test(epoch)||!/^(0|[1-9][0-9]*)$/.test(through))fail('Invalid account generation.',422);
 return validatedReminderProof(user,{ownerId:user,currentDataEpoch:Number(epoch),deletedThroughEpoch:Number(through)});
}
async function importExisting(request,env,user,proof){
 const input=await body(request);if(!Array.isArray(input.reminders)||input.reminders.length>16||!Array.isArray(input.subscriptions)||input.subscriptions.length>32)fail('Invalid reminder import.');
 const database=env.DB,key='import:'+JSON.stringify([user,proof.currentDataEpoch]);
 const priorKey=proof.currentDataEpoch===1?'import:'+user:key;
 if(await database.prepare('SELECT value FROM system WHERE key=? OR key=?').bind(key,priorKey).first())return {imported:true};
 const statements=[];
 for(const row of input.reminders){
  const r=reminderInput({id:row.id,kind:row.kind,time:row.time,timezone:row.timezone,enabled:!!row.enabled,quietStart:row.quiet_start,quietEnd:row.quiet_end,tone:row.tone,daysPerWeek:row.days_per_week});
  statements.push(database.prepare('INSERT INTO reminders(id,user_id,kind,time,timezone,enabled,quiet_start,quiet_end,tone,days_per_week) SELECT ?,?,?,?,?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM system WHERE key=? OR key=?) ON CONFLICT(id) DO NOTHING').bind(r.id,user,r.kind,r.time,r.timezone,r.enabled,r.quietStart,r.quietEnd,r.tone,r.daysPerWeek,key,priorKey));
 }
 for(const item of input.subscriptions){const s=subscriptionInput(item);statements.push(database.prepare('INSERT INTO subscriptions(endpoint,user_id,data,created_at) SELECT ?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM system WHERE key=? OR key=?) ON CONFLICT(endpoint) DO NOTHING').bind(s.endpoint,user,JSON.stringify(s),Date.now(),key,priorKey));}
 statements.push(database.prepare('INSERT INTO system(key,value) VALUES(?,?) ON CONFLICT(key) DO NOTHING').bind(key,String(Date.now())));
 await epochFencedBatch(database,{ownerId:user,expectedDataEpoch:proof.currentDataEpoch,now:Date.now(),statements});return {imported:true};
}
export default {
 async fetch(request,env){
  try{
   const url=new URL(request.url),path=url.pathname,method=request.method;
   if(path==='/health'&&method==='GET'){const tick=await env.DB.prepare("SELECT value FROM system WHERE key='scheduler_tick'").first();return json({ok:true,service:'MYR5 reminders',configured:!!env.VAPID_PRIVATE_KEY&&!!env.VAPID_PUBLIC_KEY,schedulerActive:!!tick&&Date.now()-Number(tick.value)<300000});}
   if(!await authorized(request,env))return json({error:'Unauthorized.'},401);
   if(path==='/internal/status'&&method==='GET'){const tick=await env.DB.prepare("SELECT value FROM system WHERE key='scheduler_tick'").first();return json({configured:!!env.VAPID_PRIVATE_KEY&&!!env.VAPID_PUBLIC_KEY,publicKey:env.VAPID_PUBLIC_KEY||null,schedulerActive:!!tick&&Date.now()-Number(tick.value)<300000,lastRun:tick?Number(tick.value):null});}
   // Token actions atomically match the currently stored unique token. No pseudo-owner epoch.
   if(/^\/internal\/release-email\/(confirm|unsubscribe)$/.test(path)&&method==='POST'){const input=await body(request);return json(await emailLinkAction(env,path.split('/').at(-1),input.token));}
   const user=request.headers.get('X-Coach-User');if(!user||user.length>512||user.trim()!==user||/[\r\n]/.test(user))return json({error:'Missing account.'},401);
   const allowed=(path==='/internal/account-reconcile'&&method==='POST')||(path==='/internal/training-status'&&method==='POST')||(path==='/internal/import'&&method==='POST')||(path==='/api/updates/subscription'&&['GET','POST','DELETE'].includes(method))||(path==='/api/reminders'&&['GET','POST'].includes(method))||(path==='/api/reminders/plan'&&['GET','PUT'].includes(method))||(/^\/api\/reminders\/[a-f0-9-]{36}$/.test(path)&&['PUT','PATCH','DELETE'].includes(method))||(/^\/api\/push\/(subscribe|unsubscribe|test)$/.test(path)&&method==='POST')||(path==='/api/export'&&method==='GET');
   if(!allowed)return json({error:'Not found.'},404);
   const proof=proofFromHeaders(request,user),ack=await reconcileRemoteEpoch(env.DB,{...proof,now:Date.now(),deletions:remoteAccountDeletionStatements(env.DB,user)});
   if(path==='/internal/account-reconcile')return json({ownerId:ack.ownerId,currentDataEpoch:ack.currentDataEpoch,deletedThroughEpoch:ack.deletedThroughEpoch});
   if(ack.currentDataEpoch!==proof.currentDataEpoch)throw Object.assign(Error('Account generation changed.'),{status:409,code:'target_epoch_mismatch'});
   if(path==='/internal/training-status')return json(await syncTrainingStatus(env.DB,user,await body(request),Date.now(),{dataEpoch:proof.currentDataEpoch}));
   if(path==='/internal/import')return json(await importExisting(request,env,user,proof));
   if(path==='/api/updates/subscription')return json(await emailSubscription(env,user,method,method==='POST'?await body(request):{},Date.now(),{dataEpoch:proof.currentDataEpoch}));
   return json(await remoteAccountOperation(request,env,user,proof.currentDataEpoch));
  }catch(error){
   const status=error.status||(error.code==='target_epoch_mismatch'?409:error.code==='remote_epoch_busy'?503:500);
   return json({error:status===500?'Could not complete the reminder request.':error.message,...(typeof error.code==='string'?{code:error.code}:{})},status);
  }
 },
 // Scheduled senders retain their captured source epoch through claims and callbacks.
 async scheduled(event,env,ctx){
  ctx.waitUntil((async()=>{const result=await runReminders(env);if(result.failed)throw Error(`${result.failed} reminder deliveries failed`);})());
  ctx.waitUntil((async()=>{const result=await runReleaseEmails(env);if(result.failed)throw Error(`${result.failed} release email deliveries failed`);})());
  ctx.waitUntil((async()=>{const result=await runReleasePush(env);if(result.failed)throw Error(`${result.failed} update notification deliveries failed`);})());
 }
};

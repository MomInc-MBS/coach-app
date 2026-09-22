import {readAccountReadiness,scheduleAccountReadiness,refreshReminderHealth,trainingReadinessKey} from './account-readiness.mjs';
import {remoteAccountOperation} from './remote-account-operations.mjs';
import {epochFencedBatch} from './remote-epochs.mjs';
import {AccountDataEpochError,inspectAccountDataEpoch,deleteAccountDataAtEpoch} from './account-data-epochs.mjs';
import {importWorkout,WorkoutImportError} from './workout-import.mjs';
import {readExerciseRoute,assertRoundAvailable,completeRound,maximumRoundGoal} from './workout-route.mjs';
import {scoreboardApi,exportScoreboard,deleteScoreboard} from './scoreboard.mjs';
import {authConfig,identity,accountOwner,linkLegacy} from './auth.mjs';
import {galaApi} from './gala.mjs';
import {installDraft} from './install-draft.mjs';
import {readOnboarding,saveOnboarding} from './onboarding.mjs';
import {db} from './db.mjs';
import {remoteReminders,reminderService,ensureReminderMigration,queueReminderReconciliation,attemptReminderReconciliation} from './remote-reminders.mjs';
import {MODES,uuid,cleanText,fail,mealInput,progress,} from './domain.mjs';
import {runReminders} from './push.mjs';
import {RELEASE} from '../release-info.mjs';
import {trainingFromDaily} from '../weapon-training.mjs';
import {combatProgress,startBreathing,completeBreathing} from './combat.mjs';
import {syncTrainingStatus} from './reminder-plan.mjs';
import {emailSubscription,emailLinkAction,emailLinkPage} from './release-email.mjs';
import {readEntitlements,recordCoachArmyCompletion,createCoachArmyBinding,claimCoachArmyBinding} from './entitlements.mjs';
import {startCoachArmyRun,readCoachArmyRun,recordBrowserCoachArmyEvent,recordVerifiedCoachArmyEvent,startDjscratchChallenge,recordDjscratchControl,deliverCoachArmyOutbox} from './coach-army-runs.mjs';
import {warRoomApi} from './war-room.mjs';
import {RECOVERY_HTML} from '../recovery-page.mjs';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
async function body(request){if(!request.headers.get('content-type')?.startsWith('application/json'))fail('Send JSON.',415);const reader=request.body?.getReader();if(!reader)fail('Empty request.');const chunks=[];let size=0;for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>60000){await reader.cancel();fail('Request too large.',413);}chunks.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.byteLength;}let v;try{v=JSON.parse(new TextDecoder().decode(bytes));}catch{fail('Invalid request.');}if(!v||typeof v!=='object'||Array.isArray(v))fail('Invalid request.');return v;}
async function count(database,user){return Number((await database.prepare(`SELECT count(*) AS total FROM workouts WHERE user_id=? AND source='server' AND completed_at IS NOT NULL`).bind(user).first()).total);}
async function workoutProgress(database,user,now=Date.now(),includeCombat=true,onboarding=null,{recordLogin=true}={}){const rows=(await database.prepare(`SELECT mode,CAST(completed_at/86400000 AS INTEGER) AS day,COUNT(*) AS sets FROM workouts WHERE user_id=? AND source='server' AND completed_at IS NOT NULL GROUP BY mode,day`).bind(user).all()).results;return {exerciseRoute:await readExerciseRoute(database,user,onboarding,now),...progress(rows.reduce((sum,row)=>sum+Number(row.sets),0)),activeDays:new Set(rows.map(row=>row.day)).size,trainingVersion:1,training:trainingFromDaily(rows),trainingStatus:{startedDay:rows.length?rows.reduce((value,r)=>Math.min(value,r.day),Infinity):Math.floor(now/86400000),lastCompletedDay:rows.length?rows.reduce((value,r)=>Math.max(value,r.day),-Infinity):null},...(includeCombat?{combat:await combatProgress(database,user,now,{recordLogin})}:{})};}
async function api(request,env,ctx){const u=new URL(request.url),p=u.pathname,method=request.method;
 if(p==='/api/workouts/import'&&(method!=='POST'||env.WORKOUT_IMPORTS_ENABLED!=='true'))return json({error:'Not found.'},404);
 const database=db(env);
 if(p.startsWith('/api/gala/'))return galaApi(request,database,body);
 if(p==='/api/integrations/coach-army/completion'&&method==='POST'){
  if(!env.COACH_ARMY_COMPLETION_SECRET||request.headers.get('Authorization')!==`Bearer ${env.COACH_ARMY_COMPLETION_SECRET}`)fail('Unauthorized.',401);
  return json({entitlements:await recordCoachArmyCompletion(database,await body(request))});
 }
 if(p==='/api/integrations/coach-army/binding'&&method==='POST'){
  if(!env.COACH_ARMY_COMPLETION_SECRET||request.headers.get('Authorization')!==`Bearer ${env.COACH_ARMY_COMPLETION_SECRET}`)fail('Unauthorized.',401);
  return json({binding:await createCoachArmyBinding(database,await body(request))});
 }
 if(p==='/api/integrations/coach-army/run-events'&&method==='POST'){
  if(!env.COACH_ARMY_COMPLETION_SECRET||request.headers.get('Authorization')!==`Bearer ${env.COACH_ARMY_COMPLETION_SECRET}`)fail('Unauthorized.',401);
  const result=await recordVerifiedCoachArmyEvent(database,await body(request),Date.now());
  return json({run:result.run,accepted:true,outbox:result.outbox||null});
 }
 if(p==='/api/releases/current'&&method==='GET')return json(RELEASE);
 if(['/api/updates/confirm','/api/updates/unsubscribe'].includes(p)){
  const action=p.split('/').at(-1),token=u.searchParams.get('token');
  if(method==='GET')return emailLinkPage(action,token);
  if(method!=='POST')fail('Method not allowed.',405);
  if(action==='confirm'&&request.headers.get('Origin')!==u.origin)fail('Confirm from the email link page.',403);
  if(!/^[a-f0-9]{64}$/.test(token||''))fail('This email link is invalid.');
  const result=remoteReminders(env)?await reminderService(env,'email-link',`/internal/release-email/${action}`,'POST',{token}):await emailLinkAction(env,action,token);
  return emailLinkPage(action,token,result.message);
 }
 if(p==='/api/cron'&&method==='POST'){if(!env.CRON_SECRET||request.headers.get('Authorization')!==`Bearer ${env.CRON_SECRET}`)fail('Unauthorized.',401);if(remoteReminders(env))fail('The independent reminder service owns scheduling.',409);return json(await runReminders(env));}
 if(!['GET','HEAD'].includes(method)&&request.headers.get('Origin')!==u.origin)fail('Open this action from Coach.',403);
 if(p==='/api/auth/config'&&method==='GET')return json(authConfig(env));
 if(p==='/api/auth/link'&&method==='POST'){const v=await body(request);if(v.confirm!==true)fail('Confirm the account connection.');return json(await linkLegacy(database,await identity(request,env)));}
 if(p==='/api/install-draft')return installDraft(request,database,body);
 const id=await identity(request,env),user=await accountOwner(database,id),now=Date.now();
 const accountReadProof=p==='/api/account'&&method==='GET'?await inspectAccountDataEpoch(database,user):null;
 const reminderRequest=p==='/api/updates/subscription'||p==='/api/reminders'||p.startsWith('/api/reminders/')||p.startsWith('/api/push/');
 const primaryWrite=(p==='/api/profile'&&method==='PUT')||(p==='/api/onboarding'&&method==='PUT')||(p==='/api/goals'&&method==='POST')||(p.startsWith('/api/goals/')&&method==='PATCH')||(p==='/api/meals'&&method==='POST')||(p.startsWith('/api/meals/')&&method==='DELETE')||(['/api/breathing/start','/api/breathing/complete'].includes(p)&&method==='POST');
 const socialWrite=!['GET','HEAD'].includes(method)&&(p.startsWith('/api/war-room/')||p.startsWith('/api/scoreboard/'));
 let workoutWriteProof=null;
 if((method==='POST'&&p.startsWith('/api/coach-army/'))||socialWrite||primaryWrite||(method==='POST'&&['/api/workouts/start','/api/workouts/complete'].includes(p))||(reminderRequest&&!['GET','HEAD'].includes(method))){
  const target=request.headers.get('X-Target-Account'),rawEpoch=request.headers.get('X-Expected-Data-Epoch');
  if(target===null||rawEpoch===null)throw Object.assign(Error('Refresh account details before saving.'),{status:428,code:'account_assertion_required'});
  if(target!==user)throw Object.assign(Error('Account changed.'),{status:409,code:'target_mismatch'});
  if(!/^[1-9][0-9]*$/.test(rawEpoch)||!Number.isSafeInteger(Number(rawEpoch)))throw Object.assign(Error('Invalid account generation.'),{status:422,code:'invalid_account_epoch'});
  workoutWriteProof=await inspectAccountDataEpoch(database,user);
  if(workoutWriteProof.currentDataEpoch!==Number(rawEpoch))throw Object.assign(Error('Account data changed.'),{status:409,code:'target_epoch_mismatch'});
 }
 const reminderProof=reminderRequest?(workoutWriteProof||await inspectAccountDataEpoch(database,user)):null;
 const exportProof=p==='/api/export'?await inspectAccountDataEpoch(database,user):null;
 const onboarding=env.REMINDER_INTERNAL===true?null:await readOnboarding(database,user,now);
 if(p==='/api/workouts/import'&&method==='POST'){
  if(request.headers.get('X-Target-Account')!==user)throw Object.assign(Error('target_mismatch'),{status:409,code:'target_mismatch'});
  const input=await body(request);
  try{
   const result=await importWorkout(database,{ownerId:user,targetAccountId:request.headers.get('X-Target-Account'),idempotencyKey:request.headers.get('Idempotency-Key'),body:input,now});
   return json({workout:result.workout,receipt:result.receipt},result.status);
  }catch(error){
   if(error instanceof WorkoutImportError){if(error.status===400)error.status=422;throw error;}
   throw Object.assign(Error('Import temporarily unavailable.'),{status:503,code:'import_unavailable'});
  }
 }
 if(p==='/api/war-room'&&method==='GET'){const proof=await inspectAccountDataEpoch(database,user),room=await warRoomApi(database,user,p,method,null,now);if((await inspectAccountDataEpoch(database,user)).currentDataEpoch!==proof.currentDataEpoch)throw Object.assign(Error('Account data changed.'),{status:409,code:'target_epoch_mismatch'});return json({...room,targetAccountId:user,dataEpoch:proof.currentDataEpoch});}
 if(p==='/api/war-room/loadout'&&method==='PUT')return json(await warRoomApi(database,user,p,method,await body(request),now,{dataEpoch:workoutWriteProof.currentDataEpoch}));
 if(p==='/api/war-room/recipes'&&method==='POST')return json(await warRoomApi(database,user,p,method,await body(request),now,{dataEpoch:workoutWriteProof.currentDataEpoch}));
 if(p==='/api/war-room/import/profile'&&method==='POST')return json(await warRoomApi(database,user,p,method,await body(request),now,{dataEpoch:workoutWriteProof.currentDataEpoch}));
 if(/^\/api\/war-room\/recipes\/[A-Za-z0-9_-]{1,80}$/.test(p)&&method==='DELETE')return json(await warRoomApi(database,user,p,method,await body(request),now,{dataEpoch:workoutWriteProof.currentDataEpoch}));
 if(p==='/api/coach-army/runs'&&method==='POST')return json({run:await startCoachArmyRun(database,user,now,{dataEpoch:workoutWriteProof.currentDataEpoch})},201);
 const coachArmyRun=p.match(/^\/api\/coach-army\/runs\/([0-9a-f-]{36})(?:\/events)?$/i);
 if(coachArmyRun&&method==='GET'&&!p.endsWith('/events'))return json({run:await readCoachArmyRun(database,coachArmyRun[1],user)});
 if(coachArmyRun&&method==='POST'&&p.endsWith('/events')){const result=await recordBrowserCoachArmyEvent(database,{...(await body(request)),runId:coachArmyRun[1],dataEpoch:workoutWriteProof.currentDataEpoch},user,now);return json({run:result.run,accepted:true,evidence:result.evidence||null,replay:result.replay});}
 const djscratch=p.match(/^\/api\/coach-army\/runs\/([0-9a-f-]{36})\/djscratch(?:\/controls)?$/i);
 if(djscratch&&method==='POST'&&!p.endsWith('/controls'))return json({challenge:await startDjscratchChallenge(database,djscratch[1],user,now,{dataEpoch:workoutWriteProof.currentDataEpoch})});
 if(djscratch&&method==='POST'&&p.endsWith('/controls'))return json(await recordDjscratchControl(database,{...(await body(request)),runId:djscratch[1],dataEpoch:workoutWriteProof.currentDataEpoch},user,now));
 if(p==='/api/coach-army/claim'&&method==='POST')return json({entitlements:await claimCoachArmyBinding(database,{...(await body(request)),accountId:user,dataEpoch:workoutWriteProof.currentDataEpoch},now)});
 if(p==='/api/scoreboard'||p.startsWith('/api/scoreboard/')){const proof=workoutWriteProof||await inspectAccountDataEpoch(database,user),result=await scoreboardApi(database,user,p,method,method==='POST'?await body(request):{},now,{dataEpoch:proof.currentDataEpoch});if((await inspectAccountDataEpoch(database,user)).currentDataEpoch!==proof.currentDataEpoch)throw Object.assign(Error('Account data changed.'),{status:409,code:'target_epoch_mismatch'});return json({...result,targetAccountId:user,dataEpoch:proof.currentDataEpoch});}
 if(p==='/api/updates/subscription'){const input=method==='POST'?await body(request):{};return json(remoteReminders(env)?await reminderService(env,user,p,method,method==='POST'?input:undefined,reminderProof):await emailSubscription(env,user,method,input,now,{dataEpoch:reminderProof.currentDataEpoch}));}
 if(p==='/api/onboarding'&&method==='PUT')return json(await saveOnboarding(database,user,await body(request),now,{dataEpoch:workoutWriteProof.currentDataEpoch}));
 if(env.REMINDER_INTERNAL!==true&&!onboarding&&method!=='GET'&&(p==='/api/workouts/start'||p.startsWith('/api/breathing/')||p==='/api/meals'||p.startsWith('/api/reminders')||p==='/api/push/subscribe'))fail('Answer the three setup questions to start Coach.',403);
 if(p==='/api/reminders'||p.startsWith('/api/reminders/')||p.startsWith('/api/push/')){if(remoteReminders(env)){await ensureReminderMigration(env,user,reminderProof);return json(await reminderService(env,user,p,method,['POST','PUT','PATCH'].includes(method)?await body(request):undefined,reminderProof));}return json(await remoteAccountOperation(request,env,user,reminderProof.currentDataEpoch,now));}
 if(p==='/api/account/readiness'&&method==='GET'){
  // Optional observations only; this response is never account authority.
  const proof=await inspectAccountDataEpoch(database,user);
  let push,health=null;
  if(remoteReminders(env)){health=await refreshReminderHealth(database,env,user);push={configured:false,publicKey:null,schedulerActive:false,...health.push,status:health.state};}
  else {const tick=await database.prepare("SELECT value FROM system WHERE key='scheduler_tick'").first();push={configured:!!env.VAPID_PUBLIC_KEY,publicKey:env.VAPID_PUBLIC_KEY||null,schedulerActive:!!tick&&now-Number(tick.value)<300000,status:'ready'};}
  const readiness=await readAccountReadiness(database,user,proof.currentDataEpoch);
  if(health&&(!Number.isSafeInteger(readiness.reminders.startedAt)||health.startedAt>readiness.reminders.startedAt||(health.startedAt===readiness.reminders.startedAt&&health.observationId>=readiness.reminders.observationId)))readiness.reminders=health;
  if(readiness.reminders.push)push={...readiness.reminders.push,status:readiness.reminders.state};
  if((await inspectAccountDataEpoch(database,user)).currentDataEpoch!==proof.currentDataEpoch)throw Object.assign(Error('Account data changed.'),{status:409,code:'target_epoch_mismatch'});
  return json({targetAccountId:user,dataEpoch:proof.currentDataEpoch,readiness,push:{...push,environment:env.LOCAL_PREVIEW?'preview':'live'},checkedAt:Date.now()});
 }
 if(p==='/api/account'&&method==='GET'){
  const [profile,total,tick,entitlements]=await Promise.all([database.prepare('SELECT * FROM profiles WHERE user_id=?').bind(user).first(),workoutProgress(database,user,now,env.REMINDER_INTERNAL!==true,onboarding,{recordLogin:false}),database.prepare("SELECT value FROM system WHERE key='scheduler_tick'").first(),readEntitlements(database,user)]);
  let push={configured:!!env.VAPID_PUBLIC_KEY,publicKey:env.VAPID_PUBLIC_KEY||null,schedulerActive:!!tick&&now-Number(tick.value)<300000};
  if(remoteReminders(env)){
   push={configured:false,publicKey:null,schedulerActive:false,status:'pending'};

   if(typeof ctx?.waitUntil==='function'){
    const queued=await database.prepare('SELECT value FROM system WHERE key=?').bind(`remote-deletion:${user}`).first();
    if(queued)ctx.waitUntil(Promise.resolve().then(()=>attemptReminderReconciliation(env,user,JSON.parse(queued.value))).catch(()=>{}));
   }
  }
  // Epoch was captured before onboarding/profile/progress reads; a concurrent
  // deletion makes this mixed read unsuitable for a fresh account snapshot.
  const current=await inspectAccountDataEpoch(database,user);
  if(current.currentDataEpoch!==accountReadProof.currentDataEpoch)throw Object.assign(Error('Account data changed. Refresh to continue.'),{status:409,code:'account_epoch_changed'});
  const readiness=await readAccountReadiness(database,user,accountReadProof.currentDataEpoch,now);
  if((await inspectAccountDataEpoch(database,user)).currentDataEpoch!==accountReadProof.currentDataEpoch)throw Object.assign(Error('Account data changed.'),{status:409,code:'account_epoch_changed'});
  if(remoteReminders(env)&&readiness.reminders.push)push={...readiness.reminders.push,status:readiness.reminders.state};
  scheduleAccountReadiness(ctx,database,env,user,accountReadProof,total.trainingStatus);
  return json({user:{id:user,email:id.email,provider:id.clerk?'clerk':'chatgpt'},dataEpoch:accountReadProof.currentDataEpoch,deletionEvidence:accountReadProof,profile:profile?JSON.parse(profile.data):{},revision:profile?.revision||0,onboarding,progress:total,entitlements,readiness,push:{...push,environment:env.LOCAL_PREVIEW?'preview':'live'},syncedAt:now});
 }
 if(p==='/api/goals'&&method==='GET')return json({items:(await database.prepare('SELECT id,title,note,status,created_at,updated_at FROM goals WHERE user_id=? ORDER BY updated_at DESC').bind(user).all()).results});
 if(p==='/api/goals'&&method==='POST'){const v=await body(request),title=cleanText(v.title,160),note=v.note==null||v.note===''?'':cleanText(v.note,1000);if(!title)fail('Add a title for this goal.');const id=uuid(v.id||crypto.randomUUID());await epochFencedBatch(database,{ownerId:user,expectedDataEpoch:workoutWriteProof.currentDataEpoch,now,statements:[database.prepare('INSERT INTO goals(id,user_id,title,note,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').bind(id,user,title,note,'active',now,now)]});return json({saved:true,id});}
 if(p.startsWith('/api/goals/')&&method==='PATCH'){const id=uuid(p.split('/').at(-1)),v=await body(request),changes=[];if(v.title!==undefined){const title=cleanText(v.title,160);if(!title)fail('Add a title for this goal.');changes.push(['title',title]);}if(v.note!==undefined)changes.push(['note',v.note===''?'':cleanText(v.note,1000)]);if(v.status!==undefined){if(!['active','completed','archived'].includes(v.status))fail('Choose active, completed, or archived.');changes.push(['status',v.status]);}if(!changes.length)fail('Nothing to save.');const sets=changes.map(([key])=>`${key}=?`).join(','),saved=(await epochFencedBatch(database,{ownerId:user,expectedDataEpoch:workoutWriteProof.currentDataEpoch,now,statements:[database.prepare(`UPDATE goals SET ${sets},updated_at=? WHERE id=? AND user_id=? RETURNING id`).bind(...changes.map(([,value])=>value),now,id,user)]}))[0].results[0];if(!saved)fail('Goal not found.',404);return json({saved:true});}
 if(p==='/api/profile'&&method==='PUT'){const v=await body(request);if(!Number.isSafeInteger(v.revision)||!v.data||typeof v.data!=='object'||Array.isArray(v.data))fail('Invalid profile.');const allowed=['myr5-recipe-v1','myr5-motion-v1','mominc-avatar-v1','myr5-pod-power-v1','handborne-recipe-v4','mbs-dj-identity-v1'];const safe={};for(const k of allowed){if(v.data[k]!=null){if(typeof v.data[k]!=='string'||v.data[k].length>30000)fail('Appearance is too large.');safe[k]=v.data[k];}}const result=(await epochFencedBatch(database,{ownerId:user,expectedDataEpoch:workoutWriteProof.currentDataEpoch,now,statements:[database.prepare('INSERT INTO profiles(user_id,data,revision,updated_at) VALUES(?,?,1,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data,revision=profiles.revision+1,updated_at=excluded.updated_at WHERE profiles.revision=? RETURNING revision').bind(user,JSON.stringify(safe),now,v.revision)]}))[0].results[0];if(!result)fail('Appearance changed on another device. Restore it before saving again.',409);return json(result);}
 if(env.REMINDER_INTERNAL!==true&&p==='/api/breathing/start'&&method==='POST'){const ticket=await startBreathing(database,user,now,{dataEpoch:workoutWriteProof.currentDataEpoch});if((await inspectAccountDataEpoch(database,user)).currentDataEpoch!==workoutWriteProof.currentDataEpoch)throw Object.assign(Error('Account data changed.'),{status:409,code:'target_epoch_mismatch'});return json({...ticket,targetAccountId:user,dataEpoch:workoutWriteProof.currentDataEpoch});}
 if(env.REMINDER_INTERNAL!==true&&p==='/api/breathing/complete'&&method==='POST'){const combat=await completeBreathing(database,user,await body(request),now,{dataEpoch:workoutWriteProof.currentDataEpoch});if((await inspectAccountDataEpoch(database,user)).currentDataEpoch!==workoutWriteProof.currentDataEpoch)throw Object.assign(Error('Account data changed.'),{status:409,code:'target_epoch_mismatch'});return json({combat,targetAccountId:user,dataEpoch:workoutWriteProof.currentDataEpoch});}
 if(p==='/api/workouts/start'&&method==='POST'){const v=await body(request);if(!Object.hasOwn(MODES,v.mode)||(!Number.isSafeInteger(v.goal)||v.goal<1||v.goal>await maximumRoundGoal(database,user,v.mode,onboarding.targets.goals[v.mode]??0)))fail('Choose a valid exercise and goal.');await assertRoundAvailable(database,user,v.mode,onboarding?.data?.profile?.timezone||'UTC',now);const recent=await database.prepare(`SELECT count(*) AS n FROM workouts WHERE user_id=? AND source='server' AND started_at>?`).bind(user,now-60000).first();if(recent.n>=12)fail('Please wait a moment before starting again.',429);const id=crypto.randomUUID();await epochFencedBatch(database,{ownerId:user,expectedDataEpoch:workoutWriteProof.currentDataEpoch,now,statements:[database.prepare(`INSERT INTO workouts(id,user_id,mode,goal,started_at) VALUES(?,?,?,?,?)`).bind(id,user,v.mode,v.goal,now)]});return json({id,startedAt:now,targetAccountId:user,dataEpoch:workoutWriteProof.currentDataEpoch});}
 if(p==='/api/workouts/complete'&&method==='POST'){const v=await body(request),id=uuid(v.id),w=await database.prepare(`SELECT * FROM workouts WHERE id=? AND user_id=? AND source='server'`).bind(id,user).first();if(!w)fail('Workout not found.',404);await completeRound(database,user,w,v,onboarding?.data?.profile?.timezone||'UTC',now,{dataEpoch:workoutWriteProof.currentDataEpoch});const progress=await workoutProgress(database,user,now,env.REMINDER_INTERNAL!==true,onboarding,{recordLogin:false});if(remoteReminders(env))try{await reminderService(env,user,'/internal/training-status','POST',progress.trainingStatus,workoutWriteProof);}catch{}else await syncTrainingStatus(database,user,progress.trainingStatus,now,{dataEpoch:workoutWriteProof.currentDataEpoch});if((await inspectAccountDataEpoch(database,user)).currentDataEpoch!==workoutWriteProof.currentDataEpoch)throw Object.assign(Error('Account data changed.'),{status:409,code:'target_epoch_mismatch'});return json({progress,targetAccountId:user,dataEpoch:workoutWriteProof.currentDataEpoch});}
 if(p==='/api/workouts'&&method==='GET')return json({items:(await database.prepare('SELECT id,mode,goal,value,completed_at FROM workouts WHERE user_id=? AND completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 100').bind(user).all()).results});
 if(p==='/api/achievements'&&method==='GET')return json({items:(await database.prepare('SELECT mode,COUNT(*) AS sets,MAX(value) AS best,SUM(value) AS total FROM workouts WHERE user_id=? AND completed_at IS NOT NULL GROUP BY mode').bind(user).all()).results});
 if(p==='/api/meals'&&method==='GET')return json({items:(await database.prepare('SELECT * FROM meals WHERE user_id=? ORDER BY eaten_at DESC LIMIT 100').bind(user).all()).results});
 if(p==='/api/meals'&&method==='POST'){const v=mealInput(await body(request));await epochFencedBatch(database,{ownerId:user,expectedDataEpoch:workoutWriteProof.currentDataEpoch,now,statements:[database.prepare('INSERT INTO meals(id,user_id,name,portion,calories,protein,carbs,fat,micros,nutrition_source,eaten_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(v.id,user,v.name,v.portion,v.calories,v.protein,v.carbs,v.fat,JSON.stringify(v.micros),v.nutritionSource,v.eatenAt,now)]});return json({saved:true});}
 if(p.startsWith('/api/meals/')&&method==='DELETE'){await epochFencedBatch(database,{ownerId:user,expectedDataEpoch:workoutWriteProof.currentDataEpoch,now,statements:[database.prepare('DELETE FROM meals WHERE id=? AND user_id=?').bind(uuid(p.split('/').at(-1)),user)]});return json({deleted:true});}
  if(p==='/api/export'&&method==='GET'){const tables=['profiles','onboarding','workouts','meals','reminders','goals','war_room_arsenals'].filter(t=>t!=='onboarding'||env.REMINDER_INTERNAL!==true);const data={};for(const table of tables)data[table]=(await database.prepare(`SELECT * FROM ${table} WHERE user_id=?`).bind(user).all()).results;if(remoteReminders(env)){await ensureReminderMigration(env,user,exportProof);data.reminders=(await reminderService(env,user,'/api/reminders','GET',undefined,exportProof)).items;data.releaseEmails=await reminderService(env,user,'/api/updates/subscription','GET',undefined,exportProof);}if(env.REMINDER_INTERNAL!==true){
 for(const table of ['account_entitlements','account_pack_entitlements','coach_army_completions'])data[table]=(await database.prepare(`SELECT * FROM ${table} WHERE user_id=?`).bind(user).all()).results;
 for(const table of ['coach_army_runs','coach_army_run_events','coach_army_completion_outbox','coach_army_djscratch_challenges'])data[table]=(await database.prepare(`SELECT * FROM ${table} WHERE account_id=?`).bind(user).all()).results;
 data.coach_army_bindings=(await database.prepare('SELECT binding_id,run_id,account_id,event_id,completed_at,expires_at,claimed_at,created_at,data_epoch FROM coach_army_bindings WHERE account_id=?').bind(user).all()).results;
 data.scoreboard=await exportScoreboard(database,user);data.combat=await combatProgress(database,user,now,{recordLogin:false});for(const table of ['login_days','breathing_sessions'])data[table]=(await database.prepare(`SELECT * FROM ${table} WHERE user_id=?`).bind(user).all()).results;}if(!remoteReminders(env))data.releaseEmails=await emailSubscription(env,user,'GET');data.deletionEvidence=exportProof;data.deletionReceipts=(await database.prepare('SELECT owner_id,deleted_epoch,deleted_at FROM account_data_deletions WHERE owner_id=? ORDER BY deleted_epoch').bind(user).all()).results;data.workoutImports=(await database.prepare('SELECT i.* FROM workout_imports i JOIN workouts w ON w.id=i.workout_id WHERE w.user_id=?').bind(user).all()).results;data.competitiveDecisions=(await database.prepare('SELECT d.* FROM competitive_decisions d JOIN workouts w ON w.id=d.workout_id WHERE w.user_id=?').bind(user).all()).results;if((await inspectAccountDataEpoch(database,user)).currentDataEpoch!==exportProof.currentDataEpoch)throw Object.assign(Error('Account data changed.'),{status:409,code:'account_epoch_changed'});return json(data);}
  if(p==='/api/account'&&method==='DELETE'){
   const target=request.headers.get('X-Target-Account');
   if(target===null)throw Object.assign(Error('Refresh account details before deleting.'),{status:428,code:'account_target_required'});
   if(target!==user)throw Object.assign(Error('Account changed. Refresh before deleting.'),{status:409,code:'target_mismatch'});
   const v=await body(request);
   if(!Object.hasOwn(v,'expectedDataEpoch'))throw Object.assign(Error('Refresh account details before deleting.'),{status:428,code:'account_epoch_required'});
   if(!Number.isSafeInteger(v.expectedDataEpoch)||v.expectedDataEpoch<1||v.expectedDataEpoch>=Number.MAX_SAFE_INTEGER||Object.keys(v).some(key=>!['confirm','expectedDataEpoch'].includes(key)))throw Object.assign(Error('Invalid account deletion request.'),{status:422,code:'invalid_account_epoch'});
   if(v.confirm!=='DELETE')fail('Type DELETE to clear your Coach data.');
   let proof;
   try{proof=await deleteAccountDataAtEpoch(database,{ownerId:user,expectedDataEpoch:v.expectedDataEpoch,now,deletions:[database.prepare('DELETE FROM system WHERE key=?').bind(trainingReadinessKey(user)),...(env.REMINDER_INTERNAL===true?[]:deleteScoreboard(database,user)),database.prepare('DELETE FROM deliveries WHERE endpoint IN (SELECT endpoint FROM subscriptions WHERE user_id=?) OR reminder_id IN (SELECT id FROM reminders WHERE user_id=?)').bind(user,user),database.prepare('DELETE FROM coach_army_djscratch_challenges WHERE account_id=?').bind(user),database.prepare('DELETE FROM coach_army_bindings WHERE account_id=?').bind(user),database.prepare('DELETE FROM coach_army_completion_outbox WHERE account_id=?').bind(user),database.prepare('DELETE FROM coach_army_run_events WHERE account_id=?').bind(user),database.prepare('DELETE FROM coach_army_runs WHERE account_id=?').bind(user),...['test:','training:','coach-plan:'].map(prefix=>database.prepare('DELETE FROM system WHERE key=?').bind(prefix+user)),database.prepare('DELETE FROM system WHERE substr(key,1,length(key)-10)=?').bind('notify-budget:'+user+':'),...['profiles','onboarding','workouts','meals','reminders','goals','war_room_arsenals','subscriptions','release_subscribers','release_deliveries','login_days','breathing_sessions','account_entitlements','account_pack_entitlements','coach_army_completions'].filter(t=>!['onboarding','login_days','breathing_sessions'].includes(t)||env.REMINDER_INTERNAL!==true).map(t=>database.prepare(`DELETE FROM ${t} WHERE user_id=?`).bind(user)),...(remoteReminders(env)?[queueReminderReconciliation(database,user,v.expectedDataEpoch+1,now)]:[])]});}
   catch(error){if(error instanceof AccountDataEpochError&&error.code==='epoch-mismatch')throw Object.assign(Error('Account data changed. Refresh before deleting.'),{status:409,code:'target_epoch_mismatch'});throw error;}
   const remote=remoteReminders(env)?await attemptReminderReconciliation(env,user,proof):{status:'not_configured'};
   return json({deleted:!proof.alreadyDeleted,deletedEpoch:v.expectedDataEpoch,...proof,dataEpoch:proof.currentDataEpoch,deletionEvidence:{ownerId:proof.ownerId,currentDataEpoch:proof.currentDataEpoch,deletedThroughEpoch:proof.deletedThroughEpoch},remote});
  }
 return json({error:'Not found.'},404);
}
export default {
 async fetch(request,env,ctx){try{const url=new URL(request.url);if(url.pathname==='/repair-coach')return new Response(RECOVERY_HTML,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});if(url.pathname.startsWith('/api/'))return await api(request,env,ctx);if(url.pathname==='/health'){let reminders=null;if(remoteReminders(env)){try{const status=await reminderService(env,'health','/internal/status');reminders={available:true,configured:status.configured,schedulerActive:status.schedulerActive};}catch{reminders={available:false,configured:false,schedulerActive:false};}}return json({ok:true,app:'MYR5 Coach',reminders});}if(url.pathname==='/')return Response.redirect(new URL('/pose.html',url),302);if(env.ASSETS)return env.ASSETS.fetch(request);return new Response('Not found',{status:404});}catch(e){if(e.code==='target_epoch_mismatch'&&!e.status)e.status=409;if(!e.status)console.error('Coach request failed',e.message);return json({error:e.status?e.message:'Could not complete this request. Please try again.',...(e.status&&e.code?{code:e.code}:{})},e.status||500);}},
 async scheduled(event,env,ctx){if(!remoteReminders(env))ctx.waitUntil(runReminders(env));ctx.waitUntil(deliverCoachArmyOutbox(db(env),env));}
};

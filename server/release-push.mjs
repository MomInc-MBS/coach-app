import {db} from './db.mjs';
import {sendPush} from './push.mjs';
import {epochFencedBatch} from './remote-epochs.mjs';
const stale=error=>['target_epoch_mismatch','stale_delivery'].includes(error?.code);
export async function runReleasePush(env,now=Date.now()){
 if(!env.RELEASE_ORIGIN||!env.VAPID_PUBLIC_KEY||!env.VAPID_PRIVATE_KEY)return {sent:0,failed:0,configured:false};
 const startedAt=Date.now(),origin=new URL(env.RELEASE_ORIGIN);
 if(origin.protocol!=='https:'||origin.username||origin.password)throw Error('Invalid release origin.');
 const response=await fetch(new URL('/api/releases/current',origin).href,{redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Could not check the published Coach release.');
 const release=await response.json();if(typeof release?.id!=='string'||!/^[-a-zA-Z0-9_.]{1,200}$/.test(release.id)||typeof release.title!=='string'||!release.title.trim())throw Error('Invalid published Coach release.');
 const database=db(env),retryBefore=now-120000;
 const rows=(await database.prepare("SELECT s.endpoint,s.user_id,s.data,s.created_at,COALESCE(e.epoch,1) AS data_epoch FROM subscriptions s LEFT JOIN account_data_epochs e ON e.owner_id=s.user_id LEFT JOIN release_push_deliveries d ON d.endpoint=s.endpoint AND d.release_id=? WHERE d.endpoint IS NULL OR (d.status!='sent' AND d.updated_at<?) ORDER BY s.created_at,s.endpoint LIMIT 50").bind(release.id,retryBefore).all()).results;
 let sent=0,failed=0;
 for(const row of rows){
  const claimAt=now+Date.now()-startedAt,commit=statements=>epochFencedBatch(database,{ownerId:row.user_id,expectedDataEpoch:row.data_epoch,now:claimAt,statements});
  let claim;
  try{claim=(await commit([database.prepare("INSERT INTO release_push_deliveries(endpoint,release_id,status,updated_at) SELECT endpoint,?,'sending',? FROM subscriptions WHERE endpoint=? AND user_id=? AND data=? AND created_at=? ON CONFLICT(endpoint,release_id) DO UPDATE SET status='sending',updated_at=excluded.updated_at WHERE release_push_deliveries.status!='sent' AND release_push_deliveries.updated_at<? RETURNING endpoint").bind(release.id,claimAt,row.endpoint,row.user_id,row.data,row.created_at,claimAt-120000)]))[0].results?.[0];}
  catch(error){if(stale(error))continue;throw error;}
  if(!claim)continue;
  let deliveryStatus='sent';
  try{
   await sendPush(env,JSON.parse(row.data),{kind:'app-update',title:'Coach update ready to download',body:'A new version of MYR5 Coach is ready. Tap to download the update.',tag:'myr5-update-'+release.id,url:'/pose.html?panel=install&update='+encodeURIComponent(release.id)},{ttl:86400,ownerId:row.user_id,dataEpoch:row.data_epoch,subscriptionData:row.data,subscriptionCreatedAt:row.created_at});sent++;
  }catch(error){if(stale(error))continue;failed++;deliveryStatus='failed';}
  try{await commit([database.prepare('UPDATE release_push_deliveries SET status=?,updated_at=? WHERE endpoint=? AND release_id=? AND updated_at=? AND EXISTS(SELECT 1 FROM subscriptions WHERE endpoint=? AND user_id=? AND data=? AND created_at=?)').bind(deliveryStatus,claimAt,row.endpoint,release.id,claimAt,row.endpoint,row.user_id,row.data,row.created_at)]);}
  catch(error){if(!stale(error))throw error;}
 }
 await database.prepare('DELETE FROM release_push_deliveries WHERE release_id!=? AND updated_at<?').bind(release.id,now-90*86400000).run();
 const result={sent,failed,configured:true,releaseId:release.id};await database.prepare("INSERT INTO system(key,value) VALUES('release_push_tick',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify({...result,checkedAt:now})).run();return result;
}

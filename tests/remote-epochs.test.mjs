import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {Miniflare} from 'miniflare';
import {epochFencedBatch,reconcileRemoteEpoch} from '../server/remote-epochs.mjs';
import {deleteAccountDataAtEpoch,inspectAccountDataEpoch} from '../server/account-data-epochs.mjs';
const product=new URL('../',import.meta.url);
let mf,primary,remote;
before(async()=>{
 mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['PRIMARY','REMOTE']});
 primary=await mf.getD1Database('PRIMARY');remote=await mf.getD1Database('REMOTE');
 for(const name of (await readdir(new URL('drizzle/',product))).filter(name=>name.endsWith('.sql')).sort()){
  const parts=(await readFile(new URL('drizzle/'+name,product),'utf8')).split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean);
  for(const db of [primary,remote])await db.batch(parts.map(s=>db.prepare(s)));
 }
 await remote.prepare('CREATE TABLE failure_probe(value TEXT NOT NULL)').run();
});
after(()=>mf?.dispose());
const training=(db,owner,value)=>db.prepare('INSERT INTO system(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('training:'+owner,value);
const reminders=(db,owner,id)=>db.prepare("INSERT INTO reminders(id,user_id,kind,time,timezone,enabled,quiet_start,quiet_end) VALUES(?,?,'water','09:00','UTC',1,'22:00','07:00') ON CONFLICT(id) DO UPDATE SET time=excluded.time WHERE reminders.user_id=excluded.user_id").bind(id,owner);
const deletes=(db,owner)=>[db.prepare('DELETE FROM reminders WHERE user_id=?').bind(owner),db.prepare('DELETE FROM system WHERE key=?').bind('training:'+owner)];
const read=async(db,owner)=>(await db.prepare('SELECT value FROM system WHERE key=?').bind('training:'+owner).first())?.value??null;
const write=(owner,epoch,value,statements=[training(remote,owner,value)])=>epochFencedBatch(remote,{ownerId:owner,expectedDataEpoch:epoch,now:1,statements});
const reconcile=(owner,epoch,deletions=deletes(remote,owner))=>reconcileRemoteEpoch(remote,{ownerId:owner,currentDataEpoch:epoch,deletedThroughEpoch:epoch-1,now:2,deletions});

test('epoch guard rejects stale entire mixed-mutation batch after remote deletion fence',async()=>{
 await write('a',1,'old',[training(remote,'a','old'),reminders(remote,'a','old-reminder')]);await reconcile('a',2);
 await assert.rejects(write('a',1,'late',[training(remote,'a','late'),reminders(remote,'a','late-reminder')]),{code:'target_epoch_mismatch'});
 assert.equal(await read(remote,'a'),null);assert.equal((await remote.prepare("SELECT COUNT(*) n FROM reminders WHERE user_id='a'").first()).n,0);
 await write('a',2,'new');assert.equal(await read(remote,'a'),'new');
});
test('old deletion replay cannot erase newer remote data; skipped primary epochs reconcile coherently',async()=>{
 await reconcile('a',5);await write('a',5,'epoch5');
 assert.equal((await reconcile('a',2)).reconciled,false);assert.equal(await read(remote,'a'),'epoch5');
 assert.deepEqual(await inspectAccountDataEpoch(remote,'a'),{ownerId:'a',currentDataEpoch:5,deletedThroughEpoch:4});
});
test('stale DELETE-shaped ordinary mutation cannot erase current generation',async()=>{
 await write('b',1,'old');await reconcile('b',2);await write('b',2,'keep');
 await assert.rejects(write('b',1,null,deletes(remote,'b')),{code:'target_epoch_mismatch'});assert.equal(await read(remote,'b'),'keep');
});
test('twenty concurrent proof retries fence once and other owners remain unchanged',async()=>{
 await write('race',1,'old');await write('other',1,'keep');
 const results=await Promise.all(Array.from({length:20},()=>reconcile('race',3)));
 assert.equal(results.filter(r=>r.reconciled).length,1);assert.equal(await read(remote,'race'),null);assert.equal(await read(remote,'other'),'keep');
});
test('reconciliation deletion failure rolls back owner data, generation and receipt',async()=>{
 await write('rollback',1,'keep');
 await assert.rejects(reconcile('rollback',2,[...deletes(remote,'rollback'),remote.prepare('INSERT INTO failure_probe(value) VALUES(NULL)')]));
 assert.equal(await read(remote,'rollback'),'keep');assert.deepEqual(await inspectAccountDataEpoch(remote,'rollback'),{ownerId:'rollback',currentDataEpoch:1,deletedThroughEpoch:0});
});
test('both serial orders remove pre-fence writes and reject post-fence stale writes',async()=>{
 for(const first of [true,false]){
  const owner='serial-'+first;if(first)await write(owner,1,'before');
  await reconcile(owner,2);await assert.rejects(write(owner,1,'after'),{code:'target_epoch_mismatch'});assert.equal(await read(remote,owner),null);
 }
});
test('captured old source computation cannot be relabeled with new remote generation',async()=>{
 const capturedEpoch=1,computedOldTraining='old-derived-training';await reconcile('captured',2);
 await assert.rejects(write('captured',capturedEpoch,computedOldTraining),{code:'target_epoch_mismatch'});assert.equal(await read(remote,'captured'),null);
});
test('primary deletion persists remote work before network, and old acknowledgment cannot erase newer marker',async()=>{
 const owner='queue',key='remote-deletion:'+owner;
 await primary.prepare("INSERT INTO profiles(user_id,data,revision,updated_at) VALUES(?,'{}',0,1)").bind(owner).run();
 const queued=(epoch)=>primary.prepare('INSERT INTO system(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,JSON.stringify({ownerId:owner,currentDataEpoch:epoch,deletedThroughEpoch:epoch-1}));
 const proof=await deleteAccountDataAtEpoch(primary,{ownerId:owner,expectedDataEpoch:1,now:2,deletions:[primary.prepare('DELETE FROM profiles WHERE user_id=?').bind(owner),queued(2)]});
 assert.equal(proof.currentDataEpoch,2);assert(await primary.prepare('SELECT * FROM system WHERE key=?').bind(key).first());
 // Remote outage: primary outcome remains committed and queued, never falsely rolled back.
 assert.equal(await primary.prepare('SELECT * FROM profiles WHERE user_id=?').bind(owner).first(),null);
 await deleteAccountDataAtEpoch(primary,{ownerId:owner,expectedDataEpoch:2,now:3,deletions:[queued(3)]});
 await primary.prepare("DELETE FROM system WHERE key=? AND json_extract(value,'$.currentDataEpoch')<=?").bind(key,2).run();
 assert.equal(JSON.parse((await primary.prepare('SELECT value FROM system WHERE key=?').bind(key).first()).value).currentDataEpoch,3);
});

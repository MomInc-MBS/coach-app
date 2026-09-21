import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {Miniflare} from 'miniflare';
import {AccountDataEpochError,inspectAccountDataEpoch,readAccountDataEpoch,deleteAccountDataAtEpoch} from '../server/account-data-epochs.mjs';
let mf,db;
before(async()=>{
 mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB']});
 db=await mf.getD1Database('DB');
 for(const name of (await readdir('drizzle')).filter(name=>name.endsWith('.sql')).sort()){
  const statements=(await readFile('drizzle/'+name,'utf8')).split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean);
  await db.batch(statements.map(s=>db.prepare(s)));
 }
 await db.batch([
  db.prepare('CREATE TABLE protected_data(owner_id TEXT NOT NULL,marker TEXT NOT NULL)'),
  db.prepare('CREATE TABLE failure_probe(value TEXT NOT NULL)'),
  db.prepare('CREATE TABLE guarded_probe(owner_id TEXT NOT NULL,marker TEXT NOT NULL)'),
 ]);
});
after(()=>mf?.dispose());
const insert=(ownerId,marker)=>db.prepare('INSERT INTO protected_data(owner_id,marker) VALUES(?,?)').bind(ownerId,marker);
const remove=ownerId=>db.prepare('DELETE FROM protected_data WHERE owner_id=?').bind(ownerId);
const count=async ownerId=>(await db.prepare('SELECT COUNT(*) AS n FROM protected_data WHERE owner_id=?').bind(ownerId).first()).n;
const receiptCount=async ownerId=>(await db.prepare('SELECT COUNT(*) AS n FROM account_data_deletions WHERE owner_id=?').bind(ownerId).first()).n;
const deletion=(ownerId,expectedDataEpoch=1,deletions=[remove(ownerId)])=>deleteAccountDataAtEpoch(db,{ownerId,expectedDataEpoch,now:100,deletions});
const isCode=code=>error=>error instanceof AccountDataEpochError&&error.code===code;

test('the exact migration chain supports implicit epoch 1 and explicit provision',async()=>{
 assert.deepEqual(await inspectAccountDataEpoch(db,'fresh'),{ownerId:'fresh',currentDataEpoch:1,deletedThroughEpoch:0});
 assert.equal(await db.prepare('SELECT * FROM account_data_epochs WHERE owner_id=?').bind('fresh').first(),null);
 assert.deepEqual(await readAccountDataEpoch(db,'fresh',10),{ownerId:'fresh',currentDataEpoch:1,deletedThroughEpoch:0});
 assert.equal(await receiptCount('fresh'),0);
});
test('first deletion of an unseen owner advances epoch 1 to 2 and retains a receipt',async()=>{
 await insert('unseen','old').run();
 assert.deepEqual(await deletion('unseen'),{ownerId:'unseen',currentDataEpoch:2,deletedThroughEpoch:1,alreadyDeleted:false});
 assert.equal(await count('unseen'),0);assert.equal(await receiptCount('unseen'),1);
});
test('twenty concurrent same-epoch deletions commit once',async()=>{
 await insert('race','old').run();
 const replies=await Promise.all(Array.from({length:20},()=>deletion('race')));
 assert.equal(replies.filter(result=>!result.alreadyDeleted).length,1);
 assert(replies.every(result=>result.currentDataEpoch===2&&result.deletedThroughEpoch===1));
 assert.equal(await receiptCount('race'),1);assert.equal(await count('race'),0);
});
test('lost-response retry returns evidence without deleting newer data',async()=>{
 await insert('retry','old').run();await deletion('retry');await insert('retry','new generation').run();
 assert.deepEqual(await deletion('retry'),{ownerId:'retry',currentDataEpoch:2,deletedThroughEpoch:1,alreadyDeleted:true});
 assert.equal(await count('retry'),1);assert.equal(await receiptCount('retry'),1);
 await deletion('retry',2);
 assert.deepEqual(await deletion('retry'),{ownerId:'retry',currentDataEpoch:3,deletedThroughEpoch:2,alreadyDeleted:true});
 assert.equal(await receiptCount('retry'),2);
});
test('runtime constraint failure after data deletion rolls back data, epoch and receipt',async()=>{
 for(const provisioned of [false,true]){
  const id=provisioned?'rollback-existing':'rollback-new';
  if(provisioned)await readAccountDataEpoch(db,id,10);
  await insert(id,'keep').run();
  await assert.rejects(()=>deletion(id,1,[remove(id),db.prepare('INSERT INTO failure_probe(value) VALUES(NULL)')]));
  assert.equal(await count(id),1);assert.equal(await receiptCount(id),0);
  const row=await db.prepare('SELECT epoch FROM account_data_epochs WHERE owner_id=?').bind(id).first();
  assert.equal(row?.epoch??null,provisioned?1:null);
 }
});
test('receipt guard rejects stale generation inside batch even after a stale preflight',async()=>{
 await readAccountDataEpoch(db,'stale-preflight',10);
 let held=true;
 const wrapper={prepare:sql=>{
  const statement=db.prepare(sql);
  if(!sql.startsWith('SELECT e.epoch'))return statement;
  return {bind:(...args)=>{const bound=statement.bind(...args);return {first:async()=>{
   const result=await bound.first();
   if(held){held=false;await deletion('stale-preflight');await insert('stale-preflight','new').run();}
   return result;
  }};}};
 },batch:statements=>db.batch(statements)};
 const result=await deleteAccountDataAtEpoch(wrapper,{ownerId:'stale-preflight',expectedDataEpoch:1,now:11,deletions:[remove('stale-preflight')]});
 assert.equal(result.alreadyDeleted,true);assert.equal(result.currentDataEpoch,2);
 assert.equal(await count('stale-preflight'),1);assert.equal(await receiptCount('stale-preflight'),1);
});
test('both serial orders of an epoch-guarded write versus deletion prevent resurrection',async()=>{
 const write=(ownerId,expected)=>db.prepare('INSERT INTO guarded_probe(owner_id,marker) SELECT ?,? WHERE (SELECT epoch FROM account_data_epochs WHERE owner_id=?)=?').bind(ownerId,'probe',ownerId,expected);
 const remaining=async id=>(await db.prepare('SELECT COUNT(*) AS n FROM guarded_probe WHERE owner_id=?').bind(id).first()).n;
 await readAccountDataEpoch(db,'write-first',10);await write('write-first',1).run();
 await deletion('write-first',1,[db.prepare('DELETE FROM guarded_probe WHERE owner_id=?').bind('write-first')]);
 assert.equal(await remaining('write-first'),0);
 await deletion('delete-first',1,[]);await write('delete-first',1).run();
 assert.equal(await remaining('delete-first'),0);
 await write('delete-first',2).run();assert.equal(await remaining('delete-first'),1);
});
test('invalid epochs, future generations and overflow fail without provisioning data',async()=>{
 for(const expectedDataEpoch of [0,-1,1.5,Number.MAX_SAFE_INTEGER+1])await assert.rejects(()=>deletion('invalid',expectedDataEpoch,[]),isCode('invalid-epoch'));
 await assert.rejects(()=>deletion('invalid',Number.MAX_SAFE_INTEGER,[]),isCode('epoch-overflow'));
 await assert.rejects(()=>deletion('invalid',2,[]),isCode('epoch-mismatch'));
 assert.equal(await db.prepare('SELECT * FROM account_data_epochs WHERE owner_id=?').bind('invalid').first(),null);
});
test('only the requested owner is deleted',async()=>{
 await db.batch([insert('a','remove'),insert('b','keep')]);await deletion('a');
 assert.equal(await count('a'),0);assert.equal(await count('b'),1);assert.equal(await receiptCount('b'),0);
});
test('epoch and deletion evidence are read in a single SQL snapshot',async()=>{
 await deletion('snapshot');
 let reads=0;const wrapped={prepare:sql=>{reads++;assert(sql.startsWith('SELECT e.epoch'));return db.prepare(sql);}};
 assert.deepEqual(await inspectAccountDataEpoch(wrapped,'snapshot'),{ownerId:'snapshot',currentDataEpoch:2,deletedThroughEpoch:1});
 assert.equal(reads,1);
});
test('constraint checks and receipt consistency reject corrupt generations',async()=>{
 await assert.rejects(()=>db.prepare('INSERT INTO account_data_epochs(owner_id,epoch,updated_at) VALUES(?,1.5,0)').bind('fractional').run());
 await db.prepare('INSERT INTO account_data_epochs(owner_id,epoch,updated_at) VALUES(?,2,0)').bind('corrupt').run();
 await assert.rejects(()=>inspectAccountDataEpoch(db,'corrupt'),isCode('epoch-history-corrupt'));
});

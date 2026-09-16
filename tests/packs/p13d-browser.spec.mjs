// Browser proof uses the real pod owner module, not a success-only workout mock.
import {test, expect} from 'playwright/test';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'../..'); let server,base;
test.use({channel:'msedge'});
test.beforeAll(async()=>{server=http.createServer(async(req,res)=>{const path=new URL(req.url,'http://local').pathname;if(path==='/blank.html')return res.end('<!doctype html><title>P13D</title>');if(path.startsWith('/packs/')||path.startsWith('/pod/'))try{res.writeHead(200,{'Content-Type':'text/javascript'});return res.end(await readFile(resolve(root,path.slice(1))));}catch{}res.writeHead(404);res.end();});await new Promise(done=>server.listen(0,'127.0.0.1',done));base=`http://127.0.0.1:${server.address().port}`;});
test.afterAll(()=>new Promise(done=>server.close(done)));

test('real pod owner leaves activation pending while tracking and leases idle through activation',async({page})=>{
 await page.goto(base+'/blank.html'); const state=await page.evaluate(async()=>{
  const {WorkoutSessionOwner}=await import('/pod/workout-session-owner.mjs'); const {existingWorkoutIdleAdapter}=await import('/packs/workout-idle-adapter.mjs');
  const store={data:new Map(),getItem(k){return this.data.get(k)??null},setItem(k,v){this.data.set(k,String(v))}}; const owner=new WorkoutSessionOwner({storage:store}), adapter=existingWorkoutIdleAdapter({owner});
  owner.start(); const tracking=await adapter.saveAndConfirmIdle(); owner.stop(); const safe=await adapter.saveAndConfirmIdle(); const blockedDuringLease=owner.start()===false; safe.release(); const startsAfterRelease=owner.start()===true;
  return {tracking,saved:safe.saved,local:safe.local,accountSynced:safe.accountSynced,blockedDuringLease,startsAfterRelease,phase:owner.snapshot().phase};
 });
 expect(state).toMatchObject({tracking:{saved:false,idle:false},saved:true,local:true,accountSynced:false,blockedDuringLease:true,startsAfterRelease:true,phase:'active'});
});

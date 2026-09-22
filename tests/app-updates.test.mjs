import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {safeToUpdate,releaseNotice,requestActivation} from '../update-policy.mjs';
import {releaseBuildId,prepareReleaseBuild} from '../scripts/release-build.mjs';

test('automatic installation waits for activity, forms, workouts, rest, visibility and connection',()=>{
 const idle={now:30000,lastInteraction:0};assert.equal(safeToUpdate(idle),true);
 for(const key of ['tracking','rest','dialog','editing','hidden'])assert.equal(safeToUpdate({...idle,[key]:true}),false,key);
 assert.equal(safeToUpdate({...idle,online:false}),false);assert.equal(safeToUpdate({...idle,lastInteraction:20000}),false);assert.equal(safeToUpdate({...idle,lastInteraction:20000,automatic:false}),true);
});
test('release notices persist dismissal but show the next build and tolerate blocked storage',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};const first=releaseNotice(storage,'a');assert.equal(first.visible,true);first.dismiss();assert.equal(releaseNotice(storage,'a').visible,false);assert.equal(releaseNotice(storage,'b').visible,true);const blocked=releaseNotice(null,'a');blocked.dismiss();assert.equal(blocked.visible,false);
});
test('activation requires worker approval and times out without forcing an update',async()=>{
 const accepted={postMessage(_,[port]){port.postMessage({activated:true});port.close();}};await requestActivation(accepted);
 await assert.rejects(requestActivation({postMessage(_,[port]){port.postMessage({activated:false});port.close();}}),/another session/);
 await assert.rejects(requestActivation({postMessage(){}},{timeout:10}),/retry automatically/);
});
test('every changed app build gets an update identity without manually editing release notes',async()=>{
 const root=await mkdtemp(join(tmpdir(),'coach-release-'));
 try{await writeFile(join(root,'app.mjs'),'one');const a=await prepareReleaseBuild(root);assert.equal(await releaseBuildId(root),a);await writeFile(join(root,'app.mjs'),'two');assert.notEqual(await releaseBuildId(root),a);}finally{assert.equal(dirname(resolve(root)),resolve(tmpdir()));assert.ok(basename(root).startsWith('coach-release-'));await rm(root,{recursive:true,force:true});}
});

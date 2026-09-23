import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {join,resolve,dirname,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {deploymentSize} from '../scripts/deployment-size.mjs';

test('deployment budget includes server/hidden metadata and tar overhead',async()=>{
 const root=await mkdtemp(join(tmpdir(),'coach-archive-'));
 try{
  for(const folder of ['client','server','.openai/drizzle'])await mkdir(join(root,folder),{recursive:true});
  for(const path of ['client/index.html','server/index.js','.openai/hosting.json','.openai/drizzle/0000.sql'])await writeFile(join(root,path),'hello');
  const size=await deploymentSize(root);
  assert.equal(size.files,4);assert.equal(size.payloadBytes,20);assert(size.tarBytes>size.payloadBytes+1024,'archive headers and padding are part of the budget');
  await assert.rejects(deploymentSize(root,{limit:size.tarBytes}),/no headroom/);
 }finally{assert.equal(dirname(resolve(root)),resolve(tmpdir()));assert(basename(root).startsWith('coach-archive-'));await rm(root,{recursive:true,force:true});}
});

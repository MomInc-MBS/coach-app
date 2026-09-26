import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {join,resolve,dirname,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {deploymentSize} from '../scripts/deployment-size.mjs';

test('deployment check counts every dist file and enforces Workers file limits',async()=>{
 const root=await mkdtemp(join(tmpdir(),'coach-archive-'));
 try{
  for(const folder of ['client','server','.openai/drizzle'])await mkdir(join(root,folder),{recursive:true});
  for(const path of ['client/index.html','server/index.js','.openai/hosting.json','.openai/drizzle/0000.sql'])await writeFile(join(root,path),'hello');
  await writeFile(join(root,'client/big.glb'),'0123456789');
  const size=await deploymentSize(root);
  assert.equal(size.files,5);assert.equal(size.payloadBytes,30);assert.equal(size.largest.bytes,10);assert.equal(basename(size.largest.path),'big.glb');
  await assert.rejects(deploymentSize(root,{fileLimit:4}),/Too many files/);
  await assert.rejects(deploymentSize(root,{fileBytes:9}),/File too large/);
 }finally{assert.equal(dirname(resolve(root)),resolve(tmpdir()));assert(basename(root).startsWith('coach-archive-'));await rm(root,{recursive:true,force:true});}
});

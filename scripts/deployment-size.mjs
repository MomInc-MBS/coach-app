import {readdir,stat} from 'node:fs/promises';
import {resolve,dirname,basename,join} from 'node:path';
import {spawn} from 'node:child_process';

export const SITES_ARCHIVE_LIMIT=268435456;

// Count the entire dist tree, including hidden deployment metadata, then stream
// a local tar to count its headers/padding as well. The supported Sites packager
// remains the final authority after its metadata normalization/staging step.
export async function deploymentSize(directory='dist',{limit=SITES_ARCHIVE_LIMIT}={}){
 const root=resolve(directory);let files=0,payloadBytes=0;
 async function walk(path){for(const entry of await readdir(path,{withFileTypes:true})){const child=join(path,entry.name);if(entry.isDirectory())await walk(child);else if(entry.isFile()){files++;payloadBytes+=(await stat(child)).size;}else throw new Error(`Non-regular deployment entry: ${child}`);}}
 await walk(root);
 const tarBytes=await new Promise((accept,reject)=>{
  const child=spawn('tar',['-cf','-',basename(root)],{cwd:dirname(root),windowsHide:true,stdio:['ignore','pipe','pipe']});let bytes=0,error='';
  child.stdout.on('data',chunk=>{bytes+=chunk.length;});child.stderr.on('data',chunk=>{error=(error+chunk).slice(-4096);});
  child.on('error',reject);child.on('close',code=>code===0?accept(bytes):reject(new Error(`Deployment tar measurement failed (${code}): ${error}`)));
 });
 const headroom=limit-tarBytes;
 if(headroom<=0)throw new Error(`Sites local tar has no headroom: ${tarBytes} / ${limit} bytes (${payloadBytes} file bytes).`);
 return {files,payloadBytes,tarBytes,headroom};
}

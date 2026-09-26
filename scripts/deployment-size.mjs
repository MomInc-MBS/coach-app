import {readdir,stat} from 'node:fs/promises';
import {join} from 'node:path';

// Cloudflare Workers static assets: 20,000 files per version (Free plan; Paid is 100,000)
// and 25 MiB per file. There is no total-size cap, unlike the old 256 MiB Sites archive.
export const WORKERS_FILE_LIMIT=20000,WORKERS_FILE_BYTES=25*1024*1024;

// Walk the whole dist tree (client assets plus the server bundle) after the build.
export async function deploymentSize(directory='dist',{fileLimit=WORKERS_FILE_LIMIT,fileBytes=WORKERS_FILE_BYTES}={}){
 let files=0,payloadBytes=0,largest={path:null,bytes:0};
 async function walk(path){for(const entry of await readdir(path,{withFileTypes:true})){const child=join(path,entry.name);if(entry.isDirectory())await walk(child);else if(entry.isFile()){const {size}=await stat(child);files++;payloadBytes+=size;if(size>largest.bytes)largest={path:child,bytes:size};}else throw new Error(`Non-regular deployment entry: ${child}`);}}
 await walk(directory);
 if(files>fileLimit)throw new Error(`Too many files for Workers: ${files} / ${fileLimit}.`);
 if(largest.bytes>fileBytes)throw new Error(`File too large for Workers: ${largest.path} is ${largest.bytes} / ${fileBytes} bytes.`);
 return {files,payloadBytes,largest};
}

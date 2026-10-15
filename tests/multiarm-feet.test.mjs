import test from 'node:test';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
test('grounded multiarm coach legs stay with their feet through skinning',async()=>{
 const entry=fileURLToPath(new URL('./multiarm-feet-integration.ts',import.meta.url)),out=fileURLToPath(new URL('./.multiarm-feet.integration.mjs',import.meta.url));
 try{await build({entryPoints:[entry],outfile:out,bundle:true,platform:'node',format:'esm',target:'node22',external:['three']});await import(pathToFileURL(out).href);}finally{await unlink(out).catch(()=>{});}
});

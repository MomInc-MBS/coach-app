import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlinkSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';

const bundle=fileURLToPath(new URL('./.body-owned-tail.integration.mjs',import.meta.url));
test('single-source slug and tail bases follow Body while authored arms remain',async()=>{
 await build({entryPoints:[fileURLToPath(new URL('./body-owned-tail-integration.ts',import.meta.url))],outfile:bundle,bundle:true,platform:'node',format:'esm',target:'node22',external:['three']});
 try{await import(pathToFileURL(bundle).href);assert.ok(true);}finally{try{unlinkSync(bundle);}catch{}}
});

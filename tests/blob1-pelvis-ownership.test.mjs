import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlinkSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';

const bundle=fileURLToPath(new URL('./.blob1-pelvis-integration.mjs',import.meta.url));
test('Blob1 pelvis moves to body without losing or freezing either lower foot',async()=>{
 await build({entryPoints:[fileURLToPath(new URL('./blob1-pelvis-integration.ts',import.meta.url))],outfile:bundle,bundle:true,platform:'node',format:'esm',target:'node22',external:['three']});
 try{await import(pathToFileURL(bundle).href);assert.ok(true);}finally{try{unlinkSync(bundle);}catch{}}
});

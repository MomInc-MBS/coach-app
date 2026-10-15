import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlinkSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';

const bundle=fileURLToPath(new URL('./.oliva-pelvis-integration.mjs',import.meta.url));
test('Oliva center bridge follows body while its two lateral legs keep moving',async()=>{
 await build({entryPoints:[fileURLToPath(new URL('./oliva-pelvis-integration.ts',import.meta.url))],outfile:bundle,bundle:true,platform:'node',format:'esm',target:'node22',external:['three']});
 try{await import(pathToFileURL(bundle).href);assert.ok(true);}finally{try{unlinkSync(bundle);}catch{}}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';

const bundle=fileURLToPath(new URL('./.pec-n0ld-two-arm.integration.mjs',import.meta.url));
test('Pec-n0ld preserves its mirrored lower arm and both arm pivots move',async t=>{
 await build({entryPoints:[fileURLToPath(new URL('./pec-n0ld-two-arm-integration.ts',import.meta.url))],outfile:bundle,bundle:true,platform:'node',format:'esm',target:'node22',external:['three']});
 t.after(async()=>{try{await unlink(bundle);}catch{}});
 await import(pathToFileURL(bundle).href);assert.ok(true);
});

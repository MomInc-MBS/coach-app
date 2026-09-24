import test from 'node:test';
import assert from 'node:assert/strict';
import {stat} from 'node:fs/promises';
import source from '../nutrition-data.mjs';

test('deployed nutrition rows exactly match the USDA source while freeing archive space',async t=>{
 const deployed=new URL('../dist/client/nutrition-data.mjs',import.meta.url);
 let packedSize;try{packedSize=(await stat(deployed)).size;}catch(error){if(error.code==='ENOENT'){t.skip('Run npm run build first.');return;}throw error;}
 const packed=(await import(deployed.href)).default;
 assert.deepStrictEqual(packed,source);
 assert.equal(source.length,8790);
 assert((await stat(new URL('../nutrition-data.mjs',import.meta.url))).size-packedSize>1_000_000,'the deploy copy saves at least 1 MB');
});

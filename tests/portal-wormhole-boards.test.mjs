import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const src=readFileSync(new URL('../modules/portal/portal.mjs',import.meta.url),'utf8');
const open="window.myr5Packs?.open?.('grimoire-'+id)";

test('every board texture keeps the colourful wormhole at 25% under its own material',()=>{
 assert(src.includes('c=mix(c,material(a,v,z,r,aa,c),.75);'));
 assert(!/\n c=material\(a,v,z,r,aa,c\);/.test(src),'a texture replaces the wormhole outright');
});

test('Downloads opens only for an explicit board pick, not a saved pick at start or sync',()=>{
 assert(src.includes(`if(explicit&&load===boardLoad)${open}`));
 assert.equal(src.split(open).length,2,'the Downloads open must be guarded, once');
 assert(src.includes('loadBoard(selected,{explicit:true})'));
 assert(/loadBoard\(initialBoardId\(\)\)/.test(src)&&/loadBoard\(stored\)\.catch/.test(src),'start and sync stay non-explicit');
});

test('board loads are serialised so a stale board never disposes over the next one',()=>{
 assert(src.includes('loadQueue.then(()=>load===boardLoad?loadBoardNow('));
});

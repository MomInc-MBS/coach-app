import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const src=readFileSync(new URL('../modules/portal/portal.mjs',import.meta.url),'utf8');
const open="window.myr5Packs?.open?.('grimoire-'+id)";

test('every board uses the original full-strength rainbow wormhole, no board material',()=>{
 assert(!/material\(a,v,z|tunnelMaterial|portal-tunnel-/.test(src));
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

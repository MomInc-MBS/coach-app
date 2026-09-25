import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const src=readFileSync(new URL('../modules/portal/portal.mjs',import.meta.url),'utf8');
test('every board uses the original full-strength rainbow wormhole, no board material',()=>{
 assert(!/material\(a,v,z|tunnelMaterial|portal-tunnel-/.test(src));
});

test('a missing board recovers to saved Quilt without opening Downloads',()=>{
 assert(!src.includes('window.myr5Packs?.open?.'), 'board failure never redirects to Downloads');
 assert(src.includes('store.set(BOARD_KEY,id)'), 'fallback persists Quilt for future cold starts');
 assert(src.includes("id='quilt';"), 'failed optional board selects Quilt');
 assert(src.includes('loadBoard(selected)'), 'the Board picker still retries on deliberate selection');
});

test('board loads are serialised so a stale board never disposes over the next one',()=>{
 assert(src.includes('loadQueue.then(()=>load===boardLoad?loadBoardNow('));
});


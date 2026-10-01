import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const src=readFileSync(new URL('../modules/portal/portal.mjs',import.meta.url),'utf8');
test('material palettes are selected per board while Quilt and all-rainbow remain intact',()=>{
 assert.match(src,/async function startTunnel\(ph,poly,color,all\)/);
 assert.match(src,/const capturedBoardId=boardId,capturedSignal=lifecycle\?\.signal/);
 assert.match(src,/const seq=all\|\|capturedBoardId==='quilt'\?ringColours\(color,all\)/);
 assert.match(src,/tunnelGL\(material\)/);
 assert.match(src,/programs:new Map\(\)/);
 const start=src.indexOf('export function ringColours'),end=src.indexOf('// Lens map',start),neons=['#ff5f1f','#b026ff','#ff10f0','#1f51ff','#39ff14','#ffff33'];
 const ringColours=vm.runInNewContext(src.slice(start,end).replace('export function','function')+';ringColours',{NEONS:neons});
 assert.deepEqual(Array.from(ringColours('#ff5f1f',true)),neons,'all-rainbow remains the original six colors');
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


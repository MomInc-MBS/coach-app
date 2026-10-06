import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('portal transitions select board palettes and optional materials while retaining Quilt and all-rainbow paths',async()=>{
 const src=await readFile(new URL('../modules/portal/portal.mjs',import.meta.url),'utf8');
 assert.match(src,/import\(`\.\/portal-tunnel-\$\{capturedBoardId\}\.mjs`\)/,'optional material import is keyed by the captured board');
 assert.match(src,/if\(cancelled\|\|!ph\.glass\.isConnected\|\|capturedSignal\?\.aborted\)return/,'a stopped or removed phase cannot attach after loading');
 assert.match(src,/all\|\|capturedBoardId==='quilt'\?ringColours\(color,all\)/,'Quilt and all-rainbow retain their original ring sequence');
 assert.match(src,/const materialLoads=new Map\(\)/,'material imports are cached');
 const css=await readFile(new URL('../modules/portal/portal.css',import.meta.url),'utf8');
 assert.match(css,/portal-palette select/,'palette choice remains a native accessible select');
});

test('Grimoire settings board chips have no visible Board title but keep the group aria-label',async()=>{
 const src=await readFile(new URL('../modules/portal/portal.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(src,/portal-board-label/);
 assert.match(src,/class="portal-board-chips" role="group" aria-label="Board">\$\{boardChipsHtml\(\)\}/);
});

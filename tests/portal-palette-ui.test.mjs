import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {paletteFor,paletteOptions} from '../modules/portal/portal-tunnel-palettes.mjs';

test('appearance sheet creates safe native palette options and restores a validated choice',async()=>{
 const source=await readFile(new URL('../modules/portal/portal.mjs',import.meta.url),'utf8');
 const start=source.indexOf('const htmlSafe='),end=source.indexOf('function updateBoardChips()',start);
 assert.ok(start>=0&&end>start,'production palette UI renderer is extractable');
 let saved='not-a-palette';
 const context={paletteOptions,paletteFor,store:{get:()=>saved},paletteKey:id=>'myr5.wormholePalette.'+id,boardId:'ice'};
 const render=vm.runInNewContext(`${source.slice(start,end)};paletteSelectHtml`,context);
 const html=render();
 assert.match(html,/label class="portal-palette"/);
 assert.match(html,/select aria-label="Wormhole palette" data-palette/);
 assert.match(html,/value="clear_crystal" selected/,'invalid stored presets display the catalogue default');
 assert.equal((html.match(/<option\b/g)||[]).length,paletteOptions('ice').length);
 assert.doesNotMatch(html,/<script|onerror=/i);
 context.boardId='quilt';
 assert.equal(render(),'', 'Quilt keeps its rainbow path without material choices');
});

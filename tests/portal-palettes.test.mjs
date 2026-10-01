import test from 'node:test';
import assert from 'node:assert/strict';
import {PALETTES,paletteFor,paletteOptions} from '../modules/portal/portal-tunnel-palettes.mjs';

test('material presets expose valid distinct palettes and usable labels',()=>{
 for(const board of ['wood','ice','cogs','grass','jelly']){
  const rows=paletteOptions(board);assert(rows.length>=3,board);
  assert.equal(new Set(rows.map(row=>row.id)).size,rows.length);
  for(const row of rows){assert(row.id&&row.label);assert(row.colors.length>=3&&row.colors.length<=6);assert(row.colors.every(color=>/^#[0-9a-f]{6}$/i.test(color)));assert.match(row.core,/^#[0-9a-f]{6}$/i);}
  assert.deepEqual(paletteFor(board,'missing'),rows[0]);assert.deepEqual(paletteFor(board,rows.at(-1).id),rows.at(-1));
 }
});
test('Quilt and unknown boards retain the rainbow path with no material preset',()=>{
 for(const board of ['quilt','unknown','__proto__']){assert.equal(paletteFor(board,'missing'),null);assert.deepEqual(paletteOptions(board),[]);}
});
test('returned presets cannot mutate the shared catalogue',()=>{
 const before=JSON.stringify(PALETTES),selected=paletteFor('wood');
 try{selected.colors[0]='#000000';selected.label='changed';}catch{}
 assert.equal(JSON.stringify(PALETTES),before);
 const options=paletteOptions('wood');try{options.pop();}catch{}
 assert.equal(JSON.stringify(PALETTES),before);
});

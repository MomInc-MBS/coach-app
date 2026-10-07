import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// L9 vault counter hooks: verify one-line bump calls are present at user-action points

const readFile=f=>readFileSync(new URL(f,import.meta.url),'utf8');

test('share hook is in apple-basic-share.mjs near shareAppleBasic result',()=>{
 const src=readFile('../apple-basic-share.mjs');
 assert.ok(src.includes("m.bump('share')"));
});

test('armie-read hook is in armie-inbox-ui.mjs after markRead',()=>{
 const src=readFile('../armie-inbox-ui.mjs');
 assert.ok(src.includes("m.bump('armie-read')"));
});

test('armie-ignored hook is in armie-inbox-ui.mjs when inbox opens',()=>{
 const src=readFile('../armie-inbox-ui.mjs');
 assert.ok(src.includes("m.bump('armie-ignored'"));
});

test('breathing-mode hook is in breathing.mjs startSession',()=>{
 const src=readFile('../breathing.mjs');
 assert.ok(src.includes("m.bump('breath-mode'"));
});

test('shape-opened hook is in portal.mjs runShape',()=>{
 const src=readFile('../modules/portal/portal.mjs');
 assert.ok(src.includes("m.bump('shape-opened'"));
});

test('grim-time hook tracks visible time in portal.mjs setVisible',()=>{
 const src=readFile('../modules/portal/portal.mjs');
 assert.ok(src.includes("m.addTime('grim-time'"));
});

test('gala-part hook is in war-room-gala.ts onPart',()=>{
 const src=readFile('../creature/source/war-room-gala.ts');
 assert.ok(src.includes("m.bump('gala-part')"));
});

test('gala-slot hook is in war-room-gala.ts for part/dye/weapon',()=>{
 const src=readFile('../creature/source/war-room-gala.ts');
 assert.ok(src.includes("m.bump('gala-slot'"));
});

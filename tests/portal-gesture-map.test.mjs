// Checks the gesture -> destination table in modules/portal/portal.mjs against Ian's 2026-09-22 map
// (see the task's gesture table). Import-only, no DOM: portal.mjs's top-level code never touches
// document/location at module-eval time (see tests/portal-production.test.mjs for the same premise).
import test from 'node:test';
import assert from 'node:assert/strict';
import {MENUS} from '../modules/portal/portal.mjs';
import {SHAPE_IDS} from '../modules/portal/portal-shapes.mjs';

test('gesture id -> destination label matches the map',()=>{
 const table={
  rect:'Workout', // Camera: starts the next workout in line
  oval:'Choose Workout', // workout/coach selection (fly-in not built yet)
  up:'Food',
  down:'Achievements',
  vdiamond:'Leaderboard',
  hdiamond:'Leaderboard', // one Diamond, two orientations
  x:'Character Editor',
  'line-lr':'Meditation',
  'line-rl':'Reminders',
  'line-down':'Settings',
  'line-up':'Share QR', // not built: opens the Menu sheet instead
 };
 for(const [id,label] of Object.entries(table))assert.equal(MENUS[id]?.label,label,id);
 // cross has no destination of its own: today's "everything falls in, Menu sheet opens" stays in portal.mjs's portalSequence.
 assert.equal(MENUS.cross,undefined);
});

test('both diamond orientations route to the exact same Leaderboard destination, and only one shows in the Menu sheet',()=>{
 assert.equal(MENUS.vdiamond.open,MENUS.hdiamond.open);
 assert.equal(MENUS.vdiamond.color,MENUS.hdiamond.color);
 assert.equal(MENUS.vdiamond.hidden,undefined);
 assert.equal(MENUS.hdiamond.hidden,true);
});

test('Share QR (line-up) opens the Menu sheet, not a dialog, and is hidden from the sheet grid itself',()=>{
 assert.equal(MENUS['line-up'].kind,'menu');
 assert.equal(MENUS['line-up'].hidden,true);
});

test('War Room/Arcade keeps its Menu-sheet row and lock, with no gesture of its own',()=>{
 assert.equal(MENUS.warroom.label,'Arcade / War Room');
 assert.equal(typeof MENUS.warroom.locked,'function');
 assert.equal(MENUS.warroom.lockedMessage,'Finish Coach setup to unlock the War Room.');
 assert(!SHAPE_IDS.includes('warroom'),'War Room has no recognizable shape');
});

test('every recognizable shape other than cross has a MENUS destination, and the Menu sheet rows follow the table order',()=>{
 for(const id of SHAPE_IDS)if(id!=='cross')assert(MENUS[id],`${id} should route somewhere`);
 const visibleRows=Object.entries(MENUS).filter(([,m])=>!m.hidden).map(([id])=>id);
 assert.deepEqual(visibleRows,['rect','oval','up','down','vdiamond','x','line-lr','line-rl','line-down','warroom']);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {MENUS} from '../modules/portal/portal.mjs';

test('active gesture destinations omit the retired Menu strokes',()=>{
 const labels={rect:'Workout',oval:'Choose Workout',up:'Food',down:'Achievements',vdiamond:'Leaderboard',hdiamond:'Spotify DJ',x:'War Room','line-lr':'Meditation','line-rl':'Reminders','line-down':'Settings'};
 assert.deepEqual(Object.keys(MENUS),Object.keys(labels));
 for(const [id,label] of Object.entries(labels))assert.equal(MENUS[id]?.label,label,id);
 for(const id of ['line-up','cross','ship','warroom'])assert.equal(MENUS[id],undefined,id);
 assert.equal(MENUS.oval.route,'select');
 assert.equal(MENUS.hdiamond.route,'spotify');
 assert.notEqual(MENUS.vdiamond,MENUS.hdiamond);
});
test('X enters the public War Room and saved actions retain server authorization',()=>{
 assert.equal(MENUS.x.route,'war-room');
 assert.equal(MENUS.x.kind,'nav');
 assert.equal(MENUS.x.locked,undefined);
});

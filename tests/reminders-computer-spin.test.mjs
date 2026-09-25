import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {spinBy} from '../modules/rooms/reminders-computer.mjs';

test('Reminders computer spin is clamped both ways',()=>{
 assert.equal(spinBy(0,10),10);
 assert.equal(spinBy(55,20),60);
 assert.equal(spinBy(-55,-20),-60);
});

test('Reminders computer spin composes with idle sway and stays off under reduced motion',async()=>{
 const css=await readFile(new URL('../modules/rooms/reminders-computer.css',import.meta.url),'utf8');
 assert.match(css,/rotateY\(calc\(var\(--sway\) \+ var\(--computer-spin,0deg\)\)\)/);
 assert.match(css,/touch-action:pan-y/);
 assert.match(css,/prefers-reduced-motion:reduce\)\{[^}]*::before\{animation:none\}/);
});

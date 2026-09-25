import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ROUTES} from '../modules/routes.mjs';

const shell=await readFile(new URL('../launch-shell.mjs',import.meta.url),'utf8');

test('the dock phone key opens the Reminders computer route',()=>{
 assert.match(shell,/class="dock-control dock-pod" data-route="reminders" aria-label="Reminders computer" title="Reminders computer"/);
 assert.equal(ROUTES.reminders.label,'Reminders');
 assert.equal(ROUTES.reminders.dialog,'#remindersPanel');
 assert.equal(typeof ROUTES.reminders.open,'function');
 assert.match(shell,/class="dock-portal" data-route="portal" aria-label="Portal or workout pod"/);
});

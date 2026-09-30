import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ROUTES} from '../modules/routes.mjs';

const shell=await readFile(new URL('../launch-shell.mjs',import.meta.url),'utf8');

test('the dock phone key opens the Reminders computer route',()=>{
 assert.match(shell,/class="dock-control dock-pod" data-panel="reminders" data-route="reminders" aria-label="Reminders computer" title="Reminders computer"/);
 assert.equal(ROUTES.reminders.label,'Reminders');
 assert.equal(ROUTES.reminders.dialog,'#remindersPanel');
 assert.equal(typeof ROUTES.reminders.open,'function');
 assert.match(shell,/class="dock-portal" data-route="portal" aria-label="Portal or workout pod"/);
});

test('the far-left dock key keeps the gear icon and class, but routes to the coach customizer',()=>{
 assert.match(shell,/class="dock-control dock-settings" data-route="customizeCoach" aria-label="Customize coach" title="Customize coach"/);
 assert.match(shell,/<circle cx="12" cy="12" r="3"\/><circle cx="12" cy="12" r="6\.5"\/><path d="M12 2v3M12 19v3M2 12h3M19 12h3/,'the gear SVG (two circles, eight spokes) is unchanged');
 assert.equal(ROUTES.customizeCoach.label,'Customize coach');
 assert.equal(typeof ROUTES.customizeCoach.open,'function');
 assert.equal(ROUTES.customizeCoach.nav,undefined,'not the plain nav that #customize uses (that lands on the public War Room)');
});

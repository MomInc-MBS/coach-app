import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {canEnterPublicRoute,coachArmyComplete,filterInitialPrecache,isOptionalPublicRoute} from '../public-access.mjs';
test('only the explicit authoritative Coach Army entitlement unlocks editors',()=>{
 assert.equal(coachArmyComplete({onboarding:{revision:1}}),false);
 assert.equal(coachArmyComplete({onboarding:{data:{entryRoute:'office'}}}),false);
 assert.equal(coachArmyComplete({onboarding:{data:{entryRoute:'games',armieCompleted:true}}}),false);
 assert.equal(coachArmyComplete({progress:{level:99,completedSets:999}}),false);
 assert.equal(coachArmyComplete({entitlements:{coachArmy:{status:'completed',completedAt:1700000000000}}}),true);
 assert.equal(coachArmyComplete({entitlements:{coachArmy:{status:'completed',completedAt:'1700000000000'}}}),false);
 assert.equal(coachArmyComplete(null),false);
});
test('public entry and functional routes stay available while optional routes are gated',()=>{for(const path of ['/pose.html','/pose.html?panel=reminders','/api/reminders','/signin.html'])assert.equal(canEnterPublicRoute(path.split('?')[0],false),true,path);for(const path of ['/war-room/','/handborne/index.html','/creature/index.html','/editor/character']){assert.equal(isOptionalPublicRoute(path),true,path);assert.equal(canEnterPublicRoute(path,false),false,path);assert.equal(canEnterPublicRoute(path,true),true,path);}});
test('initial precache omits optional editor and pocket assets but keeps shell assets',()=>{const files=['/pose.html','/launch-runtime.mjs','/handborne/index.html','/handborne/companion.mjs','/pocket-hardware.css','/food-worker.mjs','/war-room/index.html'];assert.deepEqual(filterInitialPrecache(files),['/pose.html','/launch-runtime.mjs','/food-worker.mjs']);});
test('editor documents defer their heavy bootstrap behind the public gate',()=>{
 for(const [file,asset] of [['creature/index.html','/creature/assets/editor.js'],['handborne/index.html','/handborne/assets/hand-entry-BrVOFL10.js']]){
  const html=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
  assert.match(html,/public-entry\.mjs/);assert.match(html,new RegExp('data-module="'+asset.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.doesNotMatch(html,new RegExp('<script type="module"[^>]+src="'+asset.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as access from '../public-access.mjs';
const {coachArmyComplete,filterInitialPrecache}=access;
test('coachArmyComplete reads only the explicit authoritative entitlement (War Room lane)',()=>{
 assert.equal(coachArmyComplete({onboarding:{revision:1}}),false);
 assert.equal(coachArmyComplete({onboarding:{data:{entryRoute:'office'}}}),false);
 assert.equal(coachArmyComplete({onboarding:{data:{entryRoute:'games',armieCompleted:true}}}),false);
 assert.equal(coachArmyComplete({progress:{level:99,completedSets:999}}),false);
 assert.equal(coachArmyComplete({entitlements:{coachArmy:{status:'completed',completedAt:1700000000000}}}),true);
 assert.equal(coachArmyComplete({entitlements:{coachArmy:{status:'completed',completedAt:'1700000000000'}}}),false);
 assert.equal(coachArmyComplete(null),false);
});
test('installed app has no second Coach Army gate on optional routes or materials',()=>{
 assert.equal(access.canEnterPublicRoute,undefined);assert.equal(access.isOptionalPublicRoute,undefined);
 const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
 assert.doesNotMatch(read('public-entry.mjs'),/coachArmy|\/api\/account|optional=/);
 for(const file of ['launch.mjs','coach-profile.mjs','app.mjs','pod/pod.mjs','modules/routes.mjs'])assert.doesNotMatch(read(file),/coachArmy|myr5VerifiedOptionalAccess|canEnterPublicRoute|Coach setup to unlock|Coach Army required|route\.locked/,file);
 assert.match(read('coach-profile.mjs'),/publicState=localPlan\?'unlocked':'locked'/,'sign-out with a device-local plan must not re-lock the public shell');
 assert.match(read('coach-profile.mjs'),/coachPlan=localPlan;document\.documentElement\.dataset\.publicState='unlocked'/,'applyLocalCoach unlocks');
 assert.doesNotMatch(read('pose.html'),/after Coach unlock/);assert.doesNotMatch(read('creature/source/cage.ts'),/Coach Army members/);
 assert.match(read('app.mjs'),/Sign in to download materials you own\./,'owned material packs still ask guests to sign in');
});
test('the main Coach page never applies the optional-access visual lock',()=>{
 const html=fs.readFileSync(new URL('../pose.html',import.meta.url),'utf8');
 assert.doesNotMatch(html,/locked-public\.css/);
 assert.doesNotMatch(html,/dataset\.publicState\s*=\s*['"]locked['"]/);
 assert.match(html,/data-access-route="\/creature\/index\.html"[^>]*>Customize/);
 assert.match(html,/id="coachMount" class="coach-mount"/);
});
test('initial precache omits optional editor and pocket assets but keeps shell assets',()=>{const files=['/pose.html','/launch-runtime.mjs','/handborne/index.html','/handborne/companion.mjs','/pocket-hardware.css','/food-worker.mjs','/war-room/index.html'];assert.deepEqual(filterInitialPrecache(files),['/pose.html','/launch-runtime.mjs','/food-worker.mjs']);});
test('editor documents defer their heavy bootstrap behind the public gate',()=>{
 for(const [file,asset] of [['handborne/index.html','/handborne/assets/hand-entry-BrVOFL10.js']]){
  const html=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
  assert.match(html,/public-entry\.mjs/);assert.match(html,new RegExp('data-module="'+asset.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.doesNotMatch(html,new RegExp('<script type="module"[^>]+src="'+asset.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 }
});

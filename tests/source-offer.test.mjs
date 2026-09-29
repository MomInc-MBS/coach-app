import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sourceOffer} from '../scripts/source-offer.mjs';

test('the complete AGPL source offer is shipped outside offline caches and linked from Settings',async()=>{
 const [build,shell,offline,pose]=await Promise.all(['../scripts/build.mjs','../launch-shell.mjs','../scripts/offline-assets.mjs','../pose.html'].map(path=>readFile(new URL(path,import.meta.url),'utf8')));
 assert.match(build,/writeFile\('dist\/client\/source\.json',sources\)/);
 assert.match(build,/dist\/client\/source\.json\.gz/);
 assert.match(shell,/href="\/source\.json\.gz" download/);
 assert.match(pose,/<a href="\/source\.json" download>Source code<\/a>/);
 assert.match(offline,/'source\.json','source\.json\.gz'/);
});

test('the source offer covers the authored build and server source and never secrets, plan, tests or build outputs',async()=>{
 const paths=Object.keys(await sourceOffer());
 for(const path of ['LICENSE','package.json','wrangler.jsonc','app.mjs','pose.html','server/worker.mjs','creature/source/phone.ts','handborne/source/app/companion.ts','modules/materials/material-config.mjs','drizzle/0000_new_cammi.sql','release-trust/public-build.json'])assert.ok(paths.includes(path),path);
 for(const path of paths)assert.doesNotMatch(path,/^(plan|tests|dist|node_modules)\/|\/assets\/|(^|\/)\.|\.dpapi$|secret|^(app-runtime|launch-runtime|local-coach-runtime)\.mjs$|^war-room\/gala-bay\.js$|^handborne\/companion\.mjs$/);
});

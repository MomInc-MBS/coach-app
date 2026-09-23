import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('the complete AGPL source offer is shipped as a compact download outside offline caches',async()=>{
 const [build,shell,offline]=await Promise.all([
  readFile(new URL('../scripts/build.mjs',import.meta.url),'utf8'),
  readFile(new URL('../launch-shell.mjs',import.meta.url),'utf8'),
  readFile(new URL('../scripts/offline-assets.mjs',import.meta.url),'utf8'),
 ]);
 assert.match(build,/gzipSync\(JSON\.stringify\(sources\),\{level:9\}\)/);
 assert.match(build,/unlink\('dist\/client\/source\.json'\)/);
 assert.match(build,/dist\/client\/source\.json\.gz/);
 assert.match(shell,/href="\/source\.json\.gz" download/);
 assert.match(offline,/'source\.json\.gz'/);
});

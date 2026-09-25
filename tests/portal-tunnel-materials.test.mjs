import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// v63: every board's transition is the original full-strength rainbow wormhole; no board tunnel material is loaded or mixed in.
test('portal transitions use the original rainbow wormhole for every board',async()=>{
 const src=await readFile(new URL('../modules/portal/portal.mjs',import.meta.url),'utf8');
 assert(!/portal-tunnel-/.test(src),'portal.mjs must not load board tunnel materials');
 assert(!/tunnelMaterial|tunnelCore|material\(a,v,z/.test(src),'no per-board tunnel material in the shader');
 assert(!/25% over every board/.test(src),'no 25% overlay');
 const css=await readFile(new URL('../modules/portal/portal.css',import.meta.url),'utf8');
 assert(!/data-tunnel=/.test(css),'no per-board tunnel CSS');
});

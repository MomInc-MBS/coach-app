import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';

const dir=new URL('../pod/gala-coaches/',import.meta.url);
// roster.ts / design.ts are TypeScript with extensionless imports, so read the data out of the source text.
const src=n=>readFileSync(new URL('../creature/source/creator/'+n,import.meta.url),'utf8');
const ROSTER=JSON.parse(src('roster.ts').match(/=(\[.*\]);/s)[1]);
const REJECTED_BODY_IDS=new Set(src('design.ts').split('REJECTED_BODY_IDS')[1].split(']);')[0].match(/'roster\/[^']+'/g).map(x=>x.slice(1,-1)));
const manifest=JSON.parse(readFileSync(new URL('manifest.json',dir),'utf8'));

test('coach sprite manifest covers every non-rejected coach exactly once',()=>{
 const want=['myr5',...ROSTER.filter(r=>!REJECTED_BODY_IDS.has(r.id)).map(r=>r.id)];
 assert.equal(REJECTED_BODY_IDS.size,4);
 assert.deepEqual(manifest.sprites.map(s=>s.id).sort(),want.sort());
 const family=new Map([['myr5','MYR5'],...ROSTER.map(r=>[r.id,r.group])]);
 for(const s of manifest.sprites){
  assert.equal(s.kind,family.get(s.id)==='Four-legged'?'pet':'body',s.id);
  assert.equal(s.family,family.get(s.id),s.id);
  assert.equal(s.unlock,s.id);
  const sheet=manifest.sheets[s.sheet];
  assert.ok(sheet&&statSync(new URL(sheet.image,dir)).size>0&&statSync(new URL(sheet.mask,dir)).size>0,s.id);
  assert.deepEqual(s.frame.slice(2),sheet.frame,s.id);
 }
});

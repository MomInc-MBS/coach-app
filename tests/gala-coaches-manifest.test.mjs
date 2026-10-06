import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {COACHES} from '../performance-catalog.mjs';

const dir=new URL('../pod/gala-coaches/',import.meta.url);
// roster.ts / design.ts are TypeScript with extensionless imports, so read the data out of the source text.
const src=n=>readFileSync(new URL('../creature/source/creator/'+n,import.meta.url),'utf8');
const ROSTER=JSON.parse(src('roster.ts').match(/=(\[.*\]);/s)[1]);
const REJECTED_BODY_IDS=new Set(src('design.ts').split('REJECTED_BODY_IDS')[1].split(']);')[0].match(/'roster\/[^']+'/g).map(x=>x.slice(1,-1)));
const manifest=JSON.parse(readFileSync(new URL('manifest.json',dir),'utf8'));

test('coach sprite manifest covers approved coaches and keeps legacy extra sprites loadable',()=>{
 assert.equal(REJECTED_BODY_IDS.size,4);
 assert.equal(new Set(manifest.sprites.map(s=>s.id)).size,manifest.sprites.length,'no duplicate sprite IDs');
 const legacyExtras=new Set(['roster/18-quad-all--wooden_robot_3d_model','roster/21-flyer--winged_humanoid_3d_model']);
 assert.ok(manifest.sprites.every(s=>s.id==='myr5'||ROSTER.some(r=>r.id===s.id)||legacyExtras.has(s.id)),'every sprite is approved roster art or retained legacy art');
 assert.ok(manifest.sprites.every(s=>!REJECTED_BODY_IDS.has(s.id)),'four creator-only rejects stay hidden from the sprite manifest');
 const approved=new Set(COACHES.map(coach=>coach.id));
 assert.equal(approved.size,65);
 assert.ok([...approved].every(id=>manifest.sprites.some(sprite=>sprite.id===id)),'each approved coach has art');
 assert.deepEqual(manifest.sprites.filter(sprite=>!approved.has(sprite.id)).map(sprite=>sprite.id).sort(),['roster/18-quad-all--wooden_robot_3d_model','roster/21-flyer--winged_humanoid_3d_model']);
 const family=new Map([['myr5','MYR5'],...ROSTER.map(r=>[r.id,r.group]),['roster/18-quad-all--wooden_robot_3d_model','Four-legged'],['roster/21-flyer--winged_humanoid_3d_model','Flyer']]);
 for(const s of manifest.sprites){
  assert.equal(s.kind,family.get(s.id)==='Four-legged'?'pet':'body',s.id);
  assert.equal(s.family,family.get(s.id),s.id);
  assert.equal(s.unlock,s.id);
  const sheet=manifest.sheets[s.sheet];
  assert.ok(sheet&&statSync(new URL(sheet.image,dir)).size>0&&statSync(new URL(sheet.mask,dir)).size>0,s.id);
  assert.deepEqual(s.frame.slice(2),sheet.frame,s.id);
 }
});

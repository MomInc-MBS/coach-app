import test from 'node:test';
import assert from 'node:assert/strict';
import {BOSSES,TIERS,MAX_LEVEL,bossStates,selectedTracks} from '../achievements-board.mjs';
const byTier=(states,id)=>states.filter(b=>b.id.startsWith(id+'-'));
const beat=ids=>Object.fromEntries(ids.map(id=>[id,MAX_LEVEL]));
test('every boss has a box inside the art and a unique id',()=>{
 assert.equal(BOSSES.length,38);
 assert.equal(new Set(BOSSES.map(b=>b.id)).size,BOSSES.length);
 for(const {box:[x,y,w,h]} of BOSSES){assert(x>=0&&y>=0&&w>0&&h>0&&x+w<=100&&y+h<=100);}
 assert.deepEqual(TIERS.filter(t=>t.track===null).map(t=>t.id),['warden','lume']);
});
test('only the selected paths and meditation are playable; rows unlock left to right',()=>{
 const tracks=new Set(['quads','meditation']);
 const fresh=bossStates({},tracks);
 assert(byTier(fresh,'strider').every(b=>b.state==='locked'),'unselected path stays locked');
 assert.deepEqual(byTier(fresh,'ringer').map(b=>b.state),['open','locked','locked','locked','locked']);
 assert.equal(byTier(fresh,'tanka')[0].state,'open','meditation is always available');
 assert(byTier(fresh,'warden').concat(byTier(fresh,'lume')).every(b=>b.state==='locked'),'shared bosses wait');
 const partial=bossStates({'ringer-1':MAX_LEVEL,'ringer-2':2},tracks);
 assert.deepEqual(byTier(partial,'ringer').map(b=>b.state),['done','open','locked','locked','locked']);
 assert.equal(byTier(partial,'ringer')[1].levels,2);
 const paths=beat([...byTier(fresh,'ringer'),...byTier(fresh,'tanka')].map(b=>b.id));
 const shared=bossStates(paths,tracks);
 assert.equal(byTier(shared,'warden')[0].state,'open','shared boss opens once every available row is beaten');
 assert.equal(byTier(shared,'lume')[0].state,'locked');
 assert.equal(byTier(bossStates({...paths,'warden-1':99},tracks),'lume')[0].state,'open');
});
test('with no track filter every row is playable',()=>{
 const all=bossStates({});
 for(const tier of TIERS.filter(t=>t.track!==null))assert.equal(byTier(all,tier.id)[0].state,'open');
});
test('selected tracks come from the onboarding movements plus meditation',()=>{
 assert.deepEqual([...selectedTracks(null)],['meditation']);
 const account={onboarding:{data:{profile:{exercises:['squat','pushup','boxing','jumping','tree']}}}};
 assert.deepEqual([...selectedTracks(account)].sort(),['cardio','chest','martial-arts','meditation','quads']);
});

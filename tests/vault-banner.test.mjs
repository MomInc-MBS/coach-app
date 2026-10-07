import test from 'node:test';
import assert from 'node:assert/strict';
import {createBanner,SHOW_MS,FADE_MS} from '../modules/vault/vault-banner.mjs';
import {GOALS} from '../modules/vault/vault-goals.mjs';
test('banner queues goals one at a time: 5 s shown, 0.6 s fade, no overlap',()=>{
 let now=0;const timers=[];const log=[];
 const setTimer=(f,ms)=>{timers.push({f,at:now+ms});return timers.length;},adv=ms=>{now+=ms;for(const t of timers.filter(t=>t.at<=now&&!t.d)){t.d=1;t.f();}};
 const [a,b]=GOALS;
 const bn=createBanner({show:g=>log.push('show:'+g.id),hide:()=>log.push('hide'),done:()=>log.push('done'),setTimer,clearTimer:i=>{if(timers[i-1])timers[i-1].d=1;}});
 bn.push([a.id,b.id,'nope']);assert.deepEqual(log,['show:'+a.id]);
 adv(SHOW_MS-1);assert.equal(log.length,1);adv(1);assert.deepEqual(log.slice(1),['hide']);
 adv(FADE_MS);assert.deepEqual(log.slice(2),['done','show:'+b.id],'second starts only after first fully faded');
 bn.dismiss();assert.equal(log.at(-1),'hide');adv(FADE_MS);assert.equal(log.at(-1),'done');
});

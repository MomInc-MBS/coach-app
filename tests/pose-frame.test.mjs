import test from 'node:test';
import assert from 'node:assert/strict';
import {PoseFrameScheduler} from '../pose-frame.mjs';
for(const fresh of [true,false])test(`camera scheduling uses ${fresh?'decoded video':'animation'} frames and never queues callbacks`,()=>{
 const pending=new Map();let n=0,calls=0;
 const request=fn=>{pending.set(++n,fn);return n;},cancel=id=>pending.delete(id);
 const video=fresh?{requestVideoFrameCallback:request,cancelVideoFrameCallback:cancel}:{};
 const scheduler=new PoseFrameScheduler(video,{request,cancel});
 scheduler.schedule(()=>calls++);scheduler.schedule(()=>calls++);assert.equal(pending.size,1);
 const [id,run]=pending.entries().next().value;pending.delete(id);run();assert.equal(calls,1);
 scheduler.schedule(()=>calls++);scheduler.stop();assert.equal(pending.size,0);assert.equal(calls,1);
});

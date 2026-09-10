import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
const source=await readFile(new URL('../creature/source/latest-preview.ts',import.meta.url),'utf8');
const {LatestPreview}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source,{mode:'transform'})).toString('base64'));
const tick=()=>new Promise(r=>setTimeout(r,30));
test('a rapid drag keeps only the newest waiting design and settles that design',async()=>{
 const started=[],settled=[],releases=[];
 const queue=new LatestPreview(value=>{started.push(value);return new Promise(resolve=>releases.push(resolve));},value=>settled.push(value));
 queue.request('first');queue.request('middle');queue.request('latest');
 assert.deepEqual(started,['first']);releases.shift()();await tick();
 assert.deepEqual(started,['first','latest']);assert.deepEqual(settled,[]);
 releases.shift()();await tick();assert.deepEqual(settled,['latest']);queue.dispose();
});
test('a failed preview reports the error and the next edit can recover',async()=>{
 const settled=[];const queue=new LatestPreview(async value=>{if(value==='bad')throw Error('model failed');},(value,error)=>settled.push([value,error?.message]));
 queue.request('bad');await tick();queue.request('good');await tick();
 assert.deepEqual(settled,[['bad','model failed'],['good',undefined]]);queue.dispose();
});
test('leaving the editor cancels queued designs and prevents completion callbacks',async()=>{
 let release;const started=[],settled=[];const queue=new LatestPreview(value=>{started.push(value);return new Promise(resolve=>{release=resolve;});},value=>settled.push(value));
 queue.request(1);queue.request(2);queue.dispose();queue.request(3);release();await tick();assert.deepEqual(started,[1]);assert.deepEqual(settled,[]);
});

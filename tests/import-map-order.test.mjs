import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('the pod import map precedes module preloads and every script',async()=>{
 const html=await readFile('pose.html','utf8');
 const map=html.indexOf('<script type="importmap">');
 assert(map>=0);
 assert(map<html.indexOf('<link rel="modulepreload"'));
 assert(map<html.indexOf('<script src='));
 assert(map<html.indexOf('<script type="module"'));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {validRecipe} from '../onboarding-domain.mjs';
const recipe=id=>({version:1,styles:Object.fromEntries(['head','eye','collar','body','arms','feet'].map(r=>[r,id])),coach:'supportive',eye:'open',fur:1,iris:1});
test('new Fluffy and Jelly coaches survive setup and transfer validation',()=>{for(const id of [20,21])assert.equal(validRecipe(recipe(id)),true);});
test('legacy skin IDs remain importable without accepting arbitrary future or malformed IDs',()=>{for(const id of [0,7,8,11,18,22])assert.equal(validRecipe(recipe(id)),true);for(const id of [-1,23,200,1.5,'21'])assert.equal(validRecipe(recipe(id)),false);});

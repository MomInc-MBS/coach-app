import test from 'node:test';
import assert from 'node:assert/strict';
import {pyramidTiles} from '../food/pyramid-tiles.mjs';

test('idle state before any scan shows the prompt and dashes',()=>{
 const tiles=pyramidTiles(null,null);
 assert.equal(tiles.name,'TAP CAMERA TO SCAN');
 assert.equal(tiles.calories,'—');assert.equal(tiles.protein,'—');assert.equal(tiles.fat,'—');assert.equal(tiles.carbs,'—');assert.equal(tiles.vitamins,'—');
});

test('failure or no clear guess shows Try again',()=>{
 const tiles=pyramidTiles('',null);
 assert.equal(tiles.name,'Try again');assert.equal(tiles.calories,'—');assert.equal(tiles.vitamins,'—');
});

test('a guess with no nutrition match still shows the guess name',()=>{
 const tiles=pyramidTiles('Mystery dish',null);
 assert.equal(tiles.name,'Mystery dish');assert.equal(tiles.calories,'—');
});

test('a matched scan fills macros and picks the top two vitamins by %DV',()=>{
 const nutrients={calories:250.4,protein:12.34,fat:9.876,carbs:30.5,vitaminA:90,vitaminC:90,vitaminD:0,vitaminE:null,vitaminB12:1.2,folate:40};
 // %DV: A=10%, C=100%, D=0% (excluded), E=null (excluded), B12=50%, folate=10% -> top two: C, B12
 const tiles=pyramidTiles('Grilled chicken',nutrients);
 assert.equal(tiles.name,'Grilled chicken');
 assert.equal(tiles.calories,'250 kcal');assert.equal(tiles.protein,'12.3 g');assert.equal(tiles.fat,'9.9 g');assert.equal(tiles.carbs,'30.5 g');
 assert.equal(tiles.vitamins,'C B12');
});

test('a zero-value vitamin is excluded, not treated as a tie at the top',()=>{
 const tiles=pyramidTiles('Water',{calories:0,protein:0,fat:0,carbs:0,vitaminA:0,vitaminC:0,vitaminD:0,vitaminE:0,vitaminB12:0,folate:0});
 assert.equal(tiles.vitamins,'—');
});

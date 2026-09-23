import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
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

test('pyramid room reuses the Dr Girlfriend game wall pattern and both original poster texts lazily',async()=>{
 const source=await readFile(new URL('../food/pyramid-scanner.mjs',import.meta.url),'utf8');
 assert.match(source,/mominc-girlfriend-fix\/tv\/channels\/girlfriend\.html/);
 assert.match(source,/repeating-linear-gradient\(90deg,transparent 0 139px,#604c4133 140px 142px\)/);
 assert.match(source,/repeating-linear-gradient\(0deg,#b8a477 0 79px,#c3b181 80px 82px\)/);
 assert.match(source,/CARED FOR\.<br>CORRECTED\.<br>PROVIDED FOR\.<small>A MOM INC\. WORKPLACE<\/small>/);
 assert.match(source,/READ THE SOURCE\.<br>KEEP THE LABEL\./);
 assert.match(source,/releaseRoomStyle\(\)/);
 assert.doesNotMatch(source,/drgf-paper-character/i);
 assert.doesNotMatch(source,/https?:\/\/(?!www\.w3\.org)/i,'room CSS may embed its SVG texture, but must not request a remote asset');
});

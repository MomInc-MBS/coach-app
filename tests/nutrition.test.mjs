import test from 'node:test';
import assert from 'node:assert/strict';
import foods from '../nutrition-data.mjs';
import {findFoods,portionNutrition,displayNutrient} from '../nutrition.mjs';
import {mealInput} from '../server/domain.mjs';
test('USDA reference values scale by confirmed grams with unknown distinct from zero',()=>{
 const butter=foods.find(f=>f.id==='01001'),value=portionNutrition(butter,14.2);
 assert.equal(value.calories,101.81);assert.equal(value.fat,11.52);assert.equal(value.calcium,3.41);assert.equal(value.vitaminA,97.13);assert.equal(value.vitaminD,0);
 assert.equal(portionNutrition({...butter,iron:null},100).iron,null);assert.equal(displayNutrient(null,'mg'),'—');assert.equal(displayNutrient(0,'mg'),'0 mg');
 for(const grams of [0,-1,NaN,2001])assert.equal(portionNutrition(butter,grams).fat,null);
});
test('food references require every query term and never substitute unrelated foods',()=>{
 assert(findFoods(foods,'pizza').every(f=>/pizza/i.test(f.name)));assert(findFoods(foods,'apple pie').length>0);assert.equal(findFoods(foods,'xyznofood').length,0);assert.equal(findFoods(foods,'').length,0);
 assert(findFoods(foods,'grilled salmon').every(f=>/salmon/i.test(f.name)&&/cooked/i.test(f.name)));
});
test('micronutrients reject negative, unbounded, string and object values',()=>{
 const meal={id:crypto.randomUUID(),name:'Meal',portion:'100 g',eatenAt:new Date().toISOString(),micros:{calcium:0,iron:2.4},nutritionSource:'USDA SR28 01001'};
 assert.equal(mealInput(meal).micros.calcium,0);assert.equal(mealInput(meal).micros.vitaminC,null);
 for(const calcium of [-1,Infinity,2000001,'10',{}])assert.throws(()=>mealInput({...meal,micros:{calcium}}));
 assert.throws(()=>mealInput({...meal,micros:[]}));
});

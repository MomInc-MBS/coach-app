import {NUTRIENTS,findFoods,portionNutrition,displayNutrient} from './nutrition.mjs';
import FDC from './food/nutrition-fdc.json' with {type:'json'};
// #R9-FOOD: the Food-101 scanner labels (and typed text that exactly matches one) skip the SR28 fuzzy
// search below and use this USDA FoodData Central table instead -- one real "as eaten" match per label
// rather than a guessed word-match. Reshaped into portionNutrition()'s per-100g "food" shape so the same
// grams scaler/renderer this file already has handles it; only the two vitamins FDC gave us are filled in.
const VITAMIN_KEY={'Vitamin A':'vitaminA','Vitamin C':'vitaminC','Vitamin D':'vitaminD','Vitamin E':'vitaminE','Vitamin B12':'vitaminB12',Folate:'folate'};
function fdcFood(entry){
 const per100=v=>v==null?null:v*100/entry.servingG;
 const food={id:`fdc:${entry.fdcId}`,name:entry.description,calories:per100(entry.kcal),protein:per100(entry.proteinG),carbs:per100(entry.carbsG),fat:per100(entry.fatG)};
 for(const v of entry.vitamins)food[VITAMIN_KEY[v.name]]=per100(v.amount);
 return food;
}
export function mountMealNutrition(){
 const $=id=>document.getElementById(id),form=$('mealForm');let foods=null,reference=null,generation=0,mode='estimate',queryTimer;
 const data=()=>{const nutrients=Object.fromEntries(NUTRIENTS.map(([k])=>[k,form.elements[k].value===''?null:Number(form.elements[k].value)]));const source=reference?.id?.startsWith('fdc:')?`USDA FDC ${reference.id.slice(4)}`:`USDA SR28 ${reference?.id}`;return {...nutrients,micros:Object.fromEntries(NUTRIENTS.slice(4).map(([k])=>[k,nutrients[k]])),nutritionSource:mode==='estimate'&&reference?source:'User entered'};};
 const snapshot=()=>({name:$('mealConfirmation').hidden?null:$('mealName').value,nutrients:data()});
 function render(){const values=data();for(const [k,,unit]of NUTRIENTS)$('nutrient-'+k).textContent=displayNutrient(values[k],unit);window.dispatchEvent(new CustomEvent('myr5:meal-nutrition',{detail:snapshot()}));}
 function calculate(){mode='estimate';const grams=Number($('mealGrams').value),values=portionNutrition(reference,grams);for(const [k]of NUTRIENTS)form.elements[k].value=values[k]??'';form.elements.portion.value=`${grams} g`;$('nutritionBasis').textContent=reference?(reference.id?.startsWith('fdc:')?`USDA FDC · ${grams} g`:`Estimate · ${grams} g`):'No match. Enter the food or label values.';render();}
 async function search(query){
  const run=++generation,exact=FDC[query.trim().toLowerCase()];
  reference=null;$('foodReference').replaceChildren();
  if(exact){reference=fdcFood(exact);$('mealGrams').value=exact.servingG;$('foodReferenceLabel').hidden=true;calculate();return;}
  calculate();
  try{foods??=(await import('./nutrition-data.mjs')).default;if(run!==generation)return;const matches=findFoods(foods,query);for(const f of matches){const o=document.createElement('option');o.value=f.id;o.textContent=f.name;$('foodReference').append(o);}reference=matches[0]||null;$('foodReferenceLabel').hidden=!matches.length;calculate();}catch{if(run===generation)$('nutritionBasis').textContent='Food reference could not load. Reconnect or enter nutrition from its label.';}
 }
 function open(name=''){clearTimeout(queryTimer);$('mealConfirmation').hidden=false;$('mealSaveControls').hidden=false;$('mealName').value=name;$('mealGrams').value=100;$('nutritionAdjust').open=false;search(name);}
 function reset(){generation++;clearTimeout(queryTimer);reference=null;form.reset();const now=new Date();form.elements.eatenAt.value=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,16);$('mealConfirmation').hidden=true;$('mealSaveControls').hidden=true;for(const [k]of NUTRIENTS)form.elements[k].value='';render();}
 $('foodReference').onchange=()=>{reference=foods?.find(f=>f.id===$('foodReference').value)||null;calculate();};
 $('mealGrams').oninput=calculate;
 $('mealName').oninput=()=>{clearTimeout(queryTimer);generation++;reference=null;calculate();queryTimer=setTimeout(()=>search($('mealName').value),250);};
 for(const [k]of NUTRIENTS)form.elements[k].oninput=()=>{mode='manual';$('nutritionBasis').textContent='Your label values';render();};
 window.addEventListener('myr5:food-selected',e=>open(e.detail?.name||''));
 window.addEventListener('myr5:food-reset',reset);
 window.addEventListener('pagehide',()=>{generation++;clearTimeout(queryTimer);});
 return {data,reset,snapshot};
}

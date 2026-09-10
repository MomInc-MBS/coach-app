import {NUTRIENTS,findFoods,portionNutrition,displayNutrient} from './nutrition.mjs';
export function mountMealNutrition(){
 const $=id=>document.getElementById(id),form=$('mealForm');let foods=null,reference=null,generation=0,mode='estimate',queryTimer;
 const data=()=>{const nutrients=Object.fromEntries(NUTRIENTS.map(([k])=>[k,form.elements[k].value===''?null:Number(form.elements[k].value)]));return {...nutrients,micros:Object.fromEntries(NUTRIENTS.slice(4).map(([k])=>[k,nutrients[k]])),nutritionSource:mode==='estimate'&&reference?`USDA SR28 ${reference.id}`:'User entered'};};
 function render(){const values=data();for(const [k,,unit]of NUTRIENTS)$('nutrient-'+k).textContent=displayNutrient(values[k],unit);}
 function calculate(){mode='estimate';const grams=Number($('mealGrams').value),values=portionNutrition(reference,grams);for(const [k]of NUTRIENTS)form.elements[k].value=values[k]??'';form.elements.portion.value=`${grams} g`;$('nutritionBasis').textContent=reference?`Estimate for ${grams} g · confirm the food and portion.`:'No reference match. Adjust the food name or enter nutrition from its label.';render();}
 async function search(query){const run=++generation;reference=null;calculate();$('foodReference').replaceChildren();try{foods??=(await import('./nutrition-data.mjs')).default;if(run!==generation)return;const matches=findFoods(foods,query);for(const f of matches){const o=document.createElement('option');o.value=f.id;o.textContent=f.name;$('foodReference').append(o);}reference=matches[0]||null;$('foodReferenceLabel').hidden=!matches.length;calculate();}catch{if(run===generation)$('nutritionBasis').textContent='Food reference could not load. Reconnect or enter nutrition from its label.';}}
 function open(name=''){clearTimeout(queryTimer);$('mealConfirmation').hidden=false;$('mealSaveControls').hidden=false;$('mealName').value=name;$('mealGrams').value=100;$('nutritionAdjust').open=false;search(name);}
 function reset(){generation++;clearTimeout(queryTimer);reference=null;form.reset();const now=new Date();form.elements.eatenAt.value=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,16);$('mealConfirmation').hidden=true;$('mealSaveControls').hidden=true;for(const [k]of NUTRIENTS)form.elements[k].value='';render();}
 $('foodReference').onchange=()=>{reference=foods?.find(f=>f.id===$('foodReference').value)||null;calculate();};
 $('mealGrams').oninput=calculate;
 $('mealName').oninput=()=>{clearTimeout(queryTimer);generation++;reference=null;calculate();queryTimer=setTimeout(()=>search($('mealName').value),250);};
 for(const [k]of NUTRIENTS)form.elements[k].oninput=()=>{mode='manual';$('nutritionBasis').textContent='Nutrition entered by you for this portion.';render();};
 window.addEventListener('myr5:food-selected',e=>open(e.detail?.name||''));
 window.addEventListener('myr5:food-reset',reset);
 window.addEventListener('pagehide',()=>{generation++;clearTimeout(queryTimer);});
 return {data,reset};
}

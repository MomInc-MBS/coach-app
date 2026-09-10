export const MACROS=[['calories','Calories','kcal'],['protein','Protein','g'],['carbs','Carbs','g'],['fat','Fat','g']];
export const MICROS=[['calcium','Calcium','mg'],['iron','Iron','mg'],['magnesium','Magnesium','mg'],['potassium','Potassium','mg'],['sodium','Sodium','mg'],['zinc','Zinc','mg'],['vitaminA','Vitamin A','µg RAE'],['vitaminC','Vitamin C','mg'],['vitaminD','Vitamin D','µg'],['vitaminE','Vitamin E','mg'],['vitaminB12','Vitamin B12','µg'],['folate','Folate','µg']];
export const NUTRIENTS=[...MACROS,...MICROS];
const aliases={'french fries':'potatoes french fried','ice cream':'ice creams','hamburger':'hamburger','hot dog':'frankfurter','grilled salmon':'salmon cooked','grilled cheese sandwich':'sandwich cheese','macaroni and cheese':'macaroni cheese','steak':'beef steak cooked','french toast':'french toast','fried rice':'rice fried','sashimi':'fish raw','omelette':'egg omelet'};
const words=value=>value.toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>1&&!['and','with','the'].includes(w)).map(w=>w.replace(/s$/,''));
export function findFoods(foods,query,limit=8){
 const terms=words(aliases[query.toLowerCase()]||query);if(!terms.length)return [];
 return foods.map(food=>{const tokens=words(food.name);if(!terms.every(t=>tokens.includes(t)))return null;return {food,score:tokens.length+( /babyfood|infant|dry mix|powder|dehydrated/i.test(food.name)?60:0)};}).filter(Boolean).sort((a,b)=>a.score-b.score).slice(0,limit).map(x=>x.food);
}
export function portionNutrition(food,grams){
 if(!food||!Number.isFinite(grams)||grams<=0||grams>2000)return Object.fromEntries(NUTRIENTS.map(([k])=>[k,null]));
 return Object.fromEntries(NUTRIENTS.map(([k])=>[k,food[k]==null?null:Math.round(food[k]*grams/100*100)/100]));
}
export function displayNutrient(value,unit){return value==null?'—':`${new Intl.NumberFormat(undefined,{maximumFractionDigits:unit==='kcal'?0:2}).format(value)} ${unit}`;}

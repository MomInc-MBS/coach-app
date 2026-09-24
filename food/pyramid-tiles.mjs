// Pure scan-result formatting, kept independent of WebGL for unit tests.
const VITAMIN_DV={vitaminA:900,vitaminC:90,vitaminD:20,vitaminE:15,vitaminB12:2.4,folate:400};
const VITAMIN_LABEL={vitaminA:'A',vitaminC:'C',vitaminD:'D',vitaminE:'E',vitaminB12:'B12',folate:'B9'};
const DASH='—';
const has=v=>typeof v==='number'&&Number.isFinite(v);

export function pyramidTiles(scan,nutrients){
 if(scan==null)return {name:'SCAN A MEAL',calories:DASH,protein:DASH,fat:DASH,carbs:DASH,vitamins:DASH};
 const round=(v,d=0)=>{const m=10**d;return Math.round(v*m)/m;};
 const amount=k=>has(nutrients?.[k])?`${round(nutrients[k],k==='calories'?0:1)} ${k==='calories'?'kcal':'g'}`:DASH;
 const top=Object.entries(VITAMIN_DV)
  .map(([k,dv])=>[VITAMIN_LABEL[k],has(nutrients?.[k])?nutrients[k]/dv:-1])
  .filter(([,pct])=>pct>0).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([label])=>label);
 return {name:scan||'Try again',calories:amount('calories'),protein:amount('protein'),fat:amount('fat'),carbs:amount('carbs'),vitamins:top.length?top.join(' '):DASH};
}

// A saved /api/meals row -> the flat nutrient object pyramidTiles reads (D1 returns micros as JSON text).
export function mealNutrients(item){
 let micros=item?.micros;
 if(typeof micros==='string'){try{micros=JSON.parse(micros);}catch{micros=null;}}
 return {...(micros||{}),calories:item?.calories,protein:item?.protein,fat:item?.fat,carbs:item?.carbs};
}

// Meals eaten on `now`'s local calendar day; null when the list isn't available (signed out, offline).
export function mealsOn(items,now=new Date()){
 if(!Array.isArray(items))return null;
 const day=now.toDateString();
 return items.filter(item=>new Date(item.eaten_at).toDateString()===day);
}

// #35: the screens' "today" face — summed macros (0 when nothing is logged yet) and the top two vitamins.
export function todayTiles(items,now=new Date()){
 const meals=mealsOn(items,now);
 if(!meals)return pyramidTiles('TODAY',null);
 const total={calories:0,protein:0,fat:0,carbs:0};
 for(const item of meals)for(const [k,v] of Object.entries(mealNutrients(item)))if(has(v))total[k]=(total[k]||0)+v;
 return pyramidTiles(meals.length?`TODAY · ${meals.length} MEAL${meals.length===1?'':'S'}`:'TODAY',total);
}

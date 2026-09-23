// Pure scan-result formatting, kept independent of WebGL for unit tests.
const VITAMIN_DV={vitaminA:900,vitaminC:90,vitaminD:20,vitaminE:15,vitaminB12:2.4,folate:400};
const VITAMIN_LABEL={vitaminA:'A',vitaminC:'C',vitaminD:'D',vitaminE:'E',vitaminB12:'B12',folate:'B9'};
const DASH='—';

export function pyramidTiles(scan,nutrients){
 if(scan==null)return {name:'TAP CAMERA TO SCAN',calories:DASH,protein:DASH,fat:DASH,carbs:DASH,vitamins:DASH};
 const has=v=>typeof v==='number'&&Number.isFinite(v);
 const round=(v,d=0)=>{const m=10**d;return Math.round(v*m)/m;};
 const amount=k=>has(nutrients?.[k])?`${round(nutrients[k],k==='calories'?0:1)} ${k==='calories'?'kcal':'g'}`:DASH;
 const top=Object.entries(VITAMIN_DV)
  .map(([k,dv])=>[VITAMIN_LABEL[k],has(nutrients?.[k])?nutrients[k]/dv:-1])
  .filter(([,pct])=>pct>0).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([label])=>label);
 return {name:scan||'Try again',calories:amount('calories'),protein:amount('protein'),fat:amount('fat'),carbs:amount('carbs'),vitamins:top.length?top.join(' '):DASH};
}

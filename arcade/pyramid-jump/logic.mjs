// Pure pieces of Pyramid Jump (no DOM): coach shape + colour mapping, meal markers and the
// platform generator. Lazy/optional: loaded only from the food pyramid on a photo day (see food/pyramid-scanner.mjs).
import {SHAPES,COLOURS,LEGACY} from './data.mjs';
export const W=360;
export const BEST_KEY='myr5-pyramid-jump-best-v1';

// The user's selected coach body -> its paper silhouette, filled with the body's own colour (colour only, no texture).
export function paperFor(recipe){
 const id=String(recipe?.body||'myr5').replace(/^roster\//,''),shape=SHAPES[id]||SHAPES.myr5;
 const choice=recipe?.materials?.body?.colorId,hex=/^#[0-9a-f]{6}$/i.test(choice)?choice:null;
 const colour=hex||COLOURS[choice]||LEGACY[recipe?.styles?.body]||LEGACY[0];
 return {id:SHAPES[id]?id:'myr5',d:shape.d,eye:shape.e,colour};
}
export function readRecipe(store=localStorage){try{const r=JSON.parse(store.getItem('myr5-recipe-v1'));return r&&typeof r==='object'?r:null;}catch{return null;}}
// Top of the silhouette (min y of the path) so the pocket peek can crop to head + eye.
export const topOf=d=>Math.min(...[...d.matchAll(/[ML](-?\d+),(-?\d+)/g)].map(m=>+m[2]));

// Logged meals, oldest first (the API returns newest first), one paper tag each. Guests / no meals -> [].
export function mealMarkers(items){
 if(!Array.isArray(items))return [];
 return items.filter(m=>m&&m.name&&!Number.isNaN(Date.parse(m.eaten_at)))
  .sort((a,b)=>Date.parse(a.eaten_at)-Date.parse(b.eaten_at))
  .map(m=>{const t=new Date(m.eaten_at);return {name:String(m.name).slice(0,22),date:t.toLocaleDateString(undefined,{month:'short',day:'numeric'}),t:t.getTime(),p:Math.round(m.protein)||0,c:Math.round(m.carbs)||0,f:Math.round(m.fat)||0};});
}
export const MARKER_START=700,MARKER_GAP=520;
export const markerHeight=i=>MARKER_START+i*MARKER_GAP;

// One continuous journey: office -> MOM Inc. posters -> orbit -> space ports -> deep space (heights in world units).
export const ZONES=[['office',0],['posters',1800],['orbit',4200],['ports',7000],['deep',10500]];
export const zoneAt=h=>ZONES.reduce((z,[n,from])=>h>=from?n:z,'office');

export const mulberry=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
export const PLAT_W=64,JUMP=760,GRAVITY=1600,MAX_JUMP=JUMP*JUMP/(2*GRAVITY); // 180 units
// Platforms keep climbing forever. Rows are never further apart than MAX_JUMP*0.8, and every breaking row also
// carries a solid platform, so a safe route always exists. Monsters and black holes sit between rows, off the row's platform.
export class Level{
 constructor(rng=mulberry(7)){this.rng=rng;this.items=[{x:W/2-PLAT_W/2,y:0,type:'static'}];this.top=0;}
 ensure(y){while(this.top<y)this.row();}
 row(){
  const r=this.rng,h=this.top,gap=(60+Math.min(80,h/150))*(0.75+0.25*r()),y=this.top+=gap,x=r()*(W-PLAT_W);
  const roll=r();let type='static';
  if(h>600&&roll<0.22)type='moving';
  else if(h>900&&roll<0.38)type='breaking';
  else if(roll>0.94)type='spring';
  const item={x,y,type};
  if(type==='moving'){item.dx=40+r()*60;item.phase=r()*6.28;}
  if(type==='static'){const k=r();if(h>1500&&k<0.05)item.gear='propeller';else if(h>3000&&k>0.97)item.gear='jetpack';}
  this.items.push(item);
  if(type==='breaking')this.items.push({x:(x+W/2)%(W-PLAT_W),y:y+gap*0.15,type:'static'});
  const far=()=>{let fx;do fx=r()*(W-60);while(Math.abs(fx-x)<110);return fx;};
  if(h>2000&&r()<0.07)this.items.push({x:far(),y:y+gap*0.5,type:'monster',dir:r()<0.5?-1:1});
  else if(h>4000&&r()<0.04)this.items.push({x:far(),y:y+gap*0.5,type:'hole'});
 }
}

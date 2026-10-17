// Original MYR5 / MOM Inc. courses. Timings are simulation flight seconds.
export const BIOME_SECONDS=90;
export const SECTION_SECONDS=30;
export const PORTAL_REST_SECONDS=3;
const pickup=(id,name,benefit,shape)=>Object.freeze({id,name,benefit,shape});
export const BIOMES=Object.freeze([
 {id:'tropical',name:'MYR5 Crate Coast',sections:['Palm Crate Pier','Mango Quarry','Sunset Cargo Run'],pickups:[
  pickup('pineapple-boost','Pineapple Turbo','speed','pineapple'),pickup('coconut-shield','Coconut Guard','shield','coconut'),pickup('tiki-magnet','Cargo Tiki','magnet','tiki')]},
 {id:'castle',name:'MOM Inc. Ember Bureau',sections:['Morale Drawbridge','Lava Compliance Hall','Executive Furnace'],pickups:[
  pickup('morale-star','Morale Dividend','coins','star'),pickup('ember-ward','Compliance Ward','shield','crest'),pickup('spring-seal','Approved Uplift','lift','spring')]},
 {id:'rainbow',name:'MYR5 Prism Skyway',sections:['Spectrum Causeway','Cloud Ribbon','Prism Summit'],pickups:[
  pickup('spectrum-boost','Spectrum Turbo','speed','crystal'),pickup('prism-magnet','Prism Collector','magnet','prism'),pickup('cloud-lift','Cloud Cushion','lift','cloud')]},
 {id:'loopway',name:'MYR5 Ring Meadow',sections:['Green Ring Sprint','Loopway Orchard','Hilltop Gold Run'],pickups:[
  pickup('golden-ring','Meadow Dividend','coins','ring'),pickup('meadow-spring','Meadow Lift','lift','spring'),pickup('pollen-magnet','Pollen Collector','magnet','flower')]},
 {id:'laboratory',name:'MOM Inc. Lift Laboratory',sections:['Jetpack Intake','Unlicensed Innovation','Salary Escape Tunnel'],pickups:[
  pickup('ignition-cell','Ignition Cell','speed','cell'),pickup('lab-barrier','Safety Bubble','shield','flask'),pickup('salary-cache','Salary Cache','coins','briefcase')]},
 {id:'asteroid',name:'MYR5 Octant Drift',sections:['Debris Approach','Octant Spoke Field','Starward Exit'],pickups:[
  pickup('ion-charge','Ion Charge','speed','comet'),pickup('gravity-cage','Gravity Collector','magnet','satellite'),pickup('satellite-shield','Satellite Guard','shield','orbital')]},
].map(b=>Object.freeze({...b,sections:Object.freeze(b.sections),pickups:Object.freeze(b.pickups)})));
export function biomeAt(index=0,elapsed=0,{portal=false,restElapsed=0}={}){
 const ordinal=Math.max(0,Math.floor(index)),b=BIOMES[ordinal%BIOMES.length],next=BIOMES[(ordinal+1)%BIOMES.length];
 const t=Math.max(0,Math.min(BIOME_SECONDS,elapsed)),section=Math.min(2,Math.floor((t+1e-8)/SECTION_SECONDS));
 const turnElapsed=t-section*SECTION_SECONDS,active=!portal&&section>0&&turnElapsed>=-1e-8&&turnElapsed<1;
 return {id:b.id,name:b.name,index:ordinal,cycle:Math.floor(ordinal/BIOMES.length),section,sectionName:b.sections[section],
  elapsed:t,remaining:Math.max(0,BIOME_SECONDS-t),portal,restElapsed,nextId:next.id,nextName:next.name,
  turn:{active,progress:active?Math.max(0,turnElapsed):1,direction:(ordinal+section)%2?1:-1}};
}

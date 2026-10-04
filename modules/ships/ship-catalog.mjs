// These IDs are the same keys used by recipes, rewards and the verified GLB pack.
export const SHIP_CATALOG=Object.freeze([
 {id:'supportive',name:'Bubble shuttle',description:'A rounded cockpit with four bulbous engine pods around a compact hull.'},
 {id:'direct',name:'Wing fighter',description:'A pointed cockpit between broad swept wings and long engine rails.'},
 {id:'analytical',name:'Ring-engine scout',description:'A narrow cockpit and small fins ahead of a large circular rear engine.'},
 {id:'playful',name:'Fork interceptor',description:'A dark central cockpit between long forked nose rails, with two side engine pods.'},
 {id:'calm',name:'Capsule pod',description:'A short rounded capsule with a forward cockpit and a thick rear housing.'},
 {id:'mom',name:'Cargo carrier',description:'A broad blocky hull with a raised centre tower and two large front engine housings.'},
].map(ship=>Object.freeze({...ship,assetPath:`assets/ships/${ship.id}.glb`})));
export const shipDetails=id=>SHIP_CATALOG.find(ship=>ship.id===id)||SHIP_CATALOG[0];

// Original MYR5 Plank Flight catalog. Reference names are audit metadata only; they are
// not display names, art direction, or claims about the original games' physics.
const deepFreeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};

export const VEHICLES = deepFreeze([
  {id:'comet-hopper',name:'Comet Hopper',auditReference:'Bad As Hog',tier:'default',price:0,duration:20,handling:{lateral:1.05,vertical:1.16,acceleration:1.08,damping:0.78,radius:0.075},trait:'rise-hop'},
  {id:'foundry-walker',name:'Foundry Walker',auditReference:"Lil' Stomper",tier:'default',price:0,duration:22,handling:{lateral:0.82,vertical:0.80,acceleration:0.86,damping:1.18,radius:0.14},trait:'one-impact-armor'},
  {id:'ribbon-skimmer',name:'Ribbon Skimmer',auditReference:'Mr. Cuddles',tier:'default',price:0,duration:20,handling:{lateral:1.18,vertical:0.97,acceleration:1.12,damping:0.68,radius:0.075},trait:'smooth-weave'},
  {id:'polarity-shell',name:'Polarity Shell',auditReference:'Gravity Suit',tier:'default',price:0,duration:20,handling:{lateral:0.96,vertical:1.08,acceleration:0.92,damping:0.96,radius:0.09},trait:'gravity-cycle'},
  {id:'foldwing',name:'Foldwing',auditReference:'Crazy Freaking Teleporter',tier:'default',price:0,duration:18,handling:{lateral:1.08,vertical:0.92,acceleration:1.18,damping:0.72,radius:0.07},trait:'preview-fold'},
  {id:'pipwing',name:'Pipwing',auditReference:'Profit Bird',tier:'default',price:0,duration:20,handling:{lateral:0.88,vertical:1.24,acceleration:1.04,damping:0.92,radius:0.075},trait:'rise-pulse'},
  {id:'tide-glider',name:'Tide Glider',auditReference:'Wave Rider',tier:'expansion',price:180,duration:24,handling:{lateral:1.00,vertical:1.12,acceleration:0.96,damping:0.86,radius:0.08},trait:'wave-follow'},
  {id:'triad-bulwark',name:'Triad Bulwark',auditReference:'S.A.M. component mech',tier:'special',price:0,duration:24,handling:{lateral:0.91,vertical:0.92,acceleration:0.84,damping:1.12,radius:0.17},trait:'lean-deflector'}
]);

const vehicleIndex = Object.fromEntries(VEHICLES.map(vehicle => [vehicle.id, vehicle]));
export const vehicleById = id => vehicleIndex[id] ?? null;

// Numeric prices are MYR5 design proposals in game coins, not copied storefront prices.
export const GADGETS = deepFreeze([
  {id:'orbit-magnet',name:'Orbit Magnet',price:90,auditReference:'Coin Magnet / Magnetic Tokens',effect:{magnetRadius:0.30}},
  {id:'quiet-vector',name:'Quiet Vector',price:110,auditReference:'Gravity Belt',effect:{verticalResponse:0.10}},
  {id:'spark-dampener',name:'Spark Dampener',price:130,auditReference:'Dezapinator',effect:{initialShield:1}},
  {id:'early-signal',name:'Early Signal',price:120,auditReference:'Ezy-Dodge / Missile Jammer',effect:{warningLead:4}},
  {id:'coin-prism',name:'Coin Prism',price:150,auditReference:'Gemology',effect:{coinBonus:1}},
  {id:'rescue-echo',name:'Rescue Echo',price:170,auditReference:'Final Blast / Free Ride',effect:{crashGrace:0.30,impactBuffer:1}},
  {id:'shell-courier',name:'Shell Courier',price:200,auditReference:'Free Ride',effect:{initialVehicle:'comet-hopper'}},
  {id:'dash-battery',name:'Dash Battery',price:140,auditReference:'Boost',effect:{powerupDuration:2}},
  {id:'route-lantern',name:'Route Lantern',price:100,auditReference:'X-Ray Specs',effect:{coinPreview:8}},
  {id:'lucky-signal',name:'Lucky Signal',price:160,auditReference:'Lucky Last / Token Gift',effect:{eventTokenChance:0.22},eventBlocked:true},
  {id:'component-call',name:'Component Call',price:190,auditReference:'S.A.M. letters',effect:{componentChance:0.18},eventBlocked:true},
  {id:'sideband-collector',name:'Sideband Collector',price:125,auditReference:'Air Barrys',effect:{npcBonus:1}}
]);

export const POWERUPS = deepFreeze([
  {id:'coin-current',name:'Coin Current',family:'cash-dash',auditReference:'Cash Dash',duration:6,effect:{magnetRadius:0.8,clearHazards:true,coinBonus:1}},
  {id:'visual-afterburn',name:'Visual Afterburn',family:'boost',auditReference:'Boost',duration:5,effect:{visualRush:true}},
  {id:'aegis-pulse',name:'Aegis Pulse',family:'shield',auditReference:'Shield',duration:0,effect:{shield:1}},
  {id:'slow-orbit',name:'Slow Orbit',family:'rocket-time',auditReference:'Rocket Time',duration:6,effect:{threatSlow:1.7}}
]);

export const COSMETICS = deepFreeze([
  {id:'ion-afterglow',name:'Ion Afterglow',kind:'cosmetic',price:35,tint:'#a67cff',equipable:false},
  {id:'tideline-mint',name:'Tideline Mint',kind:'cosmetic',price:45,tint:'#55e6c1',equipable:false},
  {id:'ember-trace',name:'Ember Trace',kind:'cosmetic',price:55,tint:'#ff926b',equipable:false},
  {id:'signal-gold',name:'Signal Gold',kind:'cosmetic',price:65,tint:'#ffd66e',equipable:false},
  {id:'orbit-badge',name:'Orbit Badge',kind:'cosmetic',price:40,tint:'#74bfff',equipable:false}
]);
const cosmeticIndex = Object.fromEntries(COSMETICS.map(item => [item.id,item]));
export const cosmeticById = id => cosmeticIndex[id] ?? null;

// Permanent upgrades have bounded passive effects, with levels persisted by the wallet.
export const UPGRADES = deepFreeze([
  {id:'magnet-tuning',name:'Magnet Tuning',kind:'upgrade',price:80,maxLevel:3,effectPerLevel:{magnetRadius:0.08},equipable:false},
  {id:'shield-capacitor',name:'Shield Capacitor',kind:'upgrade',price:120,maxLevel:2,effectPerLevel:{maxShield:1,initialShield:1},equipable:false},
  {id:'vehicle-reserve',name:'Vehicle Reserve',kind:'upgrade',price:100,maxLevel:3,effectPerLevel:{vehicleDuration:2},equipable:false},
  {id:'signal-relay',name:'Signal Relay',kind:'upgrade',price:90,maxLevel:3,effectPerLevel:{warningLead:1.5},equipable:false}
]);

export const SHOP_ITEMS = deepFreeze([
  ...VEHICLES.filter(item => item.price > 0).map(item => ({id:item.id,name:item.name,kind:'vehicle',price:item.price,equipable:false})),
  ...GADGETS.map(item => ({id:item.id,name:item.name,kind:'gadget',price:item.price,equipable:true})),
  ...COSMETICS.map(item => ({id:item.id,name:item.name,kind:item.kind,price:item.price,tint:item.tint,equipable:false})),
  ...UPGRADES.map(item => ({id:item.id,name:item.name,kind:item.kind,price:item.price,maxLevel:item.maxLevel,equipable:false}))
]);

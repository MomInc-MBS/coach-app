import test from 'node:test';
import assert from 'node:assert/strict';
import {stepTrain,applyTorque,gearsFromLayout,hitGear,nearestPipe,valveAngle,wiggleStep,wiggleKick,lightLevel,heatColor,weldBeadAlpha,beadAlpha,stepSpark,KNOBS,METAL,DEFAULT_FRAME,cogs} from '../modules/portal/portal-board-cogs.mjs';

const TAU=Math.PI*2;

// --- Layout parsing: parts array -> physics gears array, `drives` remapped from a parts-array index
// to a gears-array index -----------------------------------------------------------------------
const LAYOUT_PARTS=[
 {node:'g04',kind:'gear',u:.35,v:.35,r:.09,rot:0,layer:1},          // 0: root gear
 {node:'g02',kind:'gear',u:.35,v:.50,r:.06,rot:0,layer:1,drives:0}, // 1: meshed under gear 0
 {node:'g60',kind:'valve',u:.65,v:.40,r:.06,rot:0,layer:1},         // 2: not a gear
 {node:'g05',kind:'light',u:.50,v:.15,r:.05,rot:0,layer:2},         // 3: not a gear
 {node:'g36',kind:'pipe',u:.20,v:.70,r:.07,rot:45,layer:0},         // 4: not a gear
];

test('gearsFromLayout: only kind:gear entries become gears, in layout order',()=>{
 const gears=gearsFromLayout(LAYOUT_PARTS);
 assert.equal(gears.length,2);
 assert.equal(gears[0].r,.09);assert.equal(gears[1].r,.06);
 assert.equal(gears[0].u,.35);assert.equal(gears[0].v,.35);
});

test('gearsFromLayout: drives is a parts-array index, remapped to a gears-array index',()=>{
 const gears=gearsFromLayout(LAYOUT_PARTS);
 assert.equal(gears[0].drives,null,'root: no drives field');
 assert.equal(gears[1].drives,0,'drives:0 (parts index) -> gears index 0, the same gear');
});

test('gearsFromLayout: a drives value pointing past the gear list is treated as its own root',()=>{
 const gears=gearsFromLayout([{node:'g01',kind:'gear',u:0,v:0,r:.1,drives:2}]); // 2 isn't a gear at all
 assert.equal(gears[0].drives,null);
});

test('gearsFromLayout: initial angle comes from rot (no tooth data in the layout)',()=>{
 const gears=gearsFromLayout([{node:'g01',kind:'gear',u:0,v:0,r:.1,rot:90}]);
 assert.ok(Math.abs(gears[0].angle-Math.PI/2)<1e-9);
});

// --- Train physics: reused rootRatio/applyTorque/stepTrain machinery, now fed by gearsFromLayout ---
test('applyTorque on the root spins it, and stepTrain derives the counter-rotation ratio',()=>{
 const g=gearsFromLayout(LAYOUT_PARTS);
 applyTorque(g,0,5);
 stepTrain(g,1/60);
 assert.ok(g[0].omega>0,'root keeps the sign of the applied torque');
 assert.ok(Math.abs(g[1].omega-(-g[0].omega*g[0].r/g[1].r))<1e-9,'meshed gear opposes it, rim speed equal');
});

test('applyTorque on a non-root gear still drives the whole train (rigid mesh)',()=>{
 const g=gearsFromLayout(LAYOUT_PARTS);
 applyTorque(g,1,-2); // push directly on the meshed (non-root) gear
 assert.ok(g[0].omega!==0,'the root absorbed the equivalent torque');
 stepTrain(g,1/60);
 assert.ok(Math.abs(g[1].omega-(-g[0].omega*g[0].r/g[1].r))<1e-9,'ratio still holds after stepping');
});

test('friction decays the train to rest, and stepTrain reports it',()=>{
 const g=gearsFromLayout(LAYOUT_PARTS);
 applyTorque(g,0,5);
 let moving=true,iterations=0;
 while(moving&&iterations<10000){moving=stepTrain(g,1/60);iterations++;}
 assert.ok(!moving,'train comes to rest');
 assert.ok(g.every(x=>Math.abs(x.omega)<=.02),'every gear settled under the rest threshold');
 assert.ok(iterations>1&&iterations<10000,'took a nonzero, bounded number of steps to decay');
});

test('stepTrain returns false immediately for an already-still train, and copes with zero gears',()=>{
 assert.equal(stepTrain(gearsFromLayout(LAYOUT_PARTS),1/60),false);
 assert.equal(stepTrain(gearsFromLayout([]),1/60),false);
});

test('unlinked gears (no drives) are each their own root and never affect one another',()=>{
 const g=gearsFromLayout([{node:'a',kind:'gear',u:0,v:0,r:.1},{node:'b',kind:'gear',u:.5,v:0,r:.1}]);
 applyTorque(g,0,5);stepTrain(g,1/60);
 assert.ok(g[0].omega>0);assert.equal(g[1].omega,0,'untouched, unlinked gear stays still');
});

// --- Hit-testing on the layout circles -----------------------------------------------------------
test('hitGear: nearest gear whose layout circle contains the point',()=>{
 const g=gearsFromLayout(LAYOUT_PARTS),face={w:1,h:1.75};
 assert.equal(hitGear(g,face,.35,.35),0,'dead centre of gear 0');
 assert.equal(hitGear(g,face,.35,.50),1,'dead centre of gear 1');
 assert.equal(hitGear(g,face,.9,.9),-1,'off both discs');
});

test('hitGear: skips indices in the skip set (gone with a falling cut piece)',()=>{
 const g=gearsFromLayout(LAYOUT_PARTS),face={w:1,h:1.75};
 assert.equal(hitGear(g,face,.35,.35,new Set([0])),-1);
});

// --- Kind behaviour, tested as pure functions (no WebGL) -------------------------------------------
test('valveAngle: idles in the shared train direction plus a share of its raw speed',()=>{
 let angle=0;
 for(let i=0;i<600;i++)angle=valveAngle(angle,1/60,1,1,0); // dir=1, valveDir=1, train at rest
 assert.ok(((angle%TAU)+TAU)%TAU>0,'idles forward even with the train stopped');
 const still=valveAngle(0,1/60,1,0,0);
 assert.equal(still,0,'no idle direction, no train speed -> no movement this step');
 const a=valveAngle(0,1/60,1,1,0),b=valveAngle(0,1/60,-1,1,0);
 assert.equal(a,-b,'dir flips the sign of the same idle step');
});

// --- Light level: ramps on near a finger, fades off after (the "near" timing itself is glue-code,
// tracked in step() via nearUntil; this is just the ramp/fade rate limiter it drives) --------------
test('lightLevel: ramps up toward a target of 1 within about rampMs',()=>{
 let level=0;for(let i=0;i<7;i++)level=lightLevel(level,1,1/60,120,1200); // ~117ms of steps
 assert.ok(level>.9,`expected near-full after ~ramp window, got ${level}`);
 assert.ok(level<=1,'never overshoots the target');
});
test('lightLevel: fades back toward 0 over about fadeMs once the target drops',()=>{
 let level=1;for(let i=0;i<72;i++)level=lightLevel(level,0,1/60,120,1200); // 1.2s of steps
 assert.ok(level<.05,`expected near-zero after ~fade window, got ${level}`);
});
test('lightLevel: holds steady while the target stays put',()=>{
 assert.equal(lightLevel(1,1,1/60,120,1200),1);
 assert.equal(lightLevel(0,0,1/60,120,1200),0);
});
test('lightLevel: ramp is faster than fade for the same gap (rampMs<fadeMs)',()=>{
 const rise=lightLevel(0,1,1/60,120,1200),fall=1-lightLevel(1,0,1/60,120,1200);
 assert.ok(rise>fall,'one dt of ramp moves further than one dt of fade');
});

// --- Pipe wiggle: damped spring kicked by a passing finger --------------------------------------
test('wiggleStep: an undisturbed pipe stays at rest',()=>{
 const r=wiggleStep(0,0,1/60,6,8,10*Math.PI/180);
 assert.equal(r.angle,0);assert.equal(r.omega,0);
});
test('wiggleStep: a kicked pipe oscillates and settles within about a second',()=>{
 let angle=0,omega=3,sawNegative=false; // a kick
 for(let i=0;i<60;i++){({angle,omega}=wiggleStep(angle,omega,1/60,6,8,10*Math.PI/180));if(angle<0)sawNegative=true;}
 assert.ok(sawNegative,'an underdamped spring should swing past zero at least once');
 assert.ok(Math.abs(angle)<.01&&Math.abs(omega)<.2,`expected settled by 1s, got angle=${angle} omega=${omega}`);
});
test('wiggleStep: repeated kicks are capped at maxAngle',()=>{
 let angle=0,omega=0;const max=10*Math.PI/180;
 for(let i=0;i<200;i++){omega+=5;({angle,omega}=wiggleStep(angle,omega,1/60,6,8,max));assert.ok(Math.abs(angle)<=max+1e-9);}
});
test('wiggleKick: no finger motion, no kick',()=>{
 assert.equal(Math.abs(wiggleKick(0,0,0,5)),0);
});
test('wiggleKick: motion along the pipe axis has no sideways component',()=>{
 assert.ok(Math.abs(wiggleKick(1,0,0,5))<1e-9,'moving along a 0deg pipe is purely axial');
});
test('wiggleKick: motion across the pipe axis kicks it',()=>{
 assert.notEqual(wiggleKick(0,1,0,5),0);
});

// --- Nearest pipe (tap hit-testing, mirrors hitGear) ---------------------------------------------
test('nearestPipe: within r+margin of centre, -1 if off both',()=>{
 const pipes=[{u:.2,v:.7,r:.07},{u:.6,v:.3,r:.05}],face={w:1,h:1.75};
 assert.equal(nearestPipe(pipes,face,.2,.7,.02),0);
 assert.equal(nearestPipe(pipes,face,.9,.9,.02),-1);
});

// --- Welding trail: heat colour ramp and weld-bead alpha -----------------------------------------
test('heatColor: freshest is white-hot, oldest is dull red, clamped outside 0..1',()=>{
 const hot=heatColor(0),cold=heatColor(1);
 assert.ok(hot.r>240&&hot.g>240&&hot.b>200,`expected near-white at f=0, got ${JSON.stringify(hot)}`);
 assert.ok(cold.r>cold.g&&cold.g>=cold.b&&cold.r<200,`expected a dull red at f=1, got ${JSON.stringify(cold)}`);
 assert.deepEqual(heatColor(-1),heatColor(0));
 assert.deepEqual(heatColor(2),heatColor(1));
});
test('heatColor: reddens monotonically as f rises (green channel falls)',()=>{
 const g=[0,.3,.6,1].map(f=>heatColor(f).g);
 for(let i=1;i<g.length;i++)assert.ok(g[i]<=g[i-1],`green should not rise: ${g}`);
});
test('weldBeadAlpha: zero before the trail cools and after it fully fades',()=>{
 assert.equal(weldBeadAlpha(0,650,1500,.35),0);
 assert.equal(weldBeadAlpha(649,650,1500,.35),0);
 assert.equal(weldBeadAlpha(650+1500+1,650,1500,.35),0);
});
test('weldBeadAlpha: full through the hold window, then fades to 0 by hotMs+beadMs',()=>{
 assert.equal(weldBeadAlpha(650,650,1500,.35),1,'just cooled: full alpha');
 assert.equal(weldBeadAlpha(650+1500*.34,650,1500,.35),1,'still in the hold window');
 const mid=weldBeadAlpha(650+1500*.67,650,1500,.35);
 assert.ok(mid>0&&mid<1,`expected a partial fade mid-way through the fade window, got ${mid}`);
 assert.ok(weldBeadAlpha(650+1500,650,1500,.35)<=1e-9,'fully faded right at the end');
});

// --- Exported effect shape -------------------------------------------------------------------------
test('cogs effect: door.glb asset, guide off (the lines are painted in), a default frame',()=>{
 assert.equal(cogs.id,'cogs');
 assert.equal(cogs.asset,'/pod/worlds/boards/cogs/door.glb');
 assert.equal(cogs.guide,null);
 assert.deepEqual(cogs.frame,DEFAULT_FRAME);
 assert.equal(typeof cogs.flip,'boolean');
 for(const fn of ['init','press','move','release','step','cut','heal','dispose'])assert.equal(typeof cogs[fn],'function',fn);
});

// --- R17 torch: spark bounce and the bead's own timeline --------------------------------------------
test('stepSpark: falls under gravity and bounces once off its floor, losing speed',()=>{
 const s={x:0,y:0,vx:100,vy:0,floor:10};
 let bounced=false;
 for(let i=0;i<120;i++){const vy=s.vy;stepSpark(s,1/60,1500,.38);if(vy>0&&s.vy<0){bounced=true;assert.ok(-s.vy<vy*.5,'the bounce keeps well under half the fall speed');}}
 assert.ok(bounced,'it hit the floor and came back up');
 assert.equal(s.floor,Infinity,'one bounce only, then it falls away');
 assert.ok(s.y>10,'after the bounce it falls past the floor');
});
test('stepSpark: a spark with no floor just falls',()=>{
 const s={x:0,y:0,vx:0,vy:0,floor:Infinity};
 for(let i=0;i<30;i++)stepSpark(s,1/60,1500,.38);
 assert.ok(s.vy>0&&s.y>0);
});
test('beadAlpha: the bead is there from the moment it is laid, holds, and is gone inside 7 s',()=>{
 assert.equal(beadAlpha(0),1);
 assert.equal(beadAlpha(KNOBS.weldHotMs),1,'still full as the glow cools off it');
 assert.equal(beadAlpha(KNOBS.weldHotMs+KNOBS.weldBeadMs+1),0);
 assert.ok(KNOBS.weldHotMs+KNOBS.weldBeadMs<=7000,"Ian's 7 s rule");
});
test('torch knobs: sparks stay capped and the metal finish is in the metal range',()=>{
 assert.ok(KNOBS.sparkMax>0&&KNOBS.sparkMax<=256);
 assert.ok(METAL.metalness>=.8&&METAL.metalness<=1);
 assert.ok(METAL.roughness>=.3&&METAL.roughness<=.45);
 assert.ok(KNOBS.tintHaloMix<=.3,'the tint only leans the halo; the sparks stay incandescent');
});

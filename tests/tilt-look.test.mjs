// iOS tilt (Ian, 16 Oct): rooms and the coach over-committed to every move and never settled. One helper, fed a
// recorded-like iPhone stream (upright, gimbal-locked gamma, a wrap) and an Android one, at 30 and 60 Hz.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createTiltLook,TILT} from '../character-phone-sensor.mjs';

const view={screen:{orientation:{angle:0}}};
const run=(hz,seconds,at)=>{const look=createTiltLook(view),rows=[];for(let i=0;i<=seconds*hz;i++){const t=i*1000/hz,e=at(t/1000,i);rows.push({t,...look.read(e,t)});}return rows;};
// iPhone held upright: beta wobbles 80-95, gamma swings +-25 deg with tiny twists (gimbal lock near beta 90), and
// every 50th reading arrives in the equivalent Euler form (180-beta, gamma-180), the wrap Android/Chrome emit.
const ios=(s,i)=>{const beta=87.5+7.5*Math.sin(s*1.3),gamma=25*Math.sin(s*9)+Math.sin(i*7.1);return i%50===25?{beta:180-beta,gamma:gamma-180}:{beta,gamma};};

test('upright iPhone stream: bounded, no jump on the gimbal swing or the wrap',()=>{
 const rows=run(60,6,ios);
 for(const r of rows)assert.ok(Math.abs(r.x)<=TILT.gain&&Math.abs(r.y)<=TILT.gain,'bounded');
 for(let i=1;i<rows.length;i++)assert.ok(Math.abs(rows[i].x-rows[i-1].x)+Math.abs(rows[i].y-rows[i-1].y)<.05,`no jump at ${rows[i].t.toFixed(0)} ms`);
 assert.ok(Math.max(...rows.map(r=>Math.abs(r.x)))<.25,'a twist of an upright phone barely moves the view (gravity hardly changes)');
 // Root cause: the old per-room math, raw gamma delta over 12 deg, slams to full look on the same stream.
 const g0=ios(0,0).gamma;assert.ok(rows.some((_,i)=>Math.abs((ios(i/60,i).gamma-g0)/12)>=1),'raw gamma would saturate');
});

test('a new hold re-centres within recentreS, and a real tilt still reads',()=>{
 const hold=s=>({beta:50,gamma:s<1?0:15}); // Android-like: phone at 50 deg, then tilted right 15 deg and held
 const rows=run(60,1+TILT.recentreS,hold),at=t=>rows.find(r=>r.t>=t*1000);
 assert.ok(at(1.05).x>.4,`tilting right looks right (${at(1.05).x})`);
 assert.ok(Math.abs(at(1+TILT.recentreS).x)<.1,`held still, it settles back toward 0 (${at(1+TILT.recentreS).x})`);
 const back=run(60,4,s=>({beta:50+(s<1?0:-20),gamma:0}));
 assert.ok(back.find(r=>r.t>=1050).y<-.4,'tipping the top toward you reads as up/down');
});

test('30 Hz and 60 Hz give the same look',()=>{
 const sweep=s=>({beta:60+10*Math.sin(s*2),gamma:20*Math.sin(s*1.5)});
 const a=run(60,5,sweep),b=run(30,5,sweep);
 for(const r of b){const q=a.find(x=>Math.abs(x.t-r.t)<1);assert.ok(Math.abs(q.x-r.x)<.02&&Math.abs(q.y-r.y)<.02,`at ${r.t.toFixed(0)} ms: ${q.x},${r.x}`);}
});

test('landscape maps the phone\'s long-edge tilt to screen x',()=>{
 const look=createTiltLook({screen:{orientation:{angle:90}}});look.read({beta:20,gamma:0},0);
 const r=look.read({beta:40,gamma:0},10);assert.ok(Math.abs(r.x)>.5&&Math.abs(r.y)<.05,JSON.stringify(r));
});

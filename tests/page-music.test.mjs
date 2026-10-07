import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {trackForRoute,loopPosition,rampPlan,duckPlan,ROUTE_TRACK,FADE_IN} from '../audio/page-music.mjs';

test('route -> track mapping follows Ian\'s list',()=>{
 const t=(id,o)=>trackForRoute(id,o);
 assert.equal(t('',{}),'main-theme-one');assert.equal(t('pod'),'main-theme-one');assert.equal(t('workout'),null);assert.equal(t('select'),null);
 assert.equal(t('',{scene:'battlepass'}),'hey-man-idk','XP Flight dialog over the pod');assert.equal(t('',{scene:null}),'main-theme-one');
 assert.deepEqual(Object.keys(ROUTE_TRACK).filter(k=>ROUTE_TRACK[k]==='hey-man-idk'),['battlepass'],'hey-man-idk is flyer-only');
 assert.equal(t('',{portalUp:true}),'main-theme-one');assert.equal(t('settings'),'main-theme-one');
 for(const id of ['achievements','vault'])assert.equal(t(id),'guarded-gate');
 assert.equal(t('customizeCoach'),'daemon-time');assert.equal(t('',{pathname:'/creature/index.html'}),'daemon-time');assert.equal(t('',{pathname:'/war-room/index.html'}),'daemon-time');
 assert.equal(t('food'),'sick-with-science');assert.equal(t('scoreboard'),'laboratory-violence');
 assert.equal(t('history'),undefined,'unmapped scenes keep the current song');
 assert.equal(t('food',{quiet:true}),null,'camera workout is silent');assert.equal(t('meditate'),null);
 const manifest=JSON.parse(readFileSync('audio/music/manifest.json','utf8'));
 for(const name of new Set(Object.values(ROUTE_TRACK).filter(Boolean)))assert.ok(manifest.tracks[name],name+' has a loop');
});
test('resume offset: wraps the loop and survives a cut at any time',()=>{
 const base={duration:16,startedAt:10};
 assert.equal(loopPosition({...base,startOffset:0,now:14.5}),4.5);
 assert.ok(Math.abs(loopPosition({...base,startOffset:0,now:10+16*3+2.25})-2.25)<1e-9,'wraps whole loops');
 assert.equal(loopPosition({...base,startOffset:15,now:12}),1,'start offset plus elapsed wraps');
 assert.equal(loopPosition({...base,startOffset:0,now:10}),0);
});
test('ramp schedule: 3 s fade in, grimoire theme 5 s up to 35 %',()=>{
 assert.deepEqual(rampPlan('hey-man-idk',2),{from:0,to:1,start:2,end:2+FADE_IN});assert.equal(FADE_IN,3);
 assert.deepEqual(rampPlan('main-theme-one',1),{from:0,to:.35,start:1,end:6});
});
test('ducking falls fast and recovers slowly',()=>{
 const down=duckPlan(true),up=duckPlan(false);assert.ok(down.seconds<up.seconds/5);assert.ok(down.to<1&&up.to===1);
});

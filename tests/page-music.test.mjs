import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {trackForRoute,loopPosition,rampPlan,duckPlan,ROUTE_TRACK,FADE_IN,FADE_OUT,createPageMusic} from '../audio/page-music.mjs';

test('route -> track mapping follows Ian\'s list',()=>{
 const t=(id,o)=>trackForRoute(id,o);
 assert.equal(t('',{}),'main-theme-one');assert.equal(t('pod'),'main-theme-one');assert.equal(t('workout'),null);assert.equal(t('select'),null);
 assert.equal(t('',{scene:'battlepass'}),'hey-man-idk','XP Flight dialog over the pod');assert.equal(t('',{scene:null}),'main-theme-one');
 assert.deepEqual(Object.keys(ROUTE_TRACK).filter(k=>ROUTE_TRACK[k]==='hey-man-idk'),['battlepass'],'hey-man-idk is flyer-only');
 assert.equal(t('',{portalUp:true}),null,'grimoire is silent');assert.equal(t('portal'),null);assert.equal(t('food',{hold:true}),null,'silent through the trace/tunnel');assert.equal(t('settings'),'main-theme-one');
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

// ---- fake audio: read the gain automation instead of listening ----------------------------------------------
function rig(){
 const listeners={},calls=[];let now=0;
 const param=()=>({value:0,ev:[],cancelScheduledValues(){},setValueAtTime(v,t){this.value=v;this.ev.push(['set',v,t]);},linearRampToValueAtTime(v,t){this.ev.push(['ramp',v,t]);},exponentialRampToValueAtTime(){},setTargetAtTime(){}});
 const node=()=>({connect(n){return n;},disconnect(){},start(){},stop(){},gain:param(),frequency:param(),Q:{},threshold:{},ratio:{},playbackRate:{},type:''});
 const ctx={state:'running',get currentTime(){return now;},destination:node(),sampleRate:8000,createGain(){const n=node();calls.push(n);return n;},createOscillator:node,createBufferSource:node,createBiquadFilter:node,createDynamicsCompressor:node,createBuffer:()=>({getChannelData:()=>new Float32Array(8)}),decodeAudioData:async()=>({duration:16}),resume:async()=>{},suspend:async()=>{}};
 const doc={hidden:false,body:{dataset:{}},getElementById:()=>null,addEventListener(){},removeEventListener(){}};
 const win={addEventListener(t,f){(listeners[t]??=[]).push(f);},dispatch(t,detail){for(const f of listeners[t]||[])f({detail});},myr5Routes:{current:()=>''}};win.parent=win;
 const fetchRef=async url=>({ok:true,json:async()=>url.includes('music')?{tracks:{'main-theme-one':{url:'/a'},'sick-with-science':{url:'/b'},'hey-man-idk':{url:'/c'}}}:{cues:{}},arrayBuffer:async()=>new ArrayBuffer(1)});
 globalThis.MutationObserver??=class{observe(){}};
 const m=createPageMusic({sound:{context:ctx,unlock(){},muted:false,board:'quilt'},documentRef:doc,windowRef:win,fetchRef,pathname:'/'});
 return {m,win,doc,ctx,tick:ms=>{now+=ms/1000;},flush:()=>new Promise(r=>setTimeout(r,20))};
}
const gainOf=m=>m.log; // fade-in/out entries: {what,v0,v1,t0,t1}
test('portal home is silent; destination track starts only after the portal transition ends, then fades in 3 s',async()=>{
 const r=rig(),{m,win}=r;m.mount();m.unlock();
 win.dispatch('myr5:route',{});r.m.sync();await r.flush();assert.equal(m.current(),'main-theme-one','pod plays');
 // grimoire opens (route id '' + portal up) -> fade out ~1 s
 r.doc.getElementById=id=>id==='portalHome'?{hidden:false}:null;m.sync();await r.flush();
 assert.equal(m.current(),null,'grimoire: no track');
 const out=m.log.filter(l=>l.what==='fade-out').pop();assert.ok(out&&out.t1-out.t0<=1.5,'faded out in about a second');
 // trace -> tunnel: hold, then the route changes underneath
 win.dispatch('myr5:music-hold',{hold:true});win.myr5Routes.current=()=>'food';win.dispatch('myr5:route',{id:'food'});await r.flush();
 assert.equal(m.current(),null,'nothing during the tunnel');
 r.tick(2000);win.dispatch('myr5:music-hold',{hold:false});await r.flush();
 assert.equal(m.current(),'sick-with-science','starts once the transition is over');
 const fin=m.log.filter(l=>l.what==='fade-in').pop();assert.equal(fin.t0,2);assert.equal(fin.t1-fin.t0,FADE_IN);
});
test('dialog scene (XP Flight) fades in on open and out ~1.2 s on close, back to the page track',async()=>{
 const r=rig(),{m,win}=r;m.mount();m.unlock();m.sync();await r.flush();assert.equal(m.current(),'main-theme-one');
 r.tick(10000);win.dispatch('myr5:music-scene',{scene:'battlepass'});await r.flush();
 assert.equal(m.current(),'hey-man-idk');
 const inn=m.log.filter(l=>l.what==='fade-in').pop();assert.equal(inn.t1-inn.t0,FADE_IN);
 r.tick(5000);win.dispatch('myr5:music-scene',{scene:null});await r.flush();
 const out=m.log.filter(l=>l.what==='fade-out').pop();assert.equal(+(out.t1-out.t0).toFixed(2),FADE_OUT);assert.ok(FADE_OUT>=1&&FADE_OUT<=1.5);
 assert.equal(m.current(),'main-theme-one');
 // over the grimoire the same close drops to silence
 r.doc.getElementById=id=>id==='portalHome'?{hidden:false}:null;win.dispatch('myr5:music-scene',{scene:'battlepass'});await r.flush();
 win.dispatch('myr5:music-scene',{scene:null});await r.flush();assert.equal(m.current(),null);
});

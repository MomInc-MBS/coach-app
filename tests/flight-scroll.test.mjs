import test from 'node:test';
import assert from 'node:assert/strict';
import {flightScrollSpeed,mountFlightScroll} from '../flight-scroll.mjs';

test('flight scroll reverses at the middle and accelerates symmetrically toward both edges',()=>{
 assert.equal(flightScrollSpeed(300,100,400),0);
 assert.equal(flightScrollSpeed(100,100,400),-1600);
 assert.equal(flightScrollSpeed(500,100,400),1600);
 assert.equal(flightScrollSpeed(200,100,400),-400);
 assert.equal(flightScrollSpeed(400,100,400),400);
 assert.equal(flightScrollSpeed(-200,100,400),-1600);
 assert.equal(flightScrollSpeed(900,100,400),1600);
 assert.equal(flightScrollSpeed(0,0,0),0);
});

test('holding a stationary finger keeps scrolling; center and release stop movement',()=>{
 let callback,cancelled=false;
 const viewport={scrollTop:1000,getBoundingClientRect:()=>({top:100,height:400})};
 const scroll=mountFlightScroll(viewport,{requestFrame:f=>(callback=f,1),cancelFrame:()=>cancelled=true,now:()=>0});
 scroll.aim(100);callback(20);assert.equal(viewport.scrollTop,968);
 callback(40);assert.equal(viewport.scrollTop,936);
 scroll.aim(500);callback(60);assert.equal(viewport.scrollTop,968);
 scroll.aim(300);callback(80);assert.equal(viewport.scrollTop,968);
 scroll.stop();assert(cancelled);callback(100);assert.equal(viewport.scrollTop,968);
});

test('one achievements page: sections map to clamped scroll targets and hyper-jumps stay within the tuned time',async()=>{
 const {flightSections,sectionScrollTop,hyperDuration,hyperEase,FLIGHT_TUNING}=await import('../flight-scroll.mjs');
 const sections=flightSections(25);
 assert.equal(sections.length,26);
 assert.deepEqual(sections[0],{id:'system-1',chapter:0});
 assert.deepEqual(sections.at(-1),{id:'coaches',chapter:null});
 // A marker 5000px down a 600px screen lands at the land line; the top and the bottom clamp to the scroll range.
 assert.equal(sectionScrollTop(5000,600,30000),5000-600*FLIGHT_TUNING.landLine);
 assert.equal(sectionScrollTop(0,600,30000),0);
 assert.equal(sectionScrollTop(29990,600,30000),29400);
 assert.equal(sectionScrollTop(1000,600,30000,.6),640);
 assert.equal(hyperDuration(10),FLIGHT_TUNING.hyperMinMs);
 assert.equal(hyperDuration(-1e6),FLIGHT_TUNING.hyperMaxMs);
 assert.equal(hyperDuration(28000),1000);
 assert.equal(hyperEase(0),0);assert.equal(hyperEase(1),1);assert.equal(hyperEase(.5),.5);
});

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

import assert from 'node:assert/strict';
import test from 'node:test';
import {mountMenuLifecycle} from '../menu-lifecycle.mjs';

class Frame{
 constructor(src){this.tagName='IFRAME';this.attrs=new Map([['src',src]]);this.parent=null;}
 getAttribute(name){return this.attrs.has(name)?this.attrs.get(name):null;}
 setAttribute(name,value){this.attrs.set(name,value);}
 removeAttribute(name){this.attrs.delete(name);}
 closest(selector){return selector==='dialog'?this.parent:null;}
 matches(selector){return selector==='iframe';}
 querySelectorAll(){return [];}
}
class Dialog{
 constructor(id,frame){this.id=id;this.tagName='DIALOG';this.open=true;this.hidden=false;this.dataset={route:id};this.frame=frame;frame.parent=this;this.closeCount=0;}
 matches(selector){return selector===`#${this.id}`;}
 querySelectorAll(selector){return selector==='iframe'?[this.frame]:[];}
 close(){this.open=false;this.closeCount++;}
}
function fixture(){
 const frameA=new Frame('/one.html'),frameB=new Frame('/two.html');
 const a=new Dialog('a',frameA),b=new Dialog('b',frameB);
 const doc=new EventTarget();doc.hidden=false;doc.documentElement={};
 doc.querySelectorAll=selector=>selector==='dialog'?[a,b]:selector==='iframe'?[frameA,frameB]:[];
 doc.querySelector=selector=>[a,b].find(x=>x.matches(selector))||null;
 doc.getElementById=id=>[a,b].find(x=>x.id===id)||null;
 const win=new EventTarget();win.CustomEvent=class extends Event{constructor(name,{detail}){super(name);this.detail=detail;}};
 const lifecycle=mountMenuLifecycle({doc,win,routes:{a:{dialog:'#a'},b:{dialog:'#b'}}});
 return {a,b,frameA,frameB,doc,win,lifecycle};
}

test('route switch closes old menu and disposes its resources once',()=>{
 const {a,b,frameA,lifecycle,win}=fixture(),calls=[],events=[];
 win.addEventListener('myr5:menu-leave',event=>events.push(event.detail));
 lifecycle.registerMenuResource('a',{dispose:reason=>calls.push(`stop:${reason}`),reopen:()=>calls.push('reopen')});
 lifecycle.closeInactive(b);
 assert.equal(a.open,false);assert.equal(b.open,true);
 assert.equal(frameA.getAttribute('src'),'about:blank');
 assert.deepEqual(calls,['stop:route-switch']);
 assert.equal(events.length,1);
 lifecycle.leave('a','dialog-close');assert.equal(events.length,1);
 a.open=true;lifecycle.enter('a');assert.equal(frameA.getAttribute('src'),'/one.html');
 assert.deepEqual(calls,['stop:route-switch','reopen']);
 lifecycle.dispose();
});

test('page hide closes menus, blanks embedded sessions, and does not reopen on return',()=>{
 const {a,b,frameA,frameB,doc,lifecycle}=fixture();
 doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));
 assert.equal(a.open,false);assert.equal(b.open,false);
 assert.equal(frameA.getAttribute('src'),'about:blank');assert.equal(frameB.getAttribute('src'),'about:blank');
 doc.hidden=false;doc.dispatchEvent(new Event('visibilitychange'));
 assert.equal(a.closeCount,1);assert.equal(frameA.getAttribute('src'),'about:blank');
 doc.hidden=true;a.open=true;lifecycle.enter(a);
 assert.equal(a.open,false);assert.equal(frameA.getAttribute('src'),'about:blank');
 doc.hidden=false;
 a.open=true;lifecycle.enter(a);assert.equal(frameA.getAttribute('src'),'/one.html');
 lifecycle.dispose();
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {bootCoach} from '../launch-bootstrap.mjs';
function page(){
 const nodes=[];const document={getElementById:id=>nodes.find(n=>n.id===id),createElement:tag=>({tag,style:{},children:[],setAttribute(){},append(...children){this.children.push(...children);},replaceChildren(){this.children=[];},showModal(){this.open=true;},close(){this.open=false;}}),body:{append(node){nodes.push(node);}}};
 return document;
}
test('failed startup offers a reload instead of a setup redirect',async t=>{
 t.mock.method(console,'error',()=>{});const document=page();
 assert.equal(await bootCoach({document,load:async()=>{throw Error('stale cached module');}}),false);
 const gate=document.getElementById('coachStartupRecovery');assert.equal(gate.open,true);
 assert.equal(gate.children[2].textContent,'Reload Coach');assert.match(gate.children[2].href,/^\/pose.html\?reconnect=/);
 assert(!gate.children.some(node=>node.href?.includes('onboarding')));
});
test('successful startup never shows recovery and a stalled startup can still finish',async t=>{
 t.mock.method(console,'error',()=>{});const document=page();
 assert.equal(await bootCoach({document,load:async()=>{}}),true);assert.equal(document.getElementById('coachStartupRecovery'),undefined);
 let finish;const pending=bootCoach({document,timeout:5,load:()=>new Promise(resolve=>{finish=resolve;})});
 await new Promise(resolve=>setTimeout(resolve,15));assert.equal(document.getElementById('coachStartupRecovery').open,true);
 finish();assert.equal(await pending,true);assert.equal(document.getElementById('coachStartupRecovery').open,false);
});

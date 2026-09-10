import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

test('update notifications offer download, open a closed app, and preserve an open workout',async()=>{
 const handlers={},shown=[],opened=[],messages=[];let clients=[],focused=0,navigated=0;
 const self={location:{origin:'https://coach.test'},addEventListener:(type,handler)=>handlers[type]=handler,registration:{showNotification:async(title,options)=>shown.push({title,options})},clients:{matchAll:async()=>clients,openWindow:async url=>opened.push(url)}};
 runInNewContext(await readFile('sw.js','utf8'),{self,URL});
 const data={kind:'app-update',title:'Coach update ready to download',body:'Tap to download.',tag:'myr5-update-build-2',url:'/pose.html?panel=install&update=build-2'};
 let pending;
 handlers.push({data:{json:()=>data},waitUntil:p=>pending=p});await pending;
 assert.equal(shown[0].options.actions[0].title,'Download update');assert.equal(shown[0].options.tag,data.tag);
 const click=async(notificationData)=>{handlers.notificationclick({notification:{close(){},data:notificationData},waitUntil:p=>pending=p});await pending;};
 await click(shown[0].options.data);assert.equal(opened[0],'https://coach.test'+data.url);
 clients=[{url:'https://coach.test/pose.html',focus:async()=>focused++,navigate:async()=>navigated++,postMessage:message=>messages.push(message)}];
 await click(shown[0].options.data);assert.equal(focused,1);assert.equal(navigated,0);assert.equal(messages[0].type,'APP_UPDATE_AVAILABLE');
 await click({url:'https://untrusted.test/',kind:'app-update'});assert.equal(focused,1);assert.equal(opened.length,1);
 handlers.push({data:{json:()=>({title:'Water reminder',url:'/pose.html?panel=reminders'})},waitUntil:p=>pending=p});await pending;
 assert.equal(shown[1].options.actions,undefined);await click(shown[1].options.data);assert.equal(navigated,1);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {APPLE_BASIC_SHARE_URL} from '../apple-basic-share-config.mjs';
import {shareAppleBasic,mountAppleBasicShare} from '../apple-basic-share.mjs';

const EXAMPLE='https://example.invalid/apple-basic'; // test-only placeholder

function fakeDom(){
 const make=()=>({children:[],attrs:{},append(...c){this.children.push(...c);},setAttribute(k,v){this.attrs[k]=v;}});
 globalThis.document={createElement:make};
 return {children:[],append(...c){this.children.push(...c);}};
}

test('shipped config mounts a share action for the separate public Apple basic app',()=>{
 assert.equal(APPLE_BASIC_SHARE_URL,'https://mom-inc-fitness-basic.ianmyersrocks97.chatgpt.site');
 assert.ok(!APPLE_BASIC_SHARE_URL.includes('myr5.mominc.online'));
 const settings=fakeDom();
 const wrap=mountAppleBasicShare(settings,{nav:{}});
 assert.equal(settings.children.length,1);
 assert.equal(wrap.children[0].textContent,'Share Apple basic');
});

test('uses navigator.share when available',async()=>{
 let arg;
 assert.equal(await shareAppleBasic(EXAMPLE,{share:async a=>{arg=a;}}),'shared');
 assert.equal(arg.url,EXAMPLE);
});

test('falls back to clipboard when share is missing or fails',async()=>{
 let copied;
 const clipboard={writeText:async t=>{copied=t;}};
 assert.equal(await shareAppleBasic(EXAMPLE,{clipboard}),'copied');
 assert.equal(copied,EXAMPLE);
 assert.equal(await shareAppleBasic(EXAMPLE,{share:async()=>{throw new Error('x');},clipboard}),'copied');
});

test('user cancel does not copy; total failure reports failed',async()=>{
 const abort=Object.assign(new Error('a'),{name:'AbortError'});
 let copied=false;
 assert.equal(await shareAppleBasic(EXAMPLE,{share:async()=>{throw abort;},clipboard:{writeText:async()=>{copied=true;}}}),'cancelled');
 assert.equal(copied,false);
 assert.equal(await shareAppleBasic(EXAMPLE,{}),'failed');
 assert.equal(await shareAppleBasic(null,{share:async()=>{}}),'unavailable');
});

test('configured mount renders a button plus role=status and announces the result',async()=>{
 const settings=fakeDom();
 const wrap=mountAppleBasicShare(settings,{url:EXAMPLE,nav:{clipboard:{writeText:async()=>{}}}});
 const [button,status]=wrap.children;
 assert.equal(button.textContent,'Share Apple basic');
 assert.equal(status.attrs.role,'status');
 await button.onclick();
 assert.match(status.textContent,/copied/i);
});

test('no QR or full-app install link in the share sources',()=>{
 for(const f of ['../apple-basic-share.mjs','../apple-basic-share-config.mjs']){
  const src=readFileSync(new URL(f,import.meta.url),'utf8');
  assert.doesNotMatch(src,/qr|itms-apps|testflight|apps\.apple\.com|\.ipa|\.apk/i);
 }
});

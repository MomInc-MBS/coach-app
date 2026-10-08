import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright';

const bundle=(await build({entryPoints:['creature/source/preview-idle.ts'],bundle:true,format:'esm',platform:'browser',target:'es2022',write:false})).outputFiles[0].text;
const css=await readFile(resolve('creature/preview-window.css'),'utf8');
const html='<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/preview-window.css"><style>html,body{margin:0;height:100%;font:16px sans-serif}.preview-bay{position:relative;width:320px;height:220px;background:#333}.preview-readout,.preview-toolbar,.preview-strip{position:absolute}.preview-toolbar{bottom:0}.outside{margin-top:20px}</style><section id="bay" class="preview-bay"><div class="preview-readout">Readout</div><button class="preview-toolbar editor-tilt-request">Toolbar</button><div class="preview-strip">Strip</div><input aria-label="inside input"></section><button class="outside">Outside</button><script type="module">import {mountPreviewIdle} from "/preview-idle.mjs";window.mountPreviewIdle=mountPreviewIdle;</script>';
const server=createServer((req,res)=>{
 const path=new URL(req.url,'http://local').pathname;
 if(path==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}
 if(path==='/preview-idle.mjs'){res.setHeader('Content-Type','text/javascript');res.end(bundle);return;}
 if(path==='/preview-window.css'){res.setHeader('Content-Type','text/css');res.end(css);return;}
 res.writeHead(404);res.end();
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({channel:'msedge',headless:true});
after(async()=>{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));});

async function pageWithBay(t){
 const page=await browser.newPage({viewport:{width:375,height:812}});t.after(()=>page.close());
 await page.goto('http://127.0.0.1:'+server.address().port+'/');
 await page.waitForFunction(()=>typeof window.mountPreviewIdle==='function');
 return page;
}
const mount=(page,delay)=>page.evaluate(delay=>window.__disposePreview=window.mountPreviewIdle(document.querySelector('#bay'),delay),delay);
const fire=(page,type,target='#bay',pointerId=1)=>page.evaluate(([type,target,pointerId])=>{
 const node=target==='window'?window:document.querySelector(target);
 const event=type.startsWith('pointer')?new PointerEvent(type,{bubbles:true,cancelable:true,pointerId,pointerType:'mouse'}):new Event(type,{bubbles:true,cancelable:true});
 node.dispatchEvent(event);
},[type,target,pointerId]);
const idle=page=>page.locator('#bay').getAttribute('data-idle');
const waitIdle=async(page,expected)=>page.waitForFunction(expected=>document.querySelector('#bay').dataset.idle===expected,expected);

test('preview begins visible, fades its glass controls after inactivity, and waits the full three seconds',async t=>{
 const page=await pageWithBay(t);await mount(page,3000);
 assert.equal(await idle(page),'false','the bay is visible when mounted');
 assert.equal(await page.locator('.preview-readout').evaluate(el=>getComputedStyle(el).opacity),'1');
 await page.waitForTimeout(2850);assert.equal(await idle(page),'false','the initial timeout is not shortened');
 await waitIdle(page,'true');
 await page.waitForTimeout(300);
 assert.equal(await page.locator('.preview-readout').evaluate(el=>getComputedStyle(el).opacity),'0');
 assert.equal(await page.locator('.preview-toolbar').evaluate(el=>getComputedStyle(el).opacity),'0');
 assert.equal(await page.locator('.preview-strip').evaluate(el=>getComputedStyle(el).opacity),'0');
});

test('local activity restores immediately and any held pointer prevents the idle timeout',async t=>{
 const page=await pageWithBay(t);await mount(page,140);await waitIdle(page,'true');
 await fire(page,'pointerdown','#bay',11);assert.equal(await idle(page),'false','pointerdown reveals controls synchronously');
 await page.waitForTimeout(220);assert.equal(await idle(page),'false','a held pointer blocks hiding past the delay');
 await fire(page,'pointerdown','#bay',12);await fire(page,'pointerup','window',11);
 await page.waitForTimeout(220);assert.equal(await idle(page),'false','one remaining pointer still blocks hiding');
 await fire(page,'pointerup','window',12);await waitIdle(page,'true');
 assert.equal(await idle(page),'true','release outside the bay starts a fresh idle delay');
});

test('pointercancel, focus, keyboard, wheel, and input in the bay restore the controls',async t=>{
 const page=await pageWithBay(t);await mount(page,120);await waitIdle(page,'true');
 await fire(page,'pointerdown','#bay',7);await fire(page,'pointercancel','window',7);assert.equal(await idle(page),'false','pointercancel releases a held pointer and restores controls');
 await waitIdle(page,'true');
 for(const [type,target] of [['focusin','#bay input'],['keydown','#bay input'],['input','#bay input'],['wheel','#bay']]){
  await fire(page,type,target);assert.equal(await idle(page),'false',`${type} inside the bay restores controls`);
  await waitIdle(page,'true');
 }
});

test('activity outside the bay does not reveal it, and disposal cancels timers and listeners',async t=>{
 const page=await pageWithBay(t);await mount(page,100);await waitIdle(page,'true');
 for(const [type,target] of [['pointerdown','.outside'],['keydown','.outside'],['wheel','.outside'],['input','.outside']])await fire(page,type,target);
 await page.waitForTimeout(30);assert.equal(await idle(page),'true','activity outside the bay leaves it idle');

 await page.evaluate(()=>{window.__idleChanges=[];new MutationObserver(records=>window.__idleChanges.push(...records.map(r=>r.target.dataset.idle))).observe(document.querySelector('#bay'),{attributes:true,attributeFilter:['data-idle']});});
 // Keep a short, active timer pending when teardown runs, then try every listener path again.
 await fire(page,'pointerdown','#bay',31);
 await page.evaluate(()=>{window.__idleChanges=[];window.__disposePreview();});
 for(const [type,target] of [['pointerdown','#bay'],['pointermove','#bay'],['pointerup','window'],['pointercancel','window'],['focusin','#bay input'],['keydown','#bay input'],['input','#bay input'],['wheel','#bay']])await fire(page,type,target,31);
 await page.waitForTimeout(160);
 assert.equal(await idle(page),'false','disposed timer cannot hide the bay');
 assert.deepEqual(await page.evaluate(()=>window.__idleChanges),[],'disposed listeners cannot mutate the idle state');
});

test('idle tilt controls cannot steal hits, and pointerdown restores the glass instantly',async t=>{
 const page=await pageWithBay(t);await mount(page,100);await waitIdle(page,'true');
 // Model the late-loaded housing rule that makes tilt controls pointer-active.
 await page.addStyleTag({content:'.editor-tilt-request{pointer-events:auto}'});
 const before=await page.locator('.editor-tilt-request').evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.className;});
 assert.equal(before,'preview-bay','an idle toolbar descendant cannot intercept the bay hit');
 const box=await page.locator('.editor-tilt-request').boundingBox();
 await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
 assert.equal(await idle(page),'false','the pointerdown lands on the bay and restores the preview');
 assert.equal(await page.locator('.preview-readout').evaluate(el=>getComputedStyle(el).opacity),'1','readout is fully visible on the same frame as the touch');
 assert.equal(await page.locator('.preview-toolbar').evaluate(el=>getComputedStyle(el).transitionDuration),'0s','the reveal skips the fade transition');
 const after=await page.locator('.editor-tilt-request').evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.className;});
 assert.equal(after,'preview-toolbar editor-tilt-request','toolbar control becomes hit-testable immediately when visible');
});

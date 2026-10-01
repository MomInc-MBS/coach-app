import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
let browser,source;
test.before(async()=>{source=await readFile('modules/phone-orientation.mjs','utf8');browser=await chromium.launch({channel:'msedge',headless:true});});
test.after(async()=>browser?.close());
async function fixture({phone=true,type='portrait-primary',lock='reject',popover=true}={}){
 const context=await browser.newContext({viewport:{width:375,height:667},userAgent:phone?'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)':'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)'}),page=await context.newPage();
 await page.setContent('<button id="under">Underlying action</button><dialog id="app"><button>App action</button></dialog>');
 await page.evaluate(async({source,type,lock,popover})=>{
  if(!popover){HTMLElement.prototype.showPopover=undefined;HTMLElement.prototype.hidePopover=undefined;}
  const orientation=new EventTarget();orientation.type=type;window.calls=[];window.unlocks=0;
  orientation.lock=kind=>{calls.push(kind);return lock==='pending'?new Promise(r=>window.resolveLock=r):lock==='success'?Promise.resolve():Promise.reject(new Error('unsupported'));};
  if(lock==='absent')delete orientation.lock;
  orientation.unlock=()=>window.unlocks++;Object.defineProperty(screen,'orientation',{configurable:true,value:orientation});
  window.rotate=type=>{orientation.type=type;orientation.dispatchEvent(new Event('change'));};
  window.mod=await import(URL.createObjectURL(new Blob([source],{type:'text/javascript'})));window.cleanup=mod.mountPhoneOrientation();
 },{source,type,lock,popover});
 return{context,page};
}
test('phone requests portrait lock, ignores keyboard viewport shape, and cleans up successful and pending locks',async()=>{
 for(const lock of ['success','pending']){const{context,page}=await fixture({lock});try{
  assert.deepEqual(await page.evaluate(()=>calls),['portrait-primary']);await page.setViewportSize({width:667,height:300});assert.equal(await page.locator('[data-phone-portrait-notice]').isVisible(),false);
  await page.evaluate(()=>{cleanup();if(window.resolveLock)resolveLock();});await page.waitForFunction(()=>unlocks===1);assert.equal(await page.locator('[data-phone-portrait-notice]').count(),0);
  await page.evaluate(()=>{rotate('landscape-primary');dispatchEvent(new Event('resize'));});assert.equal(await page.locator('[data-phone-portrait-notice]').count(),0);assert.equal(await page.locator('[data-phone-orientation-style]').count(),0);
 }finally{await context.close();}}
});
for(const popover of [true,false])test(`unsupported phone lock blocks landscape above modal dialogs (${popover?'popover':'dialog fallback'})`,async()=>{
 const{context,page}=await fixture({type:'landscape-primary',popover});try{
  await page.evaluate(()=>document.querySelector('#app').showModal());await page.waitForTimeout(40);
  const notice=page.locator('[data-phone-portrait-notice]');assert.equal(await notice.isVisible(),true);
  assert.equal(await notice.evaluate(el=>{const r=el.getBoundingClientRect();return r.width>=innerWidth&&r.height>=innerHeight&&el.contains(document.elementFromPoint(innerWidth/2,innerHeight/2));}),true,'full-screen guard is above the app modal');
  await page.evaluate(()=>{window.keys=0;document.addEventListener('keydown',()=>keys++);});await page.keyboard.press('Escape');await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>keys),0);assert.equal(await notice.isVisible(),true,'Escape cannot dismiss the landscape guard');
  await page.evaluate(()=>rotate('portrait-primary'));assert.equal(await notice.isVisible(),false);assert.equal(await page.locator('#app').evaluate(el=>el.open),true,'portrait resumes the existing app dialog');await page.evaluate(()=>cleanup());
 }finally{await context.close();}
});
test('tablet stays flexible and missing lock API still guards physical phone landscape',async()=>{
 const tablet=await fixture({phone:false,type:'landscape-primary'});try{assert.deepEqual(await tablet.page.evaluate(()=>calls),[]);assert.equal(await tablet.page.locator('[data-phone-portrait-notice]').count(),0);}finally{await tablet.context.close();}
 const phone=await fixture({lock:'absent',type:'landscape-secondary'});try{assert.equal(await phone.page.locator('[data-phone-portrait-notice]').isVisible(),true);await phone.page.evaluate(()=>rotate('portrait-primary'));assert.equal(await phone.page.locator('[data-phone-portrait-notice]').isVisible(),false);}finally{await phone.context.close();}
});

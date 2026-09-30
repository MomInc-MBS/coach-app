import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {chromium} from 'playwright';

test('quick setup offers a no-limits answer and preserves described limits',async()=>{
 const root=resolve('.');
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();
  await page.route('http://setup.test/**',async route=>{
   const path=new URL(route.request().url()).pathname;
   if(path==='/')return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><div id="root"></div>'});
   const file=resolve(root,'.'+path);
   if(!file.startsWith(root+sep)||!file.endsWith('.mjs'))return route.fulfill({status:404,body:'Not found'});
   return route.fulfill({status:200,contentType:'text/javascript',body:await readFile(file,'utf8')});
  });
  await page.goto('http://setup.test/');
  const mount=()=>page.evaluate(async()=>{
   const {mountQuickSetup}=await import('/quick-setup-form.mjs');
   window.saved=null;
   mountQuickSetup(document.querySelector('#root'),{entryRoute:'office',profile:{},answers:{}},{save:async data=>{window.saved=data;}});
  });
  const start=page.getByRole('button',{name:'Start my coach'});
  await mount();
  await page.locator('select[name=goal]').selectOption('Build a routine');
  await page.locator('input[name=sessionMinutes]').fill('10');
  assert.equal(await start.isEnabled(),true,'limits are optional in Release 9');
  await page.getByRole('button',{name:'No limits'}).click();
  assert.equal(await page.locator('textarea[name=limits]').inputValue(),'None');
  assert.equal(await start.isEnabled(),true,'one tap unlocks setup for someone with no limits');
  await start.click();
  assert.equal(await page.evaluate(()=>window.saved?.answers?.armie?.q3),'None');

  await mount();
  await page.locator('select[name=goal]').selectOption('Build a routine');
  await page.locator('input[name=sessionMinutes]').fill('10');
  await page.locator('textarea[name=limits]').fill('Avoid jumping');
  assert.equal(await start.isEnabled(),true);
  await start.click();
  assert.equal(await page.evaluate(()=>window.saved?.answers?.armie?.q3),'Avoid jumping');
 }finally{await browser.close();}
});

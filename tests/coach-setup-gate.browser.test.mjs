import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium} from 'playwright';

// W1-1C #10/#11: a signed-out visitor with no saved plan on this device is a true dead end (Coach
// has nothing to render), so #coachSetupGate must still block — but it must now say why in one line
// and always offer a working Sign in (reconnect) next to Get started, not just "Open installed Coach".
test('signed-out dead-end gate explains why it blocks and offers a real Sign in alongside Get started',async()=>{
 const bundle=await build({entryPoints:['coach-profile.mjs'],bundle:true,write:false,format:'esm',target:'es2022'});
 const server=createServer((req,res)=>{
  if(req.url==='/profile.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);return;}
  if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><body></body>');return;}
  res.writeHead(503);res.end();
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);
  const result=await page.evaluate(async()=>{
   const {clearCoachAccount,applyCoachAccount}=await import('/profile.js');
   clearCoachAccount(); // signed out, nothing saved on this device: the actual dead end
   const gate=document.getElementById('coachSetupGate'),signIn=document.getElementById('gateSignIn'),primary=gate.querySelector('a');
   const deadEnd={open:gate.open,message:gate.querySelector('p').textContent,signInVisible:signIn.style.display!=='none',signInHref:signIn.getAttribute('href'),primaryText:primary.textContent,primaryHref:primary.getAttribute('href')};
   applyCoachAccount({entitlements:{},progress:{},onboarding:null}); // signed in, setup just incomplete: Sign in no longer applies
   const midSetup={signInVisible:signIn.style.display!=='none',primaryText:primary.textContent};
   return {deadEnd,midSetup};
  });
  assert.equal(result.deadEnd.open,true,'must still block: there is no plan data to render the app around');
  assert.match(result.deadEnd.message,/Sign in/,'says why it is blocking, in one line');
  assert.equal(result.deadEnd.signInVisible,true,'a working Sign in action is always offered, not just when already installed');
  assert.match(result.deadEnd.signInHref,/^\/signin\.html\?return_to=/,'reuses the existing sign-in flow, no invented auth');
  assert.equal(result.deadEnd.primaryText,'Get started');
  assert.equal(result.deadEnd.primaryHref,'/install.html');
  assert.equal(result.midSetup.signInVisible,false,'Sign in from the dead-end state must not leak into the already-signed-in, setup-incomplete state');
  assert.equal(result.midSetup.primaryText,'Continue coach setup');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});

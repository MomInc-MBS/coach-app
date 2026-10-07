// Drives the vault-door preview at 375x812 touch and asserts the L7 behaviours: node scripts/vault-l7-shots.cjs
// Starts scripts/vault-l7-preview.cjs itself. Shots -> .vault/shots/L7-*.png, poster -> pod/worlds/vault/door-poster.webp
const {chromium}=require('../node_modules/playwright'),{spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),PORT=process.env.MYR5_VAULT_PORT||8907;
(async()=>{
 const srv=spawn(process.execPath,[path.join(__dirname,'vault-l7-preview.cjs')],{env:{...process.env,MYR5_VAULT_PORT:PORT},stdio:'ignore'});await new Promise(r=>setTimeout(r,800));
 fs.mkdirSync(path.join(root,'.vault/shots'),{recursive:true});
 const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']}),ctx=await b.newContext({viewport:{width:375,height:812},hasTouch:true,deviceScaleFactor:2}),page=await ctx.newPage();
 const logs=[];page.on('console',m=>{if(m.type()==='error'&&!/404/.test(m.text()))logs.push(m.text())});page.on('pageerror',e=>logs.push('pageerror '+e.message));
 try{
  await page.goto('http://127.0.0.1:'+PORT+'/');await page.waitForFunction(()=>window.ready||window.errors.length,null,{timeout:90000});
  assert.deepEqual(await page.evaluate(()=>window.errors),[]);
  const info=()=>page.evaluate(()=>vault.info()),P=(u,v)=>page.evaluate(([u,v])=>vault.project(u,v),[u,v]);
  const shot=async n=>{await page.waitForTimeout(1800);await page.screenshot({path:path.join(root,'.vault/shots/L7-'+n+'.png')});};
  const drag=async(pts,hold=false)=>{const a=await P(...pts[0]);await page.mouse.move(a.x,a.y);await page.mouse.down();for(const q of pts.slice(1)){const p=await P(...q);await page.mouse.move(p.x,p.y,{steps:3});}if(!hold)await page.mouse.up();};
  const ring=(c,R,a0,a1,n)=>Array.from({length:n+1},(_,i)=>{const a=a0+(a1-a0)*i/n;return [c[0]+Math.sin(a)*R,c[1]-Math.cos(a)*R];});
  await shot('01-idle');
  let i0=await info();assert.equal(i0.shadows,false,'shadows off when idle');assert.equal(i0.awake,false,'no free-running RAF');
  // finger drives gears / pipes / lights / weld
  const wp=Array.from({length:15},(_,i)=>[.12+i*.025,.82+Math.sin(i/2)*.05]);
  const a=await P(...wp[0]);await page.mouse.move(a.x,a.y);await page.mouse.down();for(const q of wp.slice(1)){const p=await P(...q);await page.mouse.move(p.x,p.y,{steps:2});}
  await page.waitForTimeout(150);await page.screenshot({path:path.join(root,'.vault/shots/L7-02-finger.png')});assert.equal((await info()).shadows,true,'shadows on while touched');await page.mouse.up();
  // knob: +30deg steps goals forward in order, wraps; -30deg steps back
  const K=[.5,.455],ids=[];const idx=async()=>(await info()).view.id;
  ids.push(await idx());
  await drag(ring(K,.07,0,Math.PI/6+.12,4));ids.push(await idx());await shot('03-crt-a');
  await drag(ring(K,.07,0,Math.PI/6+.12,4));ids.push(await idx());await shot('04-crt-b');
  await drag(ring(K,.07,0,-(Math.PI/6+.12),4));ids.push(await idx());
  console.log('goal order',ids.join(' > '));
  assert.deepEqual(ids,['still-pond','fire-starter','shares','fire-starter']);
  await drag(ring(K,.07,0,-(Math.PI/6+.12),4));await drag(ring(K,.07,0,-(Math.PI/6+.12),4));assert.equal(await idx(),'all-six','wraps backwards');await shot('05-crt-c');
  // flywheel: half turn held, then released (springs back), then a full turn opens
  const F=[.5,.72];
  await drag(ring(F,.12,0,Math.PI,18),true);await page.waitForTimeout(300);await page.screenshot({path:path.join(root,'.vault/shots/L7-06-fly-half.png')});
  const half=await info();assert.ok(half.progress>.45&&half.progress<.55,'half turn '+half.progress);assert.equal(half.open,0);await page.mouse.up();
  await page.waitForTimeout(2500);assert.ok((await info()).progress<.05,'unfinished turn springs back');
  await drag(ring(F,.12,0,Math.PI*2.05,40));await page.waitForTimeout(1500);await shot('07-open');
  const op=await info();assert.equal(op.open,1,'door fully open');assert.equal(op.awake,true,'hint ring pulses for a few seconds');await page.waitForTimeout(7000);const op2=await info();assert.equal(op2.shadows,false,'asleep after the pulse');assert.equal(op2.awake,false);
  const sc=await page.evaluate(()=>vault.projectWorld(0,0,-.2));await page.mouse.click(sc.x,sc.y);await page.waitForTimeout(450);
  await page.screenshot({path:path.join(root,'.vault/shots/L7-08-mid-dolly.png')});await page.waitForTimeout(1800);
  await page.screenshot({path:path.join(root,'.vault/shots/L7-09-purple-fill.png')});
  assert.equal(await page.evaluate(()=>window.entered),1,'port tap calls enter');
  assert.equal((await info()).awake,false,'dolly ends asleep');
  // the real route: openVault() with the real vault-goals / vault-store
  await page.goto('http://127.0.0.1:'+PORT+'/?real=1');await page.waitForFunction(()=>window.ready||window.errors.length,null,{timeout:90000});
  assert.deepEqual(await page.evaluate(()=>window.errors),[]);const rv=await page.evaluate(()=>document.getElementById('vaultPanel')._vault.info().view);console.log('real route CRT',JSON.stringify(rv));assert.ok(/^GOAL 01\//.test(rv.head));
  assert.deepEqual(logs,[]);console.log('L7 browser checks passed');
 }finally{await b.close();srv.kill();}
})().catch(e=>{console.error(e);process.exit(1)});

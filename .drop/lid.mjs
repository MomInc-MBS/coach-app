import {chromium} from 'playwright';
const b=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=d3d11']});
const p=await b.newPage({viewport:{width:375,height:812}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:5391/drop-harness.html?tier=rare');await p.evaluate(()=>window.start());
await p.waitForFunction(()=>window.ctl?.world);
const r=await p.evaluate(async()=>{const T=await import('three');const h=new T.Group(),m=new T.Group();const body=new T.Mesh(new T.CylinderGeometry(.6,.6,2,16),new T.MeshStandardMaterial({color:0x888888}));body.position.y=1;const lid=new T.Mesh(new T.CylinderGeometry(.5,.5,.2,16),new T.MeshStandardMaterial({color:0xff0000}));lid.name='Lid_top';lid.position.y=2.1;m.add(body,lid);h.add(m);window.ctl.world.useModel(h);return 'ok'});
await p.waitForFunction(()=>window.ctl.world.landed);await p.waitForFunction(()=>document.querySelector('.drop-pod.ready'));
await p.locator('.drop-pod-hit').click();await p.waitForTimeout(2500);
console.log(r,errs,await p.evaluate(()=>document.querySelector('.drop-pod').dataset.phase));await p.screenshot({path:'.drop/glb-lid-test.png'});await b.close();

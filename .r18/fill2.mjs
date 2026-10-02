// Calibrate: coach silhouette height / canvas height at several body paddings (floor hidden). node .r18/fill.mjs
import {createServer} from 'node:http';import {readFile} from 'node:fs/promises';import {resolve,extname} from 'node:path';import {chromium} from 'playwright';
const root=resolve('dist/client');
const server=createServer(async(req,res)=>{const path=new URL(req.url,'http://local').pathname;try{const body=await readFile(resolve(root,'.'+path));res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.mjs':'text/javascript','.json':'application/json'})[extname(path)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:375,height:812}});
await page.addInitScript(()=>sessionStorage.setItem('myr5-ship-gate','ship-admission-v2'));
await page.goto('http://127.0.0.1:'+server.address().port+'/creature/index.html');
await page.waitForFunction(()=>window.myr5Companion?.ready===true,null,{timeout:60000});
console.log(await page.evaluate(async()=>{
 const v=window.myr5Companion.viewer;v.floorObjects.forEach(o=>o.visible=false);v.setPaused(true);
 const meas=async()=>{v.renderer.render(v.scene,v.camera);await new Promise(r=>setTimeout(r,80));v.renderer.render(v.scene,v.camera);
  const cv=v.renderer.domElement,t=document.createElement('canvas');t.width=cv.width;t.height=cv.height;const x=t.getContext('2d');x.drawImage(cv,0,0);const dat=x.getImageData(0,0,t.width,t.height).data;
  let top=1e9,bot=-1,l=1e9,r=-1;for(let y=0;y<t.height;y++)for(let i=0;i<t.width;i++)if(dat[(y*t.width+i)*4+3]>40){top=Math.min(top,y);bot=Math.max(bot,y);l=Math.min(l,i);r=Math.max(r,i);}
  return 'fill '+((bot-top+1)/t.height).toFixed(3)+' top '+(top/t.height).toFixed(2)+' bottom '+(bot/t.height).toFixed(2)+' width '+((r-l+1)/t.width).toFixed(2)+' stage '+t.width+'x'+t.height;};
 const out=['default '+await meas()];
 for(const z of [.6,1.8]){v.setZoom(z);out.push('zoom '+z+' '+await meas());}
 v.setZoom(1);return out.join(' | ');}));
await browser.close();server.close();

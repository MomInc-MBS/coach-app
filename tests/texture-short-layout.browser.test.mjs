import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';

test('long locked-preview message leaves complete texture tiles on short screens',async()=>{
 const root=resolve('.');
 const fixture=(await readFile('creature/index.html','utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace('</head>','<link rel="stylesheet" href="/modules/portal/portal.css"><link rel="stylesheet" href="/modules/portal/standalone-housing.css"></head>');
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/'){res.setHeader('Content-Type','text/html');res.end(fixture);return;}
  try{const file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',extname(file)==='.css'?'text/css':'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}
 });
 await new Promise(done=>server.listen(0,'127.0.0.1',done));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage({viewport:{width:375,height:667}});await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(()=>{
   document.getElementById('tab-body').setAttribute('aria-selected','false');document.getElementById('panel-body').hidden=true;
   document.getElementById('tab-textures').setAttribute('aria-selected','true');document.getElementById('panel-textures').hidden=false;
   const skin=document.createElement('button');skin.textContent='Skins';document.querySelector('.menu-tabs').append(skin);
   document.getElementById('textureId').innerHTML='<option>Stormcharged</option>';
   document.getElementById('creatureStatus').textContent='Preview only · How to unlock Arnoid Press: Choose Shoulders as one of your two starting workout paths OR Easy · Shoulders: complete 15 reps in one working set.';
   const grid=document.createElement('div');grid.className='material-grid texture-grid';
   for(let i=0;i<30;i++){const b=document.createElement('button');b.innerHTML='<img alt=""><span>Graph Paper</span>';grid.append(b);}
   document.getElementById('panel-textures').prepend(grid);
  });
  for(const viewport of [{width:375,height:667},{width:812,height:375}]){
   await page.setViewportSize(viewport);
   for(const row of [0,1]){
    await page.evaluate(row=>{const scroll=document.querySelector('.console-scroll'),tiles=[...document.querySelectorAll('.texture-grid button')],first=tiles[0].getBoundingClientRect(),next=tiles.find(b=>b.getBoundingClientRect().top>first.top+1);scroll.scrollTop=row*(next.getBoundingClientRect().top-first.top);},row);
    const result=await page.evaluate(()=>{const s=document.querySelector('.console-scroll').getBoundingClientRect();return {height:s.height,complete:[...document.querySelectorAll('.texture-grid button')].filter(b=>{const r=b.getBoundingClientRect();return r.top>=s.top&&r.bottom<=s.bottom;}).length};});
    assert.ok(result.complete>=2,JSON.stringify({viewport,row,...result}));
   }
  }
 }finally{await browser?.close();server.closeAllConnections();await new Promise(done=>server.close(done));}
});

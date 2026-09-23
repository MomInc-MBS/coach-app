import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';

// W3-3A: live food scans failed with 'Failed to resolve module specifier "onnxruntime-common"': the worker imported the
// bundler build of transformers.js. Load the exact file food-worker.mjs pins (from the installed dev copy of the same
// version) as a module inside a real browser worker, the way the worker does.
test('food-worker imports a transformers.js build a browser worker can load on its own',async()=>{
 const worker=await readFile(new URL('../food-worker.mjs',import.meta.url),'utf8');
 const [,version,file]=worker.match(/https:\/\/cdn\.jsdelivr\.net\/npm\/@huggingface\/transformers@([\d.]+)\/dist\/([\w.]+\.js)/)||[];
 const local=new URL('../node_modules/@huggingface/transformers/',import.meta.url);
 assert.equal(JSON.parse(await readFile(new URL('package.json',local),'utf8')).version,version,'the pinned CDN version matches the installed copy');
 const library=await readFile(new URL(`dist/${file}`,local));
 const server=createServer((req,res)=>{
  if(req.url==='/library.js'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(library);return;}
  if(req.url==='/probe.mjs'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end("import('/library.js').then(m=>postMessage(typeof m.pipeline+' '+typeof m.env),e=>postMessage('error '+e.message));");return;}
  res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><title>worker</title>');
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const loaded=await page.evaluate(()=>new Promise(resolve=>{const w=new Worker('/probe.mjs',{type:'module'});w.onmessage=e=>resolve(e.data);w.onerror=e=>resolve('worker error '+e.message);}));
  assert.equal(loaded,'function object',`${file} must load inside a module worker`);
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});

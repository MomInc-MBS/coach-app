// Launcher for the local Pixel adaptation of Ian's MYR5 pose demo.
// It serves the test HTML and its license. Rep milestones are acknowledged without
// writing cards to the ship console. No camera frames are received or stored.
const http = require('node:http');
const fs = require('node:fs');
const speech=require('./robot-speech.cjs');
const source = require('node:path').join(__dirname, 'pose.html');
const port = Number(process.env.MYR5_PORT || 8816);
const publicOrigin = process.env.MYR5_PUBLIC_ORIGIN || '';
if (publicOrigin) {
  const parsed = new URL(publicOrigin);
  if (parsed.protocol !== 'https:' || parsed.origin !== publicOrigin) {
    throw new Error('MYR5_PUBLIC_ORIGIN must be an exact HTTPS origin without a trailing slash.');
  }
}
const allowedOrigins = new Set([`http://localhost:${port}`, `http://127.0.0.1:${port}`, publicOrigin].filter(Boolean));
let cameraInfo=null;

if (!fs.existsSync(source)) {
  console.error('The existing MYR5 pose demo was not found at: ' + source);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost:' + port).pathname;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if(path==='/speech'){
    if(req.method!=='POST'){res.writeHead(405);res.end();return;}
    if(req.headers.origin&&!allowedOrigins.has(req.headers.origin)){req.resume();res.writeHead(403);res.end();return;}
    let body='';req.on('data',chunk=>{body+=chunk;if(body.length>4096)req.destroy();});
    req.on('end',async()=>{let text;try{text=JSON.parse(body).text;if(typeof text!=='string'||!text.trim()||text.length>600)throw new Error();}catch{res.writeHead(400);res.end();return;}
      try{const wav=await speech.synthesize(text);if(!res.destroyed){res.writeHead(200,{'Content-Type':'audio/wav','Content-Length':wav.length});res.end(wav);}}
      catch{if(!res.destroyed){res.writeHead(503);res.end('Speech unavailable');}}
    });return;
  }
  if(path==='/camera-info'){
    if(req.method==='GET'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(cameraInfo&&Date.now()-cameraInfo.receivedAt<300000?cameraInfo:null));return;}
    if(req.method==='POST'){
      if(req.headers.origin&&!allowedOrigins.has(req.headers.origin)){req.resume();res.writeHead(403);res.end();return;}
      let body='';req.on('data',chunk=>{body+=chunk;if(body.length>12000)req.destroy();});
      req.on('end',()=>{try{const input=JSON.parse(body);const str=v=>String(v??'').slice(0,180),num=v=>Number.isFinite(v)?v:null;cameraInfo={receivedAt:Date.now(),version:str(input.version),label:str(input.label),facing:str(input.facing),width:num(input.width),height:num(input.height),zoom:{supported:!!input.zoom?.supported,applied:!!input.zoom?.applied,min:num(input.zoom?.min),max:num(input.zoom?.max),zoom:num(input.zoom?.zoom)},lenses:Array.isArray(input.lenses)?input.lenses.slice(0,20).map(str):[]};res.writeHead(204);res.end();}catch{res.writeHead(400);res.end();}});return;
    }
    res.writeHead(405);res.end();return;
  }
  // MYR5 companion files use one shared renderer in the editor and phone view.
  if((req.method==='GET'||req.method==='HEAD')&&['/pod/pod.css','/pod/pod.mjs','/pod/set-flow.mjs','/pod/encouragement.mjs','/pod/identity.mjs','/pod/gala-avatar.js','/pod/mom-inc-mark.png'].includes(path)){
    const file=require('node:path').join(__dirname,path.slice(1)),type=path.endsWith('.css')?'text/css; charset=utf-8':path.endsWith('.png')?'image/png':'text/javascript; charset=utf-8';
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':type,'Content-Length':data.length});res.end(req.method==='HEAD'?undefined:data);});return;
  }
  if ((req.method === 'GET' || req.method === 'HEAD') && path.startsWith('/creature/')) {
    const paths=require('node:path'),root=paths.join(__dirname,'creature');
    let relative;try{relative=decodeURIComponent(path.slice('/creature/'.length));}catch{res.writeHead(400);res.end();return;}
    const file=paths.resolve(root,relative||'index.html');
    if(!file.startsWith(root+paths.sep)){res.writeHead(404);res.end();return;}
    const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.glb':'model/gltf-binary','.json':'application/json','.map':'application/json','.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8'};
    fs.stat(file,(error,stat)=>{if(error||!stat.isFile()){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':types[paths.extname(file)]||'application/octet-stream','Content-Length':stat.size});if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);});return;
  }
  if (req.method === 'GET' && path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ name: 'myr5-pixel-movement-test', sourceExists: fs.existsSync(source), phoneLinkConfigured: !!publicOrigin, speechAvailable: speech.available() }));
    return;
  }
  if (req.method === 'POST' && path === '/cmd') {
    req.resume();
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method === 'GET' && ['/app.mjs','/movement-engine.mjs','/menu.mjs','/hand-controls.mjs','/hand-gesture.mjs','/exercise-gestures.mjs','/gesture-controls.mjs','/coach.mjs','/robot-audio.mjs','/demo-poses.mjs','/hologram.mjs','/camera.mjs','/menu.css','/models/squat.glb','/models/pushup.glb'].includes(path)) {
    fs.readFile(require('node:path').join(__dirname,path.slice(1)),(error,data)=>{
      if(error){res.writeHead(500,{'Content-Type':'text/plain'});res.end('Test module could not be loaded.');return;}
      const type=path.endsWith('.css')?'text/css; charset=utf-8':path.endsWith('.glb')?'model/gltf-binary':'text/javascript; charset=utf-8';
      res.writeHead(200,{'Content-Type':type});res.end(data);
    });
    return;
  }
  if (req.method === 'GET' && path === '/LICENSE') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    fs.createReadStream(require('node:path').join(__dirname, 'LICENSE')).pipe(res);
    return;
  }
  if ((req.method === 'GET' || req.method === 'HEAD') && (path === '/' || path === '/pose.html')) {
    fs.readFile(source, (error, data) => {
      if (error) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Could not read the local pose demo.');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(req.method === 'HEAD' ? undefined : data);
    });
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.on('error', async error => {
  if (error.code === 'EADDRINUSE') {
    try {
      const response = await fetch('http://127.0.0.1:' + port + '/health', { signal: AbortSignal.timeout(1500) });
      const health = await response.json();
      if (health.name === 'myr5-pixel-movement-test') {
        console.log('The MYR5 phone test is already running.');
        console.log('Phone address after forwarding: http://localhost:' + port + '/pose.html');
        return;
      }
    } catch {}
  }
  console.error('Could not start the MYR5 phone test: ' + error.message);
  process.exitCode = 1;
});

server.listen(port, '127.0.0.1', () => {
  console.log('MYR5 phone movement test is ready.');
  if (publicOrigin) console.log('Phone test link: ' + publicOrigin + '/pose.html');
  console.log('In desktop Chrome: chrome://inspect/#devices');
  console.log('Forward phone port 8816 to localhost:8816.');
  console.log('On your phone: http://localhost:8816/pose.html');
  console.log('Keep this process running. Press Ctrl+C to stop it.');
});

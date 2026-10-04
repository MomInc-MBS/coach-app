// Local Release 21 review; read-only API fixtures, no account or production writes.
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.glb':'model/gltf-binary','.wasm':'application/wasm','.webp':'image/webp','.png':'image/png'};
http.createServer(async(req,res)=>{
 const pathname=new URL(req.url,'http://local').pathname;
 if(pathname==='/__blank__'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Release 21 review</title>');return;}
 if(pathname.startsWith('/api/')){res.writeHead(pathname==='/api/auth/config'||pathname==='/api/gala/leaderboard'?200:401,{'Content-Type':'application/json'});res.end(JSON.stringify(pathname==='/api/auth/config'?{enabled:false}:pathname==='/api/gala/leaderboard'?{items:[]}:{error:'Local guest preview'}));return;}
 try{const file=path.resolve(root,'.'+decodeURIComponent(pathname.endsWith('/')?pathname+'index.html':pathname));if(!file.startsWith(root+path.sep))throw Error('outside preview');res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404);res.end();}
}).listen(Number(process.env.MYR5_R21_PORT)||5203,'127.0.0.1',function(){console.log('Release 21 review http://127.0.0.1:'+this.address().port);});

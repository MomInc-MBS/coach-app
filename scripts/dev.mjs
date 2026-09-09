import {createServer} from 'vite';
import {sites} from '@openai/sites-vite-plugin';
import {Miniflare} from 'miniflare';
import {readFile,readdir} from 'node:fs/promises';
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB'],d1Persist:'.wrangler/local-db'});
const DB=await mf.getD1Database('DB');
await DB.prepare('CREATE TABLE IF NOT EXISTS _local_migrations (name TEXT PRIMARY KEY)').run();
for(const name of (await readdir('drizzle')).filter(n=>n.endsWith('.sql')).sort()){if(await DB.prepare('SELECT name FROM _local_migrations WHERE name=?').bind(name).first())continue;const statements=(await readFile(`drizzle/${name}`,'utf8')).split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean);await DB.batch(statements.map(s=>DB.prepare(s)));await DB.prepare('INSERT INTO _local_migrations(name) VALUES(?)').bind(name).run();}
const server=await createServer({configFile:false,plugins:[sites(),{name:'coach-api',configureServer(server){return()=>server.middlewares.use(async(req,res,next)=>{if(!req.url.startsWith('/api/')&&req.url!=='/health')return next();try{const chunks=[];for await(const chunk of req)chunks.push(chunk);const request=new Request(`http://${req.headers.host}${req.url}`,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});const {default:worker}=await server.ssrLoadModule('/server/worker.mjs');const result=await worker.fetch(request,{DB});res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));}catch{res.writeHead(500);res.end('Local request failed');}})}}],server:{host:'127.0.0.1',port:Number(process.env.COACH_DEV_PORT)||5195,strictPort:true},appType:'mpa'});
await server.listen();server.printUrls();
process.on('SIGINT',async()=>{await server.close();await mf.dispose();process.exit();});

import {test, expect} from 'playwright/test';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, extname} from 'node:path';

const root=resolve(import.meta.dirname,'../..');let server,base;
const optional=/\/(creature\/(assets\/phone\.js|phone\.css|cinematics\.(js|css))|pod\/hardware\.(mjs|css)|hardware-launch\.css|pocket-hardware\.css|hand-companion\.css|handborne\/previews\/)/;
const type=path=>({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp'}[extname(path)]||'application/octet-stream');
test.use({channel:'msedge'});
test.beforeAll(async()=>{server=http.createServer(async(req,res)=>{const path=new URL(req.url,'http://local').pathname;try{const file=await readFile(resolve(root,'.'+path));res.writeHead(200,{'Content-Type':type(path)});res.end(file);}catch{res.writeHead(404);res.end();}});await new Promise(done=>server.listen(0,'127.0.0.1',done));base=`http://127.0.0.1:${server.address().port}`;});
test.afterAll(()=>new Promise(done=>server.close(done)));

test('locked pod makes no optional material requests; verified user intent loads them lazily',async({page})=>{
 const requests=[];page.on('request',request=>requests.push(new URL(request.url()).pathname));
 await page.goto(base+'/pose.html');await page.waitForTimeout(150);
 expect(requests.filter(path=>optional.test(path)),JSON.stringify(await page.evaluate(()=>({verified:window.myr5VerifiedOptionalAccess,preview:document.querySelector('#identityHandPreview').getAttribute('src')})))).toEqual([]);
 await page.evaluate(()=>{window.myr5VerifiedOptionalAccess=true;document.querySelector('#openSettings').click();});await page.waitForTimeout(150);
 expect(requests.filter(path=>optional.test(path)).length).toBeGreaterThan(0);
});

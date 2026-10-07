// Browser check for page music: node scripts/vault-audio-preview.cjs  (serves the worktree on :8910, drives Chromium)
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const root=path.resolve(__dirname,'..'),PORT=8910;
const types={'.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.m4a':'audio/mp4','.mp3':'audio/mpeg','.html':'text/html'};
const html=`<!doctype html><html><body><div id="portalHome" hidden></div><button id="b">tap</button><script type="module">
import {mountPageMusic} from '/audio/page-music.mjs';import {physicalSound} from '/audio/physical-sound.mjs';
physicalSound.mount();window.physicalSound=physicalSound;window.route='';window.myr5Routes={current:()=>window.route};window.m=mountPageMusic();window.ready=true;
</script></body></html>`;
const server=http.createServer(async(req,res)=>{const u=new URL(req.url,'http://l');if(u.pathname==='/'){res.setHeader('Content-Type','text/html');return res.end(html);}
 try{const f=path.join(root,decodeURIComponent(u.pathname));if(!f.startsWith(root))throw 0;const b=await fs.readFile(f);res.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');res.end(b);}catch{res.statusCode=404;res.end('no');}});
async function main(){
 await new Promise(r=>server.listen(PORT,r));
 const {chromium}=require('playwright');const browser=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errors.push(m.text());});
 await page.goto(`http://localhost:${PORT}/`);await page.waitForFunction(()=>window.ready);
 const out={};const wait=ms=>page.waitForTimeout(ms);
 out.beforeGesture=await page.evaluate(()=>m.state());
 await page.click('#b');await wait(2500);
 out.afterGesture=await page.evaluate(()=>m.state());
 out.fadeLog=await page.evaluate(()=>m.log.filter(l=>l.what==='fade-in').map(l=>({to:l.v1,dur:+(l.t1-l.t0).toFixed(3)})));
 out.bedLog=await page.evaluate(()=>m.log.filter(l=>l.what==='bed').map(l=>({dur:+(l.t1-l.t0).toFixed(3)})));
 // decoded length must equal the manifest frames (priming/padding trimmed by the decoder)
 out.frames=await page.evaluate(async()=>{const man=await (await fetch('/audio/music/manifest.json')).json();const ctx=physicalSound.context,r={};for(const [n,t] of Object.entries(man.tracks)){const b=await ctx.decodeAudioData(await (await fetch(t.url)).arrayBuffer());r[n]={decoded:b.length,expected:t.frames,sr:b.sampleRate};}return r;});
 // grimoire theme: 35 % over 5 s
 await page.evaluate(()=>{document.getElementById('portalHome').hidden=false;window.dispatchEvent(new CustomEvent('myr5:route'));});await wait(1500);
 out.portalFade=await page.evaluate(()=>({now:m.current(),fades:m.log.filter(l=>l.what==='fade-in').map(l=>({to:l.v1,dur:+(l.t1-l.t0).toFixed(3)})).pop()}));
 // same track across routes does not restart
 const before=await page.evaluate(()=>m.log.length);await page.evaluate(()=>{window.route='settings';window.dispatchEvent(new CustomEvent('myr5:route'));});await wait(300);
 out.noRestart=await page.evaluate(n=>m.log.length===n,before);
 // classroom: cut and resume
 await page.evaluate(()=>{window.route='scoreboard';document.getElementById('portalHome').hidden=true;window.dispatchEvent(new CustomEvent('myr5:route'));});await wait(1500);
 const cut=await page.evaluate(()=>{window.dispatchEvent(new CustomEvent('myr5:music-cut'));return m.state();});
 await wait(1200);
 const res=await page.evaluate(()=>{const off=m.state().cut.offset;window.dispatchEvent(new CustomEvent('myr5:music-resume'));return {off,playing:m.current()};});
 out.cutResume={track:cut.cut&&cut.cut.name,cutOffset:cut.cut&&+cut.cut.offset.toFixed(3),resumed:res.playing,stateAfterCut:cut.playing};
 // mute and hidden
 await page.evaluate(()=>physicalSound.setMuted(true));await wait(300);
 out.mutedMasterGain=await page.evaluate(()=>m.state().muted);
 out.errors=errors;console.log(JSON.stringify(out,null,1));await browser.close();server.close();
}
main().catch(e=>{console.error(e);process.exit(1);});

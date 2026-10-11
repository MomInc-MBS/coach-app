import worker from './worker.mjs';
import music from '../audio/music/manifest.json' with {type:'json'};
// Only the published, bounded music files need byte serving; other assets keep their existing route.
const musicBytes=new Map(Object.values(music.tracks).map(track=>[track.url,track.bytes]));
function matchingRangeValidator(value,headers){
 if(!value)return true;
 if(value.startsWith('"')||value.startsWith('W/'))return !value.startsWith('W/')&&value===headers.get('etag');
 const date=Date.parse(value),modified=Date.parse(headers.get('last-modified'));
 return Number.isFinite(date)&&Number.isFinite(modified)&&value===headers.get('last-modified');
}
// Single-range parsing follows scripts/actual-dj-preview.mjs, including suffix and end clamping.
export async function musicRangeResponse(request,response,size){
 if(response.status!==200)return response;
 if(!Number.isSafeInteger(size)||size<=0||size>1024*1024)return new Response('Music asset exceeds byte-serving bounds',{status:502});
 const reader=response.body?.getReader(),chunks=[];let length=0;
 if(reader)try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>size){await reader.cancel();return new Response('Music asset size mismatch',{status:502});}chunks.push(value);}}finally{reader.releaseLock();}
 if(length!==size)return new Response('Music asset size mismatch',{status:502});
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 const headers=new Headers(response.headers);headers.delete('content-encoding');headers.delete('content-range');headers.set('accept-ranges','bytes');headers.set('content-length',String(size));
 if(request.method==='HEAD')return new Response(null,{status:200,headers});
 const range=request.headers.get('range');
 if(!range||!matchingRangeValidator(request.headers.get('if-range'),headers))return new Response(bytes,{headers});
 const match=range.match(/^bytes=(\d*)-(\d*)$/i);let start,end;
 if(match&&(match[1]||match[2])){
  if(match[1]){start=Number(match[1]);end=match[2]?Number(match[2]):size-1;}
  else{const suffix=Number(match[2]);start=suffix>0?Math.max(0,size-suffix):size;end=size-1;}
 }
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start){headers.set('content-range',`bytes */${size}`);headers.set('content-length','0');return new Response(null,{status:416,headers});}
 end=Math.min(end,size-1);headers.set('content-range',`bytes ${start}-${end}/${size}`);headers.set('content-length',String(end-start+1));
 return new Response(bytes.subarray(start,end+1),{status:206,headers});
}
// Public Cloudflare Workers entry (the build bundles this, not worker.mjs).
// OpenAI Sites injected oai-authenticated-user-* after its own ChatGPT sign-in; on a
// public Worker any caller can send them, so trusting them is account takeover.
// They are dropped here, leaving identity to a verified Clerk bearer token (auth.mjs).
// Tests and the local dev server (Sites mock sign-in) still call worker.mjs directly.
export default {
 ...worker,
 async fetch(request,env,ctx){
  const headers=new Headers(request.headers);
  for(const name of [...headers.keys()])if(name.startsWith('oai-authenticated-user-'))headers.delete(name);
  const clean=new Request(request,{headers}),size=musicBytes.get(new URL(request.url).pathname);
  if(size&&env.ASSETS&&['GET','HEAD'].includes(request.method)){
   // ASSETS is an in-process binding, so this does not re-enter the public Worker route.
   // Fetch the complete representation for slicing, never a conditional or partial response.
   for(const name of ['range','if-range','if-none-match','if-modified-since','if-match','if-unmodified-since'])headers.delete(name);
   headers.set('accept-encoding','identity');
   return musicRangeResponse(clean,await env.ASSETS.fetch(new Request(request,{method:'GET',headers})),size);
  }
  return worker.fetch(clean,env,ctx);
 },
};

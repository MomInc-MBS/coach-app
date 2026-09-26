import worker from './worker.mjs';
// Public Cloudflare Workers entry (the build bundles this, not worker.mjs).
// OpenAI Sites injected oai-authenticated-user-* after its own ChatGPT sign-in; on a
// public Worker any caller can send them, so trusting them is account takeover.
// They are dropped here, leaving identity to a verified Clerk bearer token (auth.mjs).
// Tests and the local dev server (Sites mock sign-in) still call worker.mjs directly.
export default {
 ...worker,
 fetch(request,env,ctx){
  const headers=new Headers(request.headers);
  for(const name of [...headers.keys()])if(name.startsWith('oai-authenticated-user-'))headers.delete(name);
  return worker.fetch(new Request(request,{headers}),env,ctx);
 },
};

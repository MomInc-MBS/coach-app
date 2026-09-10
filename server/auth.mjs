import {verifyToken} from '@clerk/backend';
import {fail} from './domain.mjs';
export function authConfig(env){return {enabled:!!(env.CLERK_PUBLISHABLE_KEY&&env.CLERK_JWT_KEY&&env.CLERK_FRONTEND_URL&&env.CLERK_AUTHORIZED_PARTIES),publishableKey:env.CLERK_PUBLISHABLE_KEY||null,frontend:env.CLERK_FRONTEND_URL||null};}
export async function identity(request,env){
  const legacy=request.headers.get('oai-authenticated-user-id');
  if(!request.headers.has('Authorization'))return {legacy,clerk:null,email:request.headers.get('oai-authenticated-user-email')||'Your account'};
  if(!authConfig(env).enabled||!/^Bearer \S+$/.test(request.headers.get('Authorization')))fail('Sign in to Coach again.',401);
  try{
    // Only explicit bearer sessions are accepted here. Browser cookies remain
    // Clerk's responsibility; the app never guesses an identity from an email.
    const parties=env.CLERK_AUTHORIZED_PARTIES.split(',').filter(Boolean);
    const claims=await verifyToken(request.headers.get('Authorization').slice(7),{jwtKey:env.CLERK_JWT_KEY,authorizedParties:parties});
    if(typeof claims.sub!=='string'||!claims.sub.startsWith('user_')||typeof claims.sid!=='string'||!claims.sid.startsWith('sess_')||claims.iss!==env.CLERK_FRONTEND_URL||!parties.includes(claims.azp)||claims.sts==='pending')fail('Sign in to Coach again.',401);
    return {legacy,clerk:claims.sub,email:'Your Mom Inc account'};
  }catch{fail('Sign in to Coach again.',401);}
}
export async function accountOwner(database,id){
  if(id.clerk){await database.prepare('INSERT INTO account_identities(clerk_id,owner_id,created_at) VALUES(?,?,?) ON CONFLICT(clerk_id) DO NOTHING').bind(id.clerk,'clerk:'+id.clerk,Date.now()).run();return (await database.prepare('SELECT owner_id FROM account_identities WHERE clerk_id=?').bind(id.clerk).first()).owner_id;}
  if(!id.legacy)fail('Sign in to save your progress.',401);return id.legacy;
}
export async function linkLegacy(database,id){
  if(!id.clerk||!id.legacy)fail('Sign in to both accounts to reconnect your saved Coach.',401);
  // Unique keys make concurrent linking deterministic and prevent two logins
  // from claiming the same Coach. Existing separate accounts are not merged.
  try{await database.prepare('INSERT INTO account_identities(clerk_id,owner_id,created_at) VALUES(?,?,?) ON CONFLICT(clerk_id) DO NOTHING').bind(id.clerk,id.legacy,Date.now()).run();}catch{fail('This Coach is already connected to another login. Continue with ChatGPT to access it.',409);}
  const row=await database.prepare('SELECT owner_id FROM account_identities WHERE clerk_id=?').bind(id.clerk).first();
  if(row?.owner_id!==id.legacy)fail('This login already has a separate Coach. Continue with ChatGPT to keep using your original Coach.',409);
  return {linked:true};
}

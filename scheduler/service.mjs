import coach from '../server/worker.mjs';
import {runReminders, subscriptionInput} from '../server/push.mjs';
import {reminderInput, fail} from '../server/domain.mjs';

const json = (data, status=200) => new Response(JSON.stringify(data), {status, headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
async function authorized(request, env) {
  const token = request.headers.get('Authorization') || '';
  if (!env.REMINDER_SERVICE_TOKEN || token.length > 200) return false;
  const hash = value => crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  const [a,b] = await Promise.all([hash(token),hash(`Bearer ${env.REMINDER_SERVICE_TOKEN}`)]);
  let diff=0; const left=new Uint8Array(a),right=new Uint8Array(b);
  for(let i=0;i<left.length;i++) diff |= left[i]^right[i];
  return diff===0;
}
async function importExisting(request, env, user) {
  const text = await request.text();
  if (text.length > 60000) fail('Too much reminder data.',413);
  const input=JSON.parse(text);
  if (!Array.isArray(input.reminders) || input.reminders.length>16 || !Array.isArray(input.subscriptions) || input.subscriptions.length>32) fail('Invalid reminder import.');
  const database=env.DB, key=`import:${user}`;
  if (await database.prepare('SELECT value FROM system WHERE key=?').bind(key).first()) return json({imported:true});
  const statements=[];
  for(const row of input.reminders) {
    const r=reminderInput({id:row.id,kind:row.kind,time:row.time,timezone:row.timezone,enabled:!!row.enabled,quietStart:row.quiet_start,quietEnd:row.quiet_end});
    statements.push(database.prepare('INSERT INTO reminders(id,user_id,kind,time,timezone,enabled,quiet_start,quiet_end) SELECT ?,?,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM system WHERE key=?) ON CONFLICT(id) DO NOTHING').bind(r.id,user,r.kind,r.time,r.timezone,r.enabled,r.quietStart,r.quietEnd,key));
  }
  for(const item of input.subscriptions) {
    const s=subscriptionInput(item);
    statements.push(database.prepare('INSERT INTO subscriptions(endpoint,user_id,data,created_at) SELECT ?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM system WHERE key=?) ON CONFLICT(endpoint) DO NOTHING').bind(s.endpoint,user,JSON.stringify(s),Date.now(),key));
  }
  statements.push(database.prepare('INSERT INTO system(key,value) VALUES(?,?) ON CONFLICT(key) DO NOTHING').bind(key,String(Date.now())));
  await database.batch(statements);
  return json({imported:true});
}

export default {
  async fetch(request,env) {
    try {
      const url=new URL(request.url), path=url.pathname;
      if(path==='/health' && request.method==='GET') return json({ok:true,service:'MYR5 reminders'});
      if(!await authorized(request,env)) return json({error:'Unauthorized.'},401);
      if(path==='/internal/status' && request.method==='GET') {
        const tick=await env.DB.prepare("SELECT value FROM system WHERE key='scheduler_tick'").first();
        return json({configured:!!env.VAPID_PRIVATE_KEY&&!!env.VAPID_PUBLIC_KEY,publicKey:env.VAPID_PUBLIC_KEY||null,schedulerActive:!!tick&&Date.now()-Number(tick.value)<300000,lastRun:tick?Number(tick.value):null});
      }
      const user=request.headers.get('X-Coach-User');
      if(!user || user.length>200 || /[\r\n]/.test(user)) return json({error:'Missing account.'},401);
      if(path==='/internal/import' && request.method==='POST') return await importExisting(request,env,user);
      const allowed = path==='/api/reminders' || /^\/api\/reminders\/[a-f0-9-]{36}$/.test(path) || /^\/api\/push\/(subscribe|unsubscribe|test)$/.test(path) || (path==='/api/export'&&request.method==='GET') || (path==='/api/account'&&request.method==='DELETE');
      if(!allowed) return json({error:'Not found.'},404);
      // Identity is supplied only by Coach's authenticated server. The public
      // endpoint never accepts an unverified browser account header.
      const headers=new Headers({'Origin':url.origin,'Content-Type':request.headers.get('Content-Type')||'','oai-authenticated-user-id':user});
      return coach.fetch(new Request(request,{headers}), {...env,REMINDER_SERVICE_ORIGIN:undefined});
    } catch(e) { return json({error:e.status?e.message:'Could not complete the reminder request.'},e.status||500); }
  },
  async scheduled(event,env,ctx) {
    ctx.waitUntil((async()=>{const result=await runReminders(env);if(result.failed)throw new Error(`${result.failed} reminder deliveries failed`);})());
  }
};

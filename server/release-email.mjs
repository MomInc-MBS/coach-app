import {RELEASE} from '../release-info.mjs';
import {fail} from './domain.mjs';

const DAY=86400000;
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),x=>x.toString(16).padStart(2,'0')).join('');
const token=()=>crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const emailConfigured=env=>(!!env.EMAIL?.send||!!env.RESEND_API_KEY)&&/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(env.RELEASE_EMAIL_FROM||'')&&/^https:\/\//.test(env.RELEASE_ORIGIN||'');
export function emailInput(value){const email=typeof value==='string'?value.trim().toLowerCase():'';if(email.length>254||!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/.test(email))fail('Enter a valid email address.');return email;}
function link(env,action,value){return new URL(`/api/updates/${action}?token=${value}`,env.RELEASE_ORIGIN).href;}
async function mail(env,email,subject,text,html,unsubscribe){
 const content={subject,text,html,...(unsubscribe?{headers:{'List-Unsubscribe':`<${unsubscribe}>`,'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}}:{})};
 if(env.EMAIL?.send)return env.EMAIL.send({from:{email:env.RELEASE_EMAIL_FROM,name:'MOM Dispatch'},to:email,...content});
 const response=await fetch('https://api.resend.com/emails',{method:'POST',redirect:'manual',signal:AbortSignal.timeout(15000),headers:{'Authorization':`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`coach-${await hash(email+subject+text)}`},body:JSON.stringify({from:`MOM Dispatch <${env.RELEASE_EMAIL_FROM}>`,to:[email],...content})});
 if(!response.ok)throw new Error('Email provider did not accept the message.');
 const result=await response.json();if(!result.id)throw new Error('Email provider returned no message ID.');return {messageId:result.id};
}
export async function emailSubscription(env,user,method,input={},now=Date.now()){
 const db=env.DB;
 if(method==='GET'){const row=await db.prepare('SELECT email,enabled,confirmed_at FROM release_subscribers WHERE user_id=?').bind(user).first();return {configured:emailConfigured(env),email:row?.email||null,enabled:!!row?.enabled,confirmedAt:row?.confirmed_at||null};}
 if(method==='DELETE'){await db.batch([db.prepare('DELETE FROM release_subscribers WHERE user_id=?').bind(user),db.prepare('DELETE FROM release_deliveries WHERE user_id=?').bind(user)]);return {enabled:false};}
 if(method!=='POST')fail('Method not allowed.',405);
 if(!emailConfigured(env))fail('Email delivery is not connected yet. In-app updates are available now.',503);
 const email=emailInput(input.email),existing=await db.prepare('SELECT * FROM release_subscribers WHERE user_id=?').bind(user).first();
 if(existing?.email===email&&existing.enabled)return {message:'Release emails are already on.',enabled:true};
 // Atomic limits survive concurrent requests and apply to both account and destination.
 for(const key of [`release-email-user:${user}`,`release-email-address:${await hash(email)}`]){
  const claim=await db.prepare('INSERT INTO system(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE CAST(system.value AS INTEGER)<? RETURNING key').bind(key,String(now),now-3600000).first();
  if(!claim)fail('Please wait an hour before requesting another confirmation email.',429);
 }
 const hour=Math.floor(now/3600000),global=await db.prepare('INSERT INTO system(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=CAST(system.value AS INTEGER)+1 WHERE CAST(system.value AS INTEGER)<30 RETURNING value').bind(`release-email-hour:${hour}`,'1').first();
 if(!global)fail('Email confirmation is busy. Please try again later.',429);
 const confirm=token(),unsubscribe=token(),confirmHash=await hash(confirm);
 await db.prepare('INSERT INTO release_subscribers(user_id,email,enabled,confirm_hash,expires_at,unsubscribe_token,updated_at,confirmed_at,last_release) VALUES(?,?,0,?,?,?,?,NULL,?) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email,enabled=0,confirm_hash=excluded.confirm_hash,expires_at=excluded.expires_at,unsubscribe_token=excluded.unsubscribe_token,updated_at=excluded.updated_at,confirmed_at=NULL,last_release=excluded.last_release').bind(user,email,confirmHash,now+DAY,unsubscribe,now,RELEASE.id).run();
 const confirmUrl=link(env,'confirm',confirm),stopUrl=link(env,'unsubscribe',unsubscribe);
 try {await mail(env,email,'MOM Dispatch · Confirm your transmission channel',`MOM here. Your training pod is ready to receive transmissions. Confirm your email to hear when a Coach app update is ready:\n${confirmUrl}\n\nThis link expires in 24 hours. If you did not request this, ignore this email.\nCancel: ${stopUrl}`,`<p>MOM here. Your training pod is ready to receive transmissions. Confirm your email to hear when a Coach app update is ready.</p><p><a href="${escape(confirmUrl)}">Confirm update emails</a></p><p>This link expires in 24 hours. If you did not request this, ignore this email.</p><p><a href="${escape(stopUrl)}">Cancel</a></p>`,stopUrl);}
 catch{await db.prepare('DELETE FROM release_subscribers WHERE user_id=? AND confirm_hash=?').bind(user,confirmHash).run();fail('The confirmation email could not be sent. Please try again later.',503);}
 return {message:'Check your inbox and confirm your email. Release emails stay off until you confirm.',enabled:false};
}
export async function emailLinkAction(env,action,value,now=Date.now()){
 if(!/^[a-f0-9]{64}$/.test(value||''))fail('This email link is invalid.',400);
 if(action==='unsubscribe'){await env.DB.prepare('DELETE FROM release_subscribers WHERE unsubscribe_token=?').bind(value).run();return {message:'Update emails are off. You can close this page.'};}
 if(action!=='confirm')fail('Not found.',404);
 const row=await env.DB.prepare('UPDATE release_subscribers SET enabled=1,confirmed_at=?,confirm_hash=NULL,expires_at=NULL,updated_at=?,last_release=? WHERE confirm_hash=? AND expires_at>? RETURNING user_id').bind(now,now,RELEASE.id,await hash(value),now).first();
 if(!row)fail('This confirmation link has expired or was already used. Open Coach to request another.',410);
 return {message:'Your email is confirmed. We’ll email you when a new app update is ready.'};
}
export function emailLinkPage(action,value,message){
 const valid=/^[a-f0-9]{64}$/.test(value||''),title=action==='confirm'?'Confirm app update emails':'Stop app update emails';
 const form=valid&&!message?`<form method="post"><button>${action==='confirm'?'Confirm email':'Stop update emails'}</button></form>`:'';
 return new Response(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · MYR5 Coach</title><style>body{font:18px system-ui;max-width:36rem;margin:12vh auto;padding:24px;background:#f5f3eb;color:#252820}button,a{font:inherit}button{padding:14px 22px;border:0;border-radius:12px;background:#304c32;color:white;cursor:pointer}a{color:#304c32}</style><h1>${title}</h1><p>${escape(message||(valid?'Choose below to save your email preference.':'This email link is invalid.'))}</p>${form}<p><a href="/pose.html?panel=install">Open Coach</a></p></html>`,{status:valid?200:400,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"}});
}
export async function runReleaseEmails(env,now=Date.now()){
 if(!emailConfigured(env))return {configured:false,sent:0,failed:0};
 // Deploying the sender ahead of the app must never announce an unpublished build.
 const live=await fetch(new URL('/api/releases/current',env.RELEASE_ORIGIN),{redirect:'manual',signal:AbortSignal.timeout(10000),headers:{'Cache-Control':'no-cache'}});
 if(!live.ok||(await live.json()).id!==RELEASE.id)return {sent:0,failed:0,waitingForPublication:true};
 const rows=(await env.DB.prepare('SELECT * FROM release_subscribers s WHERE enabled=1 AND confirmed_at IS NOT NULL AND (last_release IS NULL OR last_release!=?) AND NOT EXISTS (SELECT 1 FROM release_deliveries d WHERE d.user_id=s.user_id AND d.release_id=?) LIMIT 10').bind(RELEASE.id,RELEASE.id).all()).results;
 let sent=0,failed=0;
 for(const row of rows){
  const claim=await env.DB.prepare("INSERT INTO release_deliveries(user_id,release_id,status,updated_at) VALUES(?,?,'claimed',?) ON CONFLICT(user_id,release_id) DO NOTHING RETURNING user_id").bind(row.user_id,RELEASE.id,now).first();
  if(!claim)continue;
  const current=await env.DB.prepare('SELECT email FROM release_subscribers WHERE user_id=? AND enabled=1 AND unsubscribe_token=?').bind(row.user_id,row.unsubscribe_token).first();
  if(!current)continue;
  const stopUrl=link(env,'unsubscribe',row.unsubscribe_token),appUrl=new URL('/pose.html?panel=install',env.RELEASE_ORIGIN).href;
  try {
   await mail(env,row.email,`MOM Dispatch · Your training pod has an upgrade`,`TRANSMISSION FROM MOM\n\nYour training pod has an upgrade.\n${RELEASE.title}\n\n${RELEASE.notes.join('\n')}\n\nOpen Coach to update: ${appUrl}\n\nYou opened this channel for Coach app updates. Unsubscribe: ${stopUrl}`,`<p>MOM DISPATCH</p><h1>Your training pod has an upgrade.</h1><h2>${escape(RELEASE.title)}</h2><ul>${RELEASE.notes.map(n=>`<li>${escape(n)}</li>`).join('')}</ul><p><a href="${escape(appUrl)}">Open Coach to update</a></p><p>You opened this channel for Coach app updates. <a href="${escape(stopUrl)}">Unsubscribe</a>.</p>`,stopUrl);
   await env.DB.batch([env.DB.prepare("UPDATE release_deliveries SET status='sent',updated_at=? WHERE user_id=? AND release_id=?").bind(now,row.user_id,RELEASE.id),env.DB.prepare('UPDATE release_subscribers SET last_release=? WHERE user_id=? AND unsubscribe_token=?').bind(RELEASE.id,row.user_id,row.unsubscribe_token)]);sent++;
  }catch{await env.DB.prepare("UPDATE release_deliveries SET status='failed',updated_at=? WHERE user_id=? AND release_id=?").bind(now,row.user_id,RELEASE.id).run();failed++;}
 }
 // Delivery claims are retained after uncertain sends so the next tick cannot duplicate mail.
 await env.DB.batch([env.DB.prepare('DELETE FROM release_subscribers WHERE enabled=0 AND updated_at<?').bind(now-7*DAY),env.DB.prepare("DELETE FROM system WHERE key LIKE 'release-email-%' AND ((key LIKE 'release-email-hour:%' AND CAST(substr(key,20) AS INTEGER)<?) OR (key NOT LIKE 'release-email-hour:%' AND CAST(value AS INTEGER)<?))").bind(Math.floor((now-2*DAY)/3600000),now-2*DAY)]);
 return {configured:true,sent,failed};
}

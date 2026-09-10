export function safeReturn(value, fallback='/pose.html') {
  if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||/[\\\r\n]/.test(value))return fallback;
  const url=new URL(value,'https://coach.invalid');
  return url.origin==='https://coach.invalid'&&!/^\/(signin|signout|callback)/.test(url.pathname)?url.pathname+url.search+url.hash:fallback;
}
export const signInPath=returnTo=>'/signin.html?return_to='+encodeURIComponent(safeReturn(returnTo));

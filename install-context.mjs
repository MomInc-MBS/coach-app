export function isInstalled(win=window){return win.matchMedia('(display-mode: standalone)').matches||win.navigator.standalone===true;}
const BROWSER_TEST='release-45';
function browserTestAllowed(win){
 try{
  const requested=new URLSearchParams(win.location?.search||'').get('test');
  if(requested===BROWSER_TEST){win.sessionStorage.setItem('myr5-browser-test',BROWSER_TEST);return true;}
  return win.sessionStorage.getItem('myr5-browser-test')===BROWSER_TEST;
 }catch{return false;}
}
export function setupAllowed(win=window){
 if(isInstalled(win)){try{win.sessionStorage.setItem('myr5-in-app-setup','1');}catch{}return true;}
 // Release-review entry: bypasses only the install-display check. Account, camera,
 // download ownership and durable data checks continue through their normal paths.
 if(browserTestAllowed(win))return true;
 // Keep an in-app sign-in return usable if the identity provider changes its window context.
 try{return win.sessionStorage.getItem('myr5-in-app-setup')==='1';}catch{return false;}
}

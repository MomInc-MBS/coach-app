export function isInstalled(win=window){return win.matchMedia('(display-mode: standalone)').matches||win.navigator.standalone===true;}
export function setupAllowed(win=window){
 if(isInstalled(win)){try{win.sessionStorage.setItem('myr5-in-app-setup','1');}catch{}return true;}
 // Keep an in-app sign-in return usable if the identity provider changes its window context.
 try{return win.sessionStorage.getItem('myr5-in-app-setup')==='1';}catch{return false;}
}

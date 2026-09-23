// This pathname is deliberately new so a previous release's service worker lets
// it reach the network. The marker is the same install-display marker already
// used after opening the installed app; it grants no account or device access.
try{
 sessionStorage.setItem('myr5-in-app-setup','1');
 sessionStorage.setItem('myr5-browser-test','release-45');
 location.replace('/onboarding.html?from=browser-test');
}catch{
 document.querySelector('p').textContent='Browser storage is blocked. Open this page in a normal tab and retry.';
}

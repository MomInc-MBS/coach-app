// The daily How to Play guide opens by itself once per local day and covers the screen. Tests that boot the real app
// pass this to (context|page).addInitScript so it reads as already shown today.
export const guideSeen=()=>{const get=Storage.prototype.getItem,d=new Date(),day=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;Storage.prototype.getItem=function(key){return String(key).startsWith('myr5-how-to-play-day-v1/')?day:get.call(this,key);};};
// Recent Chromium exposes DeviceOrientationEvent.requestPermission like iOS, so the portal's "Tilt to look around / Allow"
// chip appears and can sit over a scene's own controls. Tests that click scene controls hide the permission API.
export const noTiltPermission=()=>{try{Object.defineProperty(DeviceOrientationEvent,'requestPermission',{value:undefined,configurable:true});}catch{}};

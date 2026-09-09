// Camera choices come from the browser, never guessed from camera numbering.
// AGPL-3.0-or-later, like the accompanying app.
export const deviceChoice=id=>'device:'+id;
export function cameraConstraints(choice='environment',fps=30){
  const source=choice.startsWith('device:')?{deviceId:{exact:choice.slice(7)}}:{facingMode:{ideal:choice}};
  return {audio:false,video:{...source,width:{ideal:640},height:{ideal:480},frameRate:{ideal:fps,max:30},resizeMode:'none'}};
}
export async function listCameras(){return (await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput'&&d.deviceId).map(d=>({id:d.deviceId,label:d.label}));}
export async function openCamera(choice='environment',fps=30,devices=navigator.mediaDevices){
  let resolved=choice;
  if(!choice.startsWith('device:')){
    // Once permission exposes device labels, select the requested camera exactly.
    // An ideal facing preference alone can otherwise return a different camera.
    try{const pattern=choice==='user'?/(front|user|selfie)/i:/(back|rear|environment)/i;const match=(await devices.enumerateDevices()).find(d=>d.kind==='videoinput'&&d.deviceId&&pattern.test(d.label));if(match)resolved=deviceChoice(match.deviceId);}catch{}
  }
  return devices.getUserMedia(cameraConstraints(resolved,fps));
}
export function findUltrawide(cameras){return cameras.find(d=>!/(front|user|facetime|selfie)/i.test(d.label)&&/(ultra[\s-]?wide|ultrawide|0[.,][56]\s*[x×])/i.test(d.label));}
export function cameraFacing(track,choice){const settings=track.getSettings();return settings.facingMode||(/(front|user|selfie)/i.test(track.label)||choice==='user'?'user':'environment');}
export async function widestZoom(track){
  const capabilities=track.getCapabilities?.()||{},range=capabilities.zoom;
  const supported=range&&Number.isFinite(range.min)&&Number.isFinite(range.max)&&range.min>0&&range.max>=range.min;
  if(!supported)return {supported:false,applied:false,zoom:track.getSettings().zoom??null};
  try{
    await track.applyConstraints({advanced:[{zoom:range.min}]});
    const zoom=track.getSettings().zoom;
    return {supported:true,applied:Number.isFinite(zoom)&&Math.abs(zoom-range.min)<.01,min:range.min,max:range.max,zoom:zoom??null};
  }catch(error){return {supported:true,applied:false,min:range.min,max:range.max,zoom:track.getSettings().zoom??null,error:error.message};}
}
export function cameraReport(track,cameras,zoom){
  const settings=track.getSettings();return {version:'feet-optional-3',label:track.label||'Camera',facing:settings.facingMode||'',width:settings.width||0,height:settings.height||0,zoom,lenses:cameras.map(d=>d.label||'Unnamed camera')};
}

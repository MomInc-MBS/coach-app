// Dev-only, loaded by ?recordPose=1: records the camera workout's landmark stream plus tap-labelled "down"/"up"
// frames as a JSON download for scripts/pose-samples.mjs. Tap Down or Up, get into that position during the
// 3 s countdown and hold it; the next 1.5 s of frames carry the label. Switching exercise starts a new recording.
export function mountPoseRecorder(stage){
 let recording=null;
 const bar=document.createElement('div');bar.setAttribute('role','group');bar.setAttribute('aria-label','Pose recorder');
 bar.style.cssText='position:absolute;left:8px;right:8px;bottom:max(16px,env(safe-area-inset-bottom));z-index:2;display:flex;gap:8px;align-items:stretch;font:600 15px system-ui,sans-serif;color:#fff';
 const status=document.createElement('output');status.setAttribute('aria-live','polite');status.style.cssText='flex:1;min-width:0;padding:8px 10px;border-radius:12px;background:#000a';status.textContent='Recorder waiting for tracking';
 const button=(text,onClick)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.style.cssText='min-width:64px;min-height:48px;border:0;border-radius:12px;background:#fff;color:#000;font:inherit';b.addEventListener('click',onClick);bar.append(b);};
 const show=()=>{
  if(!recording)return;const now=performance.now(),last=recording.labels.at(-1);
  status.textContent=last&&now<last.from?`${last.label.toUpperCase()} in ${Math.ceil((last.from-now)/1000)}…`:last&&now<=last.to?`Hold ${last.label}…`:`${recording.exercise} · ${recording.frames.length} frames · ${recording.labels.length} labels`;
 };
 const label=name=>{if(!recording)return;const from=Math.round(performance.now()+3000);recording.labels.push({label:name,from,to:from+1500});show();};
 bar.append(status);button('Down',()=>label('down'));button('Up',()=>label('up'));
 button('Save',()=>{
  if(!recording?.frames.length)return;
  const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([JSON.stringify(recording)],{type:'application/json'}));
  link.download=`recordPose-${recording.exercise}-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
  bar.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(link.href),10000);status.textContent='Saved '+link.download;
 });
 stage.append(bar);
 addEventListener('myr5:pose',({detail})=>{
  const exercise=window.myr5TestState?.motion?.mode;if(stage.hidden||!detail.points||!exercise)return;
  if(recording?.exercise!==exercise)recording={version:1,exercise,aspect:detail.width/detail.height,frames:[],labels:[]};
  recording.frames.push([Math.round(detail.now),detail.points.slice(0,27).map(v=>[+v.x.toFixed(4),+v.y.toFixed(4),+(v.visibility??0).toFixed(3)]),...detail.world?[detail.world.slice(0,27).map(v=>[+v.x.toFixed(4),+v.y.toFixed(4),+v.z.toFixed(4)])]:[]]);
  show();
 });
}

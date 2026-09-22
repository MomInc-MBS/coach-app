export function mountCameraWorkout({video,counter,onStop}){
 const stage=document.createElement('section');stage.id='cameraWorkout';stage.hidden=true;stage.setAttribute('aria-label','Camera workout');
 const stop=document.createElement('button');stop.type='button';stop.className='camera-workout-counter';stop.setAttribute('aria-label','Stop workout');stop.title='Tap the counter to stop';stage.append(stop);
 // The AR coach is the one exception to camera-only mode (D24): a pointer-events:none layer above the
 // video and counter, so a fast knee/ankle can still register on the video underneath.
 const coachOverlay=document.createElement('div');coachOverlay.id='coachOverlay';stage.append(coachOverlay);
 document.body.append(stage);
 let active=false,anchors=[],inert=[];
 stop.addEventListener('click',()=>onStop());
 stage.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();onStop();}});
 return {setActive(next){if(next===active)return;active=next;
 if(next){
  anchors=[video,counter].map(node=>{const marker=document.createComment('camera-workout-return');node.before(marker);return [node,marker];});
  stage.prepend(video);stop.append(counter);stage.hidden=false;document.body.dataset.cameraWorkout='true';
  inert=[...document.body.children].filter(node=>node!==stage).map(node=>[node,node.inert]);for(const [node] of inert)node.inert=true;
  stop.focus({preventScroll:true});
 }else{
  for(const [node,marker] of anchors){marker.replaceWith(node);}anchors=[];
  for(const [node,value] of inert)node.inert=value;inert=[];stage.hidden=true;delete document.body.dataset.cameraWorkout;
 }
 }};
}

export function mountCameraWorkout({video,counter,onStop}){
 const stage=document.createElement('section');stage.id='cameraWorkout';stage.hidden=true;stage.setAttribute('aria-label','Camera workout');
 const stop=document.createElement('button');stop.type='button';stop.className='camera-workout-counter';stop.setAttribute('aria-label','Stop workout');stop.title='Tap the counter to stop';stage.append(stop);
 // The AR coach is the one exception to camera-only mode (D24): a pointer-events:none layer above the
 // video and counter, so a fast knee/ankle can still register on the video underneath.
 const coachOverlay=document.createElement('div');coachOverlay.id='coachOverlay';stage.append(coachOverlay);
 document.body.append(stage);
 // Dev-only: ?recordPose=1 records landmarks and up/down labels for k-NN samples (scripts/pose-samples.mjs).
 if(new URLSearchParams(location.search).get('recordPose')==='1')import('./pose-recorder.mjs').then(({mountPoseRecorder})=>mountPoseRecorder(stage));
 let active=false,anchors=[],inert=[],links=[],housing=null,token=0;
 // Metal housing + feathered strip AROUND the edge (Ian asked for it); the middle of the video stays clear and the frame ignores pointers.
 // Reuses the standalone housing markup and styles, so it needs no #portalChrome.
 const showHousing=async()=>{const mine=++token;try{
  const [{frameMarkup,paintHousing},...sheets]=await Promise.all([import('./modules/portal/standalone-housing.mjs'),...['/modules/portal/portal.css','/modules/portal/standalone-housing.css'].map(href=>new Promise(resolve=>{const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.onload=link.onerror=()=>resolve(link);document.head.append(link);}))]);
  if(!active||mine!==token){sheets.forEach(link=>link.remove());return;}
  links=sheets;housing=document.createElement('div');housing.className='camera-workout-housing';housing.setAttribute('aria-hidden','true');housing.innerHTML=frameMarkup();paintHousing(housing,document);stage.classList.add('portal-standalone');stage.insertBefore(housing,coachOverlay);
 }catch{}};
 const hideHousing=()=>{token++;housing?.remove();housing=null;links.forEach(link=>link.remove());links=[];stage.classList.remove('portal-standalone');};
 stop.addEventListener('click',()=>onStop());
 stage.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();onStop();}});
 return {setActive(next){if(next===active)return;active=next;
 if(next){
  anchors=[video,counter].map(node=>{const marker=document.createComment('camera-workout-return');node.before(marker);return [node,marker];});
  stage.prepend(video);stop.append(counter);stage.hidden=false;document.body.dataset.cameraWorkout='true';
  inert=[...document.body.children].filter(node=>node!==stage).map(node=>[node,node.inert]);for(const [node] of inert)node.inert=true;
  stop.focus({preventScroll:true});void showHousing();
 }else{
  hideHousing();
  for(const [node,marker] of anchors){marker.replaceWith(node);}anchors=[];
  for(const [node,value] of inert)node.inert=value;inert=[];stage.hidden=true;delete document.body.dataset.cameraWorkout;
 }
 }};
}

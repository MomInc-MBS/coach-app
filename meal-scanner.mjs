export function mountMealScanner(){
 const $=id=>document.getElementById(id),stage=$('mealScanStage'),overlay=$('mealScanOverlay'),preview=$('foodPreview'),trigger=$('recognizeFood');
 let worker=null,photoUrl=null,selected=null,generation=0,timer=null,started=0;
 const status=text=>$('foodStatus').textContent=text;
 function stopClock(){clearInterval(timer);timer=null;trigger.disabled=false;$('cancelFoodScan').hidden=true;stage.removeAttribute('aria-busy');}
 function cancel(message){generation++;worker?.terminate();worker=null;stopClock();overlay.dataset.state='ready';$('scanProgress').hidden=true;if(message){$('scanPhase').textContent='SCAN PAUSED';status(message);}}
 function phase(state,title,detail){overlay.hidden=false;overlay.dataset.state=state;$('scanPhase').textContent=title;$('scanDetail').textContent=detail;}
 function error(text){stopClock();phase('error','SCAN INTERRUPTED',text);$('scanProgress').hidden=true;status(text);worker?.terminate();worker=null;}
 $('foodPhoto').onchange=()=>{
  cancel();if(photoUrl)URL.revokeObjectURL(photoUrl);photoUrl=null;selected=null;preview.removeAttribute('src');stage.hidden=true;$('foodSuggestions').replaceChildren();
  const file=$('foodPhoto').files[0];if(!file){status('Choose a photo to begin.');return;}
  if(file.size>15*1024*1024){status('Choose a photo smaller than 15 MB.');return;}
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){status('Choose a JPEG, PNG or WebP photo.');return;}
  selected=file;photoUrl=URL.createObjectURL(file);preview.src=photoUrl;preview.hidden=false;stage.hidden=false;$('scanElapsed').textContent='00:00';
  phase('ready','FOOD SCANNER','Photo loaded · awaiting scan');status('Photo ready. Press Analyze food.');
 };
 $('cancelFoodScan').onclick=()=>cancel('Scan stopped. You can retry or enter the meal below.');
 $('mealsPanel').addEventListener('close',()=>{if(timer)cancel('Scan paused. Press Analyze food to start again.');});
 trigger.onclick=async()=>{
  if(!selected){status('Choose a meal photo first.');return;}
  const run=++generation;trigger.disabled=true;stage.setAttribute('aria-busy','true');$('cancelFoodScan').hidden=false;$('foodSuggestions').replaceChildren();started=performance.now();
  const tick=()=>{const s=Math.floor((performance.now()-started)/1000);$('scanElapsed').textContent=`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;};tick();timer=setInterval(tick,1000);
  phase('preparing','PREPARING PHOTO','Reading image on this device');status('Preparing your photo…');
  try{
   const bitmap=await createImageBitmap(selected);if(run!==generation){bitmap.close();return;}
   const canvas=document.createElement('canvas'),ratio=Math.min(1,768/Math.max(bitmap.width,bitmap.height));canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
   worker??=new Worker('/food-worker.mjs',{type:'module'});
   worker.onerror=()=>{if(run===generation)error('Recognition is unavailable in this browser. Type the meal name below.');};
   worker.onmessage=({data})=>{
    if(run!==generation)return;
    if(data.type==='progress'){
     phase(data.stage||'analyzing',data.stage==='loading'?'LOADING FOOD MODEL':'ANALYZING FOOD',data.text);status(data.text);
     const p=$('scanProgress');p.hidden=!(data.stage==='loading'&&Number.isFinite(data.progress));if(!p.hidden)p.value=data.progress;
    }else if(data.type==='error')error(data.text);
    else if(data.type==='result'){
     stopClock();$('scanProgress').hidden=true;
     const best=data.items[0];phase('result',data.uncertain?'CHECK THE MATCHES':'SCAN COMPLETE',best?`${best.label} · ${(best.score*100).toFixed(1)}% match score`:'No clear food match');
     status(data.uncertain?'MOM is unsure. Choose a possible match or enter the meal name.':'Choose a match, then confirm the food and portion below.');
     $('foodSuggestions').replaceChildren(...data.items.map(item=>{const b=document.createElement('button');b.type='button';b.textContent=`${item.label} · ${(item.score*100).toFixed(1)}%`;b.setAttribute('aria-label',`${item.label}, ${(item.score*100).toFixed(1)} percent model match score`);b.onclick=()=>{$('mealName').value=item.label;$('mealName').focus();};return b;}));
    }
   };
   worker.postMessage({image:canvas.toDataURL('image/jpeg',.85)});
  }catch{if(run===generation)error('Could not read that photo. Try a JPEG or PNG, or enter the meal below.');}
 };
 window.addEventListener('pagehide',()=>{cancel();if(photoUrl)URL.revokeObjectURL(photoUrl);photoUrl=null;});
}

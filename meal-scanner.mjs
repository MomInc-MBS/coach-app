export function mountMealScanner(){
 const $=id=>document.getElementById(id),stage=$('mealScanStage'),overlay=$('mealScanOverlay'),preview=$('foodPreview'),trigger=$('recognizeFood');
 let worker=null,photoUrl=null,selected=null,generation=0,timer=null,started=0;
 const status=text=>$('foodStatus').textContent=text;
 function stopClock(){clearInterval(timer);timer=null;trigger.disabled=false;$('cancelFoodScan').hidden=true;stage.removeAttribute('aria-busy');}
 function cancel(message){generation++;worker?.terminate();worker=null;stopClock();overlay.dataset.state='ready';$('scanProgress').hidden=true;if(message){$('scanPhase').textContent='SCAN PAUSED';status(message);}}
 function phase(state,title,detail){overlay.hidden=false;overlay.dataset.state=state;$('scanPhase').textContent=title;$('scanDetail').textContent=detail;}
 const notify=(type,detail)=>window.dispatchEvent(new CustomEvent(type,{detail}));
 function error(text){stopClock();phase('error','SCAN INTERRUPTED',text);$('scanProgress').hidden=true;trigger.hidden=false;status(text);worker?.terminate();worker=null;notify('myr5:food-selected',{name:''});}
 $('foodCamera').onclick=()=>$('foodPhoto').click();
 $('foodPhoto').onchange=()=>{
  if(!$('foodPhoto').files[0])return;
  cancel();notify('myr5:food-reset');trigger.hidden=true;if(photoUrl)URL.revokeObjectURL(photoUrl);photoUrl=null;selected=null;preview.removeAttribute('src');stage.hidden=true;$('foodSuggestions').replaceChildren();$('foodSuggestions').hidden=true;
  const file=$('foodPhoto').files[0];if(!file){status('Choose a photo to begin.');return;}
  if(file.size>15*1024*1024){status('Choose a photo smaller than 15 MB.');return;}
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){status('Choose a JPEG, PNG or WebP photo.');return;}
  selected=file;photoUrl=URL.createObjectURL(file);preview.src=photoUrl;preview.hidden=false;stage.hidden=false;$('scanElapsed').textContent='00:00';
  phase('ready','FOOD SCANNER','Reading your photo');return trigger.onclick();
 };
 $('cancelFoodScan').onclick=()=>{cancel('Scan stopped. Retry or confirm the food below.');trigger.hidden=false;notify('myr5:food-selected',{name:''});};
 $('mealsPanel').addEventListener('close',()=>{if(timer){cancel('Scan paused. Tap Retry scan to continue.');trigger.hidden=false;}});
 trigger.onclick=async()=>{
  if(!selected){status('Choose a meal photo first.');return;}
  const run=++generation;clearInterval(timer);trigger.hidden=true;trigger.disabled=true;stage.setAttribute('aria-busy','true');$('cancelFoodScan').hidden=false;$('foodSuggestions').replaceChildren();started=performance.now();
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
     stage.hidden=true;trigger.hidden=!data.uncertain;status(data.uncertain?'Check the possible food match and portion below.':'Confirm the food and portion below.');
     notify('myr5:food-selected',{name:best?.label||''});
     $('foodSuggestions').hidden=!data.uncertain;
     $('foodSuggestions').replaceChildren(...data.items.map(item=>{const b=document.createElement('button');b.type='button';b.textContent=`${item.label} · ${(item.score*100).toFixed(1)}%`;b.setAttribute('aria-label',`${item.label}, ${(item.score*100).toFixed(1)} percent model match score`);b.onclick=()=>{notify('myr5:food-selected',{name:item.label});};return b;}));
    }
   };
   worker.postMessage({image:canvas.toDataURL('image/jpeg',.85)});
  }catch{if(run===generation)error('Could not read that photo. Try a JPEG or PNG, or enter the meal below.');}
 };
 window.addEventListener('pagehide',()=>{cancel();if(photoUrl)URL.revokeObjectURL(photoUrl);photoUrl=null;});
}

const HAND_KEY='handborne-recipe-v4';
export function initHandCompanion(){
 const $=id=>document.getElementById(id);let companion=null,loading=null,inRest=false,disposed=false;
 function preview(){let family=11;try{const design=JSON.parse(localStorage.getItem(HAND_KEY));if(Number.isInteger(design?.sections?.palm)&&design.sections.palm>=0&&design.sections.palm<23)family=design.sections.palm;}catch{}
  for(const id of ['identityHandPreview','restHandFallback'])$(id).src='/handborne/previews/family-'+String(family).padStart(2,'0')+'.png?v=5';
 }
 function status(text){$('handTeamStatus').textContent=text;const failed=/could not|unavailable/i.test(text);$('retryHand').hidden=!failed;$('restHandFallback').hidden=!failed;}
 async function load(){if(companion){companion.setActive(inRest);return;}if(loading)return loading;
  loading=(async()=>{try{const {createHandCompanion}=await import('/handborne/companion.mjs');if(disposed||!inRest)return;companion=createHandCompanion($('restHandMount'),{onStatus:status});companion.setActive(inRest);}catch{status('3D hand unavailable. Your hand can still help with team strikes.');}finally{loading=null;}})();return loading;
 }
 function edit(){$('identitySummary').hidden=true;$('handEditorPanel').hidden=false;$('identity').classList.add('hand-editing');$('handEditorFrame').src='/handborne/index.html?embed=1';$('backToAvatar').focus();}
 function back(){ $('handEditorFrame').removeAttribute('src');$('handEditorPanel').hidden=true;$('identitySummary').hidden=false;$('identity').classList.remove('hand-editing');preview();if(inRest)companion?.refresh(); }
 $('customizeHand').addEventListener('click',edit);$('backToAvatar').addEventListener('click',()=>{back();$('customizeHand').focus();});$('identity').addEventListener('close',back);
 $('retryHand').addEventListener('click',()=>companion?companion.refresh():load());
 const changed=event=>{if(event.key===HAND_KEY||event.key===null)preview();};
 const message=event=>{if(event.origin!==location.origin||event.source!==$('handEditorFrame').contentWindow||event.data?.type!=='handborne:changed')return;preview();};
 window.addEventListener('storage',changed);window.addEventListener('message',message);preview();
 return {edit,enter(){inRest=true;preview();$('handCharge').value=0;$('handChargeLabel').textContent='Team strike in 3 taps';void load();},leave(){inRest=false;companion?.setActive(false);},hit(hit){companion?.gesture(hit.assisted?'fist-bump':hit.blocked?'high-five':'point-at-you');$('handCharge').value=hit.charge;$('handChargeLabel').textContent=hit.assisted?'Team strike!':`Team strike in ${3-hit.charge} ${hit.charge===2?'tap':'taps'}`;$('handTeamStatus').textContent=hit.assisted?(hit.blocked?'Helping Hand strikes. Coach blocks!':'Helping Hand doubles your strike!'):'Helping Hand is charging up.';},dispose(){disposed=true;companion?.dispose();window.removeEventListener('storage',changed);window.removeEventListener('message',message);}};
}

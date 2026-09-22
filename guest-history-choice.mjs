import {IMPORT_UPLOAD_MANIFEST} from './local-coach/import-upload-manifest.mjs';

// Opening/dismissing history records no choice and starts no upload. The user
// selects concrete workouts and a destination shown by this render.
export function mountGuestHistoryChoice({host,adapter,getAccount,transitions,onChange=()=>{}}){
 let generation=0;
 const clear=()=>{generation++;host.replaceChildren();adapter.stop();};
 const unsubscribe=transitions.subscribe(clear);
 const element=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
 async function render(){
  const run=++generation,displayed=getAccount(),rows=await adapter.history();if(run!==generation)return;
  host.replaceChildren();if(!rows.length)return;
  host.append(element('h3','Choose how to keep device history'));
  host.append(element('p','Signing in does not upload these workouts. Imported history stays outside rankings and rewards.'));
  const status=element('p');status.setAttribute('role','status');
  const options=element('div'),selected=new Set(),buttons=[];
  for(const row of rows){
   const line=element('label'),checkbox=element('input');checkbox.type='checkbox';checkbox.disabled=!row.selectable;
   checkbox.addEventListener('change',()=>{if(checkbox.checked)selected.add(row.workout.clientWorkoutId);else selected.delete(row.workout.clientWorkoutId);});
   const label=`${row.workout.metadata?.name||row.workout.mode} · ${new Date(row.workout.completedAt).toLocaleString()} · ${row.status.replaceAll('_',' ')}`;
   line.append(checkbox,document.createTextNode(label));options.append(line,element('br'));
  }
  host.append(options,status);
  async function act(work){
   if(run!==generation)return;buttons.forEach(button=>button.disabled=true);
   try{await work();if(run!==generation)return;await render();onChange();}
   catch(error){if(run===generation)status.textContent=error.message;}
   finally{if(run===generation)buttons.forEach(button=>button.disabled=false);}
  }
  const button=(label,work)=>{const node=element('button',label);node.type='button';node.addEventListener('click',()=>void act(work));buttons.push(node);host.append(node);return node;};
  const choice=kind=>{if(selected.size<1||selected.size>100)throw Error('Select between one and 100 workouts.');return adapter.choose(kind,[...selected],displayed);};
  button('Keep selected workouts local',()=>choice('keep_local'));
  if(displayed?.user?.id){
   host.append(element('p',`Import destination: ${displayed.user.email||displayed.user.id}`));
   button('Save import choice for selected workouts',()=>choice('import'));
   button('Check for account deletion',()=>adapter.reconcileDeletedTarget(displayed));
   if(IMPORT_UPLOAD_MANIFEST.uploadsEnabled===true){
    button('Import saved choices',()=>adapter.upload(displayed));
    const parked=rows.filter(row=>row.status==='parked'&&row.item?.targetAccountId===displayed.user.id&&row.item.targetDataEpoch===displayed.dataEpoch).map(row=>row.item.claimId);
    if(parked.length)button('Resume paused imports',()=>adapter.upload(displayed,{resumeParkedClaimIds:parked}));
   }else host.append(element('p','Uploads are disabled in this build. Your choice is saved only on this device.'));
  }else host.append(element('p','Sign in to choose an import destination.'));
 }
 return {render,close(){clear();unsubscribe();}};
}

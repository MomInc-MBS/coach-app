import { downloadAllPostDownloadSections, downloadPostDownloadSection, downloadStarterPostDownloadSections } from './post-download-controller.mjs';
import { POST_DOWNLOAD_SECTIONS, resolvePostDownloadSection, starterPostDownloadSectionIds } from './post-download-sections.mjs';
import { productionMaterialTrust } from './material-config.mjs';

export function postDownloadChoices(account, availableIds) {
  if (!account?.user?.id || !(availableIds instanceof Set)) return Object.freeze({ starter:[], individual:[], all:[] });
  const all=POST_DOWNLOAD_SECTIONS.map(section=>section.id).filter(id=>availableIds.has(id));
  const wantedStarter=starterPostDownloadSectionIds(account), starter=wantedStarter.every(id=>availableIds.has(id))?wantedStarter:[];
  const selected=new Set(starter);
  return Object.freeze({
    starter:Object.freeze(starter),
    individual:Object.freeze(all.filter(id=>id==='coach-ships-biomes'||(id.startsWith('track-')&&!selected.has(id)))),
    all:Object.freeze(all),
  });
}

/** Account-scoped explicit-action controls; anonymous core download remains independent. */
export function mountPostDownloadSections({ host, account=globalThis.myr5AuthenticatedAccount, fetchImpl=globalThis.fetch, trust=productionMaterialTrust(), policy, store }={}) {
  const accountId=value=>typeof value?.user?.id==='string'?value.user.id:null;
  if (!host || !trust || !accountId(account)) return null;
  const panel=document.createElement('section');
  panel.className='post-download-sections';panel.hidden=true;
  panel.innerHTML='<h3>Extra offline packs</h3><p data-status role="status"></p><button type="button" data-retry hidden>Try again</button><div data-actions></div><progress max="1" value="0" hidden aria-label="Extra pack download progress"></progress><button type="button" data-pause hidden>Pause</button>';
  host.append(panel);
  const status=panel.querySelector('[data-status]'), actions=panel.querySelector('[data-actions]'), progress=panel.querySelector('progress'), pause=panel.querySelector('[data-pause]'), retry=panel.querySelector('[data-retry]');
  let currentAccount=account, owner=null, available=new Map(), controller=null, pausedIds=null,epoch=0,disposed=false,checking=null;
  const allowed=()=>!disposed&&!!owner&&accountId(Object.hasOwn(globalThis,'myr5AuthenticatedAccount')?globalThis.myr5AuthenticatedAccount:currentAccount)===owner;
  const labels=new Map(POST_DOWNLOAD_SECTIONS.map(section=>[section.id,section.title]));
  function clear(){available=new Map();actions.replaceChildren();panel.hidden=true;retry.hidden=true;status.textContent='';}
  function button(label,ids,operation){const b=document.createElement('button');b.type='button';b.disabled=!!controller;b.dataset.sections=ids.join(' ');const resume=pausedIds&&JSON.stringify(pausedIds)===JSON.stringify(ids);b.textContent=resume?label.replace(/^Download/,'Resume'):label;b.addEventListener('click',()=>{pausedIds=null;void run(ids,operation);});actions.append(b);}
  function render(){
    if(!allowed()){clear();return;}
    const choices=postDownloadChoices(currentAccount,new Set(available.keys()));
    actions.replaceChildren();
    if(choices.starter.length)button('Download starter styles',choices.starter,opts=>downloadStarterPostDownloadSections(opts));
    for(const id of choices.individual)button(id==='coach-ships-biomes'?'Download ships & worlds':`Download ${labels.get(id)} pack`,[id],opts=>downloadPostDownloadSection({...opts,id}));
    if(choices.all.length===POST_DOWNLOAD_SECTIONS.length)button('Download every extra',choices.all,opts=>downloadAllPostDownloadSections(opts));
    if(actions.childElementCount)panel.hidden=false;
  }
  function report(info){progress.hidden=false;progress.value=Math.max(0,Math.min(1,Number(info?.percent)||0));status.textContent=`Downloading ${labels.get(info?.packId)||'offline packs'} · ${Math.round(progress.value*100)}%`;}
  async function run(ids,operation){
    if(controller||!allowed())return;
    const runEpoch=epoch,runOwner=owner,runAccount=currentAccount,abort=new AbortController();controller=abort;
    const active=()=>runEpoch===epoch&&allowed()&&owner===runOwner;
    pause.hidden=false;pause.disabled=false;pause.textContent='Pause';status.textContent='Preparing verified download…';render();
    try{await operation({signal:abort.signal,account:runAccount,authorize:()=>active(),fetchImpl,trust,policy,store,onProgress:info=>{if(active())report(info);}});if(active()){status.textContent='Offline packs ready.';progress.value=1;}}
    catch(error){if(active()){if(abort.signal.aborted){pausedIds=[...ids];status.textContent='Download paused. Resume is available.';}else status.textContent=error.message||'Download unavailable. Try again later.';}}
    finally{if(controller===abort){controller=null;pause.hidden=true;if(active())render();}}
  }
  pause.addEventListener('click',()=>{if(controller){controller.abort();pause.disabled=true;}});
  retry.addEventListener('click',()=>void refresh());
  async function refresh(){
    const refreshEpoch=++epoch;controller?.abort();controller=null;checking?.abort();checking=new AbortController();
    pausedIds=null;pause.hidden=true;progress.hidden=true;progress.value=0;retry.hidden=true;owner=accountId(currentAccount);
    if(!owner||disposed){clear();return;}
    panel.hidden=false;actions.replaceChildren();status.textContent='Checking signed offline packs…';
    const signal=checking.signal;
    // A section that can't be resolved (bad network, unsupported browser crypto, a stale manifest)
    // is logged, not swallowed: the others still render, and the status line says what to do next.
    const results=await Promise.all(POST_DOWNLOAD_SECTIONS.map(async section=>{
      try{return [section.id,await resolvePostDownloadSection(section.id,{fetchImpl,trust,policy,signal})];}
      catch(error){if(!signal.aborted)console.warn(`Offline pack unavailable: ${section.id}`,error);return [section.id,null];}
    }));
    if(refreshEpoch!==epoch||!allowed()||signal.aborted)return;
    available=new Map(results.filter(([,value])=>value));
    const failed=results.length-available.size;
    render();
    if(!available.size){retry.hidden=false;panel.hidden=false;status.textContent='Could not check offline packs. Check your connection, then try again.';}
    else if(failed){retry.hidden=false;status.textContent=`${failed} of ${results.length} packs could not be checked. Try again for the rest.`;}
    else if(!actions.childElementCount)panel.hidden=true;
    else status.textContent='';
  }
  const onReady=event=>{currentAccount=event.detail;void refresh();};
  const onCleared=()=>{currentAccount=null;void refresh();};
  window.addEventListener('myr5:account-ready',onReady);window.addEventListener('myr5:account-cleared',onCleared);
  void refresh();
  return Object.freeze({panel,refresh,dispose(){disposed=true;++epoch;controller?.abort();checking?.abort();window.removeEventListener('myr5:account-ready',onReady);window.removeEventListener('myr5:account-cleared',onCleared);panel.remove();}});
}

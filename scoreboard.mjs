import {FOCUS_GROUPS} from './exercise-library.mjs';
import {GROUP_INKS,comparisonRows,displayScore} from './scoreboard-domain.mjs';
const $=id=>document.getElementById(id);
const element=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!=null)node.textContent=text;return node;};
export function mountScoreboard({api,getAccount}){
 const container=$('workoutList'),panel=$('accountPanel'),tray=$('scoreboardMarkers');
 let selected='chest',members=[],loaded=false,requestNumber=0,animationNumber=0,animationTimers=[],pendingInvite=null,crewSignature='';
 function clearAnimation(){animationTimers.forEach(clearTimeout);animationTimers=[];panel.classList.remove('board-erasing','board-drawing');$('boardMovingPen').hidden=true;}
 function renderGraph(){
  container.replaceChildren();const group=FOCUS_GROUPS.find(g=>g.id===selected);panel.style.setProperty('--marker',GROUP_INKS[selected]);
  $('scoreboardGroup').textContent=group.name;$('scoreboardSubtitle').textContent=group.description;
  for(const pen of tray.children){pen.setAttribute('aria-pressed',String(pen.dataset.group===selected));}
  const axis=element('div','score-axis','↑ Exercise level');const caption=element('p','score-caption','Best completed set · bar heights compare people within each row');container.append(axis,caption);
  for(const row of comparisonRows(selected,members)){
   const section=element('section','score-row');section.setAttribute('aria-label',`Level ${row.exercise.difficulty}: ${row.exercise.name}`);
   const label=element('div','score-exercise');label.append(element('span','score-level',`LV ${String(row.exercise.difficulty).padStart(2,'0')}`),element('h4','',row.exercise.name),element('span','score-unit',row.unit));
   const pillars=element('div','score-pillars');
   for(const bar of row.bars){const person=members[bar.slot],name=bar.slot===0?'You':person?.name||`Friend ${bar.slot}`;const pillar=element('div','score-pillar');pillar.dataset.medal=bar.medal||'empty';pillar.setAttribute('aria-label',`${name}: ${bar.value===null?(person?'no completed set':'not connected'):`${displayScore(bar.value)} ${row.unit}, ${bar.medal}`}`);
    const value=element('strong','score-value',displayScore(bar.value)),track=element('div','pillar-track'),ink=element('i','pillar-bar');ink.style.setProperty('--bar-height',bar.height+'%');ink.setAttribute('aria-hidden','true');track.append(ink);
    pillar.append(value,track,element('span','pillar-rank',bar.medal?`${bar.rank} · ${bar.medal}`:person?'No set':'Open place'),element('span','pillar-name',name));pillars.append(pillar);
   }
   section.append(label,pillars);container.append(section);
  }
 }
 function select(group,button){
  if(group===selected&&loaded)return;selected=group;const sequence=++animationNumber;clearAnimation();
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){renderGraph();return;}
  const pen=$('boardMovingPen');pen.hidden=false;pen.style.setProperty('--pen-ink',GROUP_INKS[group]);
  const from=button.getBoundingClientRect(),to=$('boardCanvas').getBoundingClientRect();pen.style.setProperty('--pen-from-x',`${from.left+from.width/2-to.left}px`);pen.style.setProperty('--pen-from-y',`${from.top-to.top}px`);
  panel.classList.add('board-erasing');
  animationTimers.push(setTimeout(()=>{if(sequence!==animationNumber)return;renderGraph();panel.classList.remove('board-erasing');panel.classList.add('board-drawing');},380));
  animationTimers.push(setTimeout(()=>{if(sequence===animationNumber)clearAnimation();},820));
 }
 for(const group of FOCUS_GROUPS){const pen=element('button','board-marker');pen.type='button';pen.dataset.group=group.id;pen.style.setProperty('--pen-ink',GROUP_INKS[group.id]);pen.setAttribute('aria-label',`${group.name} scoreboard`);pen.setAttribute('aria-controls','boardCanvas');pen.setAttribute('aria-pressed',String(group.id===selected));const body=element('span','marker-body');body.setAttribute('aria-hidden','true');body.append(element('i','marker-eraser'),element('i','marker-tip'));pen.append(body,element('span','marker-label',group.name));pen.onclick=()=>select(group.id,pen);tray.append(pen);}
 function drawHead(slot,person){const frame=element('div','crew-head');if(!person){frame.textContent='+';frame.setAttribute('aria-hidden','true');return frame;}if(!person.avatar||!window.GalaAvatar){frame.textContent='?';frame.setAttribute('aria-label','No saved Gala look');return frame;}try{const look=window.GalaAvatar.normalize(person.avatar),source=document.createElement('canvas'),head=document.createElement('canvas');window.GalaAvatar.draw(source,look,{base:false,weapon:false,companion:false,prop:false});head.width=64;head.height=64;head.setAttribute('role','img');head.setAttribute('aria-label',`${slot===0?'Your':person.name+'’s'} Gala character head`);const ctx=head.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(source,8,0,48,40,0,5,64,54);frame.append(head);}catch{frame.textContent='?';frame.setAttribute('aria-label','No saved Gala look');}return frame;}
 function renderCrew(){const signature=JSON.stringify(members.map(({name,link,avatar})=>({name,link,avatar})));if(signature===crewSignature)return;crewSignature=signature;$('scoreboardCrew').replaceChildren();for(let slot=0;slot<3;slot++){const person=members[slot],card=element('div','crew-place');card.append(drawHead(slot,person),element('strong','',slot===0?(person?.name||'You'):person?.name||`Friend ${slot}`),element('span','crew-place-label',slot===0?'Your place':person?'Connected':'Invite a friend'));if(person?.link){const remove=element('button','crew-remove','Remove');remove.type='button';remove.setAttribute('aria-label',`Stop sharing with ${person.name}`);remove.onclick=()=>action(remove,async()=>{await api('/api/scoreboard/friends/'+encodeURIComponent(person.link),'DELETE');await refresh();$('crewStatus').textContent='Friend removed. Sharing has stopped.';});card.append(remove);}$('scoreboardCrew').append(card);}$('createCrewInvite').disabled=members.length>=3;$('crewJoin').disabled=members.length>=3;}
 async function action(button,fn){button.disabled=true;try{await fn();}catch(error){$('crewStatus').textContent=error.message;}finally{button.disabled=members.length>=3&&['createCrewInvite','crewJoin'].includes(button.id);}}
 $('createCrewInvite').onclick=()=>action($('createCrewInvite'),async()=>{const result=await api('/api/scoreboard/invite','POST',{consent:true});pendingInvite=result.code;$('crewInviteCode').value=result.code;$('crewInviteOutput').hidden=false;$('revokeCrewInvite').hidden=false;$('crewStatus').textContent='Code ready. Share it with one friend. It expires in seven days.';});
 $('copyCrewInvite').onclick=async()=>{try{await navigator.clipboard.writeText(pendingInvite||$('crewInviteCode').value);$('crewStatus').textContent='Invite code copied. Your friend can enter it in their scoreboard.';}catch{$('crewInviteCode').focus();$('crewInviteCode').select();$('crewStatus').textContent='Code selected. Use Copy to share it.';}};
 $('revokeCrewInvite').onclick=()=>action($('revokeCrewInvite'),async()=>{await api('/api/scoreboard/invite','DELETE');pendingInvite=null;$('crewInviteOutput').hidden=true;$('revokeCrewInvite').hidden=true;$('crewStatus').textContent='Invite cancelled.';});
 $('crewJoinForm').onsubmit=event=>{event.preventDefault();action($('crewJoin'),async()=>{await api('/api/scoreboard/join','POST',{code:$('crewJoinCode').value,consent:true});$('crewJoinCode').value='';await refresh();$('crewStatus').textContent='Connected. Your names, Gala looks and best sets are shared.';});};
 async function refresh(){if(!getAccount())return;const user=getAccount().user.id,epoch=getAccount().dataEpoch,number=++requestNumber;container.setAttribute('aria-busy','true');$('recordsStatus').textContent='Updating the board…';try{const result=await api('/api/scoreboard');if(number!==requestNumber||getAccount()?.user.id!==user||getAccount()?.dataEpoch!==epoch||result.targetAccountId!==user||result.dataEpoch!==epoch)return;members=result.members;loaded=true;renderCrew();renderGraph();$('revokeCrewInvite').hidden=!result.inviteExpiresAt;if(!result.inviteExpiresAt){pendingInvite=null;$('crewInviteOutput').hidden=true;}$('recordsStatus').textContent=members[0]?.items.length?`Updated ${new Date(result.updatedAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}`:'Finish a set to put your first record on the board.';}catch(error){if(number===requestNumber)$('recordsStatus').textContent=`Board could not refresh. ${error.message}`;}finally{if(number===requestNumber)container.removeAttribute('aria-busy');}}
 function clear(){++requestNumber;++animationNumber;clearAnimation();members=[];loaded=false;crewSignature='';pendingInvite=null;$('crewInviteOutput').hidden=true;$('crewInviteCode').value='';renderCrew();renderGraph();}
 panel.addEventListener('close',()=>{++animationNumber;clearAnimation();});
 const timer=setInterval(()=>{if(panel.open&&!document.hidden&&loaded)refresh();},30000);window.addEventListener('pagehide',()=>{clearInterval(timer);clearAnimation();});
 window.addEventListener('myr5:account-progress',()=>{if(panel.open&&loaded)refresh();});
 renderCrew();renderGraph();return {refresh,clear};
}

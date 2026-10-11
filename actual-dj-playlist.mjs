// Saved ordering only. Playback remains owned by each source's existing player.
export function reconcilePlaylist(order,localTracks,sourceLinks,makeId=()=>crypto.randomUUID()){
 const locals=new Map();for(const track of localTracks)locals.set(track.id,(locals.get(track.id)||0)+1);
 const sources=new Set(sourceLinks.map(entry=>entry.playlistId)),seen=new Set(),result=[];
 for(const ref of Array.isArray(order)?order:[]){if(!ref||typeof ref.id!=='string'||ref.id.length>100||seen.has(ref.id))continue;
  if(ref.kind==='local'&&locals.get(ref.trackId)>0){locals.set(ref.trackId,locals.get(ref.trackId)-1);result.push({id:ref.id,kind:'local',trackId:ref.trackId});}
  else if(ref.kind==='source-link'&&sources.delete(ref.sourceId))result.push({id:ref.id,kind:'source-link',sourceId:ref.sourceId});else continue;seen.add(ref.id);
 }
 for(const track of localTracks)if(locals.get(track.id)>0){result.push({id:makeId(),kind:'local',trackId:track.id});locals.set(track.id,locals.get(track.id)-1);}
 for(const entry of sourceLinks)if(sources.delete(entry.playlistId))result.push({id:makeId(),kind:'source-link',sourceId:entry.playlistId});
 return result;
}
export function movePlaylistItem(order,id,step){const index=order.findIndex(ref=>ref.id===id),target=index+step;if(index<0||![-1,1].includes(step)||target<0||target>=order.length)return order;const next=order.slice();[next[index],next[target]]=[next[target],next[index]];return next;}
export function assignPlaylistIds(entries,makeId=()=>crypto.randomUUID()){
 const seen=new Set();return entries.map(entry=>{let id=entry.playlistId;if(typeof id!=='string'||!id||id.length>100||seen.has(id))id=makeId();seen.add(id);return {...entry,playlistId:id};});
}

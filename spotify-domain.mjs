// Spotify-facing values are deliberately reduced to fields the terminal displays.
export const SPOTIFY_SCOPES = [
  'user-read-private', 'user-read-currently-playing', 'user-read-playback-state',
  'user-modify-playback-state', 'playlist-read-private', 'playlist-read-collaborative',
].join(' ');

export function spotifyJamLink(value) {
  try {
    const u = new URL(String(value).trim());
    if (u.protocol !== 'https:' || !['spotify.link', 'open.spotify.com'].includes(u.hostname)) return null;
    if (u.username || u.password || u.port || u.hash) return null;
    if (u.hostname === 'open.spotify.com' && !/^\/socialsession\/[A-Za-z0-9]+\/?$/.test(u.pathname)) return null;
    if (u.hostname === 'spotify.link' && !/^\/[A-Za-z0-9]+\/?$/.test(u.pathname)) return null;
    return u.href;
  } catch { return null; }
}

export function spotifyPlaylist(item) {
  return {id:item?.id||'',name:item?.name||'Untitled playlist',tracks:Number(item?.items?.total??item?.tracks?.total??0),image:item?.images?.[0]?.url||null,url:item?.external_urls?.spotify||null};
}

export function spotifyTrack(item) {
  if(!item||typeof item!=='object')return null;
  return {id:typeof item.id==='string'?item.id:null,name:item.name||'Unknown track',artists:(item.artists||[]).map(a=>a?.name).filter(Boolean),album:item.album?.name||null,image:item.album?.images?.[0]?.url||null,url:item.external_urls?.spotify||null,durationMs:Number(item.duration_ms)||0,uri:item.uri||(item.id?`spotify:track:${item.id}`:null)};
}

export function spotifyDevice(item) {
  return {id:item?.id||null,name:item?.name||'Unknown device',active:!!item?.is_active,restricted:!!item?.is_restricted,volumePercent:Number.isInteger(item?.volume_percent)?item.volume_percent:null,supportsVolume:!!item?.supports_volume};
}

export function spotifyNowPlaying(data) {
  const item=data?.item,base={playing:!!data?.is_playing,progressMs:Number(data?.progress_ms)||0,durationMs:Number(item?.duration_ms)||0,device:data?.device?.name||null,deviceId:data?.device?.id||null,volumePercent:Number.isInteger(data?.device?.volume_percent)?data.device.volume_percent:null,shuffle:!!data?.shuffle_state,repeat:['off','context','track'].includes(data?.repeat_state)?data.repeat_state:'off'};
  return {...base,track:item?spotifyTrack(item):null,bpm:null};
}

// Tempo is only active when a provider actually supplies a measured value.
export function handPulse(tempo,progressMs=0) {
  if (!Number.isFinite(tempo)||tempo<=0||tempo>400) return null;
  let movement=tempo;
  if(movement>=30) movement/=Math.max(1,Math.floor(movement/30));
  while(movement<30) movement*=2;
  const period=60000/movement;
  return {movementBpm:movement,periodMs:period,phase:((progressMs%period)+period)%period/period};
}

// Provider audio stays in the provider's official player. PCM mixing is for local audio.
export const DJ_PROVIDERS=Object.freeze([
 {id:'apple',name:'Apple Music',home:'https://music.apple.com/',hint:'Paste an Apple Music song, album, or playlist link.',mode:'Official player'},
 {id:'spotify',name:'Spotify',home:'https://open.spotify.com/',hint:'Paste a Spotify track, album, or playlist link.',mode:'Official player + account controls'},
 {id:'soundcloud',name:'SoundCloud',home:'https://soundcloud.com/',hint:'Paste a SoundCloud track or playlist link.',mode:'Official player'},
 {id:'youtube',name:'YouTube',home:'https://music.youtube.com/',hint:'Paste a YouTube video link.',mode:'Official video player'},
 {id:'tidal',name:'TIDAL',home:'https://tidal.com/',hint:'Paste a TIDAL track, album, or playlist link.',mode:'Official player'},
 {id:'deezer',name:'Deezer',home:'https://www.deezer.com/',hint:'Paste a Deezer track, album, or playlist link.',mode:'Official player'},
 {id:'bandcamp',name:'Bandcamp',home:'https://bandcamp.com/',hint:'Paste a Bandcamp album or track link.',mode:'Opens Bandcamp'},
 {id:'amazon',name:'Amazon Music',home:'https://music.amazon.com/',hint:'Paste an Amazon Music link.',mode:'Opens Amazon Music'},
]);
export function providerLink(id,value){
 const provider=DJ_PROVIDERS.find(p=>p.id===id);if(!provider)return null;
 try{
  const u=new URL(String(value).trim());
  if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash)return null;
  let embed=null;
  if(id==='apple'){
   if(u.hostname!=='music.apple.com'||!/^\/[a-z]{2}\/(album|song|playlist)\/[\w%.,~!()'/-]+$/.test(u.pathname))return null;
   embed='https://embed.music.apple.com'+u.pathname+(u.searchParams.get('i')&&/^\d+$/.test(u.searchParams.get('i'))?'?i='+u.searchParams.get('i'):'');
  }else if(id==='spotify'){
   if(u.hostname!=='open.spotify.com')return null;
   const match=u.pathname.match(/^\/(?:intl-[a-z]{2}\/)?(track|album|playlist)\/([A-Za-z0-9]{22})\/?$/);if(!match)return null;
   embed=`https://open.spotify.com/embed/${match[1]}/${match[2]}`;
  }else if(id==='soundcloud'){
   if(!['soundcloud.com','www.soundcloud.com'].includes(u.hostname)||!/^\/[\w-]+\/[\w/-]+\/?$/.test(u.pathname))return null;
   embed='https://w.soundcloud.com/player/?'+new URLSearchParams({url:u.origin+u.pathname,auto_play:'false',show_artwork:'true'});
  }else if(id==='youtube'){
   let video;if(u.hostname==='youtu.be')video=u.pathname.slice(1);else if(['youtube.com','www.youtube.com','music.youtube.com'].includes(u.hostname))video=u.searchParams.get('v');else return null;
   if(!/^[A-Za-z0-9_-]{11}$/.test(video||''))return null;
   embed=`https://www.youtube-nocookie.com/embed/${video}?playsinline=1`;
  }else if(id==='tidal'){
   if(!['tidal.com','www.tidal.com','listen.tidal.com'].includes(u.hostname))return null;
   const m=u.pathname.match(/^\/(?:browse\/)?(track|album|playlist)\/(\d+|[a-f0-9-]{36})\/?$/);if(!m)return null;
   embed=`https://embed.tidal.com/${m[1]}s/${m[2]}`;
  }else if(id==='deezer'){
   if(!['deezer.com','www.deezer.com'].includes(u.hostname))return null;
   const m=u.pathname.match(/^\/(?:[a-z]{2}\/)?(track|album|playlist)\/(\d+)\/?$/);if(!m)return null;
   embed=`https://widget.deezer.com/widget/dark/${m[1]}/${m[2]}`;
  }else if(id==='bandcamp'){
   if(!u.hostname.endsWith('.bandcamp.com')||!/^\/(album|track)\/[\w-]+\/?$/.test(u.pathname))return null;
  }else if(id==='amazon'){
   if(!['music.amazon.com','music.amazon.co.uk','music.amazon.de','music.amazon.co.jp'].includes(u.hostname)||!/^\/(albums|playlists|tracks|artists)\/[A-Za-z0-9]+\/?$/.test(u.pathname))return null;
  }
  return {provider:id,name:provider.name,url:u.href,embed};
 }catch{return null;}
}

const LOCAL_SOURCE=Object.freeze({
 id:'local',name:'MYR5 + imported audio',route:'local-deck',
 capabilities:Object.freeze({localMix:true,autoDJ:true,manualHandoff:false,sourceAttributionRequired:false,controls:'local-deck'}),
});
const PROVIDER_ROUTES=Object.freeze({
 apple:Object.freeze({route:'official-player',controls:'official-player'}),
 spotify:Object.freeze({route:'official-player',controls:'spotify-terminal-separate'}),
 soundcloud:Object.freeze({route:'official-player',controls:'official-player'}),
 youtube:Object.freeze({route:'official-player',controls:'official-player'}),
 tidal:Object.freeze({route:'official-player',controls:'official-player'}),
 deezer:Object.freeze({route:'official-player',controls:'official-player'}),
 bandcamp:Object.freeze({route:'external-link',controls:'external-app'}),
 amazon:Object.freeze({route:'external-link',controls:'external-app'}),
});

// Source picks describe where a link can be opened. Only local audio can enter
// the Web Audio decks; the Spotify account/API surface remains its own route.
export function getDJSourceChoices(){
 return [LOCAL_SOURCE,...DJ_PROVIDERS.map(provider=>{
  const route=PROVIDER_ROUTES[provider.id];
  return Object.freeze({
   id:provider.id,name:provider.name,home:provider.home,hint:provider.hint,mode:provider.mode,route:route.route,
   capabilities:Object.freeze({
    localMix:false,autoDJ:false,manualHandoff:true,sourceAttributionRequired:true,controls:route.controls,
   }),
  });
 })];
}

// Normalize a user-authored source link without resolving track metadata or
// implying that a protected provider can play through the local mixer.
export function normalizeProviderSourceEntry(providerId,sourceUrl,label){
 if(typeof sourceUrl!=='string'||sourceUrl.length>2048)return null;
 if(typeof label!=='string'||label.length>120||/[\u0000-\u001f\u007f]/.test(label))return null;
 const cleanLabel=label.trim();if(!cleanLabel)return null;
 const provider=DJ_PROVIDERS.find(item=>item.id===providerId);if(!provider)return null;
 const link=providerLink(providerId,sourceUrl);if(!link)return null;
 const choice=getDJSourceChoices().find(item=>item.id===providerId);
 return Object.freeze({
  kind:'source-link',provider:providerId,label:cleanLabel,sourceUrl,
  validatedUrl:link.url,embedUrl:link.embed,route:choice.route,capabilities:choice.capabilities,
  attribution:Object.freeze({app:'actual.dj',provider:provider.name,sourceUrl}),
 });
}

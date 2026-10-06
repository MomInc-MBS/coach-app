export function spotifyReturnMessage(result){
  return ({denied:'Spotify connection was cancelled. Tap Connect Spotify to try again.',expired:'Spotify sign in expired. Tap Connect Spotify to start again.',failed:'Spotify could not finish connecting. Tap Connect Spotify to try again.'})[result]||null;
}

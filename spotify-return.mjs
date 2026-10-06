export function spotifyReturnMessage(result){
  return ({denied:'Spotify connection was cancelled. Tap Connect Spotify to try again.',expired:'Spotify sign in expired. Tap Connect Spotify to start again.',failed:'Spotify could not finish connecting. Tap Connect Spotify to try again.',
    browser:'Spotify finished in a different browser than Coach. On iPhone, open Coach in Safari (not the Home Screen app), then tap Connect Spotify again.',
    notlisted:'Spotify accepted your sign in, but this Spotify account is not on the Coach test list yet. Ask Ian to add your Spotify email, then tap Connect Spotify.',
    incomplete:'Spotify sign in did not finish. If it stopped at the terms page, tap Agree there, or open Coach in Safari and tap Connect Spotify again.'})[result]||null;
}

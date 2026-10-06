# R25: Spotify on iPhone stops at the terms page

Ian's report: sign in works, but it will not get past terms and conditions.

## What the code does
Connect (spotify-terminal.mjs) POSTs /api/spotify/connect. The Worker stores PKCE state and sets an HttpOnly `spotify_oauth` cookie (SameSite=Lax, path /api/spotify/callback), then the page navigates to accounts.spotify.com. Spotify returns to /api/spotify/callback, which needs both the `state` and that cookie, exchanges the code, calls /v1/me, and redirects to /pose.html?panel=spotify&spotify=<result>.

## Where it can die (cannot be reproduced without a device and Ian's Spotify dashboard)
1. Dashboard side (only Ian can fix). The Coach app is in Spotify "Development mode". In that mode only accounts on the app's User Management list can finish; anyone else sees sign in and consent, then a failure (403 on /v1/me, or a "user not registered" page). Release 24 also showed `redirect_uri: Not matching configuration`.
2. iOS cookie jar split. The Home Screen app and Safari do not share cookies. If the connect request is made in the Home Screen app but Spotify's page (or its return) runs in the in-app Safari sheet, the callback arrives without the cookie, so the old code answered "expired" and the sheet showed a dead end.
3. The terminal closed on `visibilitychange`/`pagehide` while Spotify was open, and nothing reopened it with an explanation when the user came back without a `?spotify=` result.

## Code fixes in R25 (commit "Spotify: explain iOS return dead ends...")
- Callback with a real state but no cookie now returns `spotify=browser`: "Spotify finished in a different browser than Coach. On iPhone, open Coach in Safari (not the Home Screen app), then tap Connect Spotify again."
- /v1/me 403 now returns `spotify=notlisted`: "this Spotify account is not on the Coach test list yet. Ask Ian to add your Spotify email."
- Connect stores a 15 minute `myr5.spotifyPending` marker. If the user comes back (tab visible again, or a fresh load) without a result and still not connected, the DJ terminal reopens with "Spotify sign in did not finish. If it stopped at the terms page, tap Agree there, or open Coach in Safari..." instead of nothing.
- Not changed: the cookie binding. It is the login-CSRF defence and removing it would let an attacker link a victim's Spotify to the attacker's Coach.

## What Ian must do in the Spotify dashboard (https://developer.spotify.com/dashboard)
1. Open the Coach app (client ID 9eb27ceb2aed4ee59517d5b0854a8b79). Settings, then Redirect URIs: make sure this exact line is saved (no trailing slash, https): `https://myr5.mominc.online/api/spotify/callback`
2. Settings, then User Management: add each tester's name and the email of their Spotify account (Ian's own phone account included). Up to 25 users in development mode. Accounts that are not listed are the likeliest cause of "signs in but never finishes".
3. Check the app lists "Web API" under APIs used.
4. For general public use, request Extended Quota Mode from the dashboard (Spotify review needed).
5. Test on iPhone: open https://myr5.mominc.online in Safari, sign in to Coach, open the DJ terminal, Connect Spotify, tap Agree. If it works in Safari but not from the Home Screen app, the cookie split in item 2 above is confirmed.

## Open
No real iPhone or Spotify authorisation was available. Cause 1 or 2 is confirmed only once Ian tries step 5 after step 1 and 2.

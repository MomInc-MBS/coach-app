# Spotify and camera startup repair

Target: current Release24 Coach at https://myr5.mominc.online, Worker `myr5-coach`.
Build: `f4cca8e32dfe0f24520f`.

Camera acquisition now has a 20-second deadline and cancellation tied to workout release. Stop settles a pending permission request so Begin can retry; a stream granted after cancellation is stopped immediately. Lens discovery and zoom each have a three-second best-effort deadline so optional lens metadata cannot prevent tracker startup.

Spotify retains OAuth return state through anonymous-shell account clearing and reopens after account-ready. It ignores an obsolete close event after reopening, fences stale status reads, explains denied/expired/failed returns, offers Coach sign-in when needed, and prevents duplicate connection requests.

Validation: 23 focused Node tests pass (camera, Spotify callback/server, workout lifecycle and selection speech); production build and Wrangler dry run pass. T3 collaborative browser, phone viewport 375 x 812, exercised the production terminal module with a local fake account and mocked provider responses: initial signed-out return offers sign-in without API reads; account-cleared followed by account-ready reopens and displays the failed-return recovery message; two Connect taps produce one request and recover after a provider error. The production camera module was checked with a synthetic canvas MediaStream: cancellation rejects with AbortError and a late grant leaves every track ended.

No real Spotify authorization, playback, or physical phone camera was available in this session. Those remain device/account validation gaps; the checks above use explicit fixtures and do not establish provider approval or hardware compatibility. Earlier materials, locked rewards, battle-pass scrolling and terminal hit-target fixes remain in this release.

Live deployment: version `c5d5cc43-0f8c-412b-93a4-9e3a4bb0bf70`. Five changed public runtime files match the local build; health is OK. All 249 offline shell assets fetched from the live domain match their manifest integrity. The test browser had 27 old shell caches; after removing those test-only caches, repair downloaded the new release and correctly waited for other Coach clients before activation.

User then supplied screenshot 5803.png showing Spotify `redirect_uri: Not matching configuration`. This is an additional provider registration blocker, not evidence of a failed Coach OAuth return. Wrangler version metadata confirms the current live client ID `9eb27ceb2aed4ee59517d5b0854a8b79` and redirect URI `https://myr5.mominc.online/api/spotify/callback`. The Spotify app settings page redirects the shared browser to owner login; no settings were changed. A public authorization diagnostic reaches Spotify login, which does not establish successful redirect registration or consent. Requested owner login or saving the exact URI in that app's settings. End-to-end Spotify remains unresolved until registration is checked with owner access.

# Spotify and camera startup repair

Target: current Release24 Coach at https://myr5.mominc.online, Worker `myr5-coach`.
Build: `f4cca8e32dfe0f24520f`.

Camera acquisition now has a 20-second deadline and cancellation tied to workout release. Stop settles a pending permission request so Begin can retry; a stream granted after cancellation is stopped immediately. Lens discovery and zoom each have a three-second best-effort deadline so optional lens metadata cannot prevent tracker startup.

Spotify retains OAuth return state through anonymous-shell account clearing and reopens after account-ready. It ignores an obsolete close event after reopening, fences stale status reads, explains denied/expired/failed returns, offers Coach sign-in when needed, and prevents duplicate connection requests.

Validation: 23 focused Node tests pass (camera, Spotify callback/server, workout lifecycle and selection speech); production build and Wrangler dry run pass. T3 collaborative browser, phone viewport 375 x 812, exercised the production terminal module with a local fake account and mocked provider responses: initial signed-out return offers sign-in without API reads; account-cleared followed by account-ready reopens and displays the failed-return recovery message; two Connect taps produce one request and recover after a provider error. The production camera module was checked with a synthetic canvas MediaStream: cancellation rejects with AbortError and a late grant leaves every track ended.

No real Spotify authorization, playback, or physical phone camera was available in this session. Those remain device/account validation gaps; the checks above use explicit fixtures and do not establish provider approval or hardware compatibility. Earlier materials, locked rewards, battle-pass scrolling and terminal hit-target fixes remain in this release.

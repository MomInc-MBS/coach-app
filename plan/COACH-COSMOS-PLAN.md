# Coach cosmos implementation plan

Baseline: Release 22 (`a914083`), isolated branch `codex/coach-cosmos-1005`.

## Design decisions

1. Keep stable coach, weapon, ship, and reward IDs. Apply the user's edited names exactly, remove their deleted candidates, and use the top remaining candidate by default. The final selection has 97 names across 65 coaches, with 33 coaches having one name; single-name coaches return that name for alternative/cycle requests. Fitness identities and workout/technology notes remain in provenance metadata. Remove Flyer and Quad 10 from selection. Explicit starting access: MYR5 and Blob 1; choose exactly two workout paths for their introductory coaches. Version access reconciliation without deleting XP, sessions, or cosmetic purchases.
2. Restore the constellation achievements view and click-to-zoom coach interaction. Each focused coach shows its actual performance requirement, exercise examples, golden requirement, and the sequential weapon tiers associated with its groups/difficulty. XP never grants performance achievements.
3. Keep the exact 250-level cosmetic XP curve and pack grant IDs. Show daily quests and an understated CRT progress link below the pod controls. Expanded view opens at current progress. The compact pod CRT uses physical left/right buttons to page through ten-level solar-system areas. Clicking its screen opens one continuous vertical flight through all 25 areas, from level 1 at the bottom to level 250 at the top. Scroll or steer upward and back downward through every past unlock. Reward labels remain inspectable, while future scenery stays fogged. Past regions can be revisited. Systems grow from debris and fading stars to giant planets, red giants, artificial worlds, and rifts. One ordered coach constellation per chapter. Pool animated asteroids; lasers are purely decorative and never grant XP.
4. Make the Gala War Room editor orange CRT throughout. Group shoulders/sleeves/gloves, head/neckwear, and pants/feet. Every option gets an inline visual preview, with actual color swatches, race silhouettes, pet and weapon examples.
5. Clicking the pod's Gala avatar opens the War Room. Hide player/customizer/pod/workout-level/ready labels while retaining Goals and runtime elements needed by workouts. Place persistent metal-mounted grimoire and Now Playing CRT controls above the lamp.
6. Build a new Spotify PKCE account connection with encrypted server token storage and account/epoch checks. Client ID is configured and the user has saved https://myr5.mominc.online/api/spotify/callback. Use native Spotify playlist, playback, and Jam links where available; do not invent provider features or tempo. Show playlist terminal, shared listening, reused compact DJ visuals, and hand at the bottom. Use provider BPM with a divisible animation cadence; idle gestures when playback stops. Do not substitute synthetic BPM for real song data.
7. Pond big fish appears after eight seconds total, including scattering; strengthen follow. Remove Cogs/Gear grimoire from user choices and fall back saved selection safely. Dr Girlfriend cutout crosses behind the pyramid every ten seconds. Classroom dims/flickers every fifteen seconds and paper crawler sniffs across desk front with only upper quarter visible. Remove whiteboard goal entry; add squeaky marker audio.
8. Apply the shared phone tilt system consistently to every menu, including Achievements, Spotify/DJ, battle pass, and War Room. Preserve reduced-motion behavior and one lifecycle owner.

## Review and delegation

Astra reviewed existing sources and identified implicit starter access, cached ownership migration, scatter-inclusive fish timing, and the horizontal/vertical navigation conflict. Its improvements are included above. Authenticated Claude planning review uses the available planning model (user-approved fallback from unrecognized “Fabel 5.1”). Delegate map and Gala editor to lower-tier coding agents and roster/access to Claude's lower tier. Discover NVIDIA model access and use a supported Kimi model only if configured; report exact models and unavailable capabilities truthfully.

## Acceptance checks

- Stable reward grants and unchanged XP thresholds; current/next/max progress and ten-level page boundaries.
- Two introductory path grants only; removed coaches cannot reappear via cached ownership; account changes do not leak choices.
- Achievement coach zoom and nested weapons work by keyboard and touch.
- Every customizer category has meaningful previews; old saved outfits still load.
- All menus move subtly with phone tilt and respect reduced motion.
- Timed cameos stop when their rooms close; no hidden animation/timer leaks.
- Browser checks on desktop and narrow phone, focused domain tests, production build, and relevant regressions.

Production release follows implementation and verification; changes and database migrations must be coordinated with the staged Spotify encryption binding.

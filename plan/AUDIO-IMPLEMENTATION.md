# Physical sound implementation

User-authorized scope: implement the sound design and coach voice choices, coordinate with the existing workers, test, and publish to the existing live app.

Base: Release 20 live, build `3e9a55ada9708984ac0d`, plus Release 21's plan-only commit `be4d18a`. Audio work is isolated on `codex/audio-release`; the `w/release-21` checkout and other workers' changes are untouched. Release 21 can merge the audio branch before its final build. Do not publish an older branch over a newer release: check the live build and latest deployment immediately before publishing.

## Sound map

| Surface | Idle sound | Tap / movement |
| --- | --- | --- |
| Ship pod / main menu | Quiet machinery, air circulation, interior resonance | Mechanical switches and latches |
| Quilt grimoire | Pod bed | Real cloth rustle |
| Ice grimoire | Restrained cold interior bed | Single ice snap; restrained crack fragments during drawing |
| Grass grimoire | Gentle breeze | Recorded leaf rustle while drawing flowers, exceptionally quiet glass tinkle |
| Cogs grimoire | Quiet machinery | Metal contact and ratchet clicks |
| Jelly grimoire | Restrained soft bed | Recorded wet squish/slurp impacts |
| Wood grimoire | Quiet interior bed | Wood taps and a short rough crack/scrape |
| Pond / water grimoire | Gentle water / breeze | Single small splash on touch, slosh on dragging |
| Portals | Current room bed fades | Short accelerating teleport / transit sound |
| Reminders CRT | Quiet computer bed | Brief dial-up on entry, static/glass contact on screen touch |
| Coach + Helping Hand customizers | Current room bed | Mechanical button, switch and selection feedback, including iframe controls |

There are six existing grimoire IDs: quilt, ice, grass, cogs, jelly and wood. `pond` and `water` are aliases prepared for Release 21's incoming pond; this release does not implement that worker's visual pond. Use only one or two recordings per cue, with narrow variation. Movement cues are rate limited, with no accumulated backlog. The grass tinkle is a minor accent, not the main drawing sound.

## Implementation and ownership

1. Astra: map actual surfaces/events, verify CC0 source licenses, review concurrency and playback behavior.
2. Sol: shared Web Audio effects engine, gesture unlock, room ambience, mechanical controls, CRT/reminders, portal and material hooks, both customizers, persisted sound controls.
3. Luna: persisted Robot/Clear/Warm/Light coach choices, using local treatments of the existing eSpeak NG clips; preserve the original Robot default and voice queue/cancellation behavior. Tara is unavailable in the configured model roster.
4. Integration owner: obtain and trim source audio, retain attribution and hashes, package offline assets, mount voice settings, test, review and publish the combined candidate.

Each coding worker owns a separate worktree. Root owns shared build scripts, asset inventory, release notes and release. No schema, secret, subscription or account changes are needed.

## Asset and runtime rules

- All new effects are CC0. Credits and source links are published at `/audio/sfx/credits.html`; `/audio/sfx/manifest.json` records authors, masters, edits and hashes.
- `scripts/prepare-sound-assets.py` reproduces the MP3 pack from retained source masters. Generated dial-up and CRT waveforms are also dedicated to CC0.
- Decode from the app's own origin; there is no sound-generation service or runtime third-party audio request.
- User gesture unlock; silence before permission to play is granted by the browser. Sound controls persist per device and remain separate from the coach speech toggle.
- Bounded sources, decoded-buffer cache and movement frequency. Discard delayed callbacks after mute, backgrounding or leaving the room. Stop playing on page hide; fade ambience changes.
- Coach speaking events duck background audio so cues remain intelligible.
- Include the small pack in the installed app's core offline inventory with integrity checks and content-based update identities.

## Acceptance and release

- Confirm every manifest clip is valid MP3, non-silent, under the pack budget and matches its hash.
- Behavioral tests: bounded/rate-limited drawing, visibility/mute cancellation, settings persistence, voice cancellation, connected audio graphs for all voice choices, manifest failures and offline inventory.
- Browser: exercise the home menu, grimoire taps/drags, portal travel, reminders entry/screen, coach choices, coach customizer and Helping Hand iframe. Check playback contexts and sample requests after real gestures.
- Build and run the existing release gate; classify any existing failures against the same base. Deploy the exact tested build through the existing Cloudflare Worker, keeping production configuration and secrets.
- Before deployment, re-read the live build and deployment receipts to detect another worker's release. If changed, integrate that released source and repeat affected checks.
- Retain the previous version ID and verify the new live release and sound assets after deployment. Merge the audio branch into Release 21 through its integration owner; do not edit that worktree directly.

Automated playback evidence does not replace listening on speakers or a phone; audio loudness and timbre may need a subsequent user-guided tuning pass.

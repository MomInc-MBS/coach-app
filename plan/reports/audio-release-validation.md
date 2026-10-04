# Physical sounds and coach voices release

Candidate build: `fd927767fd253e1337e3`, branch `codex/audio-live`, based on live Release 20. Production: https://myr5.mominc.online.

The implementation covers all six current grimoires, pod ambience, portal transit, physical controls, reminders CRT/dial-up, and both customizers. Pond/water aliases are ready for Release 21; pond visuals remain owned by that worker. Four coach styles use local processing of the existing voice recordings: Robot, Clear, Warm and Light.

## Evidence

- Production build and Wrangler deployment dry run passed.
- Final focused suite: 24 passed, including portal inputs, physical sound lifecycle, voice settings, production assets and retained provenance.
- Source regression: 1,278 passed; five failures exposed a VM fixture missing the new portal sound dependency. The fixture was repaired, and all eight tests in that file passed in the final focused run. No runtime repair was needed for those failures.
- All 26 CC0 MP3 clips decoded, were non-silent and below clipping. The pack is 316,572 bytes. Manifest hashes match packaged assets; all clips are in the integrity-protected core offline inventory (7,672,358 bytes, below 8 MiB).
- Collaborative browser checks at a 375×812 viewport confirmed gesture-unlocked recorded effects, grass breeze, Warm voice playback, saved selection and effects mute. Audio contexts ran and sample requests succeeded.
- A preliminary broad browser run on the baseline was stopped after unrelated existing Food/customizer/SATCOM/skin failures. It is not represented as a clean full browser suite.
- Automated checks do not replace listening on a phone or speakers. A user-guided volume/timbre tuning pass may still be useful.

## Integration and rollback

Release 21 worktree is untouched. Its integration owner should merge `codex/audio-live` before deploying its next release, preserving the shared sound engine and the pond/water hooks. Retained masters, source licenses and the implementation plan are in this branch; public credits are `/audio/sfx/credits.html`.

Pre-deployment live build was `3e9a55ada9708984ac0d`, Worker version `1476a24f-d8a7-490b-9025-95839a5c5154`. Production deployment preserves existing variables and secrets with `--keep-vars`; no schema or account changes are included.

Deployment receipt and final browser smoke results will be appended after publication.

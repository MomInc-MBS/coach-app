# Sound tuning follow-up

User changes: whiteboard erase followed by fast marker; deeper main controls; quieter dial-up and signal beeps; silent exercise selection until Begin; gentle electric static for Reminders, Grimoire settings and Settings; gentle bloops for other internal menus; recorded waterfall ambience for meditation. Follow-up clarification preserves coach menu clicks and beeps.

The coach customizer and movement library retain ordinary mechanical sounds. Deeper playback applies only to main pod controls. Food, scoreboard and Helping Hand use soft bloops; War Room now boots the shared standalone sound layer. Electric screen entry and touch use a short static cue. The whiteboard sequence follows its erase/draw animation and also plays when the board is opened.

The dial-up sample gain is 0.13 instead of the general 0.68; signal beeps use 0.09. Waterfall ambience uses a filtered, normalized recording from **Stream Sounds by kurt**, [CC BY 3.0](https://opengameart.org/content/stream-sounds), with attribution and edit details in public sound credits. Other effects are CC0; original new UI waveforms are reproducible in the generator. Pack: 31 files, 426,040 bytes.

Review caught and corrected two issues before publication: meditation's borrowed coach sets the ship-view flag, so active meditation is explicitly exempted from that flag's audio suppression; Begin announcements must use phrases that exist in the approved voice pack. Tests verify both Begin paths for all movement modes against actual voice manifest phrases.

Validation: 35 focused/regression tests passed. Browser checks confirmed running sample playback for electric static, dial-up, signal beeps, internal bloop and both whiteboard open/category changes. Final package, meditation playback, deployment receipt and live asset verification follow below.

Integration branch: `codex/audio-tuning`, extending `codex/audio-live`. Other workers should include both branches before their next release. Production is checked again before deployment to avoid overwriting a newer worker release.

Final build `23c97ea0197585897a1b` passed. Core offline inventory: 7,792,088 bytes, below 8 MiB. The final dock browser test passed. Live-gesture browser playback confirmed the 11.5-second waterfall loop with the actual borrowed coach's ship-view flag set; the queued approved Begin clips were checked for all movements. Automated playback verification does not replace listening and timbre tuning on speakers.

Deployed to production Worker version `fa26f3f4-8413-44bb-b698-095beffe3f43`, preserving existing settings. Prior version: `d4f9401e-2652-4d7c-ba02-a9f7fd1cdc1b`. Live build, release health and every clip checksum/byte count are verified in `audio-tuning-live-assets.json`.

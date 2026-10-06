# Coach picker and DJ hand update

Build `ca4b6b72eda9dba53446`, current Release24 source, target `myr5-coach` at https://myr5.mominc.online.

Owned body changes now normalize body/head/arms/feet and filter inherited materials through the selected coach's actual grants before committing. Previously a material earned for another coach could turn an otherwise owned body into a preview-only change. No new unlocks are granted.

The preview heading shows the approved coach name and its path symbol. Locked previews expose a lock beside the name; pressing it opens the central unlock requirement. Species cards show the same symbols, explicit available/locked state and lock buttons. They use one continuous list, with the native selector retained as fallback if sprite loading fails. Textures and Ship have their own visible menu tabs; ship ownership remains enforced. The requested seven level colors were explicitly withdrawn, so no level color mapping is used.

All 65 achievement targets are assigned once to one constellation by primary workout group. Coach name captions and page arrows are removed. Central requirements and earned progress remain unchanged.

Spotify's hand sits in a clipped, noninteractive overlay above the terminal's lower-right corner, independent of playlist scrolling. The companion supports optional wrist cropping only for the Spotify terminal; other hand uses retain their existing camera.

Validation: 27 focused customizer/achievements tests and 20 hand/ship/account tests pass. Production build and Wrangler dry run pass. T3 browser at 375 x 812 confirms owned Blob coach persists across a real reload, correct locked-coach requirement opens, texture grid resides in its own panel, no horizontal page overflow, all 65 achievement targets appear with zero name captions/page arrows, and the Spotify hand overlay sits in the shell at the lower right with clipping and pointer-events disabled. Account/provider responses in local browser checks are fixtures. User separately confirmed real Spotify connection works.

Follow-up screenshots 5805/5806: terminal buttons now straddle the metal frame's top edge. Grimoire is hidden outside framed portal menus, including lazy-key replacement/restoration; Spotify retains its right-hand pod-header position. Final build is `5f63eef6435a9b8a9817`. Seven pod regression tests also pass. A T3 fixture using the production chrome module and both real stylesheets confirms the key's vertical center and frame top both equal 52px at 375 x 812, the drawing layer does not intercept taps, and returning to the pod hides Grimoire while retaining Spotify on the right. The existing browser regression test was updated but not launched through standalone Playwright.

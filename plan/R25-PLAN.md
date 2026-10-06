# Release 25: Ian's notebook fixes (6 Oct 2026)

Base: LIVE `codex/coach-cosmos-1005` @ `cf38ba6` (build `18520032b2cc293fcf15`, Worker `5c17943e`).
Merge target: `w/release-25` (D:/myr5-work/release-25). Lanes branch off cf38ba6.

## Ian's asks (transcribed from notebook photos)

| # | Ask | Lane |
|---|-----|------|
| 1 | Spotify on iPhone: you can sign in, but it won't get past the terms & conditions | DJ |
| 2 | The horizontal diamond still appears, fades to black and opens the "DJ terminal" | DJ |
| 3 | Fix the rushing water sound so it loops seamlessly | DJ |
| 4 | Textures: Fine Stripe gives a patchy belly (another species shows the right belly texture) | CUSTOM |
| 5 | Remove the original MYR5 texture | CUSTOM |
| 6 | Remove "Jelly", keep "Opal Jelly" | CUSTOM |
| 7 | Remove "Bubble Glass", keep "Glitter Resin" | CUSTOM |
| 8 | Colours apply to "Full body" and "Eyes" only; remove the "Body" and "Head" tabs | CUSTOM |
| 9 | Add anime, squinty, bloodshot and blind eyes | CUSTOM |
| 10 | Move the ship viewer above the colour selector, so you scroll to colours, not to see the ship | CUSTOM |
| 11 | Remove the "board" title in Grimoire settings | GRIMOIRE |
| 12 | Fix the wormhole palette for the Grass grimoire | GRIMOIRE |

## Lanes

- **r25-custom** (Opus): items 4–10. Removed textures leave the catalogue, and saved selections or owned grants of them migrate to their kept twin (Jelly→Opal Jelly, Bubble Glass→Glitter Resin, MYR5→Flat). Packs never award removed items. Full-body colour sets body+head together.
- **r25-dj** (Sonnet): items 1–3. Item 1 starts from `plan/reports` (commit 7e5da01 "Spotify registration blocker"): fix what is code-side, and document what is Spotify-dashboard-side for Ian. Item 2: find what the diamond is meant to be (git log), and make the opener behave as intended. Item 3: a gapless loop (Web Audio buffer loop, or a crossfaded asset).
- **r25-grimoire** (Sonnet): items 11–12.

## Brainstorm: making it better (folded in where cheap)

- Removed textures and colours migrate, and are never silently lost (any pack grant of a removed item is refunded as its twin).
- Eye styles are free starter eyes, so the new options are visible immediately. They go into the same locked/unlocked ordering.
- Ship viewer: a sticky, compact preview at the top, so a colour tap shows the result without scrolling.
- Water loop: equal-power crossfade at the seam, and the loop is suspended on `visibilitychange` (audio-layer lessons).
- Spotify on iOS: if auth fails, show a clear "Open in Spotify app / try again" fallback instead of a dead end.
- Grass wormhole palette comes from the board's own palette table, so future boards can't drift.

## Gate
Merge lanes → `npm run build` → concurrency-4 suite, failures rerun solo vs base → 375×812 check → staging → hash check → prod (Ian said deploy) → post the new base in t3-coordination.ndjson.

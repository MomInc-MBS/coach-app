# Terminal access and prior-agent goals audit

Audited the active Release 24 source against `plan/COACH-COSMOS-PLAN.md`, the editor/achievement task handoffs, and `plan/IMPLEMENTATION-VALIDATION.txt` on 2026-10-05.

## Fixed defects

- Grimoire and Spotify terminals were children of the board frame. That frame's stacking context sits below `portalOverlay`, which intercepted real taps. Move the terminals into `portalHome`'s control layer and retain their position within the moving housing. Both controls have at least a 100 by 44 CSS-pixel hit area on phones.
- External keys must not remain visible while a native modal makes them inert. Hide the shared terminals for modal menus and restore them on return. Nonmodal cutaway framing remains supported.
- Updated a stale reward-display test to compare the awarded palette with the current catalog. The product already used the current palette bytes correctly.

## Previous agent's goals

| Goal | Findings |
| --- | --- |
| Selected coach names, exclusions, starting access and two initial paths | Implemented; names/access/path tests pass. IDs and earned progress retained. |
| Achievement constellation, coach zoom, performance requirements and weapons | Implemented; achievement board, integration and reward tests pass. |
| 250-level XP flight, ten-level terminal pages and decorative firing | Implemented; domain and scene tests pass. Position-based scrolling from the subsequent request remains included. |
| Orange War Room and visual clothing/weapon previews | Implemented; Gala and manifest tests pass. Clothing group definitions include head/neckwear, shoulders/sleeves/gloves and pants/footwear. |
| Pod avatar opens War Room; physical pod controls and terminals | Implemented; this audit fixes the terminals' real hit-testing defect. Native phone-sized browser taps opened Grimoire settings and the DJ terminal. |
| Spotify connection, account-scoped encrypted tokens, playback and Jam links | Server/domain tests pass. DJ panel and Connect button are accessible. Authenticated Spotify authorization and playback remain unverified; anonymous or fixture checks do not establish these. |
| Pond timing/follow, removed Gear choice, food/classroom cameos, squeaky marker | Implemented; Pond/classroom tests pass. Grimoire settings list Quilt, Crystal, Grass, Jelly, Wood and Pond, without Gear. Room animation and cleanup code present. |
| Shared phone/menu movement and lifecycle cleanup | Implemented; portal peering and menu/workout lifecycle tests pass. Physical device orientation remains a hardware check. |
| Editor simplification, ship section and modest preview zoom | Implemented in the editor source, retaining the existing ship ownership/reveal gate. No new independent ship-selection state introduced. |
| Later startup, texture ownership and camera-route fixes | Present in Release 24; startup, selection, recovery and handoff checks pass. Physical camera tracking remains unverified. |
| All 18 additional materials and colors, locked access and synchronized hand | Preserved from the subsequent materials merge, including separate texture/color grants. |

## Verification

- 121 focused tests passed across names, access, achievements, paths, workouts, local workout persistence, startup recovery, flight, Spotify server/domain, Gala, Pond, classroom, menu lifecycle and portal navigation.
- Product-native collaborative browser, 375 by 812 CSS pixels: both terminal centers hit their actual button, Grimoire settings opened from a real tap, DJ terminal opened from a real tap, its Connect control passed hit testing, and shared keys were hidden while the modal was open.
- Production build and Wrangler production dry run passed. No database or authentication configuration changes.
- Added browser regression coverage using the real drawing-layer CSS and native `showModal()`; the earlier regression only set the `open` attribute and therefore missed modal inertness. This turn used the product-native browser for execution, rather than claiming a separate Playwright run.

Live deployment and byte checks are recorded separately after publishing. Real Spotify sign-in/playback and physical camera tracking remain explicitly unverified.

# Achievement Vault — plan (v2, conductor draft 2026-10-06 + Fable review)

Branch `w/achievement-vault` off live R27 `6d41aec` (D:/myr5-work/achievement-vault). No deploy without Ian's go.
Phone target 375×812. Every new heavy file lazy-loaded, OUTSIDE the 8 MiB offline core (like `/pod/worlds/boards/`).

## 0. What Ian asked for (source of truth)
1. Each grimoire board (pond, wood, crystal=ice, quilt, grass, jelly) gets a **secret interaction**. Finishing it reveals the **vault** — a page of cryptic secret-unlock achievements.
2. **Vault door** = a safe door built from the OLD cogs door (`9131e78`: painted door, kit gears, valves, wiggly pipes, lights near finger, 5 hub gears, weld trail) PLUS whatever the R22 mechanical door (`a0aac9b`, current `portal-board-cogs.mjs`) has that the old one lacks (pistons, bolts, tubes, pulleys, lamps w/ halos, real shadows, dial). MOM colours (`pod/pod.css:3` purple #7a2fc4, gold #ffd36e, wall #171020, cream).
   - Top-middle: **MOM Inc. logo engraved** in the door (`pod/mom-inc-engrave.png`), under it a **purple CRT screen with orange text** that shows each achievement's unlock requirement (cryptic clue).
   - **Centre knob = scroller.** Turning it steps the CRT through achievements.
   - **MOM logo on the centre flywheel.** Turning the flywheel fully opens the door — a square door swinging fully open.
   - All existing finger-driven movement (pistons, pipes wiggle, lamps, gears, weld) stays, but **unlinked from the 8 portal shapes** (any touch drives nearby mechanisms; no lock progress, no shape cut).
3. Behind the open door: a **purple screen**; you step through and **shrink into the atomic world**.
4. **Atomic hall**: all 3D coach models lined up as statues; walk a straight line (Little Boyfriend gallery pattern: `D:/MBS Pages/play/lilboyfriend/main.js` `movement()` :832, `nearestExhibit()` :270, `inspect()` :283, route sampler in `world.js`). Look at a statue → card pops with an achievement; achievements get progressively harder down the hall.
5. **Rewards = packs**, rare and legendary, each holding **2 items: 2 colours, colour+texture, or 2 textures** (randomizer). Many achievements → many packs (there are 58 textures / 156 colours but not enough levels to earn them).

## 1. Board secrets (exact behaviour)
All secrets: award once (repeatable for fun), end with the board giving way to a **metal safe door** (a flat render/poster of the vault door) the user taps → route `vault`. A secret gesture must **claim its pointers** so portal.mjs does not also run shape recognition/taps on them (see contract §4).

Rules that apply to every board (verified against the code, see §8):
- **3D only.** Effects get touches only through `createGlbBoard` (`effect.press/move/release(id,u,v)`); the flat poster path has no effect object. Flat fallback = no secret. Quilt is the one board without an effect module (`portal-board.mjs` quilt GL): its secret lives in that file.
- **Precedence:** a double-tap near a stitched outline (`portal.mjs` :1881, TAP_MS 350 / TAP_HIT_PX 14) **opens the shape first**; only then does portal ask `board.claims(id)`. Secrets therefore never block the existing open, and clue copy can hint "where nothing is stitched".
- **Gesture reducers are pure and exported** (`<board>Secret(state, ev, now)` → state, like `idlePhase`/`stepPads`) so `node --test` drives them without WebGL.
- Finish = `window.dispatchEvent(new CustomEvent('myr5:portal-secret',{detail:{board}}))` (same pattern as `myr5:portal-sound`); portal.mjs owns the door poster + route. Effects know nothing about the vault.
- The board face sits ≥ 100 px above the screen bottom (`#portalBoardHost` inset = bar 88 + rail 15) and 15 px in from the sides, so "corners" always mean **face** corners, not screen corners. Any gesture whose first touch is within 24 px of a screen edge is ignored by the reducer (iOS back-swipe / home-indicator zone).

| Board | Gesture | Payoff |
|---|---|---|
| **Pond** (`portal-board-pond.mjs`) | Big koi appears after `idleMs+scatterMs` = 8 s of stillness and stays `bigMs` 16 s (header comment line 9–10 says otherwise — fix it). User **presses and holds on the big fish** (hit = within `bigLen*0.35` of `S.big` in pond space, only while `phase==='big'`). While held, fish angles upward and scales up over **≤ 2 s** until it fills most of the face → ripples + splash → fish gone. **Release early → fish turns and swims off-screen** (no award). Hold may drift ≤ 24 px. Claims the pointer from press (so the tap-sized release never becomes `lastTap`). | Splash clears → door. |
| **Wood** (`portal-board-wood.mjs`) | One finger **scrubs back and forth** inside one face quadrant: ≥ 8 x- or y-direction reversals (each leg ≥ 18 px) within 3 s, every point inside the same quadrant. Heat builds (embers glow hotter) → **fire starts** (flame sprites). Then **one tap anywhere** puts it out → board turns to **ash and crumbles**. Claims the scrub pointer once ≥ 4 reversals (a zigzag would otherwise reach `recognizeShape` / "Almost"). | Ash falls away → door. |
| **Crystal / Ice** (`portal-board-ice.mjs`) | **10 taps in a row** (each ≤ 600 ms after the previous, each a tap: moved < 12 px; any drag or longer gap resets). Each tap adds a crack; 10th → crystal **explodes and shatters** (shards fly). Claims from the **3rd** tap onward (taps 1–2 stay eligible for the stitched-outline double-tap open; a tap that opens a shape pauses the board, which resets the chain). | Shards clear → door. |
| **Quilt** (`portal-board.mjs` quilt GL) | Step 1: two fingers in the **bottom-left and bottom-right quarters of the face**, both drag **up** ≥ 35 % of face height within 2.5 s → bottom half **folds up** onto the top half (rigid hinge rotation of the lower grid rows about the mid line — **not** a cloth-sim fold; reuse the cut-piece pivot pattern `portal-board.mjs` :330). Step 2 (within 8 s): two fingers on the folded half (one upper band, one lower band), both starting ≥ 40 px from the screen's left edge, drag **right** ≥ 40 % of face width → folds sideways the same way. Both pointers claimed from the moment both are down. | Folded quilt slides away → door. |
| **Grass** (`portal-board-grass.mjs`) | One corner: **tiny purple cone cap** (alien head top) peeking out, shaded under flowers. Opposite corner: **tiny round UFO** buried sideways. Both are primitives (cone + squashed sphere, MOM purple/gold), no new GLB. User drags a line of flowers from alien toward ship; alien follows the line (walks planted flowers in order, ~1.5 face-widths/s, stays 2 clusters behind the finger). **While a walk is live, line flowers do not fade** (normal 7 s fade would cut the line). Gap in flowers > 1.5 × `PLANT_STEP_PX` → alien stops; gap unfilled for **> 3 s** → alien vanishes, returns to start. Reaching the ship → alien boards, ship flies off, ground **cracks in an angular bolt** from ship to start and **splits open on the door**. Claims the drawing pointer once the alien has started walking. | Door in the crack. |
| **Jelly** (`portal-board-jelly.mjs`) | **Hold one finger down** (drift ≤ 24 px) for 7 s: bubbling starts at the finger, spreads until every bone is surrounded → block **boils** → the door **rises out of the middle** and parts the jelly. Lift early → bubbles subside over 1 s. Claims from press. | Door rises. |

Door poster (shared, portal.mjs): one `/pod/worlds/vault/door-poster.webp` (≤ 120 KB) faded in over the board host; tap → `routes.go('vault')`; Escape / the portal key dismisses and heals the board (`board.heal()`).

## 2. Achievements (initial list; ~40, ordered easy → hard = hall order)
Each: `id, clue (cryptic, CRT orange text), title (revealed when earned), tier ('rare'|'legendary'), test(state)`; counters in one store.

Grimoire secrets (rare each, legendary for all six): still-pond, fire-starter, shatter, fold-twice, little-way-home, boiling-point, **all-six**.
Vault itself (rare): door-open (first full flywheel turn), hall-end (reach the last statue), first-vault-pack opened.
Collection (from `performance-progress.mjs` + `unlock-store.ts`): first coach in each category (one per category, rare), all coaches (legendary), one texture on every coach (legendary), all colours (legendary), all coaches + all textures + all colours (legendary, last statue).
Engagement counters (thresholds tiered, e.g. 1/10/50). **Anti-farm rule: every counter below increments at most once per local day** (store keeps `lastDay` per counter), so thresholds read as "days you did it":
- grimoire time (visible, `!document.hidden`, portal shown; capped 20 min/day: 5 min / 30 min / 2 h) — hook `portal.mjs setVisible` :462
- shares (1/5/25 days) — `apple-basic-share.mjs shareAppleBasic` result `shared|copied`
- Armie letters read (5/25/100) — `armie-inbox.mjs markRead` :46
- Armie letters ignored (unread > 24 h: 5/25/100, counted on inbox open from `firedAt`; one per letter id, so one letter can't be re-counted)
- 64-bit customizer (War Room / Gala `war-room-gala.ts onPart/onDye/onWeapon` :111-113): first part changed, every part slot tried, full custom 64-bit look saved; first 64-bit skin earned (`boss-skin` grant)
- Least-reinforced features (no reward today): movements library (open 10 / 50 movements), Spotify DJ (first session, 10 sessions), reminders (set first reminder, keep one 7 days), history (open it), scoreboard linking, tub-flight arcade (score thresholds from `flight-score.mjs`), breathing (every breathing mode once), AR coach (first AR session), food scanner (10 scans), shapes (open every portal shape at least once), pond big fish seen 10 times (one per portal visit).
Final list + clues are a deliverable (L10); thresholds are tunables in one `VAULT_GOALS` table. Clue style: two lines max, orange CRT, a riddle that names the *place* not the *action* ("The koi that fills the pond is not afraid of you."); the title (revealed on earn) is the plain name.

Hall feel: the first unearned statue carries a faint gold "next" glow so there is always a target; the card on a locked statue shows clue + tier + a progress bar for counter goals (`3 / 10`), on an earned statue title + date + "Open pack" (if unopened). The door CRT shows earned-count and scrolls all clues; it is the "list view", the hall is the "walk".

## 3. Packs
Vault packs reuse the existing tiers (`rare` / `legendary`) so `reward-pack-ui.mjs tierOf` colours and the existing pack list work unchanged; `vault` is an id prefix, not a tier:
- id `reward-pack:<tier>:vault-<achievementId>`; `openRewardPack` detects `item.id.includes(':vault-')` and uses `VAULT_PACK={size:2,odds:{rare:{color:70,'64-bit':0},legendary:{color:40,'64-bit':0}}}` instead of `PACK_SIZES`/`PACK_ODDS` (one ternary each — do not change existing odds).
- `vault-legendary`: slot 1 forced to `texture` (falls back through the existing category order when exhausted) — "at least one texture".
- Duplicates / exhaustion already handled by the existing `remainingCosmetics` + category-fallback loop; nothing new.
- Grant via `unlock-ledger.mjs grantUnlock('reward-pack', id)` (idempotent); the pack then shows in the existing packs UI and opens with the existing reveal.

## 4. Contracts (lanes code against these; L0 lands them first)
- `modules/vault/vault-store.mjs` (pure + localStorage, owner-scoped via `performanceOwner()` from `performance-progress.mjs`): `bump(counter, n=1)` (daily-capped, see §2), `addTime(counter, ms)`, `markSecret(boardId)`, `read()`, `evaluate()` → newly earned ids → grants packs + dispatch `myr5:vault-earned {ids}`. Key `myr5-vault-v1/<owner>`. `evaluate()` runs after every write; no timers.
- `modules/vault/vault-goals.mjs`: the achievement table (§2) + `VAULT_GOALS` thresholds. Pure, unit tested; every `test(state)` is total (no throws on an empty state).
- **Board → portal (claims):** boards expose `claims(id) → bool` on the board object (`createGlbBoard` forwards to `effect.claims?.(id)`; quilt GL and the 2D/stub boards return false). `portal.mjs endPointer`: after `board.release(id)`, if the stroke is a tap and a stitched-outline double-tap matches, open it as today; otherwise `if(board.claims?.(id)){lastTap=null;return;}` before the tap/recognition branches. `claims` is read **before** the effect forgets the pointer: the glb wrapper calls `effect.claims(id)` before `effect.release`. Claimed strokes still fade as light trails (cosmetic, unchanged).
- **Board → vault (secret):** `window.dispatchEvent(new CustomEvent('myr5:portal-secret',{detail:{board}}))`. portal.mjs listens (lifecycle-scoped): `vault-store.markSecret(board)` (lazy import), pauses the board, shows the door poster; tap → `routes.go('vault')`. No ctx plumbing into effects.
- **Debug/test hooks (L0):** `window.myr5Portal.secret(boardId)` dispatches the same event; `?vault=1` opens the route on boot (like `?board=`); `window.myr5Vault={earn(id),reset(),state()}` set by vault-store when imported. Tests and the preview use these instead of replaying gestures.
- Route `vault` in `modules/routes.mjs` (`{label:'Vault',dialog:'#vaultPanel',open:()=>import('./vault/vault-door.mjs').then(m=>m.openVault())}`); `vault-door.mjs` lazy-imports `vault-hall.mjs` only when the door is fully open. Assets under `pod/worlds/vault/`; `scripts/offline-assets.mjs` core list must exclude `modules/vault/**` and `pod/worlds/vault/**` (asserted in `tests/starter-assets.test.mjs`).
- Door scene: a `createGlbBoard`-style effect (reuse its wake/`awakeUntil` on-demand render loop, shadow setup `portal-board-glb.mjs` :188-200 with the 512 map below 500 px) — **never a free-running RAF**. Shadows only while a finger is down or the door is moving.
- Statues: one GLB per achievement from `creature/models/roster/*.glb` (70 files, ~0.4–1.3 MB each; choose the **smaller** file of each pair, ≤ 40 statues ≈ 30 MB total, fetched on demand and left to the browser cache). Keep ≤ 5 loaded (3 ahead, 1 behind, current), dispose the rest; locked = same mesh with one shared dark atomic-glass material, earned = original materials. Roster `manifest.json` maps achievement → model.

**Ian update (7 Oct):** not every coach becomes a statue. Use exactly one statue per programmed achievement. Pick the coaches with the HIGHEST unlock level (latest to unlock, per `performance-catalog.mjs COACH_REQUIREMENTS` difficulty/level) and work down until every achievement has one. The hardest achievement (last in the hall) wears the highest-level coach. There must be an **"Unlocked everything"** achievement (all coaches + all textures + all colours) as the final statue.
Hall look (Ian): the inside of a data/internet cable; statues are digital holograms (inside MOM Inc's brain), PURPLE while locked and ORANGE once earned. The vault overall is sci-fi/space, purple + gold.

## 5. Lanes
| Lane | What | Worker | Files |
|---|---|---|---|
| L0 | store, goals, vault pack branch, `claims` + `myr5:portal-secret` listener + door poster, debug hooks, route stub, offline-budget test | Sonnet | vault-store, vault-goals, reward-packs.mjs, portal.mjs, portal-board-glb.mjs, portal-board.mjs (quilt `claims` stub only), routes.mjs + tests |
| L1 | Pond fish rise/bored | Sonnet | portal-board-pond.mjs |
| L2 | Wood scrub→fire→ash | Sonnet | portal-board-wood.mjs |
| L3 | Crystal 10 taps shatter | Haiku (small) → Sonnet if stuck | portal-board-ice.mjs |
| L4 | Quilt two-step fold | Sonnet | portal-board.mjs (quilt GL only; fills the L0 stub) |
| L5 | Grass alien/UFO walk + crack | Sonnet | portal-board-grass.mjs |
| L6 | Jelly boil + door rise | Sonnet | portal-board-jelly.mjs |
| L7 | Vault door (old+new cogs merge, CRT, knob scroll, flywheel open) | Sonnet (Opus if capped) | modules/vault/vault-door.mjs (+ `pod/worlds/vault/`; imports cogs/mechanical-layout helpers, does NOT edit live board) |
| L8 | Purple screen step-through, shrink, atomic hall + statues + cards | Sonnet | modules/vault/vault-hall.mjs |
| L9 | Telemetry hooks (§2 counters) | Haiku | share, armie, portal visible, gala, library, dj, reminders, breathing, food, arcade — **one-line `bump()` calls only; merges last** |
| L10 | Cryptic clues + titles copy | Haiku runner → NVIDIA `nemotron-3-super` / `glm-5.3-flash` via `.vault/nv_job.py` | vault-goals.mjs strings |

File ownership: only L0 touches `portal.mjs`, `portal-board-glb.mjs`, `routes.mjs`, `reward-packs.mjs`. L1–L6 each own exactly one board file (L4 = `portal-board.mjs`, which L0 has already stubbed). L7/L8 are new files. L9's edits are additive one-liners in files no other lane touches; it rebases and merges after L1–L8. L10 edits only string fields in `vault-goals.mjs` (L0 writes the table with placeholder clues).

Order: L0 first (contracts + hooks), then L1–L10 in parallel, each in its own worktree `D:/myr5-work/av-<lane>` off `w/achievement-vault` after L0 merges. L8 may start against a stub door (`myr5Vault.earn` + `?vault=1`) before L7 lands.

## 6. Review loop (every lane)
1. Build → `node --test` the lane's tests + `tests/portal-*.test.mjs` → screenshot at 375×812 (preview script) of each step of the interaction.
2. Self-check against the lane's acceptance row in §1/§4; iterate until every item passes.
3. Independent review: NVIDIA small-model diff review via `python .vault/nv_job.py <card.md>` (default nemotron-3-super; `z-ai/glm-5.3-flash` 2nd opinion; **never Kimi K3**; untrusted, findings must be checked against code) + one Haiku reviewer reading the diff vs this plan. Fix real findings, repeat.
4. Hand back to conductor with: commit hash, test output, screenshots, known gaps. Conductor verifies in the pane; sends back with specifics if not done.

Required automated assertions per lane (node `--test` on the pure reducer unless marked browser):
- L0: `claims` true ⇒ `endPointer` neither sets `lastTap` nor calls `recognizeShape` (stub board, browser); double-tap on an outline still opens with `claims` true; `myr5:portal-secret` ⇒ store has the board, poster shown, tap ⇒ `go('vault')`; vault pack opens with exactly 2 items, legendary has ≥ 1 texture, existing tiers' odds unchanged; `bump` twice same day counts once; core offline list excludes vault paths.
- L1: hold on big fish ≥ 2 s ⇒ `done`; release at 1 s ⇒ `bored` and fish exits the face; hold while `phase!=='big'` ⇒ nothing; pointer claimed from press.
- L2: 8 reversals in one quadrant within 3 s ⇒ `fire`; 8 reversals spanning two quadrants ⇒ no; tap after fire ⇒ `ash`; claims only after ≥ 4 reversals.
- L3: 10 taps at 500 ms spacing ⇒ `shatter`; a 700 ms gap or a 15 px drag resets; claims false for taps 1–2, true from tap 3.
- L4: two vertical drags from the bottom quarters ≥ 35 % ⇒ `folded1`; one finger ⇒ nothing; a touch starting < 24 px from the screen edge ⇒ ignored; step 2 after 9 s ⇒ reset; both pointers claimed.
- L5: ordered line with no gap ⇒ alien reaches ship; gap > 3 s ⇒ reset to start; line flowers keep `life=1` while walking.
- L6: 7 s hold ⇒ `boil`; 5 s hold then lift ⇒ subsides; 30 px drift ⇒ reset.
- L7 (browser): knob turn steps the CRT text through the goal list in order and wraps; a full flywheel turn opens the door and imports the hall; shadows off when idle (renderer.shadowMap.enabled false after `awakeUntil`).
- L8 (browser): walking to statue k pops card k with its clue; earned ids render in colour, locked in glass; ≤ 5 GLBs resident at any route position; "next" glow on the first unearned statue.
- L9: each hook calls `bump` with the right counter id exactly once per user action (existing test files for share/armie/gala get one extra case each).

**GPU rule (Ian 6 Oct):** no LM Studio / local GPU workers while Modly/ComfyUI jobs run (see `D:/myr5-work/modly-coordination.ndjson`). All "local model" work goes to the NVIDIA API small models.
`node_modules` is a junction → `coach-cosmos-1005/node_modules`; lane worktrees make the same junction and `rmdir` it before `git worktree remove`.

## 7. Open (defaults chosen, Ian can override)
- Vault entry only via a board secret (no menu link). Default: yes; after first discovery, also a faint engraved MOM mark on the Achievements page.
- Cogs stays OUT of the board picker (Ian 6 Oct); the vault door reuses cogs code only.
- Flat-poster users (WebGL failed) never see a secret. Default: accepted; the Achievements-page mark (above) is their way in after any other device discovers it (store is owner-scoped, so a signed-in account carries it).

## 8. Fable review (2026-10-06)
Verified against the code; fixes folded into §1–§6 above.

**Contract was not implementable as written.** There is no board "ctx" effects could call `secret` on: effects only receive `init({THREE,scene,…,wake})` from `portal-board-glb.mjs` :174, and the quilt GL board has no effect at all. Replaced `ctx.secret()` with a window event (`myr5:portal-secret`), zero plumbing. Pointer ids do reach effects (`press/move/release(id,u,v)` :287-294), so `claims(id)` works — but the wrapper must ask before `effect.release` forgets the pointer.

**Gesture collisions found:**
- Ice: 10 fast taps in one spot is also the double-tap open (`endPointer` :1881) whenever the spot is within 14 px of an outline. Resolved by precedence (outline open wins, ice claims from tap 3).
- Wood scrub and grass line are long strokes → `recognizeShape` / "Almost" flash after 450 ms unless claimed. Pond/jelly holds are tap-sized on release and would seed `lastTap`. All now claim.
- Quilt "bottom corners" read as screen corners = iOS home-indicator / Safari tab bar. The face bottom is ≥ 100 px up (`#portalBoardHost` inset) so it is fine *as face corners*; added the 24 px screen-edge dead zone and moved step 2's start off the left edge (back-swipe). Browser pinch/scroll is already blocked (`touch-action:none` on `#portalOverlay`).
- Flat poster boards cannot run secrets at all; stated as a rule instead of a surprise.

**Simplifications:** quilt fold = rigid hinge, not cloth; grass alien/UFO = primitives, no GLB; vault packs = id prefix on existing tiers (UI colours, list, reveal all free) instead of two new tiers; store evaluates on write, no timers; debug hooks replace gesture replay in tests.

**Performance:** door renders on demand with shadows only while driven; hall keeps ≤ 5 of the ~1 MB roster GLBs resident and picks the smaller file of each pair; all vault code/assets asserted outside the 8 MiB core.

**Abuse:** every counter is capped at one increment per local day, ignored letters count per letter id, grimoire time capped at 20 min/day.

**Lanes:** portal.mjs / portal-board-glb.mjs / routes.mjs / reward-packs.mjs are L0-only; L0 also stubs the quilt file so L4 never conflicts; L9 merges last.

Not done here: clue copy, exact thresholds, the old-door/new-door part inventory for L7 (L7's first deliverable is that inventory from `git show 9131e78:modules/portal/portal-board-cogs.mjs` vs current).

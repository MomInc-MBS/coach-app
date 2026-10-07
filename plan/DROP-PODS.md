# Drop-pod pack opening (brief)

Worktree: D:/myr5-work/drop-pods, branch w/drop-pods, based on R27 live @ 6d41aec. Do NOT deploy and do NOT touch other worktrees.

## Goal (Ian, 6 Oct)
Opening a reward pack becomes a full-screen space-drop sequence, the way top FPS games handle pack openings (Rainbow Six Siege Alpha Packs: one tap to open, a tier-coloured build-up, a burst, the item card, then "Open another" / exit).

Sequence:
1. The user taps **Open pack** in the existing dialog (`reward-pack-ui.mjs`). The pack-opening view goes **full screen** (Fullscreen API where allowed, with a fixed 100vw×100dvh overlay as the fallback on iOS).
2. **Starry night sky**, with parallax stars and a faint nebula in the tier colour.
3. **The drop pod descends**: it starts as a streak high in the sky, with a re-entry glow and a fire trail in the tier colour, falling fast and slightly angled.
4. **Impact**: it slams into the ground, with camera shake, a dust burst and a flash. It ends **half-buried in a dirt mound/crater, steaming** (rising steam particles that loop).
5. A prompt pulses: "Tap the pod". When the user taps the pod, it **opens**: the hatch/lid pops with a pressure-release vent, a light beam in the tier colour rises from inside, and the reward card rises out of it.
6. The **reward card** shows what was unlocked. Reuse `rewardSummary()` and the existing reward text and swatches; Legendary gets extra flair.
7. There are two buttons: **Exit** (closes the view and leaves fullscreen) and **Open another** (shown only while `unopenedPacks()` still has packs; it restarts the sequence from step 2 with the next pack).

## Tiers
`uncommon` #76e356, `rare` #4bafff and `legendary` #ff9c36 (`TIER_COLORS`). Each tier has its own pod model (below) and scales the effects: Legendary gets a longer build-up, a bigger impact and gold sparks.

## Assets (being made in Modly; you may not have them yet)
`pods/drop-pod-uncommon.glb`, `pods/drop-pod-rare.glb` and `pods/drop-pod-legendary.glb` are textured GLBs, upright, at roughly unit scale. **Ship a procedural fallback**: a capsule/cylinder pod with fins in the tier colour, used whenever the GLB is missing or fails to load. When the GLBs land, they must drop in with no code change. Normalise the scale with the bounding box on load. For the lid opening: if the GLB is a single mesh, fake the open with a hatch disc and light (the fallback pod can have a real hinged lid).

## Technical
- three.js is already a dependency (`hologram.mjs` imports `three` and `three/addons/...`). Load it with a **dynamic import inside the new module**, so three is not added to the core startup bundle. Check how `scripts/build.mjs` bundles modules, and register the new file and the `pods/` assets the same way other lazy modules and assets are registered (build output, precache and hash lists; look at how `hologram.mjs` and its GLBs ship).
- New module: `drop-pod-opening.mjs`, exporting something like `playDropPod({tier, open: () => Promise<opened>, onExit, hasNext, onNext})`. Call the existing `openRewardPackExclusive` at the moment the pod is tapped. Keep the ledger logic untouched.
- `reward-pack-ui.mjs`: **Open pack** starts the sequence instead of the tile flip. The existing dialog stays as the "pack waiting" prompt.
- Keep frame rate and battery in mind at 375×812 on phones: DPR capped at 2, geometry ≤ ~150k triangles, particles via Points or instancing. Dispose the renderer and geometries on exit.
- **Skip button** in the corner, always available: it jumps straight to the reveal. `prefers-reduced-motion`: no shake, short fades, and the pod is already landed.
- Accessibility: focus moves to the reveal buttons; Escape = Exit; the reward text is in an aria-live region.
- Never present over a camera workout: the existing `present()` guards stay as they are.

## Done =
- `npm test` passes, with no new failures compared to the base. Add one small test for the module's sequence state machine (sky → drop → landed → opened → reveal; next/exit) if it can run in node.
- Screenshots at 375×812 for each phase (sky, mid-fall, landed and steaming, opened, reveal) for all three tiers using the fallback pods, saved to `.drop/` and listed in `.drop/REPORT.md` along with the files changed.
- Commit on w/drop-pods. Do not push or deploy.

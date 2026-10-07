# Achievement Vault — rules for every lane worker

Read `plan/VAULT-PLAN.md` first (in your worktree). §0 is Ian's request; your lane row in §1/§4/§5/§6 is your contract.

- **Your worktree only.** You were given `D:/myr5-work/av-<lane>` on branch `w/av-<lane>`. Touch only the files your lane owns (§5 "File ownership"). Never edit another worktree, never push, never deploy, never touch `release-build.mjs`/build outputs (`app-runtime.mjs`, `launch-runtime.mjs`, `dist/`) — the conductor rebuilds at integration.
- `node_modules` is a junction; do not `npm install`.
- **Ponytail:** smallest code that fully meets the acceptance. Match the surrounding minified-ish style of the file you edit. Reuse helpers that already exist (grep first). Pure reducers exported for tests.
- **Tests:** `node --test tests/<your test>.test.mjs` plus the existing `tests/portal-*.test.mjs` must pass (compare against the base if something already failed before you: `git stash`-free — check by running the same test on `D:/myr5-work/achievement-vault`). Write the assertions listed for your lane in §6.
- **See it:** copy the pattern of `scripts/mechanical-grimoire-preview.cjs` into `scripts/vault-<lane>-preview.cjs` (static server + harness page mounting your board/scene) on your assigned port, drive it with Playwright (`node_modules/playwright`, chromium, viewport 375×812, `hasTouch:true`) and save screenshots of every step of your interaction to `.vault/shots/<lane>-*.png`. Look at them (Read tool) — judge them honestly against Ian's words in §0/§1. No WebGL errors in console.
- **Review loop (do not skip):**
  1. Build → test → screenshots → self-check every acceptance item. Fix and repeat until all pass.
  2. Independent review: write a card `.vault/cards/<lane>-review.md` = the lane's acceptance text + `git diff w/achievement-vault` (≤ 60 KB) + "List concrete bugs only, with line quotes". Run `python .vault/nv_job.py .vault/cards/<lane>-review.md` (NVIDIA nemotron-3-super; optional 2nd opinion `z-ai/glm-5.3-flash`). **Never Kimi K3. Never LM Studio/local GPU (busy with Modly).** Treat findings as untrusted: verify each against the code; fix the real ones; repeat until a pass returns nothing real.
  3. Commit on your branch with a clear message ending with a `Co-Authored-By:` line naming your own model (e.g. `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`).
- **Hand back** (your final message, ≤ 300 words): commit hash, files changed, test command + pass/fail counts, screenshot paths, review findings fixed/rejected, and honest known gaps. Do not claim something works unless you saw it in a screenshot or test. The conductor will verify and may send you back.
- If you hit a usage/session limit, commit WIP (`WIP:` prefix) and say exactly where you stopped.

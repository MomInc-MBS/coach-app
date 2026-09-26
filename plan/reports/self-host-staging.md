# SELF-HOST-STAGING report (25 Sep)

Branch `w/self-host` (base 7662d76, live v65). Nothing pushed. Production worker NOT deployed; no routes, domains or DNS touched; `myr5-coach-reminders` and `scheduler/` untouched.

## Result
- Staging: https://myr5-coach-staging.mominc-coach.workers.dev (Worker `myr5-coach-staging`; the account already had the `mominc-coach.workers.dev` subdomain, so there was no prompt).
- D1 `myr5-coach-staging` = `4b93f2db-21cb-4697-95ef-4611f07818e8` (bound to staging).
- D1 `myr5-coach` = `5731afde-1437-4fcf-9b25-1ad868b24fe3` (production, not bound to any deployed Worker yet).
- Both got `drizzle/0000`–`0020` via `wrangler d1 migrations apply`, all applied without SQL edits: 32 app tables + `d1_migrations`. Both empty.

## What changed
- `server/cloudflare.mjs` (new): the public entry the build now bundles. It deletes every `oai-authenticated-user-*` header before `worker.mjs` runs, so identity is a verified Clerk bearer token only. `auth.mjs`/`worker.mjs` are unchanged because 22 test files use that header as their test identity, and the dev server's Sites mock sign-in calls `worker.mjs` directly.
- Sign-in UI: `signin.html` loses the "Existing ChatGPT Coach" section; `signin.mjs` loses the ChatGPT continue/link routes and the link-to-ChatGPT flow; with no Clerk config it says "Sign-in is not available here yet." instead of redirecting to `/signin-with-chatgpt`. `auth-client.mjs` sign-out: Clerk `signOut()` then the return path, with no `/signout-with-chatgpt`. `launch-shell.mjs` sign-out fallback href → `/pose.html`. `privacy.html`: dropped "Existing users can continue with ChatGPT."
- Size gate: `scripts/deployment-size.mjs` now checks Workers limits on all of `dist/`, ≤20,000 files and ≤25 MiB per file. Build line: `Workers limits: 1723 / 20000 files; largest 22911224 / 26214400 bytes (dist\client\handborne\models\family-20.glb); 265697935 total bytes.` The single-file cap is the tight one: family-20.glb has 3.3 MiB left.
- `wrangler.jsonc` (new): production `myr5-coach` (workers_dev false, routes commented out, cron `* * * * *`, D1 `myr5-coach`, public Clerk + release vars) and `env.staging` = `myr5-coach-staging` (workers_dev true, own D1, no cron, no vars/secrets). `nodejs_compat` is on: Vite's SSR bundle resolves `@clerk/backend`'s crypto to `node:crypto`, and wrangler warned it would throw without the flag (Sites evidently provides it). Assets-first with default `html_handling`. No `run_worker_first`, and no account_id.
- Email: no `EMAIL` binding. `emailConfigured()` needs `EMAIL` or `RESEND_API_KEY`, so release email is off on both.
- Tests: new `tests/cloudflare-entry.test.mjs` (forged header → 401, storage never touched; build bundles the entry). Updated `deployment-size`, `icon-dedup` (tar headroom → file count), `auth-transition` (sign-out lands on `/pose.html`).

## Grok claims that were wrong (or incomplete)
1. "`/` 302s to /pose.html" and the `run_worker_first: ["/", …]` list. On live, `/` is **200** (Sites serves `index.html` first; the worker's 302 never runs). Staging now matches: `/` 200, `/pose.html` 307 → `/pose`, `/index.html` 307 → `/`. Grok's config would have added a redirect that live doesn't have.
2. "Largest copied file is hands-v2.glb (5.3 MB)". It is actually `handborne/models/family-20.glb` at 22.9 MB (gitignored, downloaded at build).
3. "No compatibility flags". `nodejs_compat` is required (see above).
4. "`drop-trailing-slash` is what redirects .html". The default handling already gives live's 307 `/pose.html` → `/pose`.
5. "Release email/push … not live". Live `/health` reports `reminders:{available:true,configured:true,schedulerActive:true}`, so the Site uses `REMINDER_SERVICE_ORIGIN`, i.e. the separate `myr5-coach-reminders` Worker (deployed 10 Sep on Ian's account). Live reminders and release pushes run there today.
Correct: the `oai-*` header takeover, the ChatGPT sign-out route, 21 migration files / 32 tables, and statement-breakpoints being harmless on D1.

## Verification (Playwright, Edge, 375×812, frames in `.frames/`)
24/24 checks passed on the final version (`cc4ab942`):
- /health 200; `/` 200; /pose.html 307 → /pose; /pose 200.
- /api/releases/current 200; /api/auth/config 200 `{enabled:false}`; /icons/coach-512.png 200 image/png (227,776 B via the alias).
- Content types: `.mjs`/`sw.js` text/javascript, `.glb` model/gltf-binary, `.webp` image/webp, manifest application/manifest+json, `app.css` text/css.
- Manifest id `/pose.html`, start_url `/pose`, scope `/`.
- A forged `oai-authenticated-user-id` gets 401; `/signin-with-chatgpt` 404.
- sw.js registers (scope `/`, activated) and controls the page after reload.
- A guest (setup saved on the device, as in the browser tests) is past the setup gate; the quilt portal mounts with a WebGL canvas; Food opens (`mealsPanel`); the Achievements board opens.
- Frames: `staging-01-first-visit.png` (fresh guest, setup gate), `02-guest-pose`, `03-portal-quilt`, `04-food`, `05-achievements-board`, `06-signin` ("Sign-in is not available here yet.", no ChatGPT).
- Console: no errors except guest 401s on `/api/account?core=1`, `/api/updates/subscription`, `/api/meals`. Live shows the identical three 401s for a guest (same script run against myr5.mominc.online), so this is not new.
- Clerk sign-in is not expected on workers.dev (keys locked to mominc.online). Staging has no Clerk config, so there was nothing to work around.

## Tests
Baseline and after were both run with no `dist/`, as in the baseline.
- Baseline: 1294 tests, 1181 pass, 110 fail, 3 skipped.
- After: 1295 tests, 1181 pass, 111 fail, 3 skipped. The new test passes.
- The only new name is `offline-worker.test.mjs` "idle prepared clients activate together without closing windows". It passes 3/3 when run alone and `sw.js` is untouched, so it is flaky under full-suite load.

## Production secrets (`npx wrangler secret put NAME`, top-level env, before the first production deploy)
- `CLERK_JWT_KEY`: Clerk dashboard → production instance (clerk.mominc.online) → API keys → JWT public key (PEM). Same value as the Site's env.
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`: must be the **same keypair live uses**. Live push runs on `myr5-coach-reminders`, so its secrets hold them, but Cloudflare secrets can't be read back. Ian needs the original values from wherever he generated them or from the Site env. The client reuses an existing browser subscription without checking the key, so a new keypair makes pushes to already-subscribed phones fail silently. If the keys are lost, AGENT follow-up: resubscribe when `subscription.options.applicationServerKey` differs.
- `COACH_ARMY_COMPLETION_SECRET`: the shared bearer the Coach Army verifier sends. Take it from the Site env; it must match the sender.
- `COACH_ARMY_ENTITLEMENT_URL` + `COACH_ARMY_ENTITLEMENT_TOKEN`: from the Site env, only if live sets them (the outbox is a no-op without them).
- `CRON_SECRET`: optional (manual `POST /api/cron` only; the Worker cron doesn't need it). Any random string.
- `RESEND_API_KEY`: optional, from resend.com; only if release email should turn on.
- Already vars in wrangler.jsonc (public): `CLERK_PUBLISHABLE_KEY`, `CLERK_FRONTEND_URL`, `CLERK_AUTHORIZED_PARTIES=https://myr5.mominc.online`, `RELEASE_ORIGIN`, `RELEASE_EMAIL_FROM`.
- Do not set: `REMINDER_SERVICE_ORIGIN`/`TOKEN` (they would switch off the in-Worker cron), `LOCAL_PREVIEW`, `EMAIL`.

## Cutover steps left
1. OWNER: decide reminders. Production is configured for the in-Worker minute cron on the empty `myr5-coach` D1. Live uses `myr5-coach-reminders`. After cutover, remove that Worker's cron (or delete it) so two schedulers never run. The alternative is to point production at it with the two REMINDER_SERVICE secrets and drop the cron here.
2. OWNER: put the secrets above on `myr5-coach` (not on staging).
3. OWNER: move the mominc.online nameservers to Cloudflare with the full zone copied (GitHub Pages apex/www DNS-only, `packs`, MX/SPF/DKIM/DMARC, `myr5` still CNAME → custom-domains.chatgpt.site). Confirm everything resolves before any Worker hostname exists.
4. AGENT (after Ian's go): uncomment the `routes` custom domain, `rm -rf dist && npm run build`, then `npx wrangler deploy --env=""` (production). Only when Ian says so.
5. AGENT: on https://myr5.mominc.online check /health, /pose, /pose.html → /pose, /api/releases/current, Clerk sign-in plus one account read, and an installed PWA's scope/id. Then re-run the staging script against it.
6. OWNER: keep the Site published until the new origin has real use. Rollback = remove the Worker custom domain, set `myr5` back to CNAME custom-domains.chatgpt.site. D1 writes after cutover stay on Cloudflare.
7. OWNER: staging can be deleted any time (`npx wrangler delete --env staging`, plus `npx wrangler d1 delete myr5-coach-staging`).

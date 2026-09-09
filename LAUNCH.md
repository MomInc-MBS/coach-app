# MYR5 Coach

The hosted app preserves the existing containment pod, custom creature, eight exercise modes, holograms and rest encounter.

## Implemented

- Installable PWA with home-screen icons, a service worker and an explicit update action.
- 339 pre-rendered clear robot voice clips (about 39 MB), plus phone speech for other text. No PC speech endpoint is used in production.
- Food-101 photo suggestions using the Apache-2.0 Swin model through Transformers.js. Inference runs on the device, with no photo upload. The model downloads only after the user requests recognition. Users confirm names and portions; optional nutrition is entered from labels or recipes, never inferred as an exact value from the photo.
- Account identity through Sites' ChatGPT sign-in; user-owned D1 meal history, workout tickets, progress, reminders and appearance snapshots.
- Server-calculated workout levels and unlocks. Ember at 4 sets, Arc at 16, Frost at 36, coach shield damage at 196 sets (level 50). Rest taps never earn XP. This is recreational progress, not a remotely verified fitness competition.
- Push subscriptions, encrypted Web Push delivery, daily timezone schedules, quiet hours, per-device disable, duplicate-delivery prevention and stale-subscription removal.
- Account data export and deletion.

## Activation still required

The separate `scheduler/service.mjs` Worker runs in the user's Cloudflare account with its own D1 reminder database. A cron trigger runs it every minute without contacting the private Site. Coach forwards authenticated reminder operations over a server-only service credential; the reminder service rejects direct browser requests and unrelated routes. The Site stays private. Pre-existing reminder records migrate once, and later deletion or import retries cannot restore them. Account export and deletion cover both databases. The app only enables device subscription when the sender reports a recent cron heartbeat.

Deployment needs Cloudflare authorization, a D1 binding in `scheduler/wrangler.jsonc`, and `REMINDER_SERVICE_TOKEN`, `VAPID_PUBLIC_KEY`, and `VAPID_PRIVATE_KEY` runtime secrets. Sites receives the matching service token and `REMINDER_SERVICE_ORIGIN`. Never store these secrets in source. The existing `/api/cron` route refuses to run a second sender after remote activation.

Real phone installation, camera performance, food inference in mobile WebAssembly, push permission and locked-screen delivery are physical device acceptance checks; automated Node checks do not prove those results.

MOM INC. website completion eligibility and the prior plan's two friend invitations are not implemented by this app's workout unlocks. The current public website stores completion in the browser; a trusted account-linked completion service is needed for secure game-based entry. No website completion is fabricated or granted by this build.

## Development

`npm install`, `npm run db:generate`, `npm run dev`, `npm test`, `npm run build`.

Local sign-in uses the Sites plugin's isolated mock account. Production only uses dispatcher-provided identity. Migrations are generated from `db/schema.ts`; do not change an already-applied migration.

The production directory is `dist/`, with the Worker at `dist/server/index.js` and browser assets at `dist/client/`. `.openai/hosting.json` preserves the registered Site. Runtime signing secrets live in Sites environment settings, never in source or this document.
The two existing creature models are build dependencies fetched from a fixed MOM INC. GitHub revision. `scripts/assets.mjs` verifies their exact Git blob hashes before including them in the hosted bundle. The large binaries are not stored in the Sites source repository.

## Model and licenses

- Model: https://huggingface.co/onnx-community/swin-finetuned-food101-ONNX (revision `e5e50bfc6425aa546f3b4421ca8bd79d0dd610b8`, Apache-2.0).
- Runtime: https://huggingface.co/docs/transformers.js (3.8.1, Apache-2.0).
- The original tracker retains its AGPL license and source offer. Existing model and creator notices are preserved.
- eSpeak NG generates the static WAV clips. No eSpeak executable is included in the app.

This code has no paid inference calls. Service-provider free-tier limits still apply.

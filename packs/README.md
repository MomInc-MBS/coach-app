# P13C isolated pack adapters

`pack-lifecycle.mjs` was copied from `prototypes/packs/pack-lifecycle.mjs` (reviewed P13B fixture lifecycle) and changed only to permit an explicit async asset-source adapter and to report durable storage/download failures as failed pack state. `browser-asset-store.mjs` puts binary assets in CacheStorage under lifecycle version/hash keys; lifecycle metadata is the small separate metadata record, not a byte-array localStorage cache.

This is an opt-in module. Locked public initial load (`app.mjs`/`launch-bootstrap.mjs`) does not import it, material runtimes, or optional fixtures. `http-fixture-adapter.mjs` is a local HTTP test fixture only—not a CDN integration—and pins Range continuation to both ETag and fixture version before lifecycle hash validation.

The existing workout implementation has camera phases (`camera`, `model`, `tracking`) and a local progress write, but it has no public atomic save-and-confirm-idle API. Therefore `existingWorkoutIdleAdapter()` returns `{saved:false,idle:false}` unless a workout owner supplies both `getWorkoutState` and `saveWorkout`; activation remains `pending-equip` and cannot interrupt an active workout. Account entitlement remains caller-owned: tests use `fixtureEntitlementAccount`, which is an explicit static test fixture and never grants entitlement to a client or calls a live service.

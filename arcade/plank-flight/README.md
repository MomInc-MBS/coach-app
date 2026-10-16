# Plank Flight

An original MYR5 first-person arcade adaptation researched against Jetpack Joyride's mechanic families. It reuses MYR5 maze materials and its workout/account lifecycle. Reference artwork, names, prices, odds and physics are not copied.

Choose **Plank Flight** in Coach. The front-facing camera guides high, low, left, right, middle and mixed checks. Comfortable push-up height controls altitude; gentle lateral movement controls steering. Both hands stay down. The camera estimates geometry: it cannot measure floor contact or which arm carries pressure. Missing torso evidence permits uncredited practice only.

Controls and workout credit share a provisional 750 ms freshness deadline. Invalid poses, hidden pages, calibration, menus, crashes and recovery countdowns earn no hold time. Gaps never catch up. Real phone accuracy, framing, fatigue and reaction times still require physical validation.

Coins, tokens, purchases, levels and records live in an owner-scoped IndexedDB device wallet. They are separate from fitness XP and are not cloud synchronized. Purchases and reward receipts serialize across tabs; replayed rewards do not pay twice. Save failures show pending rewards and retry. Closing the app during a permanent storage failure can lose pending events. Guest rewards do not automatically merge into an account.

Modules separate camera input, hold evidence, fixed-step simulation, catalog, rendering, wallet and lifecycle. `flight.mjs` consumes the same accepted pose as MovementSession; the renderer never runs a second tracker. `stop()` releases its scene and finishes pending wallet work.

Tests under `tests/plank-flight-*` cover synthetic pose calibration, lifecycle/credit integration, simulation, reward concurrency and browser navigation. The 10,000-seed witness is deliberately expensive and must not run concurrently with another copy. Browser fixtures use synthetic tracker landmarks, not a person's exercise.

Research and reviewed plans: `D:/outputs/plank-joyride-20261016/`. Keep measured behavior, original adaptation rules and unmeasured reference details distinct.

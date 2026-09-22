# Dependency assessment — 2026-09-21

The installed lockfile audit reports 12 affected package entries: 8 high and 4 moderate, with no critical entries. This is unchanged from the earlier foundation baseline. Exact advisory records are preserved in the conductor's review-packets/results/release-dependency-audit.json. This assessment does not mark them resolved.

Observed use: server and scheduler operate through prepared D1 statements and do not import drizzle-orm; Drizzle is used for schema tooling. esbuild bundles locally, while the development server is Vite bound to 127.0.0.1. Wrangler/Miniflare serve local development and D1 tests. sharp is used by the icon tool and the installed Transformers dependency; food-worker instead imports a pinned browser Transformers build from the CDN. Therefore a package-lock upgrade alone would not change that browser import.

Remediation should be a separate tested lockfile change: update direct Vite/esbuild, coordinate Wrangler with Miniflare, then assess Drizzle schema-generation compatibility. The registry's suggested automatic drizzle-kit downgrade is not a suitable blanket repair. Transformers' suggested major upgrade needs the food recognition fixture checks and review of its browser import; do not silently override native image dependencies without validating compatibility.

Acceptance requires a new audit, full tests/build, Drizzle no-op schema generation, and food fixture checks for any affected inference change. Loopback binding and absence of a direct server import do not establish that every advisory is unreachable. Production release security acceptance remains open.

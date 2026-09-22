# Signing rotation and recovery contract

Design for the remaining production catalog; current expansion/material fixtures do not implement this catalog protocol. Production configuration still contains no trust anchor.

The application ships an allowlisted Ed25519 public-key ring with key IDs and catalog protocol versions. Catalogs cannot provide or replace their own trust anchor. Private keys stay outside the repository, browser, build output and review packets. A release records the public-key fingerprint and catalog digest with its acceptance evidence.

Normal rotation first ships an application version trusting both current and successor public keys. After that build is accepted, publish the immutable successor-signed catalog and update its pointer. Older applications reject unknown keys and keep their already verified last-good catalog. A later compatible app release can retire the prior key for new catalogs. Never silently re-sign or overwrite an immutable pack version.

Catalog generation numbers increase monotonically. A rollback publishes a NEW signed catalog generation pointing at previously accepted immutable pack hashes; it does not lower the generation counter. Clients pin the complete validated catalog, dependency closure and bytes before committing the candidate. Failed downloads or startup preserve the prior working selection and built-in fallback. Verify the persisted catalog again before each restore.

Compromise recovery ships an application trust update removing the compromised key and pinning its replacement. Do not accept a remote instruction signed only by a compromised key as authority to install a replacement key. Invalidate affected selections under the workout-idle lease and use the built-in fallback. Previously downloaded bytes may remain inert for explicit removal.

A disconnected client cannot learn that a signing key or entitlement was revoked. Offline use continues under its last confirmed state until it obtains a trusted application/account update. This limitation must be explicit in release acceptance; the system must not claim immediate global revocation. Signing-key validity and account grants are separate checks.

Before publication, test: unknown/tampered key rejection, exact cached metadata verification, dual-key upgrade, retirement, lower-generation rejection, higher-generation rollback, failure during catalog/byte commit, key-compromise fallback and owner-switch/revocation during every asynchronous boundary. Measure actual same-origin Range behavior; until then, promise only bounded whole-file retry and publish no asset exceeding its measured retry budget.

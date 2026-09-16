// This value is replaced by the release build from PUBLIC_EXPANSION_SIGNING_JWK.
// It is intentionally empty in source: an unconfigured build must not pretend to
// have a production trust anchor. A public verification key is safe to ship; a
// private signing key must never enter this repository or the build output.
export const BUILT_PUBLIC_EXPANSION_SIGNING_JWK = null;

const isUsablePublicKey = value => value && typeof value === 'object' && !Array.isArray(value)
  && value.kty === 'OKP' && value.crv === 'Ed25519' && typeof value.x === 'string'
  && /^[A-Za-z0-9_-]{43}$/.test(value.x) && !/^A+$/.test(value.x);

export function productionExpansionTrust() {
  return isUsablePublicKey(BUILT_PUBLIC_EXPANSION_SIGNING_JWK) ? BUILT_PUBLIC_EXPANSION_SIGNING_JWK : null;
}

export function validatePublicExpansionSigningKey(value) {
  if (!isUsablePublicKey(value)) throw new Error('PUBLIC_EXPANSION_SIGNING_JWK must be an Ed25519 public JWK with a non-placeholder x value');
  return Object.freeze({ kty: 'OKP', crv: 'Ed25519', x: value.x, ext: true });
}

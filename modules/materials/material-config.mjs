// Release tooling replaces this value.  Null is a valid, fail-closed public build.
export const BUILT_PUBLIC_MATERIAL_SIGNING_JWK = null;

const usableKey = key => key && typeof key === 'object' && key.kty === 'OKP' && key.crv === 'Ed25519'
  && typeof key.x === 'string' && /^[A-Za-z0-9_-]{43}$/.test(key.x) && !/^A+$/.test(key.x);

export function productionMaterialTrust() {
  return usableKey(BUILT_PUBLIC_MATERIAL_SIGNING_JWK) ? BUILT_PUBLIC_MATERIAL_SIGNING_JWK : null;
}

// This is application-owned policy, never remotely supplied manifest policy.
export const MATERIAL_RUNTIME_POLICY = Object.freeze({
  'liquid-amethyst': Object.freeze({ runtimeType: 'liquid-v1', parameterKeys: Object.freeze(['hue', 'strength']) }),
});

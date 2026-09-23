// Release tooling injects only public verification material. Null is valid and fail-closed.
export const BUILT_PUBLIC_MATERIAL_SIGNING_JWK = typeof __MYR5_MATERIAL_PUBLIC_JWK__ === 'undefined' ? null : __MYR5_MATERIAL_PUBLIC_JWK__;
export const BUILT_MATERIAL_RESOURCE_POLICY = typeof __MYR5_MATERIAL_RESOURCE_POLICY__ === 'undefined' ? null : __MYR5_MATERIAL_RESOURCE_POLICY__;

const usableKey = key => key && typeof key === 'object' && key.kty === 'OKP' && key.crv === 'Ed25519'
  && typeof key.x === 'string' && /^[A-Za-z0-9_-]{43}$/.test(key.x) && !/^A+$/.test(key.x);

export function productionMaterialTrust() {
  return usableKey(BUILT_PUBLIC_MATERIAL_SIGNING_JWK) && !('d' in BUILT_PUBLIC_MATERIAL_SIGNING_JWK) ? BUILT_PUBLIC_MATERIAL_SIGNING_JWK : null;
}

export function productionMaterialResourcePolicy() {
  const value=BUILT_MATERIAL_RESOURCE_POLICY;
  if(!value||value.trustedOrigins?.length!==1||value.trustedOrigins[0]!=='https://raw.githubusercontent.com'||value.allowedProtocols?.length!==1||value.allowedProtocols[0]!=='https:'||typeof value.pathPrefix!=='string'||!/^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/[a-f0-9]{40}\/materials\/$/.test(value.pathPrefix))return null;
  return Object.freeze({trustedOrigins:Object.freeze([...value.trustedOrigins]),allowedProtocols:Object.freeze([...value.allowedProtocols]),pathPrefix:value.pathPrefix});
}

// This is application-owned policy, never remotely supplied manifest policy.
export const MATERIAL_RUNTIME_POLICY = Object.freeze({
  'liquid-amethyst': Object.freeze({ runtimeType: 'liquid-v1', parameterKeys: Object.freeze(['hue', 'strength']) }),
});

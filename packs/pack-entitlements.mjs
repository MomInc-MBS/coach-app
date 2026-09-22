// The authenticated account response is the grant authority. Never combine an
// account identity with another object's globals or legacy top-level grants.
export function packAccountIdentity(account) {
 const id=account?.user?.id;
 return typeof id==='string'&&id.length>0&&id.length<=200&&id.trim()===id?id:null;
}
export function accountPackGrants(account, ownerId=packAccountIdentity(account)) {
 if(!ownerId||packAccountIdentity(account)!==ownerId)return [];
 const grants=account?.entitlements?.ownedPacks;
 return Array.isArray(grants)?grants.filter(grant=>grant&&typeof grant.packId==='string'&&grant.packId.length>0&&grant.packId.trim()===grant.packId&&grant.status==='owned'&&Number.isSafeInteger(grant.grantedAt)):[];
}
export function hasPackGrant(account,packId) { return accountPackGrants(account).some(grant=>grant.packId===packId); }

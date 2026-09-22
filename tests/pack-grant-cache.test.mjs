import test from 'node:test';
import assert from 'node:assert/strict';
import {createPackGrantCache,memoryGrantStorage,PACK_GRANT_CACHE_KEY} from '../packs/pack-grant-cache.mjs';

const grant=(packId,grantedAt=1)=>({packId,status:'owned',grantedAt});
const account=(id,ownedPacks,dataEpoch=1)=>({user:{id},dataEpoch,entitlements:{ownedPacks}});

test('last confirmed owner grants survive offline reopen without crossing owners',()=>{
 const storage=memoryGrantStorage(),first=createPackGrantCache({storage,now:()=>10});
 first.confirm(account('ian',[grant('paper')]));
 assert.deepEqual(first.active().entitlements.ownedPacks,[grant('paper')]);
 const reopened=createPackGrantCache({storage,now:()=>20});
 assert.equal(reopened.active().user.id,'ian');
 assert.equal(reopened.forOwner('girlfriend'),null);
 reopened.confirm(account('girlfriend',[grant('material')],2));
 assert.deepEqual(reopened.active().entitlements.ownedPacks,[grant('material')]);
 assert.deepEqual(reopened.forOwner('ian').entitlements.ownedPacks,[grant('paper')]);
});

test('signout deactivates but retains prior grants and confirmed empty state revokes',()=>{
 const storage=memoryGrantStorage(),cache=createPackGrantCache({storage,now:()=>10});
 cache.confirm(account('ian',[grant('paper')]));
 cache.deactivate();
 assert.equal(cache.active(),null);
 assert.deepEqual(cache.forOwner('ian').entitlements.ownedPacks,[grant('paper')]);
 cache.confirm(account('ian',[],2));
 assert.deepEqual(cache.active().entitlements.ownedPacks,[]);
 assert.equal(cache.active().dataEpoch,2);
});

test('account deletion removes only that owner and malformed storage fails closed',()=>{
 const storage=memoryGrantStorage(),cache=createPackGrantCache({storage,now:()=>10});
 cache.confirm(account('ian',[grant('paper')]));
 cache.confirm(account('girlfriend',[grant('material')]));
 cache.remove('girlfriend');
 assert.equal(cache.active(),null);
 assert.deepEqual(cache.forOwner('ian').entitlements.ownedPacks,[grant('paper')]);
 storage.setItem(PACK_GRANT_CACHE_KEY,'{"version":1,"activeOwner":"ian","owners":{"ian":{"grants":[{"packId":"paper","status":"owned","grantedAt":"bad"}]}}}');
 assert.equal(createPackGrantCache({storage}).active(),null);
});

test('only canonical ownedPacks records are persisted',()=>{
 const storage=memoryGrantStorage(),cache=createPackGrantCache({storage,now:()=>10});
 const value=account('ian',[grant('paper'),{packId:'wrong',status:'revoked',grantedAt:2},{packId:'bad',status:'owned',grantedAt:'now'}]);
 cache.confirm(value);
 assert.deepEqual(cache.active().entitlements.ownedPacks,[grant('paper')]);
 assert.equal(JSON.stringify(value),JSON.stringify(account('ian',[grant('paper'),{packId:'wrong',status:'revoked',grantedAt:2},{packId:'bad',status:'owned',grantedAt:'now'}])));
});

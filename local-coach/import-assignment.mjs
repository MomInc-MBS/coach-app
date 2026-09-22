// Pure policy for a single owner's guest-import history. The caller must load
// validated source workouts and commit returned changes in one transaction.
// Epochs/proofs come from an authenticated adapter: shape checks are NOT auth.
export class ImportAssignmentError extends Error {
  constructor(code, message = code) { super(message); this.name = 'ImportAssignmentError'; this.code = code; }
}
const policyFailures = new WeakSet();
const fail = (code, message) => { const error = new ImportAssignmentError(code, message); policyFailures.add(error); throw error; };
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const opaque = (value, name) => {
  if (typeof value !== 'string' || !value || value.length > 512 || value.trim() !== value) fail('invalid-record', name + ' must be a canonical opaque id');
  return value;
};
const positive = (value, name) => {
  if (!Number.isSafeInteger(value) || value < 1) fail('invalid-record', name + ' must be a positive safe integer');
  return value;
};
const owned = new WeakSet();
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const key of Object.getOwnPropertyNames(value)) freeze(value[key]);
    Object.freeze(value);
    owned.add(value);
  }
  return value;
};
const canonicalJSON = value => {
  try {
  const ancestors = new Set();
  let remaining = 131072;
  const count = text => {
    remaining -= text.length;
    if (remaining < 0) fail('invalid-record', 'canonical record including its envelope exceeds the local record limit');
    return text;
  };
  const visit = (input, depth = 0) => {
    if (depth > 64) fail('invalid-record', 'snapshot is too deep');
    if (input === null || typeof input === 'string' || typeof input === 'boolean') return count(JSON.stringify(input));
    if (typeof input === 'number' && Number.isFinite(input)) return count(JSON.stringify(input));
    if (!input || typeof input !== 'object' || ancestors.has(input)) fail('invalid-record', 'snapshot must be JSON');
    const array = Array.isArray(input);
    const descriptors = Object.getOwnPropertyDescriptors(input);
    if (Object.getOwnPropertySymbols(descriptors).length) fail('invalid-record');
    const keys = Object.keys(descriptors).filter(key => descriptors[key].enumerable);
    const length = array ? descriptors.length?.value : 0;
    if (array) {
      if (Object.getPrototypeOf(input) !== Array.prototype) fail('invalid-record', 'snapshot arrays must be plain arrays');
      if (!Number.isSafeInteger(length) || length > remaining || keys.length !== length || keys.some((key, index) => key !== String(index))) fail('invalid-record', 'snapshot arrays must be dense and bounded');
    } else if (![Object.prototype, null].includes(Object.getPrototypeOf(input))) fail('invalid-record', 'snapshot must contain plain objects');
    if (Object.keys(descriptors).length !== keys.length + (array ? 1 : 0) || keys.some(key => !own(descriptors[key], 'value'))) fail('invalid-record', 'snapshot must contain data properties');
    count(array ? '[]' : '{}');
    remaining -= Math.max(0, keys.length - 1);
    if (remaining < 0) fail('invalid-record', 'snapshot exceeds the local record limit');
    ancestors.add(input);
    const parts = [];
    for (const key of array ? keys : keys.sort()) {
      parts.push((array ? '' : count(JSON.stringify(key) + ':')) + visit(descriptors[key].value, depth + 1));
    }
    const result = (array ? '[' : '{') + parts.join(',') + (array ? ']' : '}');
    ancestors.delete(input);
    return result;
  };
  const result = visit(value);
  if (result.length > 131072) fail('invalid-record', 'canonical record including its envelope exceeds the local record limit');
  return result;
  } catch (error) {
    if (policyFailures.has(error)) throw error;
    fail('invalid-record');
  }
};
// Capture own data descriptors without invoking input accessors. Validate the
// detached record only; callers cannot change a discriminator between reads.
const dataRecord = raw => {
  try {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) ||
        ![Object.prototype, null].includes(Object.getPrototypeOf(raw))) fail('invalid-record');
    const descriptors = Object.getOwnPropertyDescriptors(raw), copy = Object.create(null);
    if (Object.getOwnPropertySymbols(descriptors).length) fail('invalid-record');
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (!own(descriptor, 'value') || !descriptor.enumerable) fail('invalid-record');
      copy[key] = descriptor.value;
    }
    return copy;
  } catch (error) {
    if (policyFailures.has(error)) throw error;
    fail('invalid-record');
  }
};
const itemKey = item => JSON.stringify([item.sourceOwnerId, item.clientWorkoutId]);
const stateOf = state => {
  try {
    if (!owned.has(state)) state = structuredClone(state);
    if (!state || !Array.isArray(state.heads) || !Array.isArray(state.items) || !Array.isArray(state.events)) fail('invalid-state');
    const ids = new Set(), headKeys = new Set();
    for (const item of state.items) {
      opaque(item.itemId, 'itemId'); opaque(item.claimId, 'claimId'); positive(item.generation, 'generation');
      if (ids.has(item.itemId) || ids.has(item.claimId) || item.itemId === item.claimId) fail('invalid-state');
      ids.add(item.itemId); ids.add(item.claimId);
    }
    for (const head of state.heads) {
      const key = itemKey(head), item = state.items.find(candidate => candidate.claimId === head.claimId);
      if (headKeys.has(key) || !['active', 'released', 'keep_local'].includes(head.status) || !item ||
          item.generation !== head.generation || itemKey(item) !== key || item.itemId !== head.itemId) fail('invalid-state');
      headKeys.add(key);
    }
    for (const event of state.events) {
      const item = state.items.find(candidate => candidate.claimId === event.claimId);
      if (!item || item.kind !== 'import' || !['imported', 'retry', 'target_deleted', 'deletion_evidence'].includes(event.type) || event.generation !== item.generation) fail('invalid-state');
      if (['target_deleted', 'deletion_evidence'].includes(event.type)) {
        opaque(event.targetAccountId, 'targetAccountId');
        positive(event.deletedThroughEpoch, 'deletedThroughEpoch');
        positive(event.currentDataEpoch, 'currentDataEpoch');
        if (event.targetAccountId !== item.targetAccountId ||
            !(item.targetDataEpoch <= event.deletedThroughEpoch && event.deletedThroughEpoch < event.currentDataEpoch)) fail('invalid-state');
      }
    }
    return state;
  } catch { fail('invalid-state'); }
};
const deletionWatermark = (state, targetAccountId) => state.events
  .filter(event => ['target_deleted', 'deletion_evidence'].includes(event.type) && event.targetAccountId === targetAccountId)
  .reduce((maximum, event) => Math.max(maximum, event.deletedThroughEpoch), 0);
export const emptyImportAssignmentState = () => freeze({heads: [], items: [], events: []});
const readClaim = raw => {
  raw = dataRecord(raw);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.completed !== true || !['import', 'keep_local'].includes(raw.kind)) fail('invalid-record');
  const fields = ['decisionId','sourceOwnerId','sourceDeviceId','clientWorkoutId','claimId','itemId','kind','completed'];
  if (raw.kind === 'import') fields.push('targetAccountId','targetDataEpoch','fingerprint','snapshot');
  const prepared = raw.kind === 'import' && (own(raw,'digestVersion') || own(raw,'idempotencyKey'));
  if (prepared) {
    fields.push('digestVersion','idempotencyKey');
    if (raw.digestVersion !== 1 || typeof raw.idempotencyKey !== 'string' || !/^[0-9a-f]{64}$/.test(raw.idempotencyKey)) fail('invalid-record');
  }
  if (Object.keys(raw).some(key => !fields.includes(key))) fail('invalid-record', 'unexpected claim field');
  const base = Object.fromEntries(fields.filter(key => !['completed','targetDataEpoch','fingerprint','snapshot','digestVersion','idempotencyKey'].includes(key)).map(key => [key, opaque(raw[key], key)]));
  if (!/^guest:\S+$/.test(base.sourceOwnerId) || base.claimId === base.itemId) fail('invalid-record');
  if (raw.kind === 'keep_local') return {...base, decision: canonicalJSON(base)};
  if (typeof raw.fingerprint !== 'string' || !/^[0-9a-f]{64}$/.test(raw.fingerprint) || !own(raw, 'snapshot')) fail('invalid-record');
  const normalized = {...base, targetDataEpoch: positive(raw.targetDataEpoch, 'targetDataEpoch'),
    fingerprint: raw.fingerprint, snapshot: JSON.parse(canonicalJSON(raw.snapshot)),
    ...(prepared ? {digestVersion:raw.digestVersion,idempotencyKey:raw.idempotencyKey} : {})};
  return {...normalized, decision: canonicalJSON(normalized)};
};
export const claimAssignment = (state, input) => {
  state = stateOf(state);
  const claim = readClaim(input), prior = state.items.find(item => item.sourceOwnerId === claim.sourceOwnerId && item.decisionId === claim.decisionId && item.clientWorkoutId === claim.clientWorkoutId);
  if (prior) {
    if (prior.decision !== claim.decision) fail('decision-conflict');
    return freeze({state, item: prior, duplicate: true});
  }
  if (state.items.some(item => [item.itemId, item.claimId].includes(claim.itemId) || [item.itemId, item.claimId].includes(claim.claimId))) fail('id-conflict');
  const key = itemKey(claim), previous = state.heads.find(head => itemKey(head) === key);
  if (previous && previous.status !== 'released') fail('covered');
  if (claim.kind === 'import') {
    const watermark = deletionWatermark(state, claim.targetAccountId);
    if (claim.targetDataEpoch <= watermark) fail('deleted-target-epoch');
  }
  const generation = state.items.filter(item => itemKey(item) === key).reduce((maximum, item) => Math.max(maximum, item.generation), 0) + 1;
  positive(generation, 'generation');
  const item = freeze({...claim, generation});
  const head = freeze({sourceOwnerId: claim.sourceOwnerId, sourceDeviceId: claim.sourceDeviceId, clientWorkoutId: claim.clientWorkoutId,
    claimId: claim.claimId, itemId: claim.itemId, generation, status: claim.kind === 'keep_local' ? 'keep_local' : 'active'});
  return freeze({state: {
    heads: previous ? state.heads.map(candidate => itemKey(candidate) === key ? head : candidate) : [...state.heads, head],
    items: [...state.items, item], events: state.events,
  }, item, duplicate: false});
};
export const assignmentStatus = (state, claimId) => {
  state = stateOf(state);
  const item = state.items.find(candidate => candidate.claimId === claimId);
  if (!item) fail('not-found');
  if (item.kind === 'keep_local') return 'keep_local';
  if (item.targetDataEpoch <= deletionWatermark(state, item.targetAccountId)) return 'target_deleted';
  for (const type of ['target_deleted','imported','retry']) if (state.events.some(event => event.claimId === claimId && event.type === type)) return type;
  return 'pending';
};
export const recordImportOutcome = (state, callback) => {
  state = stateOf(state);
  callback = dataRecord(callback);
  if (!callback || !['imported','retry'].includes(callback.type)) fail('invalid-record');
  const item = state.items.find(candidate => candidate.claimId === callback.claimId);
  if (!item || item.kind !== 'import' || item.generation !== callback.generation ||
      item.sourceOwnerId !== callback.sourceOwnerId || item.sourceDeviceId !== callback.sourceDeviceId ||
      item.clientWorkoutId !== callback.clientWorkoutId) fail('not-found');
  const status = assignmentStatus(state, item.claimId);
  if (status === 'target_deleted' || status === 'imported' || status === callback.type) return freeze({state, item, duplicate: true});
  const event = freeze({type: callback.type, claimId: item.claimId, generation: item.generation});
  return freeze({state: {...state, events: [...state.events, event]}, item, duplicate: false});
};
export const recordImported = (state, callback) => recordImportOutcome(state, {...dataRecord(callback), type: 'imported'});
export const releaseAssignment = (state, proof) => {
  state = stateOf(state);
  proof = dataRecord(proof);
  if (!proof || typeof proof !== 'object') fail('invalid-record');
  const item = state.items.find(candidate => candidate.claimId === proof.claimId);
  const generation = positive(proof.generation, 'generation'), ownerId = opaque(proof.ownerId, 'ownerId');
  const currentDataEpoch = positive(proof.currentDataEpoch, 'currentDataEpoch'), deletedThroughEpoch = positive(proof.deletedThroughEpoch, 'deletedThroughEpoch');
  if (!item || item.kind !== 'import' || item.generation !== generation || item.targetAccountId !== ownerId ||
      !(item.targetDataEpoch <= deletedThroughEpoch && deletedThroughEpoch < currentDataEpoch)) fail('invalid-deletion-proof');
  const old = state.events.find(event => event.type === 'target_deleted' && event.claimId === item.claimId);
  const maximum = state.events.filter(event => event.claimId === item.claimId && ['target_deleted','deletion_evidence'].includes(event.type))
    .reduce((value, event) => Math.max(value, event.deletedThroughEpoch), 0);
  if (old && maximum >= deletedThroughEpoch) return freeze({state, item, duplicate: true});
  const event = freeze({type: old ? 'deletion_evidence' : 'target_deleted', claimId: item.claimId, generation,
    targetAccountId: ownerId, currentDataEpoch, deletedThroughEpoch});
  const key = itemKey(item), heads = state.heads.map(head => itemKey(head) === key && head.claimId === item.claimId && head.generation === generation
    ? freeze({...head, status: 'released'}) : head);
  return freeze({state: {...state, heads, events: [...state.events, event]}, item, duplicate: false});
};

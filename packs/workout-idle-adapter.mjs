/**
 * P13C bridge point for the existing workout UI.  It never invents an idle
 * acknowledgement: until the workout owner exposes save + confirmed-idle,
 * pack activation stays pending and cannot interrupt camera tracking.
 */
export function existingWorkoutIdleAdapter({ owner, getWorkoutState, saveWorkout } = {}) {
  return {
    async saveAndConfirmIdle() {
      if (owner?.acquireIdleLease && owner?.snapshot && owner?.save && owner?.releaseIdleLease) {
        const lease = owner.acquireIdleLease();
        if (!lease) return { saved: false, idle: false, reason: 'active workout must not be interrupted' };
        try {
          const saved = await owner.save();
          const after = owner.snapshot();
          if (saved !== true || after.phase !== 'idle' || after.revision !== lease.revision) {
            owner.releaseIdleLease(lease);
            return { saved: false, idle: false, reason: 'workout changed while saving' };
          }
          // PackLifecycle holds this through runtime activation, closing the idle-active-idle ABA gap.
          return { saved: true, idle: true, local: true, accountSynced: false, lease, release: () => owner.releaseIdleLease(lease) };
        } catch (error) {
          owner.releaseIdleLease(lease);
          return { saved: false, idle: false, reason: error?.message || 'workout save failed' };
        }
      }
      if (typeof getWorkoutState !== 'function' || typeof saveWorkout !== 'function') return { saved: false, idle: false, reason: 'workout save/idle integration is not installed' };
      const before = getWorkoutState();
      if (!before || before.phase !== 'idle') return { saved: false, idle: false, reason: 'active workout must not be interrupted' };
      // A state snapshot cannot prevent an idle-active-idle transition while
      // activation awaits. Legacy callbacks must install the owner lease API.
      return { saved: false, idle: false, reason: 'workout idle lease integration is not installed' };
    }
  };
}
